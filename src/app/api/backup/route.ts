import { requireAuth } from "@/lib/utils";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  // Localiza o arquivo do banco SQLite
  const prisma = new PrismaClient();
  const datasourceUrl = process.env.DATABASE_URL || "file:./dev.db";
  const filePath = datasourceUrl.replace("file:", "");

  // Caminho relativo ao prisma folder
  const resolvedPath = path.resolve(process.cwd(), "prisma", filePath);

  try {
    if (!fs.existsSync(resolvedPath)) {
      return new Response("Backup não encontrado. Verifique o caminho do banco de dados.", { status: 404 });
    }

    const buffer = fs.readFileSync(resolvedPath);
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `backup-gestao-financeira-${date}.db`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return new Response("Erro ao gerar backup", { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}