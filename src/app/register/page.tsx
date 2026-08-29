"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Building2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirm) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Erro ao registrar");

      // Login automático
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (!loginData.success) throw new Error(loginData.error || "Erro ao entrar");

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 items-center justify-center p-12">
        <div className="max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-8">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Comece agora a<br />
            <span className="text-brand-400">gerenciar suas contas</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Crie sua conta e tenha acesso a um sistema completo de gestão financeira
            com múltiplas contas, relatórios profissionais e prestação de contas.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-gray-900">Gestão Financeira</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Criar conta</h2>
          <p className="text-sm text-gray-500 mb-8">Preencha seus dados para começar</p>

          <form onSubmit={handleRegister} className="space-y-5">
            <Input label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
            <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
            <Input label="Confirmar senha" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a senha" required />

            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}

            <Button type="submit" className="w-full" loading={loading}>
              Criar conta
            </Button>
          </form>

          <p className="mt-6 text-sm text-gray-500 text-center">
            Já tem conta?{" "}
            <Link href="/login" className="text-brand-600 font-medium hover:text-brand-700">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}