"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Filter, Pencil, Trash2, Eye, FileDown, RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingSpinner, ConfirmDialog } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate, TRANSACTION_TYPES, STATUS_MAP } from "@/lib/format";
import { ImportButton } from "@/components/transactions/ImportButton";

interface Transaction {
  id: string;
  type: string;
  description: string;
  amount: string;
  date: string;
  dueDate?: string | null;
  paymentDate?: string | null;
  status: string;
  category?: { id: string; name: string } | null;
  subcategory?: { id: string; name: string } | null;
  costCenter?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
  paymentMethod?: string | null;
  documentNumber?: string | null;
  notes?: string | null;
}

interface FilterState {
  search: string;
  type: string;
  status: string;
  categoryId: string;
  supplierId: string;
  startDate: string;
  endDate: string;
}

export default function TransactionsClient({ accountId }: { accountId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    type: "EXPENSE",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    dueDate: "",
    paymentDate: "",
    categoryId: "",
    subcategoryId: "",
    costCenterId: "",
    supplierId: "",
    paymentMethod: "",
    documentNumber: "",
    notes: "",
    status: "PAID",
    recurring: false,
  });
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    type: "",
    status: "",
    categoryId: "",
    supplierId: "",
    startDate: "",
    endDate: "",
  });
  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  async function loadTransactions() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        accountId,
        page: String(page),
        limit: String(limit),
      });
      if (filters.search) params.set("search", filters.search);
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.supplierId) params.set("supplierId", filters.supplierId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/gestao/api/transactions?${params}`);
      const json = await res.json();
      if (json.success) {
        setTransactions(json.data.transactions);
        setTotal(json.data.total);
      }
    } finally {
      setLoading(false);
    }
  }

  const loadSelects = useCallback(async () => {
    const [catRes, supRes, ccRes] = await Promise.all([
      fetch(`/gestao/api/categories?accountId=${accountId}`),
      fetch(`/gestao/api/suppliers?accountId=${accountId}`),
      fetch(`/gestao/api/cost-centers?accountId=${accountId}`),
    ]);
    const cat = await catRes.json();
    const sup = await supRes.json();
    const cc = await ccRes.json();
    if (cat.success) setCategories(cat.data);
    if (sup.success) setSuppliers(sup.data);
    if (cc.success) setCostCenters(cc.data);
  }, [accountId]);

  useEffect(() => {
    loadTransactions();
  }, [page, filters, accountId]);

  useEffect(() => {
    loadSelects();
  }, [accountId]);

  // Sincroniza busca vinda do topo (searchParams)
  useEffect(() => {
    const s = searchParams.get("search");
    if (s) {
      setFilters((f) => ({ ...f, search: s }));
      router.replace("/movimentacoes");
    }
  }, [searchParams]);

  function openNew() {
    setEditing(null);
    setForm({
      type: "EXPENSE",
      description: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
      paymentDate: "",
      categoryId: "",
      subcategoryId: "",
      costCenterId: "",
      supplierId: "",
      paymentMethod: "",
      documentNumber: "",
      notes: "",
      status: "PAID",
      recurring: false,
    });
    setShowModal(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setForm({
      type: t.type,
      description: t.description,
      amount: String(Number(t.amount)),
      date: t.date.slice(0, 10),
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
      paymentDate: t.paymentDate ? t.paymentDate.slice(0, 10) : "",
      categoryId: t.category?.id || "",
      subcategoryId: t.subcategory?.id || "",
      costCenterId: t.costCenter?.id || "",
      supplierId: t.supplier?.id || "",
      paymentMethod: t.paymentMethod || "",
      documentNumber: t.documentNumber || "",
      notes: t.notes || "",
      status: t.status,
      recurring: false,
    });
    setShowModal(true);
  }

  async function saveTransaction() {
    if (!form.description || !form.amount) {
      setError("Descrição e valor são obrigatórios");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/transactions/${editing.id}` : "/api/transactions";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          type: form.type,
          description: form.description,
          amount: parseFloat(form.amount.replace(/\./g, "").replace(",", ".")),
          date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          paymentDate: form.paymentDate ? new Date(form.paymentDate).toISOString() : null,
          categoryId: form.categoryId || null,
          subcategoryId: form.subcategoryId || null,
          costCenterId: form.costCenterId || null,
          supplierId: form.supplierId || null,
          paymentMethod: form.paymentMethod || null,
          documentNumber: form.documentNumber || null,
          notes: form.notes || null,
          status: form.status,
          recurring: form.recurring,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erro ao salvar");
      setShowModal(false);
      router.refresh();
      loadTransactions();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction() {
    if (!confirmDelete) return;
    try {
      await fetch(`/gestao/api/transactions/${confirmDelete.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      loadTransactions();
    } catch {
      setError("Erro ao excluir");
    }
  }

  function exportExcel() {
    const params = new URLSearchParams({
      accountId,
      period: "custom",
      startDate: filters.startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      endDate: filters.endDate || new Date().toISOString().slice(0, 10),
    });
    if (filters.type) params.set("type", filters.type);
    window.open(`/api/export/excel?${params}`, "_blank");
  }

  const typeBadge = (t: string) => TRANSACTION_TYPES[t as keyof typeof TRANSACTION_TYPES] || TRANSACTION_TYPES.EXPENSE;
  const statusBadge = (s: string) => STATUS_MAP[s as keyof typeof STATUS_MAP] || STATUS_MAP.PENDING;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimentações</h1>
          <p className="text-sm text-gray-500">{total} lançamentos encontrados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4" /> Filtros
          </Button>
          <Button variant="secondary" onClick={exportExcel}>
            <FileDown className="w-4 h-4" /> Excel
          </Button>
          <ImportButton accountId={accountId} />
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" /> Novo lançamento
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Buscar..."
              className="input-field pl-9"
            />
          </div>
          <Select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            options={[
              { value: "INCOME", label: "Receitas" },
              { value: "EXPENSE", label: "Despesas" },
              { value: "TRANSFER", label: "Transferências" },
            ]}
            placeholder="Tipo"
          />
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            options={[
              { value: "PAID", label: "Pago" },
              { value: "RECEIVED", label: "Recebido" },
              { value: "PENDING", label: "Pendente" },
              { value: "LATE", label: "Atrasado" },
              { value: "CANCELED", label: "Cancelado" },
            ]}
            placeholder="Status"
          />
          <Select
            value={filters.categoryId}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Categoria"
          />
          <Select
            value={filters.supplierId}
            onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Fornecedor"
          />
          <Input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
          <Input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
          <Button variant="secondary" onClick={() => setFilters({ search: "", type: "", status: "", categoryId: "", supplierId: "", startDate: "", endDate: "" })}>
            <RefreshCw className="w-4 h-4" /> Limpar
          </Button>
        </div>
      )}

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
            title="Nenhum lançamento encontrado"
            description="Registre receitas e despesas para começar a acompanhar suas finanças."
            action={<Button onClick={openNew}><Plus className="w-4 h-4" /> Novo lançamento</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Data</th>
                  <th className="table-header">Descrição</th>
                  <th className="table-header">Categoria</th>
                  <th className="table-header">Fornecedor</th>
                  <th className="table-header">Tipo</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Valor</th>
                  <th className="table-header text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const tb = typeBadge(t.type);
                  const sb = statusBadge(t.status);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="table-cell">
                        <p className="font-medium text-gray-900">{t.description}</p>
                        {t.documentNumber && <p className="text-xs text-gray-400">Doc: {t.documentNumber}</p>}
                      </td>
                      <td className="table-cell">
                        <p>{t.category?.name || "-"}</p>
                        {t.subcategory && <p className="text-xs text-gray-400">{t.subcategory.name}</p>}
                      </td>
                      <td className="table-cell">{t.supplier?.name || "-"}</td>
                      <td className="table-cell">
                        <Badge variant={t.type === "INCOME" ? "success" : t.type === "EXPENSE" ? "danger" : "info"}>
                          {tb.label}
                        </Badge>
                      </td>
                      <td className="table-cell">
                        <Badge variant={sb.color === "text-emerald-600" ? "success" : sb.color === "text-amber-600" ? "warning" : sb.color === "text-red-600" ? "danger" : "default"}>
                          {sb.label}
                        </Badge>
                      </td>
                      <td className={`table-cell text-right font-semibold ${t.type === "INCOME" ? "text-emerald-600" : t.type === "EXPENSE" ? "text-red-600" : "text-blue-600"}`}>
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(t)} className="btn-ghost p-1.5" title="Editar">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmDelete(t)} className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Página {page} de {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal form */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Editar lançamento" : "Novo lançamento"} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: "INCOME", label: "Receita" },
              { value: "EXPENSE", label: "Despesa" },
              { value: "TRANSFER", label: "Transferência" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setForm({ ...form, type: opt.value })}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  form.type === opt.value
                    ? opt.value === "INCOME"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : opt.value === "EXPENSE"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Descrição"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Compra de material de escritório"
            />
            <div>
              <label className="label">Valor (R$)</label>
              <input
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="input-field text-lg font-semibold"
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Data" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input label="Vencimento" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            <Input label="Pagamento" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Categoria</label>
              <select
                value={form.categoryId}
                onChange={(e) => {
                  const cat = categories.find((c) => c.id === e.target.value);
                  setForm({ ...form, categoryId: e.target.value, subcategoryId: "" });
                }}
                className="input-field"
              >
                <option value="">Selecione...</option>
                {categories.filter((c) => c.type === form.type).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Subcategoria</label>
              <select
                value={form.subcategoryId}
                onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })}
                className="input-field"
                disabled={!form.categoryId}
              >
                <option value="">Selecione...</option>
                {categories.find((c) => c.id === form.categoryId)?.children?.map((sc: any) => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Fornecedor/Beneficiário"
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Selecione..."
            />
            <Select
              label="Centro de custo"
              value={form.costCenterId}
              onChange={(e) => setForm({ ...form, costCenterId: e.target.value })}
              options={costCenters.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Selecione..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Forma de pagamento"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              placeholder="Ex: Pix, Cartão, Boleto"
            />
            <Input
              label="Nº do documento"
              value={form.documentNumber}
              onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
              placeholder="Ex: NF-12345"
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[
                { value: "PAID", label: "Pago" },
                { value: "RECEIVED", label: "Recebido" },
                { value: "PENDING", label: "Pendente" },
                { value: "LATE", label: "Atrasado" },
                { value: "CANCELED", label: "Cancelado" },
              ]}
            />
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Observações adicionais..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-brand-600"
            />
            Lançamento recorrente
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={saveTransaction} loading={saving}>
              {editing ? "Salvar alterações" : "Registrar lançamento"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmar exclusão */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={deleteTransaction}
        title="Excluir lançamento"
        message={`Deseja realmente excluir "${confirmDelete?.description}"? O registro será movido para a lixeira.`}
        confirmText="Excluir"
        danger
      />
    </div>
  );
}