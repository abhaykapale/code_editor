"use server";

import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/db";

export async function handleGoogleSignIn() {
  await signIn("google", {
    redirectTo: "/",
  });
}

export async function handleGithubSignIn() {
  await signIn("github", {
    redirectTo: "/",
  });
}

export const getUserById = async (id: string) => {
  try {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        accounts: true,
      },
    });
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getAccountsByUserId = async (
  userId: string
) => {
  try {
    return await prisma.account.findMany({
      where: {
        userId,
      },
    });
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const currentUser = async () => {
  const session = await auth();

  return session?.user || null;
};