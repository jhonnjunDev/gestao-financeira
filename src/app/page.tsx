import { redirect } from "next/navigation";

// Com basePath /gestao, redirect("/login/") vira automaticamente /gestao/login/
export default function Home() {
  redirect("/login/");
}
