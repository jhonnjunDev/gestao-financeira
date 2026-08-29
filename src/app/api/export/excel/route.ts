import { NextRequest } from "next/server";
import { requireAccountAccess, errorResponse } from "@/lib/utils";
import { generateProfessionalExcel } from "@/lib/excel";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;

  try {
    const startDate = searchParams.get("startDate") || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    const endDate = searchParams.get("endDate") || new Date().toISOString().slice(0, 10);

    const buffer = await generateProfessionalExcel(accountId, startDate, endDate);

    const fileName = `relatorio-financeiro-${startDate}-a-${endDate}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Excel export error:", error);
    return errorResponse("Erro ao gerar o Excel: " + (error as Error).message, 500);
  }
}