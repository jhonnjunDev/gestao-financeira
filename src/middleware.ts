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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login e register são públicos (incluindo as APIs de autenticação)
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  // Verificar se é rota protegida
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected && pathname !== "/") {
    return NextResponse.next();
  }

  const token = request.cookies.get("session")?.value;

  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { success: false, error: "Sessão expirada" },
        { status: 401 }
      );
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set("session", "", { maxAge: 0, path: "/" });
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads/).*)",
  ],
};