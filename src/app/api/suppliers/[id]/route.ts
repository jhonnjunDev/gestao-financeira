import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccountAccess, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
    if (!supplier) return errorResponse("Fornecedor não encontrado", 404);

    const auth = await requireAccountAccess(supplier.accountId);
    if (auth.error) return auth.error;
    const session = auth.session!;

    const body = await request.json();
    const updated = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        name: body.name ?? supplier.name,
        document: body.document ?? supplier.document,
        phone: body.phone ?? supplier.phone,
        email: body.email ?? supplier.email,
        address: body.address ?? supplier.address,
        bankData: body.bankData ?? supplier.bankData,
        notes: body.notes ?? supplier.notes,
      },
    });

    await createAuditLog({
      userId: session.userId,
      accountId: supplier.accountId,
      action: "UPDATE",
      entity: "SUPPLIER",
      entityId: supplier.id,
      details: `Fornecedor "${supplier.name}" atualizado`,
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse("Erro ao atualizar fornecedor", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
    if (!supplier) return errorResponse("Fornecedor não encontrado", 404);

    const auth = await requireAccountAccess(supplier.accountId);
    if (auth.error) return auth.error;
    const session = auth.session!;

    await prisma.supplier.delete({ where: { id: params.id } });

    await createAuditLog({
      userId: session.userId,
      accountId: supplier.accountId,
      action: "DELETE",
      entity: "SUPPLIER",
      entityId: supplier.id,
      details: `Fornecedor "${supplier.name}" excluído`,
    });

    return successResponse({ message: "Fornecedor excluído" });
  } catch (error) {
    return errorResponse("Não é possível excluir fornecedor em uso", 400);
  }
}