import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, createAuditLog } from "@/lib/utils";
import { hashPassword } from "@/lib/password";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return successResponse(users);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const session = auth.session!;

  if (session.role !== "ADMIN") {
    return errorResponse("Somente administrador pode criar usuários", 403);
  }

  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return errorResponse("Nome, email e senha são obrigatórios");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return errorResponse("E-mail já cadastrado");

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role || "FINANCEIRO",
      },
    });

    await createAuditLog({
      userId: session.userId,
      action: "CREATE",
      entity: "USER",
      entityId: user.id,
      details: `Usuário "${name}" criado`,
    });

    return successResponse({ id: user.id, name: user.name, email: user.email, role: user.role }, 201);
  } catch (error) {
    return errorResponse("Erro ao criar usuário", 500);
  }
}