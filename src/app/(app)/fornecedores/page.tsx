import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import SuppliersClient from "@/components/forms/SuppliersClient";

export const dynamic = "force-dynamic";

export default async function FornecedoresPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  return <SuppliersClient accountId={account.id} />;
}