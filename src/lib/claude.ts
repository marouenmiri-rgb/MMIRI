import Anthropic from "@anthropic-ai/sdk";
import { env, hasClaude } from "./env";

export const CLAUDE_MODEL = "claude-opus-4-7";

let client: Anthropic | null = null;

export function claude(): Anthropic {
  if (!hasClaude) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — add it to .env to enable AI features.",
    );
  }
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY! });
  return client;
}

/**
 * Ask Claude for a JSON object matching the given schema.
 *
 * - Adaptive thinking + high effort for quality reasoning.
 * - Each agent's system prompt is marked with `cache_control: ephemeral`, so
 *   repeated calls within ~5 minutes hit the cache (~90% cheaper for the
 *   system block). Invariant: system text must be byte-stable per agent —
 *   no timestamps, per-user context, or JSON.stringify of unsorted objects.
 */
export async function askJSON<T>(opts: {
  system: string;
  user: string;
  schema: unknown;
  maxTokens?: number;
}): Promise<T> {
  const params = {
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    thinking: { type: "adaptive" as const },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: opts.schema },
    },
    system: [
      {
        type: "text" as const,
        text: opts.system,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [{ role: "user" as const, content: opts.user }],
  };

  const resp = await claude().messages.create(
    params as unknown as Anthropic.Messages.MessageCreateParamsNonStreaming,
  );

  for (const block of resp.content) {
    if (block.type === "text") {
      try {
        return JSON.parse(block.text) as T;
      } catch {
        const match = block.text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]) as T;
        throw new Error("Claude did not return valid JSON");
      }
    }
  }
  throw new Error("Claude returned no text content");
}
