import { getCurrentAccount } from "@/lib/account-context";
import { redirect } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatDate, formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { FileText, FileImage, File } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const { session, account } = await getCurrentAccount();
  if (!account) redirect("/configuracoes?setup=1");

  const attachments = await prisma.attachment.findMany({
    where: { accountId: account.id },
    include: { transaction: { select: { description: true, amount: true, date: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
        <p className="text-sm text-gray-500">Comprovantes, notas fiscais e anexos da conta</p>
      </div>

      <Card padding={false}>
        {attachments.length === 0 ? (
          <div className="py-16 text-center">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum documento anexado ainda</p>
            <p className="text-sm text-gray-400 mt-1">Os anexos são vinculados aos lançamentos financeiros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Arquivo</th>
                  <th className="table-header">Tipo</th>
                  <th className="table-header">Lançamento</th>
                  <th className="table-header">Valor</th>
                  <th className="table-header">Data</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((a) => {
                  const Icon = a.mimeType.startsWith("image/") ? FileImage : a.mimeType === "application/pdf" ? FileText : File;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{a.fileName}</span>
                        </span>
                      </td>
                      <td className="table-cell text-xs text-gray-500">{a.mimeType}</td>
                      <td className="table-cell">{a.transaction?.description || "-"}</td>
                      <td className="table-cell">{a.transaction ? formatCurrency(a.transaction.amount) : "-"}</td>
                      <td className="table-cell">{formatDate(a.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}