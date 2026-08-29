import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAccountAccess, successResponse, errorResponse, createAuditLog } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;

  const type = searchParams.get("type") || undefined;
  const categories = await prisma.category.findMany({
    where: { accountId, type, parentId: null },
    include: {
      children: { orderBy: { name: "asc" } },
      _count: { select: { transactions: { where: { deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
  });

  return successResponse(categories);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const accountId = body.accountId;
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;
  const session = auth.session!;

  if (!["ADMIN", "GESTOR"].includes(session.role)) {
    return errorResponse("Permissão negada", 403);
  }

  try {
    const { name, type, color, parentId } = body;
    if (!name || !type) return errorResponse("Nome e tipo são obrigatórios");

    const category = await prisma.category.create({
      data: { accountId, name, type, color: color || "#64748b", parentId },
    });

    await createAuditLog({
      userId: session.userId,
      accountId,
      action: "CREATE",
      entity: "CATEGORY",
      entityId: category.id,
      details: `Categoria "${name}" criada`,
    });

    return successResponse(category, 201);
  } catch (error) {
    return errorResponse("Erro ao criar categoria", 500);
  }
}