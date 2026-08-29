import { prisma } from "./prisma";
import { createToken, type TokenPayload } from "./jwt";
import { hashPassword, verifyPassword } from "./password";

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ token: string; user: TokenPayload } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const token = await createToken(payload);
  return { token, user: payload };
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) throw new Error("Email já cadastrado");

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: "ADMIN",
    },
  });

  return { id: user.id, name: user.name, email: user.email };
}

export function canAccess(
  userRole: string,
  requiredRole: string
): boolean {
  const hierarchy: Record<string, number> = {
    CONSULTA: 1,
    AUDITOR: 2,
    FINANCEIRO: 3,
    GESTOR: 4,
    ADMIN: 5,
  };
  return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 0);
}