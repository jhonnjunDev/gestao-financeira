import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAccountAccess, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAccountAccess(params.id);
  if (auth.error) return auth.error;
  const session = auth.session!;

  if (!["ADMIN", "GESTOR"].includes(session.role)) {
    return errorResponse("Permissão negada", 403);
  }

  try {
    const body = await request.json();
    const account = await prisma.account.findUnique({ where: { id: params.id } });
    if (!account) return errorResponse("Conta não encontrada", 404);

    const updated = await prisma.account.update({
      where: { id: params.id },
      data: {
        name: body.name ?? account.name,
        type: body.type ?? account.type,
        color: body.color ?? account.color,
        icon: body.icon ?? account.icon,
        description: body.description ?? account.description,
        responsible: body.responsible ?? account.responsible,
        active: body.active ?? account.active,
        archived: body.archived ?? account.archived,
      },
    });

    await createAuditLog({
      userId: session.userId,
      accountId: account.id,
      action: "UPDATE",
      entity: "ACCOUNT",
      entityId: account.id,
      details: `Conta "${account.name}" atualizada`,
      oldValue: account.name,
      newValue: updated.name,
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse("Erro ao atualizar conta", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAccountAccess(params.id);
  if (auth.error) return auth.error;
  const session = auth.session!;

  if (session.role !== "ADMIN") {
    return errorResponse("Somente administrador pode excluir contas", 403);
  }

  try {
    // Soft delete: arquiva
    const account = await prisma.account.update({
      where: { id: params.id },
      data: { archived: true },
    });

    await createAuditLog({
      userId: session.userId,
      accountId: account.id,
      action: "DELETE",
      entity: "ACCOUNT",
      entityId: account.id,
      details: `Conta "${account.name}" arquivada`,
    });

    return successResponse({ message: "Conta arquivada com sucesso" });
  } catch (error) {
    return errorResponse("Erro ao arquivar conta", 500);
  }
}