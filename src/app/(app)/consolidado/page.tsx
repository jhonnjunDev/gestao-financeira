import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import ConsolidatedClient from "@/components/forms/ConsolidatedClient";

export const dynamic = "force-dynamic";

export default async function ConsolidadoPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  return <ConsolidatedClient accountId={account.id} />;
}