import Anthropic from "@anthropic-ai/sdk";
import { env, hasClaude } from "./env";

/**
 * Model per job, not one model for everything.
 *
 * Every agent used to run Opus at high effort. For the work these agents
 * actually do — four lines of ad copy, a shot list, a caption — that is
 * several times the cost for no difference a buyer would notice, and it put
 * the 50-video tier close to underwater. Reasoning-heavy jobs keep the bigger
 * model; the rest drop down.
 *
 * Overridable per deployment so pricing can be retuned without a code change.
 */
export const MODELS = {
  /** Short, high-craft copy. Quality here is what the customer sees. */
  copy: env.CLAUDE_MODEL_COPY,
  /** Structured planning over a handful of images. */
  plan: env.CLAUDE_MODEL_PLAN,
  /** Mechanical reformatting — captions, subject lines. */
  fast: env.CLAUDE_MODEL_FAST,
  /** Multi-step analysis over a whole account's numbers. */
  reason: env.CLAUDE_MODEL_REASON,
} as const;

export type ModelRole = keyof typeof MODELS;

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
 * Each agent's system prompt is sent with `cache_control: ephemeral`, so
 * repeated calls within the cache window are far cheaper for that block.
 * Invariant: system text must be byte-stable per agent — no timestamps, no
 * per-user context, no JSON.stringify of unsorted objects.
 */
export async function askJSON<T>(opts: {
  system: string;
  user: string;
  schema: unknown;
  maxTokens?: number;
  /** Which model tier this job needs. Defaults to the cheap one on purpose. */
  role?: ModelRole;
  /** Extended thinking budget, in tokens. Omit for no thinking. */
  thinkingTokens?: number;
}): Promise<T> {
  const model = MODELS[opts.role ?? "fast"];
  const maxTokens = opts.maxTokens ?? 2048;

  const resp = await claude().messages.create({
    model,
    max_tokens: maxTokens,
    ...(opts.thinkingTokens
      ? {
          // The API requires max_tokens to exceed the thinking budget.
          max_tokens: Math.max(maxTokens, opts.thinkingTokens + 1024),
          thinking: { type: "enabled", budget_tokens: opts.thinkingTokens },
        }
      : {}),
    system: [
      {
        type: "text",
        text: opts.system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        // The schema travels with the request so the contract and the prompt
        // can never drift apart.
        content: `${opts.user}\n\nReturn ONLY a JSON object matching this schema, with no prose and no code fence:\n${JSON.stringify(opts.schema)}`,
      },
    ],
  });

  for (const block of resp.content) {
    if (block.type === "text") {
      return parseJson<T>(block.text);
    }
  }
  throw new Error("Claude returned no text content");
}

/** Tolerates a code fence or stray prose around the object. */
function parseJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Claude did not return valid JSON");
  }
}
