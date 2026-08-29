import { clearSessionCookie } from "@/lib/jwt";
import { redirect } from "next/navigation";

export async function GET() {
  await clearSessionCookie();
  redirect("/login");
}