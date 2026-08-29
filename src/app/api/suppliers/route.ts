import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccountAccess, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;

  const search = searchParams.get("search") || undefined;

  const suppliers = await prisma.supplier.findMany({
    where: { accountId, ...(search ? { name: { contains: search } } : {}) },
    include: {
      _count: { select: { transactions: { where: { deletedAt: null } } } },
      transactions: {
        where: { deletedAt: null, type: "EXPENSE" },
        select: { amount: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const withTotals = suppliers.map((s) => ({
    ...s,
    totalSpent: s.transactions.reduce((sum, t) => sum + Number(t.amount), 0),
  }));

  return successResponse(withTotals);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const accountId = body.accountId;
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;
  const session = auth.session!;

  try {
    const { name, document, phone, email, address, bankData, notes } = body;
    if (!name) return errorResponse("Nome é obrigatório");

    const supplier = await prisma.supplier.create({
      data: { accountId, name, document, phone, email, address, bankData, notes },
    });

    await createAuditLog({
      userId: session.userId,
      accountId,
      action: "CREATE",
      entity: "SUPPLIER",
      entityId: supplier.id,
      details: `Fornecedor "${name}" criado`,
    });

    return successResponse(supplier, 201);
  } catch (error) {
    return errorResponse("Erro ao criar fornecedor", 500);
  }
}