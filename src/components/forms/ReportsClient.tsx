"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, FileDown, FileText, Calendar, TrendingUp, TrendingDown, Scale, PieChart, Truck, FolderKanban, PiggyBank, FileCheck, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Select, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/format";

interface ReportData {
  totalIncome: number;
  totalExpense: number;
  result: number;
  initialBalance: number;
  balance: number;
  byCategory: { name: string; income: number; expense: number; result: number }[];
  bySupplier: { name: string; amount: number; count: number }[];
  byCostCenter: { name: string; amount: number; count: number }[];
  monthly: { label: string; income: number; expense: number }[];
  budgets: { name: string; planned: number; realized: number; pct: number }[];
  pendingIncome: number;
  pendingExpense: number;
}

export default function ReportsClient({ accountId, accountName }: { accountId: string; accountName: string }) {
  const router = useRouter();
  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingExcel, setGeneratingExcel] = useState(false);

  async function load() {
    setLoading(true);
    try {
      let start = "";
      let end = "";
      const now = new Date();
      if (period === "custom") {
        start = customStart;
        end = customEnd;
      } else {
        end = now.toISOString().slice(0, 10);
        if (period === "month") start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        else if (period === "quarter") start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().slice(0, 10);
        else if (period === "semester") start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 6) * 6, 1).toISOString().slice(0, 10);
        else start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      }
      const res = await fetch(`/gestao/api/reports/detail?accountId=${accountId}&startDate=${start}&endDate=${end}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [period, accountId]);

  function exportExcel() {
    const now = new Date();
    let start = customStart, end = customEnd;
    if (period !== "custom") {
      end = now.toISOString().slice(0, 10);
      if (period === "month") start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      else if (period === "quarter") start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().slice(0, 10);
      else if (period === "semester") start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 6) * 6, 1).toISOString().slice(0, 10);
      else start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    }
    window.open(`/api/export/excel?accountId=${accountId}&startDate=${start}&endDate=${end}`, "_blank");
  }

  const reportCards = [
    { icon: TrendingUp, label: "Demonstrativo financeiro", desc: "Visão completa de receitas e despesas", type: "demonstrativo", color: "text-emerald-600 bg-emerald-50" },
    { icon: Wallet, label: "Fluxo de caixa", desc: "Entradas e saídas por período", type: "fluxo", color: "text-brand-600 bg-brand-50" },
    { icon: TrendingUp, label: "Receitas", desc: "Todas as receitas do período", type: "receitas", color: "text-emerald-600 bg-emerald-50" },
    { icon: TrendingDown, label: "Despesas", desc: "Todas as despesas do período", type: "despesas", color: "text-red-600 bg-red-50" },
    { icon: Scale, label: "Resultado por período", desc: "Lucro ou prejuízo acumulado", type: "resultado", color: "text-violet-600 bg-violet-50" },
    { icon: PieChart, label: "Gastos por categoria", desc: "Distribuição percentual", type: "categoria", color: "text-amber-600 bg-amber-50" },
    { icon: Truck, label: "Gastos por fornecedor", desc: "Ranking de fornecedores", type: "fornecedor", color: "text-blue-600 bg-blue-50" },
    { icon: FolderKanban, label: "Gastos por centro de custo", desc: "Análise por unidade", type: "custo", color: "text-pink-600 bg-pink-50" },
    { icon: PiggyBank, label: "Orçamento x realizado", desc: "Acompanhamento do orçamento", type: "orcamento", color: "text-cyan-600 bg-cyan-50" },
    { icon: FileCheck, label: "Prestação de contas", desc: "Documento oficial pronto", type: "prestacao", color: "text-gray-700 bg-gray-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500">Central de relatórios e exportações — {accountName}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: "month", label: "Mês atual" },
              { value: "quarter", label: "Trimestre" },
              { value: "semester", label: "Semestre" },
              { value: "year", label: "Ano" },
              { value: "custom", label: "Personalizado" },
            ]}
            className="w-44"
          />
          {period === "custom" && (
            <>
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-36" />
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-36" />
              <Button variant="secondary" onClick={load}>Aplicar</Button>
            </>
          )}
          <Button onClick={exportExcel}>
            <FileDown className="w-4 h-4" /> GERAR EXCEL PROFISSIONAL
          </Button>
        </div>
      </div>

      {/* Cards de relatórios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {reportCards.map((r) => (
          <button
            key={r.type}
            onClick={() => {
              if (r.type === "prestacao") router.push("/prestacao-de-contas");
            }}
            className={`card card-hover p-5 text-left ${r.type === "prestacao" ? "" : "cursor-default"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${r.color}`}>
              <r.icon className="w-5 h-5" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">{r.label}</p>
            <p className="text-xs text-gray-400 mt-1">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Resumo executivo */}
      {loading ? (
        <Card><div className="py-12 text-center text-gray-400">Carregando...</div></Card>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Receitas", value: data.totalIncome, color: "text-emerald-600" },
              { label: "Despesas", value: data.totalExpense, color: "text-red-600" },
              { label: "Resultado", value: data.result, color: data.result >= 0 ? "text-emerald-600" : "text-red-600" },
              { label: "Saldo Final", value: data.balance, color: data.balance >= 0 ? "text-emerald-600" : "text-red-600" },
            ].map((item) => (
              <Card key={item.label} className="!p-4">
                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                <p className={`text-xl font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
              </Card>
            ))}
          </div>

          {data.byCategory.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4" /> Gastos por categoria
              </h3>
              <div className="space-y-3">
                {data.byCategory.map((c) => {
                  const max = Math.max(...data.byCategory.map((x) => x.expense), 1);
                  return (
                    <div key={c.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 font-medium">{c.name}</span>
                        <span className="text-gray-500">{formatCurrency(c.expense)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(c.expense / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {data.bySupplier.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Ranking de fornecedores
              </h3>
              <div className="space-y-2">
                {data.bySupplier.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{s.name}</span>
                      <span className="text-xs text-gray-400">{s.count} transações</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(s.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {data.budgets.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PiggyBank className="w-4 h-4" /> Orçamento x realizado
              </h3>
              <div className="space-y-4">
                {data.budgets.map((b) => (
                  <div key={b.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{b.name}</span>
                      <span className="text-gray-500">{formatCurrency(b.realized)} / {formatCurrency(b.planned)}</span>
                    </div>
                    <ProgressBar value={b.realized} max={b.planned || 1} size="sm" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : null}

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Exportação para Excel</h3>
            <p className="text-sm text-gray-500 mt-1">
              Workbook profissional com 10 abas: Dashboard executivo com gráficos, resumo financeiro, lançamentos com tabela oficial,
              receitas, despesas, categorias, fornecedores, orçamento com formatação condicional, fluxo de caixa e prestação de contas.
            </p>
          </div>
          <Button onClick={exportExcel} className="shrink-0">
            <FileDown className="w-4 h-4" /> GERAR EXCEL PROFISSIONAL
          </Button>
        </div>
      </Card>
    </div>
  );
}