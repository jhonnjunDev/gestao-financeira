import { NextResponse } from "next/server";
import { getSession } from "./jwt";
import { prisma } from "./prisma";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error }, { status });
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return { error: errorResponse("Não autorizado", 401), session: null };
  }
  return { error: null, session };
}

export async function requireAccountAccess(accountId: string) {
  const auth = await requireAuth();
  if (auth.error) return auth;

  const access = await prisma.userAccount.findFirst({
    where: {
      userId: auth.session!.userId,
      accountId,
      account: { active: true, archived: false },
    },
  });

  if (!access && auth.session!.role !== "ADMIN") {
    // Admins can access all accounts
    const adminAccess = await prisma.user.findFirst({
      where: { id: auth.session!.userId, role: "ADMIN" },
    });
    if (!adminAccess) {
      return { error: errorResponse("Acesso negado a esta conta", 403), session: null };
    }
  }

  return auth;
}

export async function createAuditLog(params: {
  accountId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
}) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch {
    // Não falha a operação principal se o audit log falhar
  }
}

export function parseSearchParams(url: string) {
  const { searchParams } = new URL(url);
  return {
    accountId: searchParams.get("accountId") || undefined,
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || "50"),
    search: searchParams.get("search") || undefined,
    type: searchParams.get("type") || undefined,
    status: searchParams.get("status") || undefined,
    categoryId: searchParams.get("categoryId") || undefined,
    supplierId: searchParams.get("supplierId") || undefined,
    costCenterId: searchParams.get("costCenterId") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    minAmount: searchParams.get("minAmount") || undefined,
    maxAmount: searchParams.get("maxAmount") || undefined,
    sortBy: searchParams.get("sortBy") || "date",
    sortOrder: searchParams.get("sortOrder") || "desc",
  };
}

export function getDateRange(period: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case "month": {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      return { start, end };
    }
    case "quarter": {
      const q = Math.floor(month / 3);
      const start = new Date(year, q * 3, 1);
      const end = new Date(year, q * 3 + 3, 0, 23, 59, 59);
      return { start, end };
    }
    case "semester": {
      const s = Math.floor(month / 6);
      const start = new Date(year, s * 6, 1);
      const end = new Date(year, s * 6 + 6, 0, 23, 59, 59);
      return { start, end };
    }
    case "year": {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      return { start, end };
    }
    default: {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      return { start, end };
    }
  }
}