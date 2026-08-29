import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/jwt";
import { getDateRange } from "@/lib/utils";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = cookies();
  const accountId = cookieStore.get("current_account")?.value;

  let account = null;
  if (accountId) {
    account = await prisma.account.findFirst({
      where: { id: accountId, archived: false },
    });
  }

  if (!account) {
    // Pega a primeira conta acessível
    if (session.role === "ADMIN") {
      account = await prisma.account.findFirst({ where: { archived: false } });
    } else {
      account = await prisma.account.findFirst({
        where: { archived: false, userAccounts: { some: { userId: session.userId } } },
      });
    }
  }

  if (!account) {
    redirect("/configuracoes?setup=1");
  }

  // Busca os dados agregados (replicando a lógica do /api/reports para renderização no servidor)
  const { start, end } = getDateRange("month");

  const [income, expense, pendingIncome, pendingExpense] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountId: account.id, deletedAt: null, type: "INCOME", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId: account.id, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId: account.id, deletedAt: null, type: "INCOME", status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId: account.id, deletedAt: null, type: "EXPENSE", status: "PENDING" },
      _sum: { amount: true },
    }),
  ]);

  const now = new Date();
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const [min, mex] = await Promise.all([
      prisma.transaction.aggregate({
        where: { accountId: account.id, deletedAt: null, type: "INCOME", date: { gte: m, lte: me }, status: { not: "CANCELED" } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { accountId: account.id, deletedAt: null, type: "EXPENSE", date: { gte: m, lte: me }, status: { not: "CANCELED" } },
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

  const expensesByCategoryRaw = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { accountId: account.id, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
    _sum: { amount: true },
    _count: { id: true },
  });
  const catIds = expensesByCategoryRaw.map((e) => e.categoryId).filter(Boolean) as string[];
  const categories = catIds.length
    ? await prisma.category.findMany({ where: { id: { in: catIds } } })
    : [];
  const expensesByCategory = expensesByCategoryRaw.map((e) => ({
    categoryId: e.categoryId,
    categoryName: categories.find((c) => c.id === e.categoryId)?.name || "Sem categoria",
    categoryColor: categories.find((c) => c.id === e.categoryId)?.color || "#64748b",
    amount: Number(e._sum.amount || 0),
    count: e._count.id,
  }));

  const incomeByCategoryRaw = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { accountId: account.id, deletedAt: null, type: "INCOME", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
    _sum: { amount: true },
  });
  const incomeByCategory = incomeByCategoryRaw.map((e) => ({
    categoryId: e.categoryId,
    categoryName: categories.find((c) => c.id === e.categoryId)?.name || "Sem categoria",
    categoryColor: categories.find((c) => c.id === e.categoryId)?.color || "#64748b",
    amount: Number(e._sum.amount || 0),
  }));

  const topExpenses = await prisma.transaction.findMany({
    where: { accountId: account.id, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end }, status: { not: "CANCELED" } },
    orderBy: { amount: "desc" },
    take: 10,
    include: { category: { select: { name: true } }, supplier: { select: { name: true } } },
  });

  const topSuppliersRaw = await prisma.transaction.groupBy({
    by: ["supplierId"],
    where: { accountId: account.id, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end }, status: { not: "CANCELED" }, supplierId: { not: null } },
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 10,
  });
  const supplierIds = topSuppliersRaw.map((s) => s.supplierId).filter(Boolean) as string[];
  const suppliers = supplierIds.length ? await prisma.supplier.findMany({ where: { id: { in: supplierIds } } }) : [];
  const topSuppliers = topSuppliersRaw.map((s) => ({
    supplierId: s.supplierId,
    supplierName: suppliers.find((sup) => sup.id === s.supplierId)?.name || "Removido",
    amount: Number(s._sum.amount || 0),
    count: s._count.id,
  }));

  const totalIncome = Number(income._sum.amount || 0);
  const totalExpense = Number(expense._sum.amount || 0);
  const initialBalance = Number(account.initialBalance || 0);

  const initialData = {
    overview: {
      totalIncome,
      totalExpense,
      balance: initialBalance + totalIncome - totalExpense,
      result: totalIncome - totalExpense,
      pendingIncome: Number(pendingIncome._sum.amount || 0),
      pendingExpense: Number(pendingExpense._sum.amount || 0),
      initialBalance,
    },
    trends: { incomeTrend: 0, expenseTrend: 0 },
    monthlyData,
    expensesByCategory,
    incomeByCategory,
    topExpenses: topExpenses.map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      date: t.date.toISOString(),
      category: t.category?.name,
      supplier: t.supplier?.name,
    })),
    topSuppliers,
  };

  return (
    <DashboardClient
      accountId={account.id}
      accountName={account.name}
      initialData={initialData as any}
    />
  );
}