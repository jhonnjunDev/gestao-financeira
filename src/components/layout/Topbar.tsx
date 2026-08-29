"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronsUpDown, Search, Plus, Building2, Archive, Power, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Account {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: string;
  balance: number;
}

const ACCOUNT_TYPES = [
  "Geral", "Bancária", "Projeto", "Loja", "Empresa",
  "Evento", "Convênio", "Associação", "Prefeitura", "Caixa",
];

export function Topbar({ accounts, currentAccountId, userName, userRole }: {
  accounts: Account[];
  currentAccountId: string;
  userName: string;
  userRole: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "Geral",
    color: "#2563eb",
    icon: "🏢",
    description: "",
    responsible: "",
    initialBalance: "",
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = accounts.find((a) => a.id === currentAccountId) || accounts[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = accounts.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.type.toLowerCase().includes(search.toLowerCase())
  );

  function switchAccount(id: string) {
    document.cookie = `current_account=${id}; path=/`;
    setOpen(false);
    router.refresh();
  }

  async function saveAccount() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/gestao/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          initialBalance: form.initialBalance ? parseFloat(form.initialBalance.replace(/\./g, "").replace(",", ".")) : 0,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Erro ao salvar");
      setShowAdd(false);
      setForm({ name: "", type: "Geral", color: "#2563eb", icon: "🏢", description: "", responsible: "", initialBalance: "" });
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateAccount() {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/gestao/api/accounts/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Erro ao atualizar");
      setShowEdit(false);
      setEditing(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-4 lg:px-6 sticky top-0 z-30">
      {/* Seletor de conta */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-gray-50 border border-gray-200 transition-all duration-150 group min-w-[200px]"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
               style={{ backgroundColor: `${current?.color || "#2563eb"}20` }}>
            {current?.icon || "🏢"}
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-gray-900 leading-tight">{current?.name || "Selecionar conta"}</p>
            <p className="text-xs text-gray-500">
              {current ? `Saldo: R$ ${current.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
            </p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-scale-in z-50">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar conta..."
                  className="input-field pl-9"
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => switchAccount(acc.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                       style={{ backgroundColor: `${acc.color}20` }}>
                    {acc.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{acc.name}</p>
                    <p className="text-xs text-gray-500">{acc.type}</p>
                  </div>
                  {acc.id === currentAccountId && <Check className="w-4 h-4 text-brand-600" />}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma conta encontrada</p>
              )}
            </div>
            <div className="p-3 border-t border-gray-100 space-y-1">
              <button onClick={() => { setShowAdd(true); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium text-brand-600">
                <Plus className="w-4 h-4" /> Adicionar nova conta
              </button>
              {current && (
                <button onClick={() => { setEditing(current); setShowEdit(true); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600">
                  <Pencil className="w-4 h-4" /> Editar conta atual
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Busca global */}
      <div className="hidden md:block relative w-64 lg:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          placeholder="Buscar lançamentos, fornecedores, documentos..."
          className="input-field pl-9"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value) {
              router.push(`/movimentacoes?search=${encodeURIComponent(e.currentTarget.value)}`);
            }
          }}
        />
      </div>

      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-bold">
          {(userName || "U").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900 leading-tight">{userName || "Usuário"}</p>
          <p className="text-[10px] text-gray-400">{userRole || ""}</p>
        </div>
      </div>

      <a href="/gestao/api/auth/logout" className="btn-ghost p-2" title="Sair">
        <Power className="w-4 h-4" />
      </a>

      {/* Modal nova conta */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Adicionar nova conta" size="md">
        <div className="space-y-4">
          <Input label="Nome da conta" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Conta Principal" />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo de conta"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))}
            />
            <div>
              <label className="label">Ícone</label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cor</label>
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer" />
            </div>
            <Input label="Saldo inicial (R$)" value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} placeholder="0,00" />
          </div>
          <Input label="Responsável" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} placeholder="Nome do responsável" />
          <div>
            <label className="label">Descrição</label>
            <textarea className="input-field" rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Breve descrição da conta" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={saveAccount} loading={saving}>Salvar conta</Button>
          </div>
        </div>
      </Modal>

      {/* Modal editar conta */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Editar: ${editing?.name || ""}`} size="md">
        {editing && (
          <div className="space-y-4">
            <Input label="Nome da conta" defaultValue={editing.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Tipo de conta"
                defaultValue={editing.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))}
              />
              <div>
                <label className="label">Ícone</label>
                <Input defaultValue={editing.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Cor</label>
                <input type="color" defaultValue={editing.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer" />
              </div>
              <Input label="Responsável" defaultValue="" onChange={(e) => setForm({ ...form, responsible: e.target.value })} placeholder="Nome do responsável" />
            </div>
            <div>
              <label className="label">Descrição</label>
              <textarea className="input-field" rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Breve descrição da conta" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancelar</Button>
              <Button onClick={updateAccount} loading={saving}>Atualizar conta</Button>
            </div>
          </div>
        )}
      </Modal>
    </header>
  );
}