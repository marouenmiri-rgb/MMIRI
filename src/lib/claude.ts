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
 * Ask Claude for a JSON object matching the given schema. Uses adaptive
 * thinking + high effort for quality reasoning in the ad pipeline.
 */
export async function askJSON<T>(opts: {
  system: string;
  user: string;
  schema: unknown;
  maxTokens?: number;
}): Promise<T> {
  const resp = await claude().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: {
        type: "json_schema",
        schema: opts.schema,
      },
    } as unknown as Anthropic.Messages.MessageCreateParams["output_config"],
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });

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
