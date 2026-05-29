"use server";

import { prisma } from "@/lib/db";
import { currentUser } from "@/modules/auth/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SavedChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// saveChatMessage
// Persists a single message row. Fire-and-forget friendly — callers do NOT
// need to await this; failures are logged, never thrown.
// ---------------------------------------------------------------------------
export async function saveChatMessage(
  playgroundId: string,
  role: "user" | "assistant",
  content: string
): Promise<{ ok: boolean; id?: string }> {
  try {
    const user = await currentUser();
    if (!user?.id) return { ok: false };

    // Guard: playground must belong to the user
    const playground = await prisma.playground.findFirst({
      where: { id: playgroundId, userId: user.id },
      select: { id: true },
    });
    if (!playground) return { ok: false };

    const message = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        playgroundId,
        role,
        content,
      },
      select: { id: true },
    });

    return { ok: true, id: message.id };
  } catch (error) {
    console.error("[saveChatMessage] error:", error);
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// getChatMessages
// Loads the most recent `limit` messages for a playground, oldest-first so
// the UI can render them in chronological order.
// ---------------------------------------------------------------------------
export async function getChatMessages(
  playgroundId: string,
  limit = 50
): Promise<SavedChatMessage[]> {
  try {
    const user = await currentUser();
    if (!user?.id) return [];

    const rows = await prisma.chatMessage.findMany({
      where: { playgroundId, userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    // Reverse so the oldest message is first (chronological order for the UI)
    return rows.reverse().map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant",
      content: r.content,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    console.error("[getChatMessages] error:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// clearChatMessages
// Deletes all messages for a playground scoped to the current user.
// ---------------------------------------------------------------------------
export async function clearChatMessages(
  playgroundId: string
): Promise<{ ok: boolean; deleted?: number }> {
  try {
    const user = await currentUser();
    if (!user?.id) return { ok: false };

    const result = await prisma.chatMessage.deleteMany({
      where: { playgroundId, userId: user.id },
    });

    return { ok: true, deleted: result.count };
  } catch (error) {
    console.error("[clearChatMessages] error:", error);
    return { ok: false };
  }
}
