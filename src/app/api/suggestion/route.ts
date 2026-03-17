import { generateText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";

const PROMPT = `
You are a code autocomplete engine.

Return ONLY code to insert.

Rules:
- No explanation
- No repetition
- Short output
- Empty if unsure

File: {fileName}

Before:
{before}

Cursor:
{textBeforeCursor}|{textAfterCursor}

After:
{after}
`;

function clean(text: string): string {
  if (!text) return "";
  return text.replace(/```[\s\S]*?```/g, "").trim();
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ suggestion: "" });
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ suggestion: "" });
    }

    const {
      fileName = "",
      before = "",
      after = "",
      textBeforeCursor = "",
      textAfterCursor = "",
    } = body;

    const prompt = PROMPT
      .replace("{fileName}", fileName)
      .replace("{before}", before)
      .replace("{after}", after)
      .replace("{textBeforeCursor}", textBeforeCursor)
      .replace("{textAfterCursor}", textAfterCursor);

    const result = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
      temperature: 0.05,
      maxOutputTokens: 60,
    });

    return NextResponse.json({
      suggestion: clean(result?.text ?? ""),
    });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === "AbortError" ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.code === "ECONNRESET")
    ) {
      return new Response(null, { status: 499 });
    }

    return NextResponse.json({ suggestion: "" });
  }
}