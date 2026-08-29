import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateUser, registerUser } from "@/lib/auth";
import { setSessionCookie, clearSessionCookie } from "@/lib/jwt";
import { createAuditLog, successResponse, errorResponse } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return errorResponse("Email e senha são obrigatórios");
    }

    const result = await authenticateUser(email, password);
    if (!result) {
      return errorResponse("Email ou senha inválidos", 401);
    }

    const response = successResponse({ user: result.user });
    await setSessionCookie(result.token);

    await createAuditLog({
      userId: result.user.userId,
      action: "LOGIN",
      entity: "USER",
      entityId: result.user.userId,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Erro interno do servidor", 500);
  }
}