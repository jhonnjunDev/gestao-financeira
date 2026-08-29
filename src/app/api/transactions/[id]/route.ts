import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccountAccess, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
    });
    if (!transaction) return errorResponse("Lançamento não encontrado", 404);

    const auth = await requireAccountAccess(transaction.accountId);
    if (auth.error) return auth.error;
    const session = auth.session!;

    if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(session.role)) {
      return errorResponse("Permissão negada", 403);
    }

    const updated = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        type: body.type ?? transaction.type,
        description: body.description ?? transaction.description,
        amount: body.amount ?? transaction.amount,
        date: body.date ? new Date(body.date) : transaction.date,
        dueDate: body.dueDate ? new Date(body.dueDate) : body.dueDate === null ? null : transaction.dueDate,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : body.paymentDate === null ? null : transaction.paymentDate,
        categoryId: body.categoryId ?? transaction.categoryId,
        subcategoryId: body.subcategoryId ?? transaction.subcategoryId,
        costCenterId: body.costCenterId ?? transaction.costCenterId,
        supplierId: body.supplierId ?? transaction.supplierId,
        paymentMethod: body.paymentMethod ?? transaction.paymentMethod,
        documentNumber: body.documentNumber ?? transaction.documentNumber,
        notes: body.notes ?? transaction.notes,
        status: body.status ?? transaction.status,
        recurring: body.recurring ?? transaction.recurring,
      },
    });

    await createAuditLog({
      userId: session.userId,
      accountId: transaction.accountId,
      action: "UPDATE",
      entity: "TRANSACTION",
      entityId: transaction.id,
      details: `Lançamento "${transaction.description}" atualizado`,
      oldValue: JSON.stringify({ amount: transaction.amount, status: transaction.status }),
      newValue: JSON.stringify({ amount: updated.amount, status: updated.status }),
    });

    return successResponse(updated);
  } catch (error) {
    console.error(error);
    return errorResponse("Erro ao atualizar lançamento", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
    });
    if (!transaction) return errorResponse("Lançamento não encontrado", 404);

    const auth = await requireAccountAccess(transaction.accountId);
    if (auth.error) return auth.error;
    const session = auth.session!;

    if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(session.role)) {
      return errorResponse("Permissão negada", 403);
    }

    // Soft delete
    await prisma.transaction.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: session.userId,
      accountId: transaction.accountId,
      action: "DELETE",
      entity: "TRANSACTION",
      entityId: transaction.id,
      details: `Lançamento "${transaction.description}" movido para lixeira`,
    });

    return successResponse({ message: "Lançamento excluído (soft delete)" });
  } catch (error) {
    return errorResponse("Erro ao excluir lançamento", 500);
  }
}