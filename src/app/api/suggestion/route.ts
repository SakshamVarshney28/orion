import { generateText, Output } from "ai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
// import { google } from "@ai-sdk/google";

const suggestionSchema = z.object({
    suggestion: z
        .string()
        .describe(
            "The code to insert at cursor, or empty string if no completion needed"
        ),
});

const SUGGESTION_PROMPT = `
You are a code completion engine.

Predict what code should appear at the cursor.

Rules:
- Return ONLY the code to insert.
- Do not explain anything.
- Do not repeat code already present.
- If no completion is needed return an empty string.

File: {fileName}

Code before cursor:
{textBeforeCursor}

Code after cursor:
{textAfterCursor}
`;

export async function POST(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 },
            );
        }

        const {
            fileName,
            code,
            currentLine,
            previousLines,
            textBeforeCursor,
            textAfterCursor,
            nextLines,
            lineNumber,
        } = await request.json();

        if (!code) {
            return NextResponse.json(
                { error: "Code is required" },
                { status: 400 }
            );
        }

        const prompt = SUGGESTION_PROMPT
            .replace("{fileName}", fileName)
            .replace("{code}", code)
            .replace("{currentLine}", currentLine)
            .replace("{previousLines}", previousLines || "")
            .replace("{textBeforeCursor}", textBeforeCursor)
            .replace("{textAfterCursor}", textAfterCursor)
            .replace("{nextLines}", nextLines || "")
            .replace("{lineNumber}", lineNumber.toString());

        const { output } = await generateText({
            model: anthropic("claude-haiku-4-5-20251001"),
            //   model: google("gemini-2.5-flash-lite"),
            output: Output.object({ schema: suggestionSchema }),
            prompt,
            temperature: 0.1,
            maxOutputTokens: 100,
        });

        return NextResponse.json({ suggestion: output.suggestion })
    } catch (error) {
        console.error("Suggestion error: ", error);
        return NextResponse.json(
            { error: "Failed to generate suggestion" },
            { status: 500 },
        );
    }
}


// code for multimodel with openrouter - keeping it here for reference, but not using it currently since google's gemini-2.5-flash-lite is performing well


// import { generateText } from "ai";
// import { auth } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";

// import { createOpenAI } from "@ai-sdk/openai";
// import { google } from "@ai-sdk/google";
// import { anthropic } from "@ai-sdk/anthropic";

// // OpenRouter provider
// const openrouter = createOpenAI({
//   apiKey: process.env.OPENROUTER_API_KEY,
//   baseURL: "https://openrouter.ai/api/v1",
//   headers: {
//     "HTTP-Referer": "http://localhost:3000",
//     "X-Title": "AI IDE Project",
//   },
// });

// // Cursor-style autocomplete prompt
// const SUGGESTION_PROMPT = `
// You are an AI code completion engine.

// Predict what code should appear at the cursor.

// Rules:
// - Return ONLY the code to insert.
// - Do not explain anything.
// - Do not repeat existing code.
// - If no completion is needed return empty string.

// File: {fileName}

// Code before cursor:
// {textBeforeCursor}

// Code after cursor:
// {textAfterCursor}
// `;

// export async function POST(request: Request) {
//   try {
//     const { userId } = await auth();

//     if (!userId) {
//       return NextResponse.json(
//         { error: "Unauthorized" },
//         { status: 403 }
//       );
//     }

//     const {
//       fileName,
//       textBeforeCursor,
//       textAfterCursor,
//     } = await request.json();

//     const prompt = SUGGESTION_PROMPT
//       .replace("{fileName}", fileName || "")
//       .replace("{textBeforeCursor}", textBeforeCursor || "")
//       .replace("{textAfterCursor}", textAfterCursor || "");

//     // Model priority
//     const models = [
//       openrouter("deepseek/deepseek-chat:free"),
//       openrouter("mistral/devstral-2:free"),
//       openrouter("qwen/qwen3-coder:free"),
//       google("gemini-2.5-flash-lite"),
//       anthropic("claude-haiku-4-5-20251001"),
//     ];

//     let response: Awaited<ReturnType<typeof generateText>> | null = null;

//     for (const model of models) {
//       try {
//         console.log("Trying model:", model.modelId);

//         response = await generateText({
//           model,
//           prompt,
//           temperature: 0.1,
//           maxOutputTokens: 80,
//           timeout: 10000,
//         });

//         if (response.text) {
//           console.log("Success with:", model.modelId);
//           break;
//         }

//       } catch (error: unknown) {
//         console.error("Model failed:", model.modelId);

//         if (error instanceof Error) {
//           console.error(error.message);
//         } else {
//           console.error(error);
//         }
//       }
//     }

//     if (!response || !response.text) {
//       return NextResponse.json(
//         { error: "No suggestion generated" },
//         { status: 500 }
//       );
//     }

//     return NextResponse.json({
//       suggestion: response.text.trim(),
//     });

//   } catch (error) {
//     console.error("Suggestion error:", error);

//     return NextResponse.json(
//       { error: "Failed to generate suggestion" },
//       { status: 500 }
//     );
//   }
// }