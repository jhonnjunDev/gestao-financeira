import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAccountAccess,
  successResponse,
  errorResponse,
  createAuditLog,
  parseSearchParams,
} from "@/lib/utils";

export async function GET(request: NextRequest) {
  const params = parseSearchParams(request.url);
  if (!params.accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(params.accountId);
  if (auth.error) return auth.error;
  const session = auth.session!;

  const where: any = {
    accountId: params.accountId,
    deletedAt: null,
  };

  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.supplierId) where.supplierId = params.supplierId;
  if (params.costCenterId) where.costCenterId = params.costCenterId;

  if (params.startDate || params.endDate) {
    where.date = {};
    if (params.startDate) where.date.gte = new Date(params.startDate);
    if (params.endDate) where.date.lte = new Date(params.endDate + "T23:59:59");
  }

  if (params.minAmount || params.maxAmount) {
    where.amount = {};
    if (params.minAmount) where.amount.gte = parseFloat(params.minAmount);
    if (params.maxAmount) where.amount.lte = parseFloat(params.maxAmount);
  }

  if (params.search) {
    where.OR = [
      { description: { contains: params.search } },
      { documentNumber: { contains: params.search } },
      { supplier: { name: { contains: params.search } } },
    ];
  }

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: {
        category: true,
        subcategory: true,
        costCenter: true,
        supplier: true,
        attachments: true,
      },
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
  ]);

  return successResponse({ total, transactions });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const accountId = body.accountId;
  if (!accountId) return errorResponse("Conta é obrigatória");

  const auth = await requireAccountAccess(accountId);
  if (auth.error) return auth.error;
  const session = auth.session!;

  if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(session.role)) {
    return errorResponse("Permissão negada", 403);
  }

  try {
    const {
      type,
      description,
      amount,
      date,
      dueDate,
      paymentDate,
      categoryId,
      subcategoryId,
      costCenterId,
      supplierId,
      paymentMethod,
      documentNumber,
      notes,
      status,
      recurring,
    } = body;

    if (!type || !description || !amount || amount <= 0) {
      return errorResponse("Tipo, descrição e valor são obrigatórios");
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId,
        type,
        description,
        amount,
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        categoryId,
        subcategoryId,
        costCenterId,
        supplierId,
        paymentMethod,
        documentNumber,
        notes,
        status: status || (type === "INCOME" ? "RECEIVED" : "PAID"),
        recurring: recurring || false,
        createdById: session.userId,
      },
    });

    await createAuditLog({
      userId: session.userId,
      accountId,
      action: "CREATE",
      entity: "TRANSACTION",
      entityId: transaction.id,
      details: `Lançamento "${description}" (${type}) criado`,
    });

    return successResponse(transaction, 201);
  } catch (error) {
    console.error(error);
    return errorResponse("Erro ao criar lançamento", 500);
  }
}