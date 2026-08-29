import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import ConfigClient from "@/components/forms/ConfigClient";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  return <ConfigClient accountId={account.id} />;
}