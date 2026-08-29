"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/format";

interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  date: string;
  description?: string;
  fromAccount: { id: string; name: string; icon: string };
  toAccount: { id: string; name: string; icon: string };
}

export default function TransfersClient({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    fromAccountId: accountId,
    toAccountId: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([
        fetch(`/api/transfers?accountId=${accountId}`),
        fetch("/api/accounts"),
      ]);
      const t = await tRes.json();
      const a = await aRes.json();
      if (t.success) setTransfers(t.data);
      if (a.success) setAccounts(a.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [accountId]);

  async function save() {
    if (!form.toAccountId || !form.amount) {
      setError("Conta de destino e valor são obrigatórios");
      return;
    }
    if (form.fromAccountId === form.toAccountId) {
      setError("Origem e destino devem ser diferentes");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount.replace(/\./g, "").replace(",", ".")),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erro ao transferir");
      setShowModal(false);
      setForm({ fromAccountId: accountId, toAccountId: "", amount: "", date: new Date().toISOString().slice(0, 10), description: "" });
      router.refresh();
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transferências</h1>
          <p className="text-sm text-gray-500">Transfira valores entre contas — saída e entrada registradas automaticamente</p>
        </div>
        <Button onClick={() => setShowModal(true)}><ArrowLeftRight className="w-4 h-4" /> Nova transferência</Button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 flex items-center gap-3">
        <ArrowLeftRight className="w-5 h-5 shrink-0" />
        O saldo é transferido sem duplicação: a conta de origem registra saída e a conta de destino registra entrada.
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Data</th>
                <th className="table-header">Origem</th>
                <th className="table-header">Destino</th>
                <th className="table-header">Descrição</th>
                <th className="table-header text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Carregando...</td></tr>
              ) : transfers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Nenhuma transferência registrada</td></tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="table-cell whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="table-cell">
                      <span className="flex items-center gap-2 text-red-600">
                        <ArrowUpRight className="w-4 h-4" /> {t.fromAccount.icon} {t.fromAccount.name}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="flex items-center gap-2 text-emerald-600">
                        <ArrowDownLeft className="w-4 h-4" /> {t.toAccount.icon} {t.toAccount.name}
                      </span>
                    </td>
                    <td className="table-cell text-gray-500">{t.description || "-"}</td>
                    <td className="table-cell text-right font-semibold text-gray-900">{formatCurrency(t.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova transferência" size="md">
        <div className="space-y-4">
          <Select
            label="Conta de origem"
            value={form.fromAccountId}
            onChange={(e) => setForm({ ...form, fromAccountId: e.target.value })}
            options={accounts.map((a) => ({ value: a.id, label: `${a.icon} ${a.name}` }))}
          />
          <Select
            label="Conta de destino"
            value={form.toAccountId}
            onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
            options={accounts.filter((a) => a.id !== form.fromAccountId).map((a) => ({ value: a.id, label: `${a.icon} ${a.name}` }))}
            placeholder="Selecione a conta de destino..."
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Valor (R$)</label>
              <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field text-lg font-semibold" placeholder="0,00" inputMode="decimal" />
            </div>
            <Input label="Data" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <Input label="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Repasse mensal" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Confirmar transferência</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}