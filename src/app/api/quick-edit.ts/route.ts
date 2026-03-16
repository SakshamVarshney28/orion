import { z } from "zod";
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@ai-sdk/anthropic";

import { firecrawl } from "@/lib/firecrawl";

const quickEditSchema = z.object({
    editedCode: z
        .string()
        .describe(
            "The edited version of the selected code based on the instruction"
        ),
});

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

Rules:
- Return ONLY the edited code.
- Do not add explanations.
- Preserve indentation and formatting.
- If the instruction cannot be applied, return the original code unchanged.
`;

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        const { selectedCode, fullCode, instruction } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 400 }
            );
        }

        if (!selectedCode) {
            return NextResponse.json(
                { error: "Selected code is required" },
                { status: 400 }
            );
        }

        if (!instruction) {
            return NextResponse.json(
                { error: "Instruction is required" },
                { status: 400 }
            );
        }

        const urls: string[] = instruction.match(URL_REGEX) || [];
        let documentationContext = "";

        if (urls.length > 0) {
            const scrapedResults = await Promise.all(
                urls.map(async (url) => {
                    try {
                        const result = await firecrawl.scrape(url, {
                            formats: ["markdown"],
                        });

                        if (result.markdown) {
                            return `<doc url="${url}">\n${result.markdown}\n</doc>`;
                        }

                        return null;
                    } catch {
                        return null;
                    }
                })
            );

            const validResults = scrapedResults.filter(Boolean);

            if (validResults.length > 0) {
                documentationContext = `<documentation>\n${validResults.join("\n\n")}\n</documentation>`;
            }
        }

        const prompt = QUICK_EDIT_PROMPT
            .replace("{selectedCode}", selectedCode)
            .replace("{fullCode}", fullCode || "")
            .replace("{instruction}", instruction)
            .replace("{documentation}", documentationContext);

        const { output } = await generateText({
            model: anthropic("claude-haiku-4-5-20251001"),
            temperature: 0.2,
            maxOutputTokens: 300,
            output: Output.object({ schema: quickEditSchema }),
            prompt,

        });

        return NextResponse.json({ editedCode: output.editedCode });
    } catch (error) {
        console.error("Edit error:", error);
        return NextResponse.json(
            { error: "Failed to generate edit" },
            { status: 500 }
        );
    }
};