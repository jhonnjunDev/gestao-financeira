import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const session = auth.session!;

  const searchParams = new URL(request.url).searchParams;
  const includeArchived = searchParams.get("archived") === "true";

  let accounts;
  if (session.role === "ADMIN") {
    accounts = await prisma.account.findMany({
      where: { archived: includeArchived ? undefined : false },
      orderBy: { name: "asc" },
    });
  } else {
    accounts = await prisma.account.findMany({
      where: {
        archived: includeArchived ? undefined : false,
        userAccounts: { some: { userId: session.userId } },
      },
      orderBy: { name: "asc" },
    });
  }

  // Calcular saldos
  const withBalance = await Promise.all(
    accounts.map(async (acc) => {
      const income = await prisma.transaction.aggregate({
        where: { accountId: acc.id, deletedAt: null, type: "INCOME", status: { not: "CANCELED" } },
        _sum: { amount: true },
      });
      const expense = await prisma.transaction.aggregate({
        where: { accountId: acc.id, deletedAt: null, type: "EXPENSE", status: { not: "CANCELED" } },
        _sum: { amount: true },
      });
      const balance = Number(acc.initialBalance || 0) + Number(income._sum.amount || 0) - Number(expense._sum.amount || 0);
      return { ...acc, balance };
    })
  );

  return successResponse(withBalance);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const session = auth.session!;

  if (!["ADMIN", "GESTOR"].includes(session.role)) {
    return errorResponse("Permissão negada", 403);
  }

  try {
    const body = await request.json();
    const { name, type, color, icon, description, responsible, initialBalance } = body;

    if (!name) return errorResponse("Nome da conta é obrigatório");

    const account = await prisma.account.create({
      data: {
        name,
        type: type || "Geral",
        color: color || "#2563eb",
        icon: icon || "🏢",
        description,
        responsible,
        initialBalance: initialBalance || 0,
      },
    });

    // Vincular ao usuário criador
    await prisma.userAccount.create({
      data: { userId: session.userId, accountId: account.id, role: "ADMIN" },
    });

    await createAuditLog({
      userId: session.userId,
      accountId: account.id,
      action: "CREATE",
      entity: "ACCOUNT",
      entityId: account.id,
      details: `Conta "${name}" criada`,
    });

    return successResponse(account, 201);
  } catch (error: any) {
    console.error(error);
    return errorResponse("Erro ao criar conta", 500);
  }
}