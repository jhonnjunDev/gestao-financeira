import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import { ResourceClient } from "@/components/forms/ResourceClient";

export const dynamic = "force-dynamic";

export default async function CentrosDeCustoPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  return (
    <ResourceClient
      accountId={account.id}
      apiPath="/api/cost-centers"
      title="Centros de custos"
      description="Acompanhe os gastos por setor, unidade ou projeto"
      itemLabel="centro de custo"
    />
  );
}