import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import ReportsClient from "@/components/forms/ReportsClient";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  return <ReportsClient accountId={account.id} accountName={account.name} />;
}