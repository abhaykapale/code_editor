import { type NextRequest, NextResponse } from "next/server";
import { auth } from "../../../auth";

interface ChatHistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequestBody {
  // The current user prompt (sent as "messages" by AiChatSidePanel)
  messages: string;
  history: ChatHistoryMessage[];
  stream?: boolean;
  mode?: string;
  model?: string;
}

// ---------------------------------------------------------------------------
// AI generation
// ---------------------------------------------------------------------------
async function generateAIResponse(
  messages: ChatHistoryMessage[],
  requestedModel?: string,
): Promise<{ text: string; tokens?: number }> {
  const systemPrompt = `You are an expert software engineer, code reviewer, and technical mentor.

Your primary goal is to help developers write high-quality, production-ready software.

Capabilities:
* Explain code clearly and concisely.
* Debug errors and identify root causes.
* Suggest efficient, scalable, and maintainable solutions.
* Review code for bugs, security vulnerabilities, performance issues, and code smells.
* Recommend best practices, design patterns, and architectural improvements.
* Assist with algorithms, data structures, databases, APIs, DevOps, cloud technologies, and system design.
* Help with frontend, backend, mobile, AI/ML, and full-stack development.

Guidelines:
1. Prioritize correctness over assumptions.
2. If the problem is unclear, ask clarifying questions before making assumptions.
3. When providing code:
   * Return complete, runnable solutions whenever possible.
   * Use modern language features and best practices.
   * Keep code readable and maintainable.
   * Avoid unnecessary complexity.
4. When debugging:
   * Explain the root cause.
   * Explain why the issue occurs.
   * Provide a corrected solution.
   * Mention possible edge cases.
5. When reviewing code:
   * Identify bugs.
   * Highlight performance concerns.
   * Point out security risks.
   * Suggest improvements with explanations.
6. When multiple solutions exist:
   * Compare trade-offs.
   * Recommend the most practical approach.
7. For production systems:
   * Consider scalability, reliability, maintainability, security, and developer experience.

Response Format:
* Start with a concise explanation.
* Provide implementation details when needed.
* Use properly formatted code blocks.
* Include edge cases and optimization suggestions when relevant.
* Be practical and solution-oriented.

                        Never invent APIs, libraries, functions, or framework features that do not exist. If uncertain, explicitly state the uncertainty.`;

  const fullMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages,
  ];

  const prompt = fullMessages.map((msg) => {
      const label =
        msg.role === "system"
          ? "System"
          : msg.role === "user"
          ? "User"
          : "Assistant";
      return `${label}: ${msg.content}`;
    }).join("\n\n");

const controller = new AbortController();

const timeout = setTimeout(() => {
  controller.abort();
}, 60_000);

try {
  const baseUrl = process.env.OLLAMA_BASE_URL?.replace(/\/$/, "");

  if (!baseUrl) {
    throw new Error("AI service is not configured. Set OLLAMA_BASE_URL in Vercel.");
  }

  const model = requestedModel || process.env.OLLAMA_MODEL || "gpt-oss:20b";
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.2,
        max_tokens: 2048,
        top_p: 0.9,
        frequency_penalty: 0,
        presence_penalty: 0,
      },
    }),
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(`AI service responded with status ${response.status}`);
  }

  const data = await response.json();

  if (!data.response) {
    throw new Error("No response from AI");
  }

  return {
    text: data.response.trim(),
    tokens: data.eval_count ?? undefined,
  };
} finally {
  clearTimeout(timeout);
}
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body: ChatRequestBody = await request.json();
    const { messages: userMessage, history = [], model = "gpt-oss:20b" } = body;

    if (
      !userMessage ||
      typeof userMessage !== "string" ||
      !userMessage.trim()
    ) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    // Validate history entries
    const validRoles = new Set(["user", "assistant", "system"]);
    const validHistory = Array.isArray(history)
      ? history.filter(
          (msg) => typeof msg.content === "string" && validRoles.has(msg.role),
        )
      : [];

    // Keep last 10 history turns for context window efficiency
    const recentHistory = validHistory.slice(-10);

    const messagesForAI: ChatHistoryMessage[] = [
      ...recentHistory,
      { role: "user", content: userMessage.trim() },
    ];

    const { text: aiResponse, tokens } =
      await generateAIResponse(messagesForAI, model);

    return NextResponse.json(
      {
        response: aiResponse,
        tokens: tokens ?? null,
        model,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        {
          error: "AI request timed out",
        },
        { status: 504 },
      );
    }

    console.error("[/api/chat] error:", error);

    if (error instanceof Error && error.message.startsWith("AI service is not configured")) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
