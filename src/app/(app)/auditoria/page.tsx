import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  const logs = await prisma.auditLog.findMany({
    where: { accountId: account.id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const actionColors: Record<string, string> = {
    CREATE: "success",
    UPDATE: "info",
    DELETE: "danger",
    LOGIN: "default",
    EXPORT: "warning",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditoria</h1>
        <p className="text-sm text-gray-500">
          Histórico de ações na conta — {logs.length} registros. O log de auditoria é imutável.
        </p>
      </div>

      <Card padding={false}>
        {logs.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma ação registrada ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Data/Hora</th>
                  <th className="table-header">Usuário</th>
                  <th className="table-header">Ação</th>
                  <th className="table-header">Entidade</th>
                  <th className="table-header">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="table-cell whitespace-nowrap font-medium">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="table-cell">{log.user?.name || "Sistema"}</td>
                    <td className="table-cell">
                      <Badge variant={(actionColors[log.action] || "default") as any}>{log.action}</Badge>
                    </td>
                    <td className="table-cell text-xs text-gray-500">{log.entity}{log.entityId ? ` #${log.entityId.slice(0, 6)}` : ""}</td>
                    <td className="table-cell text-sm text-gray-600">{log.details || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}