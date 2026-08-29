import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/jwt";
import { setSessionCookie } from "@/lib/jwt";
import { hashPassword } from "@/lib/password";
import { successResponse, errorResponse, createAuditLog } from "@/lib/utils";

// SSO a partir da sessão do FAAM (mesma origem — faamhospitalar.dpdns.org)
// O FAAM envia a sessão assinada dele; aqui validamos o perfil e criamos
// a sessão JWT do sistema de gestão financeira automaticamente.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nome, email, perfil } = body;

    if (!email || !perfil) {
      return errorResponse("Dados de sessão inválidos");
    }

    // Somente admin e admin_master do FAAM podem acessar o financeiro
    if (perfil !== "admin" && perfil !== "admin_master") {
      return errorResponse(
        "Acesso restrito: somente administradores podem acessar o sistema financeiro",
        403
      );
    }

    // Encontra ou cria o usuário no sistema financeiro (papel ADMIN)
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Cria com senha aleatória — login direto não é usado, apenas SSO
      const senhaAleatoria = Math.random().toString(36).slice(2, 14);
      user = await prisma.user.create({
        data: {
          name: nome || email.split("@")[0],
          email,
          passwordHash: await hashPassword(senhaAleatoria),
          role: "ADMIN",
        },
      });
    } else {
      user = await prisma.user.update({
        where: { email },
        data: { name: nome || user.name, active: true },
      });
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    await setSessionCookie(token);

    await createAuditLog({
      userId: user.id,
      action: "LOGIN",
      entity: "USER",
      entityId: user.id,
      details: `Login automático via FAAM (${perfil})`,
    });

    return successResponse({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("SSO error:", error);
    return errorResponse("Erro no login automático", 500);
  }
}