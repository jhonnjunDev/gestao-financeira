import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import TransfersClient from "@/components/forms/TransfersClient";

export const dynamic = "force-dynamic";

export default async function TransferenciasPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  return <TransfersClient accountId={account.id} />;
}