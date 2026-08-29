import { NextRequest } from "next/server";
import { requireAccountAccess, errorResponse } from "@/lib/utils";

// PDF profissional — usa a versão server-side com jsPDF via import dinâmico.
// Para manter a compatibilidade, gera o PDF com a biblioteca jsPDF.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;

  try {
    const { generatePdf } = await import("@/lib/pdf");
    const pdf = await generatePdf(accountId);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="prestacao-de-contas.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return errorResponse("Erro ao gerar o PDF: " + (error as Error).message, 500);
  }
}