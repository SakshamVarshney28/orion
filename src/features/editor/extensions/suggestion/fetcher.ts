import ky from "ky";

type Res = { suggestion?: string };

export async function fetcher(
  payload: {
    fileName: string;
    before: string;
    after: string;
    textBeforeCursor: string;
    textAfterCursor: string;
  },
  signal: AbortSignal
): Promise<string | null> {
  try {
    const res = await ky.post("/api/suggestion", {
      json: payload,
      signal,
      timeout: 8000,
      retry: 0,
    });

    const data = (await res.json()) as Res;

    if (!data || typeof data.suggestion !== "string") {
      return null;
    }

    return data.suggestion || null;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === "AbortError" ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.code === "ERR_ABORTED" ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.code === "ECONNRESET")
    ) {
      return null;
    }

    return null;
  }
}