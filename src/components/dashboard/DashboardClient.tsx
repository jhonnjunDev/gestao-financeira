"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  PiggyBank,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import {
  IncomeExpenseBarChart,
  BalanceLineChart,
  DonutChart,
  BudgetRadialChart,
  HorizontalBar,
} from "@/components/dashboard/Charts";
import { Badge, ProgressBar } from "@/components/ui/Badge";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

interface DashboardData {
  overview: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    result: number;
    pendingIncome: number;
    pendingExpense: number;
    initialBalance: number;
  };
  trends: { incomeTrend: number; expenseTrend: number };
  monthlyData: { month: number; year: number; income: number; expense: number }[];
  expensesByCategory: { categoryId: string; categoryName: string; categoryColor: string; amount: number; count: number }[];
  incomeByCategory: { categoryId: string; categoryName: string; categoryColor: string; amount: number }[];
  topExpenses: { id: string; description: string; amount: number; date: string; category?: string; supplier?: string }[];
  topSuppliers: { supplierId: string; supplierName: string; amount: number; count: number }[];
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const PERIODS = [
  { value: "month", label: "Mês atual" },
  { value: "quarter", label: "Trimestre" },
  { value: "semester", label: "Semestre" },
  { value: "year", label: "Ano" },
];

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  PAID: { label: "Pago", variant: "success" },
  RECEIVED: { label: "Recebido", variant: "success" },
  PENDING: { label: "Pendente", variant: "warning" },
  LATE: { label: "Atrasado", variant: "danger" },
  CANCELED: { label: "Cancelado", variant: "default" },
};

export default function DashboardClient({ accountId, accountName, initialData }: { accountId: string; accountName: string; initialData: DashboardData }) {
  const router = useRouter();
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [showTransfers, setShowTransfers] = useState(false);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [quickForm, setQuickForm] = useState({
    type: "EXPENSE",
    description: "",
    amount: "",
    categoryId: "",
    status: "PAID",
    paymentMethod: "",
  });
  const [transferForm, setTransferForm] = useState({
    fromAccountId: accountId,
    toAccountId: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData(p: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?accountId=${accountId}&period=${p}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function loadExtras() {
    const [accRes, catRes, upRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch(`/api/categories?accountId=${accountId}`),
      fetch(`/api/transactions?accountId=${accountId}&status=PENDING&limit=10`),
    ]);
    const acc = await accRes.json();
    const cat = await catRes.json();
    const up = await upRes.json();
    if (acc.success) setAccounts(acc.data);
    if (cat.success) setCategories(cat.data);
    if (up.success) setUpcoming(up.data.transactions || []);
  }

  useEffect(() => {
    loadExtras();
  }, [accountId]);

  useEffect(() => {
    loadData(period);
  }, [period, accountId]);

  const monthly = data.monthlyData.map((m) => ({
    label: MONTH_NAMES[m.month - 1],
    income: m.income,
    expense: m.expense,
    balance: m.income - m.expense,
  }));

  const expCat = data.expensesByCategory.map((c) => ({
    name: c.categoryName,
    amount: c.amount,
    color: c.categoryColor,
  }));

  const incCat = data.incomeByCategory.map((c) => ({
    name: c.categoryName,
    amount: c.amount,
    color: c.categoryColor,
  }));

  async function saveQuick() {
    if (!quickForm.description || !quickForm.amount) {
      setError("Descrição e valor são obrigatórios");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          type: quickForm.type,
          description: quickForm.description,
          amount: parseFloat(quickForm.amount.replace(/\./g, "").replace(",", ".")),
          categoryId: quickForm.categoryId || null,
          status: quickForm.type === "INCOME" ? "RECEIVED" : "PAID",
          paymentMethod: quickForm.paymentMethod || null,
          date: new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erro ao salvar");
      setShowQuick(false);
      setQuickForm({ type: "EXPENSE", description: "", amount: "", categoryId: "", status: "PAID", paymentMethod: "" });
      router.refresh();
      loadData(period);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveTransfer() {
    if (!transferForm.toAccountId || !transferForm.amount) {
      setError("Conta de destino e valor são obrigatórios");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transferForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erro ao transferir");
      setShowTransfers(false);
      setTransferForm({ fromAccountId: accountId, toAccountId: "", amount: "", date: new Date().toISOString().slice(0, 10), description: "" });
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{accountName}</h1>
          <p className="text-sm text-gray-500">Painel financeiro do período selecionado</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={PERIODS}
            className="w-40"
          />
          <Button onClick={() => setShowQuick(true)}>
            <Plus className="w-4 h-4" /> Novo lançamento
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Saldo Atual"
          value={formatCurrency(data.overview.balance)}
          icon={<Wallet className="w-5 h-5" />}
          color="brand"
          subtitle={`Saldo inicial: ${formatCurrency(data.overview.initialBalance)}`}
        />
        <StatCard
          title="Receitas"
          value={formatCurrency(data.overview.totalIncome)}
          icon={<ArrowUpCircle className="w-5 h-5" />}
          color="emerald"
          trend={{ value: formatPercent(data.trends.incomeTrend), positive: data.trends.incomeTrend >= 0 }}
        />
        <StatCard
          title="Despesas"
          value={formatCurrency(data.overview.totalExpense)}
          icon={<ArrowDownCircle className="w-5 h-5" />}
          color="red"
          trend={{ value: formatPercent(data.trends.expenseTrend), positive: data.trends.expenseTrend <= 0 }}
        />
        <StatCard
          title="Resultado"
          value={formatCurrency(data.overview.result)}
          icon={<Scale className="w-5 h-5" />}
          color={data.overview.result >= 0 ? "emerald" : "red"}
        />
        <StatCard
          title="Valores a receber"
          value={formatCurrency(data.overview.pendingIncome)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Valores a pagar"
          value={formatCurrency(data.overview.pendingExpense)}
          icon={<TrendingDown className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Orçamento"
          value="Ver módulo"
          icon={<PiggyBank className="w-5 h-5" />}
          color="violet"
          subtitle="Planejado x realizado"
        />
        <StatCard
          title="Transferências"
          value={accounts.length ? `${accounts.length} contas` : "-"}
          icon={<ArrowLeftRight className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {/* Gráfico principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Receitas x Despesas</h3>
          {loading ? <div className="h-[300px] flex items-center justify-center text-gray-400">Carregando...</div> : <IncomeExpenseBarChart data={monthly} />}
        </Card>
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Despesas por categoria</h3>
          {expCat.length > 0 ? <DonutChart data={expCat} /> : <p className="text-sm text-gray-400 py-10 text-center">Sem dados no período</p>}
        </Card>
      </div>

      {/* Segunda linha */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Evolução do saldo</h3>
          <BalanceLineChart data={monthly} />
        </Card>
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Receitas por categoria</h3>
          {incCat.length > 0 ? <DonutChart data={incCat} /> : <p className="text-sm text-gray-400 py-10 text-center">Sem dados no período</p>}
        </Card>
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Maiores despesas</h3>
          {data.topExpenses.length > 0 ? (
            <div className="space-y-3">
              {data.topExpenses.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.description}</p>
                    <p className="text-xs text-gray-400">{t.category || "Sem categoria"} · {formatDate(t.date)}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600 whitespace-nowrap">{formatCurrency(t.amount)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 py-10 text-center">Sem dados no período</p>}
        </Card>
      </div>

      {/* Terceira linha */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-2">Maiores fornecedores</h3>
          {data.topSuppliers.length > 0 ? (
            <HorizontalBar data={data.topSuppliers.map((s) => ({ name: s.supplierName, amount: s.amount }))} />
          ) : <p className="text-sm text-gray-400 py-10 text-center">Sem dados no período</p>}
        </Card>
        <Card className="xl:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Contas próximas do vencimento</h3>
          {upcoming.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Descrição</th>
                    <th className="table-header">Vencimento</th>
                    <th className="table-header">Status</th>
                    <th className="table-header text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="table-cell">{t.description}</td>
                      <td className="table-cell">{formatDate(t.dueDate || t.date)}</td>
                      <td className="table-cell">
                        <Badge variant={statusMap[t.status]?.variant || "default"}>{statusMap[t.status]?.label || t.status}</Badge>
                      </td>
                      <td className="table-cell text-right font-medium">{formatCurrency(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-10 text-center flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" /> Nenhuma conta pendente
            </p>
          )}
        </Card>
      </div>

      {/* Modal lançamento rápido */}
      <Modal open={showQuick} onClose={() => setShowQuick(false)} title="Novo lançamento rápido" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "INCOME", label: "Receita", icon: TrendingUp },
              { value: "EXPENSE", label: "Despesa", icon: TrendingDown },
              { value: "TRANSFER", label: "Transferência", icon: ArrowLeftRight },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setQuickForm({ ...quickForm, type: opt.value });
                  if (opt.value === "TRANSFER") {
                    setShowQuick(false);
                    setShowTransfers(true);
                  }
                }}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${
                  quickForm.type === opt.value ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <opt.icon className={`w-5 h-5 ${quickForm.type === opt.value ? "text-brand-600" : "text-gray-400"}`} />
                <span className="text-xs font-medium text-gray-700">{opt.label}</span>
              </button>
            ))}
          </div>

          <Input
            label="Descrição"
            value={quickForm.description}
            onChange={(e) => setQuickForm({ ...quickForm, description: e.target.value })}
            placeholder={quickForm.type === "INCOME" ? "Ex: Venda de produtos" : "Ex: Compra de material"}
            autoFocus
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Valor (R$)</label>
              <input
                value={quickForm.amount}
                onChange={(e) => setQuickForm({ ...quickForm, amount: e.target.value })}
                placeholder="0,00"
                className="input-field text-lg font-semibold"
                inputMode="decimal"
              />
            </div>
            <Select
              label="Categoria"
              value={quickForm.categoryId}
              onChange={(e) => setQuickForm({ ...quickForm, categoryId: e.target.value })}
              options={categories
                .filter((c) => c.type === (quickForm.type === "INCOME" ? "INCOME" : "EXPENSE"))
                .map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Selecione..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowQuick(false)}>Cancelar</Button>
            <Button onClick={saveQuick} loading={saving}>
              Salvar lançamento
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal transferência */}
      <Modal open={showTransfers} onClose={() => setShowTransfers(false)} title="Transferir entre contas" size="md">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-700">A transferência registra saída na origem e entrada no destino automaticamente.</p>
          </div>

          <Select
            label="Conta de origem"
            value={transferForm.fromAccountId}
            onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
            options={accounts.map((a) => ({ value: a.id, label: `${a.icon} ${a.name}` }))}
          />

          <Select
            label="Conta de destino"
            value={transferForm.toAccountId}
            onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
            options={accounts.filter((a) => a.id !== transferForm.fromAccountId).map((a) => ({ value: a.id, label: `${a.icon} ${a.name}` }))}
            placeholder="Selecione a conta de destino..."
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Valor (R$)</label>
              <input
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                className="input-field text-lg font-semibold"
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
            <Input
              label="Data"
              type="date"
              value={transferForm.date}
              onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
            />
          </div>

          <Input
            label="Descrição (opcional)"
            value={transferForm.description}
            onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
            placeholder="Ex: Repasse mensal"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowTransfers(false)}>Cancelar</Button>
            <Button onClick={saveTransfer} loading={saving}>Confirmar transferência</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}