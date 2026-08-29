import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountIdsParam = searchParams.get("accountIds");
  if (!accountIdsParam) return errorResponse("Contas são obrigatórias");

  const accountIds = accountIdsParam.split(",").filter(Boolean);
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [accounts, incomeAgg, expenseAgg, byCategoryRaw] = await Promise.all([
      prisma.account.findMany({
        where: { id: { in: accountIds }, archived: false },
      }),
      prisma.transaction.aggregate({
        where: { accountId: { in: accountIds }, deletedAt: null, type: "INCOME", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { accountId: { in: accountIds }, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["categoryId", "accountId"],
        where: { accountId: { in: accountIds }, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount || 0);
    const totalExpense = Number(expenseAgg._sum.amount || 0);

    // Saldo e totais por conta
    const accountsWithData = await Promise.all(
      accounts.map(async (acc) => {
        const [inc, exp, balance] = await Promise.all([
          prisma.transaction.aggregate({
            where: { accountId: acc.id, deletedAt: null, type: "INCOME", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { accountId: acc.id, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { accountId: acc.id, deletedAt: null, type: { in: ["INCOME", "EXPENSE"] }, status: { not: "CANCELED" } },
            _sum: { amount: true },
          }),
        ]);
        const income = Number(inc._sum.amount || 0);
        const expense = Number(exp._sum.amount || 0);
        const net = Number(balance._sum.amount || 0);
        return {
          id: acc.id,
          name: acc.name,
          icon: acc.icon,
          color: acc.color,
          income,
          expense,
          result: income - expense,
          balance: Number(acc.initialBalance || 0) + net,
        };
      })
    );

    // Categorias
    const catIds = byCategoryRaw.map((c) => c.categoryId).filter(Boolean) as string[];
    const categories = catIds.length ? await prisma.category.findMany({ where: { id: { in: catIds } } }) : [];
    const catMap: Record<string, { name: string; color: string; amount: number }> = {};
    byCategoryRaw.forEach((c) => {
      if (!c.categoryId) return;
      const cat = categories.find((x) => x.id === c.categoryId);
      const name = cat?.name || "Sem categoria";
      if (!catMap[name]) catMap[name] = { name, color: cat?.color || "#64748b", amount: 0 };
      catMap[name].amount += Number(c._sum.amount || 0);
    });

    const totalBalance = accountsWithData.reduce((s, a) => s + a.balance, 0);

    return successResponse({
      totalIncome,
      totalExpense,
      totalBalance,
      accounts: accountsWithData,
      byCategory: Object.values(catMap).sort((a, b) => b.amount - a.amount),
    });
  } catch (error) {
    console.error(error);
    return errorResponse("Erro ao consolidar contas", 500);
  }
}