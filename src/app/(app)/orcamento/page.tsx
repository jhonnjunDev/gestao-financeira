import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import OrcamentoClient from "@/components/forms/OrcamentoClient";

export const dynamic = "force-dynamic";

export default async function OrcamentoPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  return <OrcamentoClient accountId={account.id} />;
}