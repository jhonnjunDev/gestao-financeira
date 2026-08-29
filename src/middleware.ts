import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret"
);

const protectedRoutes = [
  "/dashboard",
  "/movimentacoes",
  "/receitas",
  "/despesas",
  "/contas-a-pagar",
  "/contas-a-receber",
  "/transferencias",
  "/orcamento",
  "/categorias",
  "/centros-de-custo",
  "/fornecedores",
  "/prestacao-de-contas",
  "/relatorios",
  "/documentos",
  "/auditoria",
  "/configuracoes",
  "/consolidado",
  "/api",
];

const BASE_PATH = "/gestao";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Remove o basePath para avaliar as rotas internas
  const p = pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length) || "/"
    : pathname;

  // Login e register são públicos (incluindo as APIs de autenticação)
  if (
    p === "/login" ||
    p === "/register" ||
    p.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  // Verificar se é rota protegida
  const isProtected = protectedRoutes.some((route) =>
    p.startsWith(route)
  );

  if (!isProtected && p !== "/") {
    return NextResponse.next();
  }

  const token = request.cookies.get("session")?.value;

  if (!token) {
    if (p.startsWith("/api")) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL(`${BASE_PATH}/login`, request.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    if (p.startsWith("/api")) {
      return NextResponse.json(
        { success: false, error: "Sessão expirada" },
        { status: 401 }
      );
    }
    const response = NextResponse.redirect(
      new URL(`${BASE_PATH}/login`, request.url)
    );
    response.cookies.set("session", "", { maxAge: 0, path: "/" });
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads/).*)",
  ],
};