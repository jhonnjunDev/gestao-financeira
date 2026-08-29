import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccountAccess, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;

  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;

  const budgets = await prisma.budget.findMany({
    where: { accountId, year, ...(month ? { month } : {}) },
    include: { category: true, costCenter: true },
    orderBy: { category: { name: "asc" } },
  });

  // Calcular realizado para cada orçamento
  const withRealized = await Promise.all(
    budgets.map(async (b) => {
      const where: any = {
        accountId,
        deletedAt: null,
        status: { not: "CANCELED" },
      };
      if (b.categoryId) where.categoryId = b.categoryId;
      if (b.costCenterId) where.costCenterId = b.costCenterId;
      if (b.periodType === "MONTHLY" && b.month) {
        where.date = {
          gte: new Date(year, b.month - 1, 1),
          lte: new Date(year, b.month, 0, 23, 59, 59),
        };
      } else {
        where.date = {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        };
      }
      // Para orçamento de despesas, soma despesas; para receitas, soma receitas
      if (b.category?.type === "EXPENSE") where.type = "EXPENSE";
      else if (b.category?.type === "INCOME") where.type = "INCOME";

      const agg = await prisma.transaction.aggregate({ where, _sum: { amount: true } });
      const realized = Number(agg._sum.amount || 0);
      const planned = Number(b.amount);
      return {
        ...b,
        planned,
        realized,
        difference: planned - realized,
        percentage: planned > 0 ? (realized / planned) * 100 : 0,
      };
    })
  );

  return successResponse(withRealized);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const accountId = body.accountId;
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;
  const session = auth.session!;

  try {
    const { periodType, year, month, amount, categoryId, costCenterId } = body;
    if (!periodType || !year || !amount) {
      return errorResponse("Tipo de período, ano e valor são obrigatórios");
    }

    const budget = await prisma.budget.create({
      data: { accountId, periodType, year, month: month || null, amount, categoryId, costCenterId },
    });

    await createAuditLog({
      userId: session.userId,
      accountId,
      action: "CREATE",
      entity: "BUDGET",
      entityId: budget.id,
      details: `Orçamento criado: ${periodType} ${year}${month ? "/" + month : ""}`,
    });

    return successResponse(budget, 201);
  } catch (error) {
    return errorResponse("Erro ao criar orçamento", 500);
  }
}