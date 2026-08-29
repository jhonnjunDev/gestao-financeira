import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import CategoriesClient from "@/components/forms/CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  return <CategoriesClient accountId={account.id} />;
}