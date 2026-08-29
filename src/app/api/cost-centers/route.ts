import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccountAccess, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;

  const centers = await prisma.costCenter.findMany({
    where: { accountId },
    include: {
      _count: { select: { transactions: { where: { deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
  });

  return successResponse(centers);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const accountId = body.accountId;
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;
  const session = auth.session!;

  try {
    const { name, color } = body;
    if (!name) return errorResponse("Nome é obrigatório");

    const center = await prisma.costCenter.create({
      data: { accountId, name, color: color || "#64748b" },
    });

    await createAuditLog({
      userId: session.userId,
      accountId,
      action: "CREATE",
      entity: "COST_CENTER",
      entityId: center.id,
      details: `Centro de custo "${name}" criado`,
    });

    return successResponse(center, 201);
  } catch (error) {
    return errorResponse("Erro ao criar centro de custo", 500);
  }
}