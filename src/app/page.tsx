"use client";
import { useEffect } from "react";

// Redireciona a raiz do sistema para a tela de login via JS.
// Evita o loop/erro do redirect server-side com basePath + trailingSlash.
export default function Home() {
  useEffect(() => {
    window.location.replace("/gestao/login/");
  }, []);
  return null;
}
