"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function FaamSsoPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Verificando sessão do FAAM...");
  const [error, setError] = useState("");

  useEffect(() => {
    async function sso() {
      // Tenta ler a sessão do FAAM do localStorage
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
        const res = await fetch("/gestao/api/auth/faam-sso/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sessao),
        });
        const json = await res.json();

        if (!json.success) {
          setError(json.error || "Erro ao autenticar");
          return;
        }

        // Sucesso! Vai para o dashboard
        localStorage.removeItem("faam_sso");
        setStatus("Redirecionando...");
        router.push("/dashboard/");
      } catch (e: any) {
        setError("Erro de conexão: " + e.message);
      }
    }

    sso();
  }, [router]);

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20, fontFamily: "sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, maxWidth: 420, textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: "#dc2626", margin: "0 0 8px" }}>Acesso negado</h2>
          <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.5 }}>{error}</p>
          <a
            href="https://faamhospitalar.dpdns.org/"
            style={{ display: "inline-block", marginTop: 20, padding: "10px 24px", background: "#2563eb", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14 }}
          >
            Voltar para o FAAM
          </a>
        </div>
        <p style={{ marginTop: 32, fontSize: 12, color: "#9ca3af" }}>Desenvolvido por Jhonata</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #2563eb", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#6b7280", fontSize: 14 }}>{status}</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ marginTop: 48, fontSize: 12, color: "#9ca3af" }}>Desenvolvido por Jhonata</p>
    </div>
  );
}