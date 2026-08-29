"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Tags, FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/EmptyState";

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  children: Category[];
  _count?: { transactions: number };
}

export default function CategoriesClient({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [tab, setTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [form, setForm] = useState({ name: "", type: "EXPENSE", color: "#64748b", parentId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/gestao/api/categories?accountId=${accountId}`);
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accountId]);

  const visible = categories.filter((c) => c.type === tab);

  function openNew(type: "EXPENSE" | "INCOME") {
    setEditing(null);
    setForm({ name: "", type, color: "#64748b", parentId: "" });
    setShowModal(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setForm({ name: c.name, type: c.type, color: c.color, parentId: "" });
    setShowModal(true);
  }

  async function save() {
    if (!form.name) { setError("Nome é obrigatório"); return; }
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, accountId, parentId: form.parentId || null }),
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
      await fetch(`/gestao/api/categories/${confirmDelete.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      load();
    } catch {
      setError("Não foi possível excluir");
    }
  }

  async function addSubcategory(parent: Category) {
    setEditing(null);
    setForm({ name: "", type: parent.type, color: parent.color, parentId: parent.id });
    setShowModal(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-sm text-gray-500">Organize receitas e despesas em categorias e subcategorias</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openNew("INCOME")}>
            <Plus className="w-4 h-4" /> Receita
          </Button>
          <Button onClick={() => openNew("EXPENSE")}>
            <Plus className="w-4 h-4" /> Despesa
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("EXPENSE")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "EXPENSE" ? "bg-red-50 text-red-700" : "text-gray-500 hover:bg-gray-100"}`}
        >
          Despesas
        </button>
        <button
          onClick={() => setTab("INCOME")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "INCOME" ? "bg-emerald-50 text-emerald-700" : "text-gray-500 hover:bg-gray-100"}`}
        >
          Receitas
        </button>
      </div>

      {loading ? (
        <Card><div className="py-12 text-center text-gray-400">Carregando...</div></Card>
      ) : visible.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <Tags className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma categoria criada ainda</p>
            <Button className="mt-4" onClick={() => openNew(tab)}><Plus className="w-4 h-4" /> Criar categoria</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((c) => (
            <Card key={c.id} hover>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${c.color}20` }}>
                    <FolderOpen className="w-5 h-5" style={{ color: c.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c._count?.transactions || 0} lançamentos</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="btn-ghost p-1.5"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setConfirmDelete(c)} className="btn-ghost p-1.5 text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {c.children.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {c.children.map((sc) => (
                    <span key={sc.id} className="badge bg-gray-100 text-gray-600">{sc.name}</span>
                  ))}
                </div>
              )}
              <button
                onClick={() => addSubcategory(c)}
                className="mt-3 text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar subcategoria
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Editar categoria" : "Nova categoria"} size="md">
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Alimentação" />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={[
                { value: "EXPENSE", label: "Despesa" },
                { value: "INCOME", label: "Receita" },
              ]}
            />
            <div>
              <label className="label">Cor</label>
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer" />
            </div>
          </div>
          {form.parentId === "" && form.type === "EXPENSE" && (
            <Select
              label="Categoria pai (subcategoria)"
              value=""
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              options={categories.filter((c) => c.type === "EXPENSE").map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Nenhuma (categoria principal)"
            />
          )}
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
        title="Excluir categoria"
        message={`Deseja excluir "${confirmDelete?.name}"? Categorias em uso não podem ser excluídas.`}
        confirmText="Excluir"
        danger
      />
    </div>
  );
}