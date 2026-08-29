"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, TrendingUp, TrendingDown, Scale, Wallet } from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatPercent } from "@/lib/format";
import { DonutChart } from "@/components/dashboard/Charts";

interface ConsolidatedData {
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  accounts: {
    id: string;
    name: string;
    icon: string;
    color: string;
    income: number;
    expense: number;
    balance: number;
    result: number;
  }[];
  byCategory: { name: string; amount: number; color: string }[];
}

export default function ConsolidatedClient({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([accountId]);
  const [data, setData] = useState<ConsolidatedData | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadAccounts() {
    const res = await fetch("/gestao/api/accounts");
    const json = await res.json();
    if (json.success) setAccounts(json.data);
  }

  async function loadData() {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/gestao/api/consolidated?accountIds=${selected.join(",")}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { loadData(); }, [selected]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Layers className="w-6 h-6 text-brand-600" /> Visão Consolidada
        </h1>
        <p className="text-sm text-gray-500">Compare e consolide dados de múltiplas contas sem alterar registros originais</p>
      </div>

      <Card>
        <p className="text-sm font-medium text-gray-700 mb-3">Selecione as contas:</p>
        <div className="flex flex-wrap gap-3">
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => toggle(a.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                selected.includes(a.id)
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input type="checkbox" checked={selected.includes(a.id)} readOnly className="w-4 h-4 rounded" />
              <span>{a.icon}</span>
              <span className="text-sm font-medium text-gray-900">{a.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <Card><div className="py-12 text-center text-gray-400">Carregando...</div></Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Receitas consolidadas" value={formatCurrency(data.totalIncome)} icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
            <StatCard title="Despesas consolidadas" value={formatCurrency(data.totalExpense)} icon={<TrendingDown className="w-5 h-5" />} color="red" />
            <StatCard title="Resultado consolidado" value={formatCurrency(data.totalIncome - data.totalExpense)} icon={<Scale className="w-5 h-5" />} color={data.totalIncome - data.totalExpense >= 0 ? "emerald" : "red"} />
            <StatCard title="Saldo total" value={formatCurrency(data.totalBalance)} icon={<Wallet className="w-5 h-5" />} color="brand" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2" padding={false}>
              <div className="p-6 pb-0">
                <h3 className="font-semibold text-gray-900">Comparação entre contas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Conta</th>
                      <th className="table-header text-right">Receitas</th>
                      <th className="table-header text-right">Despesas</th>
                      <th className="table-header text-right">Resultado</th>
                      <th className="table-header text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accounts.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="table-cell">
                          <span className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: `${a.color}20` }}>{a.icon}</span>
                            <span className="font-medium text-gray-900">{a.name}</span>
                          </span>
                        </td>
                        <td className="table-cell text-right text-emerald-600 font-medium">{formatCurrency(a.income)}</td>
                        <td className="table-cell text-right text-red-600 font-medium">{formatCurrency(a.expense)}</td>
                        <td className={`table-cell text-right font-medium ${a.result >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(a.result)}</td>
                        <td className="table-cell text-right font-semibold">{formatCurrency(a.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Despesas consolidadas por categoria</h3>
              {data.byCategory.length > 0 ? (
                <DonutChart data={data.byCategory} />
              ) : (
                <p className="text-sm text-gray-400 py-10 text-center">Sem dados no período</p>
              )}
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <div className="py-12 text-center">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Selecione pelo menos uma conta para visualizar a consolidação</p>
          </div>
        </Card>
      )}
    </div>
  );
}