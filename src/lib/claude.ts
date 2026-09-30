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
export type ImageInput = {
  mediaType: "image/jpeg" | "image/png";
  /** Base64 without a data: prefix or newlines. */
  data: string;
};

export async function askJSON<T>(opts: {
  system: string;
  user: string;
  schema: unknown;
  maxTokens?: number;
  /** Optional images (e.g. video frames), sent before the text. */
  images?: ImageInput[];
}): Promise<T> {
  const content = opts.images?.length
    ? [
        ...opts.images.map((img) => ({
          type: "image" as const,
          source: { type: "base64" as const, media_type: img.mediaType, data: img.data },
        })),
        { type: "text" as const, text: opts.user },
      ]
    : opts.user;

  const params = {
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    thinking: { type: "adaptive" as const },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: toApiSchema(opts.schema) },
    },
    system: [
      {
        type: "text" as const,
        text: opts.system,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [{ role: "user" as const, content }],
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

/**
 * Structured outputs accept only a subset of JSON Schema: no `maxItems`,
 * `minItems` only 0 or 1, and no numeric/string length bounds. Sending
 * them is a 400. Like the official SDK's parse() helper, strip them and
 * restate each one in the field's `description`, so Claude still sees the
 * intent; callers enforce the real bounds when they read the result.
 */
export function toApiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toApiSchema);
  if (!schema || typeof schema !== "object") return schema;

  const out: Record<string, unknown> = {};
  const notes: string[] = [];
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key === "enum" || key === "const" || key === "required") {
      out[key] = value; // literal values — never rewrite
      continue;
    }
    if (key === "minItems" && typeof value === "number") {
      if (value > 1) {
        notes.push(`at least ${value} items`);
        out.minItems = 1;
      } else {
        out.minItems = value;
      }
      continue;
    }
    if (UNSUPPORTED[key] && typeof value === "number") {
      notes.push(key === "maxItems" ? `at most ${value} items` : `${UNSUPPORTED[key]} ${value}`);
      continue;
    }
    if (key === "properties" && value && typeof value === "object") {
      out.properties = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toApiSchema(v)]),
      );
      continue;
    }
    out[key] = toApiSchema(value);
  }
  if (notes.length) {
    const hint = `(${notes.join(", ")})`;
    out.description = typeof out.description === "string" ? `${out.description} ${hint}` : hint;
  }
  return out;
}

const UNSUPPORTED: Record<string, string> = {
  maxItems: "at most",
  minimum: "minimum",
  maximum: "maximum",
  exclusiveMinimum: "greater than",
  exclusiveMaximum: "less than",
  multipleOf: "multiple of",
  minLength: "min length",
  maxLength: "max length",
};
