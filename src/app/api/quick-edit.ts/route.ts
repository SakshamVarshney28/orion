import { generateText } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@ai-sdk/anthropic";

import { firecrawl } from "@/lib/firecrawl";

const URL_REGEX = /https?:\/\/[^\s)>\]]+/g;

const QUICK_EDIT_PROMPT = `
You are an expert code editor.

Edit the selected code according to the instruction.

Instruction:
{instruction}

Selected code:
{selectedCode}

Full file context:
{fullCode}

{documentation}

Rules:
- Return ONLY the edited code.
- Do not add explanations.
- Preserve indentation and formatting.
- If the instruction cannot be applied, return the original code unchanged.
`;

function clean(text: string): string {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^```.*\n/, "")
    .replace(/```$/, "")
    .trim();
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ editedCode: "" });
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ editedCode: "" });
    }

    const {
      selectedCode = "",
      fullCode = "",
      instruction = "",
    } = body;

    if (!selectedCode || !instruction) {
      return NextResponse.json({ editedCode: "" });
    }

    /* ---------------- DOC SCRAPING (SAFE) ---------------- */

    const urls: string[] = instruction.match(URL_REGEX) || [];
    let documentationContext = "";

    if (urls.length > 0) {
      const results = await Promise.all(
        urls.map(async (url) => {
          try {
            const res = await firecrawl.scrape(url, {
              formats: ["markdown"],
            });

            if (res?.markdown) {
              return `<doc url="${url}">\n${res.markdown}\n</doc>`;
            }

            return null;
          } catch {
            return null;
          }
        })
      );

      const valid = results.filter(Boolean);

      if (valid.length > 0) {
        documentationContext = `<documentation>\n${valid.join(
          "\n\n"
        )}\n</documentation>`;
      }
    }

    /* ---------------- PROMPT ---------------- */

    const prompt = QUICK_EDIT_PROMPT
      .replace("{selectedCode}", selectedCode)
      .replace("{fullCode}", fullCode)
      .replace("{instruction}", instruction)
      .replace("{documentation}", documentationContext);

    /* ---------------- AI CALL (NO SCHEMA) ---------------- */

    const result = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      temperature: 0.2,
      maxOutputTokens: 300,
      prompt,
    });

    return NextResponse.json({
      editedCode: clean(result?.text ?? ""),
    });

  } catch (error: unknown) {
    // ✅ handle abort / ECONNRESET safely
    if (
      error instanceof Error &&
      (error.name === "AbortError" ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any)?.code === "ECONNRESET")
    ) {
      return new Response(null, { status: 499 });
    }

    console.error("Edit error:", error);

    return NextResponse.json({
      editedCode: "",
    });
  }
}