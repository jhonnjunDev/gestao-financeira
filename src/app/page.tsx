import { redirect } from "next/navigation";

// A raiz do sistema redireciona para a tela de login.
// Caminho completo inclui o basePath /gestao para evitar loops de redirect.
export default function Home() {
  redirect("/gestao/login/");
}
