import { NextRequest } from "next/server";
import { registerUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return errorResponse("Todos os campos são obrigatórios");
    }

    if (password.length < 6) {
      return errorResponse("Senha deve ter no mínimo 6 caracteres");
    }

    const user = await registerUser({ name, email, password });
    return successResponse(user, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Erro ao registrar");
  }
}