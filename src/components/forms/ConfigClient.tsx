"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Settings, Users, Shield, Database, Archive, Trash2, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/EmptyState";

export default function ConfigClient({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("conta");
  const [showEdit, setShowEdit] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [confirmArchive, setConfirmArchive] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", type: "Geral", color: "#2563eb", icon: "🏢", description: "", responsible: "", initialBalance: "",
  });
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "FINANCEIRO" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [aRes, uRes] = await Promise.all([fetch("/gestao/api/accounts"), fetch("/gestao/api/settings/users")]);
    const a = await aRes.json();
    const u = await uRes.json();
    if (a.success) setAccounts(a.data);
    if (u.success) setUsers(u.data);
  }

  useEffect(() => { load(); }, []);

  function openEdit(acc: any) {
    setEditing(acc);
    setForm({
      name: acc.name, type: acc.type, color: acc.color, icon: acc.icon,
      description: acc.description || "", responsible: acc.responsible || "", initialBalance: String(acc.initialBalance || 0),
    });
    setShowEdit(true);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/gestao/api/accounts/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erro ao salvar");
      setShowEdit(false);
      router.refresh();
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function archiveAccount() {
    if (!confirmArchive) return;
    try {
      await fetch(`/gestao/api/accounts/${confirmArchive.id}`, { method: "DELETE" });
      setConfirmArchive(null);
      load();
    } catch {
      setError("Erro ao arquivar");
    }
  }

  async function createUser() {
    if (!userForm.name || !userForm.email || !userForm.password) {
      setError("Todos os campos são obrigatórios");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/gestao/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erro ao criar usuário");
      setShowUserModal(false);
      setUserForm({ name: "", email: "", password: "", role: "FINANCEIRO" });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrador", GESTOR: "Gestor", FINANCEIRO: "Financeiro", CONSULTA: "Consulta", AUDITOR: "Auditor",
  };

  const tabs = [
    { id: "conta", label: "Contas", icon: Building2 },
    { id: "usuarios", label: "Usuários e permissões", icon: Users },
    { id: "backup", label: "Backup", icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500">Gerencie contas, usuários, permissões e backup</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              activeTab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === "conta" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <Card key={acc.id} hover>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${acc.color}20` }}>
                  {acc.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{acc.name}</p>
                  <p className="text-xs text-gray-400">{acc.type} · R$ {Number(acc.balance || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-3">{acc.description || "Sem descrição"}</p>
              {acc.responsible && <p className="text-xs text-gray-400 mb-3">Responsável: {acc.responsible}</p>}
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(acc)}>
                  <Settings className="w-3.5 h-3.5" /> Editar
                </Button>
                <Button variant="secondary" size="sm" className="text-red-600" onClick={() => setConfirmArchive(acc)}>
                  <Archive className="w-3.5 h-3.5" /> Arquivar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "usuarios" && (
        <Card padding={false}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Usuários do sistema</h3>
              <p className="text-xs text-gray-400">Perfis: Administrador, Gestor, Financeiro, Consulta, Auditor</p>
            </div>
            <Button onClick={() => setShowUserModal(true)}>
              <UserPlus className="w-4 h-4" /> Novo usuário
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Nome</th>
                  <th className="table-header">E-mail</th>
                  <th className="table-header">Perfil</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-900">{u.name}</td>
                    <td className="table-cell">{u.email}</td>
                    <td className="table-cell">
                      <span className="badge bg-brand-50 text-brand-700 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> {roleLabels[u.role] || u.role}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {u.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "backup" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" /> Backup do banco de dados
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Faça o download de um arquivo SQLite com todos os dados do sistema para restaurar em outro ambiente.
            </p>
            <a href="/gestao/api/backup" className="btn-primary">
              Baixar backup (.db)
            </a>
          </Card>
          <Card>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Zona de risco
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              A restauração de backup substitui todos os dados atuais e não pode ser desfeita.
            </p>
            <Button variant="danger" disabled title="Restauração disponível apenas via linha de comando">
              Restaurar backup
            </Button>
          </Card>
        </div>
      )}

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar conta" size="md">
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            <Input label="Ícone" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cor</label>
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer" />
            </div>
            <Input label="Responsável" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
          </div>
          <Input label="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button onClick={saveEdit} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showUserModal} onClose={() => setShowUserModal(false)} title="Novo usuário" size="md">
        <div className="space-y-4">
          <Input label="Nome" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
          <Input label="E-mail" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
          <Input label="Senha" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
          <div>
            <label className="label">Perfil</label>
            <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="input-field">
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowUserModal(false)}>Cancelar</Button>
            <Button onClick={createUser} loading={saving}>Criar usuário</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={archiveAccount}
        title="Arquivar conta"
        message={`Deseja arquivar "${confirmArchive?.name}"? Os dados serão preservados, mas a conta ficará oculta.`}
        confirmText="Arquivar"
        danger
      />
    </div>
  );
}