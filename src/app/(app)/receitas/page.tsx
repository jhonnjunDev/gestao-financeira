import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, STATUS_MAP } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReceitasPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  const receipts = await prisma.transaction.findMany({
    where: { accountId: account.id, type: "INCOME", deletedAt: null },
    include: { category: true, supplier: true },
    orderBy: { date: "desc" },
    take: 100,
  });

  const total = receipts.reduce((s, t) => s + Number(t.amount), 0);
  const pending = receipts.filter((t) => t.status === "PENDING").reduce((s, t) => s + Number(t.amount), 0);

  const sb = (s: string) => STATUS_MAP[s as keyof typeof STATUS_MAP] || STATUS_MAP.PENDING;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receitas</h1>
          <p className="text-sm text-gray-500">{receipts.length} registros · Total: {formatCurrency(total)} · Pendente: {formatCurrency(pending)}</p>
        </div>
        <a href="/movimentacoes" className="btn-primary">
          <Plus className="w-4 h-4" /> Nova receita
        </a>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Data</th>
                <th className="table-header">Descrição</th>
                <th className="table-header">Categoria</th>
                <th className="table-header">Origem</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => {
                const s = sb(r.status);
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="table-cell whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="table-cell font-medium text-gray-900">{r.description}</td>
                    <td className="table-cell">{r.category?.name || "-"}</td>
                    <td className="table-cell">{r.supplier?.name || "-"}</td>
                    <td className="table-cell"><Badge variant={s.label === "Recebido" ? "success" : "warning"}>{s.label}</Badge></td>
                    <td className="table-cell text-right font-semibold text-emerald-600">{formatCurrency(r.amount)}</td>
                  </tr>
                );
              })}
              {receipts.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhuma receita registrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}