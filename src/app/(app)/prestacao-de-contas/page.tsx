import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import { FileDown, FileText, Printer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PrestacaoDeContasPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [transactions, prevBalanceAgg] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        accountId: account.id,
        deletedAt: null,
        status: { not: "CANCELED" },
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { category: true, supplier: true },
      orderBy: { date: "asc" },
    }),
    prisma.transaction.aggregate({
      where: {
        accountId: account.id,
        deletedAt: null,
        status: { not: "CANCELED" },
        date: { lt: startOfMonth },
        type: { in: ["INCOME", "EXPENSE"] },
      },
      _sum: { amount: true },
    }),
  ]);

  const income = transactions.filter((t) => t.type === "INCOME");
  const expense = transactions.filter((t) => t.type === "EXPENSE");
  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = expense.reduce((s, t) => s + Number(t.amount), 0);
  const initialBalance = Number(account.initialBalance || 0) + Number(prevBalanceAgg._sum.amount || 0);
  const finalBalance = initialBalance + totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prestação de Contas</h1>
          <p className="text-sm text-gray-500">Documento profissional pronto para apresentação e impressão</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/export/excel?accountId=${account.id}&startDate=${startOfMonth.toISOString().slice(0, 10)}&endDate=${endOfMonth.toISOString().slice(0, 10)}`}
            className="btn-primary"
          >
            <FileDown className="w-4 h-4" /> Baixar Excel
          </a>
          <a
            href={`/api/export/pdf?accountId=${account.id}`}
            className="btn-secondary"
          >
            <FileText className="w-4 h-4" /> Baixar PDF
          </a>
        </div>
      </div>

      {/* Documento */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-4xl mx-auto overflow-hidden print-area">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">PRESTAÇÃO DE CONTAS</h2>
              <p className="text-gray-300 text-sm">Documento oficial de prestação de contas</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-gray-300">Emitido em</p>
              <p className="font-medium">{new Date().toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
        </div>

        {/* Identificação */}
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Conta</p>
            <p className="font-semibold text-gray-900">{account.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Responsável</p>
            <p className="font-semibold text-gray-900">{account.responsible || session.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Período</p>
            <p className="font-semibold text-gray-900">{formatMonthYear(now)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Tipo de conta</p>
            <p className="font-semibold text-gray-900">{account.type}</p>
          </div>
        </div>

        {/* Resumo */}
        <div className="p-8 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Resumo Financeiro</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Saldo Inicial", value: formatCurrency(initialBalance), color: "text-gray-700" },
              { label: "Receitas", value: formatCurrency(totalIncome), color: "text-emerald-600" },
              { label: "Despesas", value: formatCurrency(totalExpense), color: "text-red-600" },
              { label: "Saldo Final", value: formatCurrency(finalBalance), color: finalBalance >= 0 ? "text-emerald-600" : "text-red-600" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Receitas */}
        <div className="p-8 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Relação de Receitas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-500">Data</th>
                  <th className="text-left py-2 font-medium text-gray-500">Descrição</th>
                  <th className="text-left py-2 font-medium text-gray-500">Origem</th>
                  <th className="text-right py-2 font-medium text-gray-500">Valor</th>
                </tr>
              </thead>
              <tbody>
                {income.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-2">{formatDate(t.date)}</td>
                    <td className="py-2">{t.description}</td>
                    <td className="py-2">{t.supplier?.name || "-"}</td>
                    <td className="py-2 text-right font-medium text-emerald-600">{formatCurrency(t.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-50">
                  <td colSpan={3} className="py-2 font-bold text-emerald-800">Total de receitas</td>
                  <td className="py-2 text-right font-bold text-emerald-800">{formatCurrency(totalIncome)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Despesas */}
        <div className="p-8 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Relação de Despesas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-500">Data</th>
                  <th className="text-left py-2 font-medium text-gray-500">Descrição</th>
                  <th className="text-left py-2 font-medium text-gray-500">Categoria</th>
                  <th className="text-left py-2 font-medium text-gray-500">Fornecedor</th>
                  <th className="text-right py-2 font-medium text-gray-500">Valor</th>
                </tr>
              </thead>
              <tbody>
                {expense.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-2">{formatDate(t.date)}</td>
                    <td className="py-2">{t.description}</td>
                    <td className="py-2">{t.category?.name || "-"}</td>
                    <td className="py-2">{t.supplier?.name || "-"}</td>
                    <td className="py-2 text-right font-medium text-red-600">{formatCurrency(t.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-red-50">
                  <td colSpan={4} className="py-2 font-bold text-red-800">Total de despesas</td>
                  <td className="py-2 text-right font-bold text-red-800">{formatCurrency(totalExpense)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Assinatura */}
        <div className="p-8">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-500 mb-8">
              Declaro que as informações acima são verdadeiras e refletem a movimentação financeira da conta no período.
            </p>
            <div className="max-w-xs mx-auto border-t-2 border-gray-400 pt-2">
              <p className="font-semibold text-gray-900">{account.responsible || session.name}</p>
              <p className="text-sm text-gray-500">Responsável</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}