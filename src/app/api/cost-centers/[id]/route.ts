import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccountAccess, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const center = await prisma.costCenter.findUnique({ where: { id: params.id } });
    if (!center) return errorResponse("Centro de custo não encontrado", 404);

    const auth = await requireAccountAccess(center.accountId);
    if (auth.error) return auth.error;
    const session = auth.session!;

    const body = await request.json();
    const updated = await prisma.costCenter.update({
      where: { id: params.id },
      data: {
        name: body.name ?? center.name,
        color: body.color ?? center.color,
      },
    });

    await createAuditLog({
      userId: session.userId,
      accountId: center.accountId,
      action: "UPDATE",
      entity: "COST_CENTER",
      entityId: center.id,
      details: `Centro de custo "${center.name}" atualizado`,
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse("Erro ao atualizar centro de custo", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const center = await prisma.costCenter.findUnique({ where: { id: params.id } });
    if (!center) return errorResponse("Centro de custo não encontrado", 404);

    const auth = await requireAccountAccess(center.accountId);
    if (auth.error) return auth.error;
    const session = auth.session!;

    await prisma.costCenter.delete({ where: { id: params.id } });

    await createAuditLog({
      userId: session.userId,
      accountId: center.accountId,
      action: "DELETE",
      entity: "COST_CENTER",
      entityId: center.id,
      details: `Centro de custo "${center.name}" excluído`,
    });

    return successResponse({ message: "Centro de custo excluído" });
  } catch (error) {
    return errorResponse("Não é possível excluir centro de custo em uso", 400);
  }
}