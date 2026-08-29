"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, FolderKanban, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/format";

interface Item {
  id: string;
  name: string;
  color: string;
  _count?: { transactions: number };
  totalSpent?: number;
}

interface ResourceClientProps {
  accountId: string;
  apiPath: string;
  title: string;
  description: string;
  itemLabel: string;
  hasTotal?: boolean;
}

export function ResourceClient({ accountId, apiPath, title, description, itemLabel, hasTotal }: ResourceClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null);
  const [form, setForm] = useState({ name: "", color: "#64748b" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${apiPath}?accountId=${accountId}`);
      const json = await res.json();
      if (json.success) setItems(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accountId]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", color: "#64748b" });
    setShowModal(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    setForm({ name: item.name, color: item.color });
    setShowModal(true);
  }

  async function save() {
    if (!form.name) { setError("Nome é obrigatório"); return; }
    setSaving(true);
    setError("");
    try {
      const url = editing ? `${apiPath}/${editing.id}` : apiPath;
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
      await fetch(`${apiPath}/${confirmDelete.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      load();
    } catch {
      setError("Não foi possível excluir");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4" /> Novo {itemLabel}</Button>
      </div>

      {loading ? (
        <Card><div className="py-12 text-center text-gray-400">Carregando...</div></Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum registro encontrado</p>
            <Button className="mt-4" onClick={openNew}><Plus className="w-4 h-4" /> Criar {itemLabel}</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} hover>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}20` }}>
                    {hasTotal ? <Wallet className="w-5 h-5" style={{ color: item.color }} /> : <FolderKanban className="w-5 h-5" style={{ color: item.color }} />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    {hasTotal && item.totalSpent !== undefined && (
                      <p className="text-xs text-red-600 font-medium">{formatCurrency(item.totalSpent)} gasto</p>
                    )}
                    {!hasTotal && (
                      <p className="text-xs text-gray-400">{item._count?.transactions || 0} lançamentos</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(item)} className="btn-ghost p-1.5"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setConfirmDelete(item)} className="btn-ghost p-1.5 text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? `Editar ${itemLabel}` : `Novo ${itemLabel}`} size="sm">
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={`Ex: ${itemLabel === "fornecedor" ? "Empresa XYZ" : "Administrativo"}`} autoFocus />
          <div>
            <label className="label">Cor</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer" />
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
        title={`Excluir ${itemLabel}`}
        message={`Deseja excluir "${confirmDelete?.name}"?`}
        confirmText="Excluir"
        danger
      />
    </div>
  );
}