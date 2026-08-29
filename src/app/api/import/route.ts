import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccountAccess, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const accountId = formData.get("accountId") as string;
  const file = formData.get("file") as File;

  if (!accountId) return errorResponse("Conta é obrigatória");
  if (!file) return errorResponse("Arquivo é obrigatório");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;
  const session = auth.session!;

  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return errorResponse("Arquivo vazio ou sem dados");

    // Detectar separador
    const firstLine = lines[0];
    const separator = firstLine.includes(";") ? ";" : ",";

    const headers = firstLine.split(separator).map((h) => h.trim().toLowerCase());
    const requiredColumns = ["descricao", "valor"];
    const missing = requiredColumns.filter((c) => !headers.includes(c));
    if (missing.length > 0) {
      return errorResponse(`Colunas obrigatórias ausentes: ${missing.join(", ")}. Esperadas (pelo menos): descricao, valor`);
    }

    let created = 0;
    let skipped = 0;
    const duplicates: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(separator).map((c) => c.trim());
      if (cols.length < 2) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] || ""; });

      const description = row["descricao"];
      const amountStr = row["valor"]?.replace("R$", "").replace(/\./g, "").replace(",", ".") || "";
      const amount = parseFloat(amountStr);
      if (!description || isNaN(amount) || amount <= 0) {
        skipped++;
        continue;
      }

      const type = (row["tipo"] || "despesa").toLowerCase().includes("receit") ? "INCOME" : "EXPENSE";
      const date = row["data"] ? new Date(row["data"]) : new Date();

      // Verificar duplicado (mesma descrição, valor e data)
      const existing = await prisma.transaction.findFirst({
        where: {
          accountId,
          description,
          amount,
          date: {
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            lte: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59),
          },
          deletedAt: null,
        },
      });

      if (existing) {
        duplicates.push(description);
        skipped++;
        continue;
      }

      // Encontrar categoria pelo nome
      let category = null;
      const categoryName = row["categoria"];
      if (categoryName) {
        category = await prisma.category.findFirst({
          where: { accountId, name: categoryName },
        });
      }

      // Encontrar fornecedor pelo nome
      let supplier = null;
      const supplierName = row["fornecedor"] || row["beneficiario"];
      if (supplierName) {
        supplier = await prisma.supplier.findFirst({
          where: { accountId, name: supplierName },
        });
        if (!supplier) {
          supplier = await prisma.supplier.create({
            data: { accountId, name: supplierName },
          });
        }
      }

      await prisma.transaction.create({
        data: {
          accountId,
          type,
          description,
          amount,
          date,
          dueDate: row["vencimento"] ? new Date(row["vencimento"]) : null,
          categoryId: category?.id || null,
          supplierId: supplier?.id || null,
          paymentMethod: row["pagamento"] || null,
          documentNumber: row["documento"] || null,
          status: type === "INCOME" ? "RECEIVED" : "PAID",
          createdById: session.userId,
        },
      });
      created++;
    }

    await createAuditLog({
      userId: session.userId,
      accountId,
      action: "CREATE",
      entity: "TRANSACTION",
      details: `Importação de planilha: ${created} lançamentos criados, ${skipped} ignorados`,
    });

    return successResponse({
      created,
      skipped,
      duplicates: duplicates.length,
      duplicateExamples: duplicates.slice(0, 5),
    });
  } catch (error: any) {
    console.error("Import error:", error);
    return errorResponse("Erro ao importar: " + error.message, 500);
  }
}