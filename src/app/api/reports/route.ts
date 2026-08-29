import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccountAccess, successResponse, errorResponse, getDateRange } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;

  const period = searchParams.get("period") || "month";
  const { start, end } = getDateRange(period);
  const prevPeriod = period === "month" ? getDateRange("month") : { start: new Date(0), end: new Date(0) };
  const prevStart = new Date(prevPeriod.start.getFullYear(), prevPeriod.start.getMonth() - 1, 1);
  const prevEnd = new Date(prevPeriod.end.getFullYear(), prevPeriod.end.getMonth(), 0, 23, 59, 59);

  // Dados do período atual
  const [income, expense, pendingIncome, pendingExpense, account] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountId, deletedAt: null, type: "INCOME", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId, deletedAt: null, type: "INCOME", status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId, deletedAt: null, type: "EXPENSE", status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.account.findUnique({ where: { id: accountId } }),
  ]);

  // Período anterior
  const [prevIncome, prevExpense] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountId, deletedAt: null, type: "INCOME", date: { gte: prevStart, lte: prevEnd }, status: { not: "CANCELED" } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId, deletedAt: null, type: "EXPENSE", date: { gte: prevStart, lte: prevEnd }, status: { not: "CANCELED" } },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = Number(income._sum.amount || 0);
  const totalExpense = Number(expense._sum.amount || 0);
  const prevIncomeVal = Number(prevIncome._sum.amount || 0);
  const prevExpenseVal = Number(prevExpense._sum.amount || 0);
  const initialBalance = Number(account?.initialBalance || 0);

  // Evolução mensal (últimos 12 meses)
  const now = new Date();
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const [min, mex] = await Promise.all([
      prisma.transaction.aggregate({
        where: { accountId, deletedAt: null, type: "INCOME", date: { gte: m, lte: me }, status: { not: "CANCELED" } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { accountId, deletedAt: null, type: "EXPENSE", date: { gte: m, lte: me }, status: { not: "CANCELED" } },
        _sum: { amount: true },
      }),
    ]);
    monthlyData.push({
      month: m.getMonth() + 1,
      year: m.getFullYear(),
      income: Number(min._sum.amount || 0),
      expense: Number(mex._sum.amount || 0),
    });
  }

  // Despesas por categoria
  const expensesByCategory = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { accountId, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
    _sum: { amount: true },
    _count: { id: true },
  });
  const categories = await prisma.category.findMany({
    where: { id: { in: expensesByCategory.map((e) => e.categoryId).filter(Boolean) as string[] } },
  });
  const expensesByCategoryResolved = expensesByCategory.map((e) => ({
    categoryId: e.categoryId,
    categoryName: categories.find((c) => c.id === e.categoryId)?.name || "Sem categoria",
    categoryColor: categories.find((c) => c.id === e.categoryId)?.color || "#64748b",
    amount: Number(e._sum.amount || 0),
    count: e._count.id,
  }));

  // Receitas por categoria
  const incomeByCategory = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { accountId, deletedAt: null, type: "INCOME", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
    _sum: { amount: true },
  });
  const incomeByCategoryResolved = incomeByCategory.map((e) => ({
    categoryId: e.categoryId,
    categoryName: categories.find((c) => c.id === e.categoryId)?.name || "Sem categoria",
    categoryColor: categories.find((c) => c.id === e.categoryId)?.color || "#64748b",
    amount: Number(e._sum.amount || 0),
  }));

  // Maiores despesas
  const topExpenses = await prisma.transaction.findMany({
    where: { accountId, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
    orderBy: { amount: "desc" },
    take: 10,
    include: { category: { select: { name: true } }, supplier: { select: { name: true } } },
  });

  // Top fornecedores
  const topSuppliers = await prisma.transaction.groupBy({
    by: ["supplierId"],
    where: { accountId, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end }, status: { not: "CANCELED" }, supplierId: { not: null } },
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 10,
  });
  const suppliers = await prisma.supplier.findMany({
    where: { id: { in: topSuppliers.map((s) => s.supplierId).filter(Boolean) as string[] } },
  });
  const topSuppliersResolved = topSuppliers.map((s) => ({
    supplierId: s.supplierId,
    supplierName: suppliers.find((sup) => sup.id === s.supplierId)?.name || "Removido",
    amount: Number(s._sum.amount || 0),
    count: s._count.id,
  }));

  return successResponse({
    overview: {
      totalIncome,
      totalExpense,
      balance: initialBalance + totalIncome - totalExpense,
      result: totalIncome - totalExpense,
      pendingIncome: Number(pendingIncome._sum.amount || 0),
      pendingExpense: Number(pendingExpense._sum.amount || 0),
      initialBalance,
    },
    trends: {
      incomeTrend: prevIncomeVal > 0 ? ((totalIncome - prevIncomeVal) / prevIncomeVal) * 100 : 0,
      expenseTrend: prevExpenseVal > 0 ? ((totalExpense - prevExpenseVal) / prevExpenseVal) * 100 : 0,
    },
    monthlyData,
    expensesByCategory: expensesByCategoryResolved,
    incomeByCategory: incomeByCategoryResolved,
    topExpenses: topExpenses.map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      date: t.date,
      category: t.category?.name,
      supplier: t.supplier?.name,
    })),
    topSuppliers: topSuppliersResolved,
  });
}