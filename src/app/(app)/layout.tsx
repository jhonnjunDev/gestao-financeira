import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/jwt";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      accounts: {
        where: { account: { archived: false } },
        include: { account: true },
      },
    },
  });

  if (!user) redirect("/login");

  // Determina contas acessíveis
  let accessibleAccounts = user.accounts.map((ua) => ua.account);
  if (user.role === "ADMIN") {
    const all = await prisma.account.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
    });
    accessibleAccounts = all;
  }

  // Se não houver contas, cria uma padrão automaticamente
  if (accessibleAccounts.length === 0) {
    const acc = await prisma.account.create({
      data: {
        name: "Conta Principal",
        type: "Geral",
        responsible: user.name,
      },
    });
    await prisma.userAccount.create({
      data: { userId: user.id, accountId: acc.id, role: user.role },
    });
    accessibleAccounts = [acc];
  }

  // Calcula saldo de cada conta
  const accountsWithBalance = await Promise.all(
    accessibleAccounts.map(async (acc) => {
      const agg = await prisma.transaction.aggregate({
        where: {
          accountId: acc.id,
          deletedAt: null,
          status: { not: "CANCELED" },
          type: { in: ["INCOME", "EXPENSE"] },
        },
        _sum: { amount: true },
      });
      const income = await prisma.transaction.aggregate({
        where: { accountId: acc.id, deletedAt: null, type: "INCOME", status: { not: "CANCELED" } },
        _sum: { amount: true },
      });
      const expense = await prisma.transaction.aggregate({
        where: { accountId: acc.id, deletedAt: null, type: "EXPENSE", status: { not: "CANCELED" } },
        _sum: { amount: true },
      });
      const incomeVal = Number(income._sum.amount || 0);
      const expenseVal = Number(expense._sum.amount || 0);
      const balance = Number(acc.initialBalance || 0) + incomeVal - expenseVal;
      return { ...acc, balance };
    })
  );

  const cookieStore = cookies();
  const currentAccountId = cookieStore.get("current_account")?.value;

  let currentAccount = accountsWithBalance.find((a) => a.id === currentAccountId);
  if (!currentAccount && accountsWithBalance.length > 0) {
    currentAccount = accountsWithBalance[0];
  }
  if (!currentAccount) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <div className="flex items-center lg:hidden">
          <MobileMenu />
        </div>
        <Topbar
          accounts={accountsWithBalance}
          currentAccountId={currentAccount.id}
          userName={user.name}
          userRole={user.role}
        />
        <main className="p-4 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}