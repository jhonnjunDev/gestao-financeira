import LoginPage from "./login/page";

// A raiz do sistema (basePath /gestao) renderiza o login diretamente
// para evitar loops de redirect com basePath + trailingSlash.
export default function Home() {
  return <LoginPage />;
}
