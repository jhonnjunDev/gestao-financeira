import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const transfers = await prisma.transfer.findMany({
    where: {
      OR: [
        { fromAccountId: accountId },
        { toAccountId: accountId },
      ],
    },
    include: {
      fromAccount: { select: { id: true, name: true, icon: true } },
      toAccount: { select: { id: true, name: true, icon: true } },
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  return successResponse(transfers);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fromAccountId, toAccountId, amount, date, description } = body;

  if (!fromAccountId || !toAccountId || !amount) {
    return errorResponse("Conta de origem, destino e valor são obrigatórios");
  }

  if (fromAccountId === toAccountId) {
    return errorResponse("Conta de origem e destino devem ser diferentes");
  }

  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const session = auth.session!;

  try {
    const transfer = await prisma.$transaction(async (tx) => {
      // Criar transferência
      const t = await tx.transfer.create({
        data: { fromAccountId, toAccountId, amount, date: date ? new Date(date) : new Date(), description },
      });

      // Saída na conta de origem
      await tx.transaction.create({
        data: {
          accountId: fromAccountId,
          type: "TRANSFER",
          description: `Transferência para ${toAccountId}: ${description || "Transferência"}`,
          amount,
          date: date ? new Date(date) : new Date(),
          status: "PAID",
          transferId: t.id,
          createdById: session.userId,
        },
      });

      // Entrada na conta de destino
      await tx.transaction.create({
        data: {
          accountId: toAccountId,
          type: "TRANSFER",
          description: `Transferência recebida de ${fromAccountId}: ${description || "Transferência"}`,
          amount,
          date: date ? new Date(date) : new Date(),
          status: "RECEIVED",
          transferId: t.id,
          createdById: session.userId,
        },
      });

      return t;
    });

    await createAuditLog({
      userId: session.userId,
      accountId: fromAccountId,
      action: "CREATE",
      entity: "TRANSFER",
      entityId: transfer.id,
      details: `Transferência de R$ ${amount} realizada`,
    });

    return successResponse(transfer, 201);
  } catch (error) {
    console.error(error);
    return errorResponse("Erro ao realizar transferência", 500);
  }
}