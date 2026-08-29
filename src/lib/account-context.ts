import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSession } from "./jwt";

export async function getCurrentAccount() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = cookies();
  const accountId = cookieStore.get("current_account")?.value;

  let account = null;
  if (accountId) {
    account = await prisma.account.findFirst({
      where: { id: accountId, archived: false },
    });
  }

  if (!account) {
    if (session.role === "ADMIN") {
      account = await prisma.account.findFirst({ where: { archived: false } });
    } else {
      account = await prisma.account.findFirst({
        where: { archived: false, userAccounts: { some: { userId: session.userId } } },
      });
    }
  }

  return { session, account };
}

export async function getUserAccounts() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "ADMIN") {
    return prisma.account.findMany({ where: { archived: false }, orderBy: { name: "asc" } });
  }
  return prisma.account.findMany({
    where: { archived: false, userAccounts: { some: { userId: session.userId } } },
    orderBy: { name: "asc" },
  });
}