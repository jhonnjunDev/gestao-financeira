import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccountAccess, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const category = await prisma.category.findUnique({ where: { id: params.id } });
    if (!category) return errorResponse("Categoria não encontrada", 404);

    const auth = await requireAccountAccess(category.accountId);
    if (auth.error) return auth.error;
    const session = auth.session!;

    const body = await request.json();
    const updated = await prisma.category.update({
      where: { id: params.id },
      data: {
        name: body.name ?? category.name,
        color: body.color ?? category.color,
        parentId: body.parentId ?? category.parentId,
      },
    });

    await createAuditLog({
      userId: session.userId,
      accountId: category.accountId,
      action: "UPDATE",
      entity: "CATEGORY",
      entityId: category.id,
      details: `Categoria "${category.name}" atualizada`,
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse("Erro ao atualizar categoria", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const category = await prisma.category.findUnique({ where: { id: params.id } });
    if (!category) return errorResponse("Categoria não encontrada", 404);

    const auth = await requireAccountAccess(category.accountId);
    if (auth.error) return auth.error;
    const session = auth.session!;

    await prisma.category.delete({ where: { id: params.id } });

    await createAuditLog({
      userId: session.userId,
      accountId: category.accountId,
      action: "DELETE",
      entity: "CATEGORY",
      entityId: category.id,
      details: `Categoria "${category.name}" excluída`,
    });

    return successResponse({ message: "Categoria excluída" });
  } catch (error) {
    return errorResponse("Não é possível excluir categoria em uso", 400);
  }
}