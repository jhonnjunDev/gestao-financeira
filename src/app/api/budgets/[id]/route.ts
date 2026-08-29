import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccountAccess, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const budget = await prisma.budget.findUnique({ where: { id: params.id } });
    if (!budget) return errorResponse("Orçamento não encontrado", 404);

    const auth = await requireAccountAccess(budget.accountId);
    if (auth.error) return auth.error;
    const session = auth.session!;

    const body = await request.json();
    const updated = await prisma.budget.update({
      where: { id: params.id },
      data: { amount: body.amount ?? budget.amount },
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse("Erro ao atualizar orçamento", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const budget = await prisma.budget.findUnique({ where: { id: params.id } });
    if (!budget) return errorResponse("Orçamento não encontrado", 404);

    const auth = await requireAccountAccess(budget.accountId);
    if (auth.error) return auth.error;
    const session = auth.session!;

    await prisma.budget.delete({ where: { id: params.id } });

    return successResponse({ message: "Orçamento excluído" });
  } catch (error) {
    return errorResponse("Erro ao excluir orçamento", 500);
  }
}