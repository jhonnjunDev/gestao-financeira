import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { MarkAsPaidButton } from "@/components/transactions/MarkAsPaidButton";

export const dynamic = "force-dynamic";

export default async function ContasAPagarPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  const pending = await prisma.transaction.findMany({
    where: { accountId: account.id, type: "EXPENSE", status: { in: ["PENDING", "LATE"] }, deletedAt: null },
    include: { supplier: true, category: true },
    orderBy: [{ dueDate: "asc" }, { date: "asc" }],
    take: 50,
  });

  const total = pending.reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas a pagar</h1>
          <p className="text-sm text-gray-500">{pending.length} contas pendentes · Total: {formatCurrency(total)}</p>
        </div>
        <a href="/movimentacoes" className="btn-primary">Nova despesa</a>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Vencimento</th>
                <th className="table-header">Descrição</th>
                <th className="table-header">Fornecedor</th>
                <th className="table-header">Categoria</th>
                <th className="table-header">Dias</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Valor</th>
                <th className="table-header text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Nenhuma conta pendente</td></tr>
              ) : (
                pending.map((t) => {
                  const dd = t.dueDate ? daysUntil(t.dueDate) : null;
                  const late = dd !== null && dd < 0;
                  return (
                    <tr key={t.id} className={`hover:bg-gray-50 ${late ? "bg-red-50" : ""}`}>
                      <td className="table-cell whitespace-nowrap font-medium">{t.dueDate ? formatDate(t.dueDate) : "-"}</td>
                      <td className="table-cell font-medium text-gray-900">{t.description}</td>
                      <td className="table-cell">{t.supplier?.name || "-"}</td>
                      <td className="table-cell">{t.category?.name || "-"}</td>
                      <td className="table-cell">
                        <span className={`font-medium ${late ? "text-red-600" : dd !== null && dd <= 3 ? "text-amber-600" : "text-gray-500"}`}>
                          {dd !== null ? (dd === 0 ? "Hoje" : late ? `${Math.abs(dd)} dias atrasado` : `${dd} dias`) : "-"}
                        </span>
                      </td>
                      <td className="table-cell">
                        <Badge variant={late ? "danger" : "warning"}>{late ? "Atrasado" : "Pendente"}</Badge>
                      </td>
                      <td className="table-cell text-right font-semibold text-red-600">{formatCurrency(t.amount)}</td>
                      <td className="table-cell text-right">
                        <MarkAsPaidButton transactionId={t.id} status={t.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}