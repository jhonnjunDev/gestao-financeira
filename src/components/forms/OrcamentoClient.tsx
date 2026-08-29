"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, PiggyBank, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ProgressBar, Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/format";

interface Budget {
  id: string;
  periodType: string;
  year: number;
  month?: number | null;
  planned: number;
  realized: number;
  difference: number;
  percentage: number;
  category?: { id: string; name: string; type: string } | null;
  costCenter?: { id: string; name: string } | null;
}

export default function OrcamentoClient({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Budget | null>(null);
  const [form, setForm] = useState({
    periodType: "MONTHLY",
    month: String(new Date().getMonth() + 1),
    amount: "",
    categoryId: "",
    costCenterId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/gestao/api/budgets?accountId=${accountId}&year=${year}&month=${month}`);
      const json = await res.json();
      if (json.success) setBudgets(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function loadSelects() {
    const [catRes, ccRes] = await Promise.all([
      fetch(`/gestao/api/categories?accountId=${accountId}`),
      fetch(`/gestao/api/cost-centers?accountId=${accountId}`),
    ]);
    const cat = await catRes.json();
    const cc = await ccRes.json();
    if (cat.success) setCategories(cat.data);
    if (cc.success) setCostCenters(cc.data);
  }

  useEffect(() => { load(); loadSelects(); }, [accountId, year, month]);

  async function save() {
    if (!form.amount) { setError("Valor é obrigatório"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/gestao/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          periodType: form.periodType,
          year,
          month: form.periodType === "MONTHLY" ? parseInt(form.month) : null,
          amount: parseFloat(form.amount.replace(/\./g, "").replace(",", ".")),
          categoryId: form.categoryId || null,
          costCenterId: form.costCenterId || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erro ao salvar");
      setShowModal(false);
      setForm({ periodType: "MONTHLY", month: String(new Date().getMonth() + 1), amount: "", categoryId: "", costCenterId: "" });
      router.refresh();
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirmDelete) return;
    try {
      await fetch(`/gestao/api/budgets/${confirmDelete.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      load();
    } catch {
      setError("Erro ao excluir");
    }
  }

  const totalPlanned = budgets.reduce((s, b) => s + b.planned, 0);
  const totalRealized = budgets.reduce((s, b) => s + b.realized, 0);
  const totalPct = totalPlanned > 0 ? (totalRealized / totalPlanned) * 100 : 0;

  function statusInfo(pct: number) {
    if (pct > 100) return { label: "Orçamento ultrapassado", variant: "danger" as const };
    if (pct > 90) return { label: "Alerta", variant: "danger" as const };
    if (pct > 70) return { label: "Atenção", variant: "warning" as const };
    return { label: "Normal", variant: "success" as const };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamento</h1>
          <p className="text-sm text-gray-500">Planejado x realizado por categoria e centro de custo</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(year)}
            onChange={(e) => setYear(parseInt(e.target.value))}
            options={[year - 1, year, year + 1].map((y) => ({ value: String(y), label: String(y) }))}
            className="w-24"
          />
          <Select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Mês ${i + 1}` }))}
            className="w-28"
          />
          <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Novo orçamento</Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Planejado</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPlanned)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Realizado</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRealized)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Saldo</p>
          <p className={`text-2xl font-bold ${totalPlanned - totalRealized >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrency(totalPlanned - totalRealized)}
          </p>
          <div className="mt-2"><ProgressBar value={totalRealized} max={totalPlanned || 1} /></div>
        </Card>
      </div>

      {/* Lista */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Item</th>
                <th className="table-header text-right">Planejado</th>
                <th className="table-header text-right">Realizado</th>
                <th className="table-header text-right">Diferença</th>
                <th className="table-header w-56">Utilização</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Carregando...</td></tr>
              ) : budgets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <PiggyBank className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum orçamento para este período</p>
                    <Button className="mt-4" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Criar orçamento</Button>
                  </td>
                </tr>
              ) : (
                budgets.map((b) => {
                  const info = statusInfo(b.percentage);
                  return (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <p className="font-medium text-gray-900">{b.category?.name || b.costCenter?.name || "Geral"}</p>
                        <p className="text-xs text-gray-400">
                          {b.category?.type === "INCOME" ? "Receita" : b.category?.type === "EXPENSE" ? "Despesa" : "Centro de custo"}
                          {b.costCenter ? ` · ${b.costCenter.name}` : ""}
                        </p>
                      </td>
                      <td className="table-cell text-right">{formatCurrency(b.planned)}</td>
                      <td className="table-cell text-right font-medium">{formatCurrency(b.realized)}</td>
                      <td className={`table-cell text-right font-medium ${b.difference >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(b.difference)}
                      </td>
                      <td className="table-cell">
                        <ProgressBar value={b.realized} max={b.planned || 1} size="sm" showLabel={false} />
                        <span className="text-xs text-gray-500 mt-1 inline-block">{b.percentage.toFixed(0)}%</span>
                      </td>
                      <td className="table-cell">
                        <Badge variant={info.variant}>{info.label}</Badge>
                      </td>
                      <td className="table-cell text-right">
                        <button onClick={() => setConfirmDelete(b)} className="btn-ghost p-1.5 text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Novo orçamento" size="md">
        <div className="space-y-4">
          <Select
            label="Tipo de período"
            value={form.periodType}
            onChange={(e) => setForm({ ...form, periodType: e.target.value })}
            options={[
              { value: "MONTHLY", label: "Mensal" },
              { value: "ANNUAL", label: "Anual" },
            ]}
          />
          {form.periodType === "MONTHLY" && (
            <Select
              label="Mês"
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
              options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Mês ${i + 1}` }))}
            />
          )}
          <div>
            <label className="label">Valor (R$)</label>
            <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field text-lg font-semibold" placeholder="0,00" inputMode="decimal" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Categoria"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              options={categories.map((c) => ({ value: c.id, label: `${c.name} (${c.type === "INCOME" ? "Receita" : "Despesa"})` }))}
              placeholder="Todas"
            />
            <Select
              label="Centro de custo"
              value={form.costCenterId}
              onChange={(e) => setForm({ ...form, costCenterId: e.target.value })}
              options={costCenters.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Todos"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Salvar orçamento</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        title="Excluir orçamento"
        message="Deseja excluir este orçamento?"
        confirmText="Excluir"
        danger
      />
    </div>
  );
}