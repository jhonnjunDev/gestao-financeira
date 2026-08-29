"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Verificando sessão do FAAM...");
  const [error, setError] = useState("");

  useEffect(() => {
    async function sso() {
      const raw = localStorage.getItem("faam_sso");
      if (!raw) {
        setError("Nenhuma sessão do FAAM encontrada. Faça login no portal FAAM primeiro.");
        return;
      }

      let sessao;
      try {
        sessao = JSON.parse(raw);
      } catch {
        setError("Sessão inválida. Faça login novamente no FAAM.");
        localStorage.removeItem("faam_sso");
        return;
      }

      if (!sessao.perfil || (sessao.perfil !== "admin" && sessao.perfil !== "admin_master")) {
        setError("Acesso restrito a administradores. Seu perfil não tem permissão.");
        localStorage.removeItem("faam_sso");
        return;
      }

      setStatus("Autenticando...");

      try {
        const res = await fetch("/gestao/api/auth/faam-sso", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sessao),
        });
        const json = await res.json();

        if (!json.success) {
          setError(json.error || "Erro ao autenticar");
          return;
        }

        localStorage.removeItem("faam_sso");
        setStatus("Redirecionando...");
        router.push("/gestao/dashboard/");
      } catch (e: any) {
        setError("Erro de conexão: " + e.message);
      }
    }

    sso();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Lado visual / branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(37,99,235,0.15),transparent_50%)]" />
        <div className="relative z-10 max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-8 shadow-lg shadow-brand-500/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Gestão Financeira<br />
            <span className="text-brand-400">Profissional</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Sistema completo para gerenciar múltiplas contas, controlar receitas e despesas,
            emitir relatórios profissionais e realizar prestações de contas com excelência.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {["Múltiplas contas", "Relatórios Excel", "Gráficos", "Prestação de contas"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lado direito: SSO automático */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm text-center">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-gray-900">Gestão Financeira</h1>
          </div>

          {!error && (
            <>
              <div className="mx-auto w-12 h-12 mb-6">
                <div className="w-12 h-12 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Entrando automaticamente</h2>
              <p className="text-sm text-gray-500 mb-8">{status}</p>
            </>
          )}

          {error && (
            <>
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso restrito</h2>
              <p className="text-sm text-gray-500 mb-6">{error}</p>
              <a
                href="https://faamhospitalar.dpdns.org/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 transition-colors"
              >
                Voltar para o portal FAAM
              </a>
            </>
          )}

          <p className="mt-12 text-xs text-gray-400">
            Desenvolvido por <span className="font-semibold text-gray-600">Jhonata</span>
          </p>
        </div>
      </div>
    </div>
  );
}