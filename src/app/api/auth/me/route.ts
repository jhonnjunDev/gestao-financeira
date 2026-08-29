import { requireAuth } from "@/lib/utils";

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;
  return Response.json({ success: true, data: session });
}