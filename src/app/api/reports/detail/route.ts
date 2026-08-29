import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccountAccess, successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;

  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const dateFilter = startDate && endDate
    ? { gte: new Date(startDate), lte: new Date(endDate + "T23:59:59") }
    : undefined;

  const baseWhere: any = { accountId, deletedAt: null, status: { not: "CANCELED" }, ...(dateFilter ? { date: dateFilter } : {}) };

  const [incomeAgg, expenseAgg, byCategory, bySupplier, byCostCenter, budgets, pendingIncomeAgg, pendingExpenseAgg, account] = await Promise.all([
    prisma.transaction.aggregate({ where: { ...baseWhere, type: "INCOME" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...baseWhere, type: "EXPENSE" }, _sum: { amount: true } }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { ...baseWhere, type: "EXPENSE" },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.transaction.groupBy({
      by: ["supplierId"],
      where: { ...baseWhere, type: "EXPENSE", supplierId: { not: null } },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    }),
    prisma.transaction.groupBy({
      by: ["costCenterId"],
      where: { ...baseWhere, type: "EXPENSE", costCenterId: { not: null } },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.budget.findMany({
      where: { accountId, year: new Date().getFullYear() },
      include: { category: true },
    }),
    prisma.transaction.aggregate({ where: { accountId, deletedAt: null, type: "INCOME", status: "PENDING" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { accountId, deletedAt: null, type: "EXPENSE", status: "PENDING" }, _sum: { amount: true } }),
    prisma.account.findUnique({ where: { id: accountId } }),
  ]);

  const totalIncome = Number(incomeAgg._sum.amount || 0);
  const totalExpense = Number(expenseAgg._sum.amount || 0);

  const catIds = byCategory.map((c) => c.categoryId).filter(Boolean) as string[];
  const categories = catIds.length ? await prisma.category.findMany({ where: { id: { in: catIds } } }) : [];
  const supplierIds = bySupplier.map((s) => s.supplierId).filter(Boolean) as string[];
  const suppliers = supplierIds.length ? await prisma.supplier.findMany({ where: { id: { in: supplierIds } } }) : [];
  const ccIds = byCostCenter.map((c) => c.costCenterId).filter(Boolean) as string[];
  const costCenters = ccIds.length ? await prisma.costCenter.findMany({ where: { id: { in: ccIds } } }) : [];

  // Agrupar categorias com subcategorias no nome do pai
  const byCategoryResolved = byCategory.map((c) => ({
    name: categories.find((cat) => cat.id === c.categoryId)?.name || "Sem categoria",
    income: 0,
    expense: Number(c._sum.amount || 0),
    result: -Number(c._sum.amount || 0),
  }));

  const budgetsResolved = await Promise.all(
    budgets.map(async (b) => {
      let realized = 0;
      if (b.categoryId) {
        const agg = await prisma.transaction.aggregate({
          where: { ...baseWhere, categoryId: b.categoryId },
          _sum: { amount: true },
        });
        realized = Number(agg._sum.amount || 0);
      }
      return {
        name: b.category?.name || "Geral",
        planned: Number(b.amount),
        realized,
        pct: Number(b.amount) > 0 ? (realized / Number(b.amount)) * 100 : 0,
      };
    })
  );

  const initialBalance = Number(account?.initialBalance || 0);

  // Evolução mensal
  const transactions = await prisma.transaction.findMany({
    where: baseWhere,
    select: { date: true, type: true, amount: true },
  });
  const monthlyMap: Record<string, { label: string; income: number; expense: number }> = {};
  transactions.forEach((t) => {
    const d = new Date(t.date);
    const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
    if (!monthlyMap[key]) monthlyMap[key] = { label: key, income: 0, expense: 0 };
    if (t.type === "INCOME") monthlyMap[key].income += Number(t.amount);
    else if (t.type === "EXPENSE") monthlyMap[key].expense += Number(t.amount);
  });
  const monthly = Object.values(monthlyMap).sort((a, b) => {
    const [am, ay] = a.label.split("/");
    const [bm, by] = b.label.split("/");
    return Number(ay) - Number(by) || Number(am) - Number(bm);
  });

  return successResponse({
    totalIncome,
    totalExpense,
    result: totalIncome - totalExpense,
    initialBalance,
    balance: initialBalance + totalIncome - totalExpense,
    pendingIncome: Number(pendingIncomeAgg._sum.amount || 0),
    pendingExpense: Number(pendingExpenseAgg._sum.amount || 0),
    byCategory: byCategoryResolved,
    bySupplier: bySupplier.map((s) => ({
      name: suppliers.find((sup) => sup.id === s.supplierId)?.name || "Removido",
      amount: Number(s._sum.amount || 0),
      count: s._count.id,
    })),
    byCostCenter: byCostCenter.map((c) => ({
      name: costCenters.find((cc) => cc.id === c.costCenterId)?.name || "Removido",
      amount: Number(c._sum.amount || 0),
      count: c._count.id,
    })),
    budgets: budgetsResolved,
    monthly,
  });
}