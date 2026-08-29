import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import TransactionsClient from "@/components/transactions/TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  return <TransactionsClient accountId={account.id} />;
}