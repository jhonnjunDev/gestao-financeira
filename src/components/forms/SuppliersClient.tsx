"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Truck, Search, Phone, Mail } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/format";

interface Supplier {
  id: string;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  totalSpent?: number;
  _count?: { transactions: number };
}

export default function SuppliersClient({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: "", document: "", phone: "", email: "", address: "", bankData: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers?accountId=${accountId}${search ? `&search=${encodeURIComponent(search)}` : ""}`);
      const json = await res.json();
      if (json.success) setSuppliers(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accountId, search]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", document: "", phone: "", email: "", address: "", bankData: "", notes: "" });
    setShowModal(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name, document: s.document || "", phone: s.phone || "", email: s.email || "",
      address: s.address || "", bankData: "", notes: s.notes || "",
    });
    setShowModal(true);
  }

  async function save() {
    if (!form.name) { setError("Nome é obrigatório"); return; }
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/suppliers/${editing.id}` : "/api/suppliers";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, accountId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erro ao salvar");
      setShowModal(false);
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
      await fetch(`/api/suppliers/${confirmDelete.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      load();
    } catch {
      setError("Não foi possível excluir");
    }
  }

  const sorted = [...suppliers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores e Beneficiários</h1>
          <p className="text-sm text-gray-500">{suppliers.length} cadastrados · ranking por valor gasto</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4" /> Novo fornecedor</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar fornecedor..." className="input-field pl-9" />
      </div>

      {loading ? (
        <Card><div className="py-12 text-center text-gray-400">Carregando...</div></Card>
      ) : sorted.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum fornecedor cadastrado</p>
            <Button className="mt-4" onClick={openNew}><Plus className="w-4 h-4" /> Adicionar</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((s, idx) => (
            <Card key={s.id} hover>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${idx < 3 ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"}`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s._count?.transactions || 0} lançamentos</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="btn-ghost p-1.5"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setConfirmDelete(s)} className="btn-ghost p-1.5 text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Total gasto</span>
                  <span className="font-semibold text-red-600">{formatCurrency(s.totalSpent || 0)}</span>
                </div>
                {s.document && <p className="text-xs text-gray-400">Doc: {s.document}</p>}
                <div className="flex gap-3 pt-1">
                  {s.phone && <span className="flex items-center gap-1 text-xs text-gray-500"><Phone className="w-3 h-3" />{s.phone}</span>}
                  {s.email && <span className="flex items-center gap-1 text-xs text-gray-500 truncate"><Mail className="w-3 h-3" />{s.email}</span>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Editar fornecedor" : "Novo fornecedor"} size="md">
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Empresa XYZ LTDA" autoFocus />
          <div className="grid grid-cols-2 gap-4">
            <Input label="CPF/CNPJ" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} placeholder="00.000.000/0001-00" />
            <Input label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contato@empresa.com" />
            <Input label="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, cidade" />
          </div>
          <Input label="Dados bancários (opcional)" value={form.bankData} onChange={(e) => setForm({ ...form, bankData: e.target.value })} placeholder="Banco, agência, conta" />
          <div>
            <label className="label">Observações</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações adicionais..." />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        title="Excluir fornecedor"
        message={`Deseja excluir "${confirmDelete?.name}"?`}
        confirmText="Excluir"
        danger
      />
    </div>
  );
}