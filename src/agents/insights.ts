import { askJSON } from "@/lib/claude";

export type InsightSuggestion = {
  kind: "WINNING_HOOK" | "LOSING_HOOK" | "BUDGET_SHIFT" | "WEEKLY_BRIEF";
  title: string;      // <80 chars, headline-style
  body: string;       // 1-3 sentences of reasoning
  action?: string;    // concrete next step the user can take
};

export type InsightsOutput = {
  summary: string;    // 2-3 sentence overview of the week
  suggestions: InsightSuggestion[];
};

export type InsightInput = {
  windowDays: number;
  totals: { clicks: number; conversions: number; revenueCents: number };
  byPlatform: {
    platform: string;
    clicks: number;
    conversions: number;
    revenueCents: number;
    posts: number;
  }[];
  byAd: {
    title: string;
    revenueCents: number;
    clicks: number;
    conversions: number;
    postsShipped: number;
  }[];
  byHook: {
    label: string;
    hook: string;
    revenueCents: number;
    clicks: number;
    conversions: number;
    postsShipped: number;
  }[];
};

const SYSTEM = `You are the performance strategist for AdGen Lab. Every week
you look at this user's attributed-revenue data and tell them three things:
what won, what lost, and what to do next.

Be concrete. Use dollar amounts and percentages from the data — never
invent numbers. Never hedge. Never say "consider" — give the action as a
command ("Promote X to all platforms", "Retire Y", "Rewrite hooks on Z").

Output schema has a top-level summary and up to 5 suggestions. Each
suggestion has a 'kind' indicating which part of the pipeline it
targets. Prefer:

- WINNING_HOOK  a specific hook outperformed its peers
- LOSING_HOOK   a specific hook is under-performing; retire or rewrite
- BUDGET_SHIFT  a channel is doing disproportionate work; lean in
- WEEKLY_BRIEF  a headline about overall momentum (only one of these)

If the dataset is too small to say anything useful, return a single
WEEKLY_BRIEF suggesting what to ship next to start getting signal.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "suggestions"],
  properties: {
    summary: { type: "string" },
    suggestions: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "title", "body"],
        properties: {
          kind: {
            type: "string",
            enum: ["WINNING_HOOK", "LOSING_HOOK", "BUDGET_SHIFT", "WEEKLY_BRIEF"],
          },
          title: { type: "string" },
          body: { type: "string" },
          action: { type: "string" },
        },
      },
    },
  },
};

export async function generateInsights(input: InsightInput): Promise<InsightsOutput> {
  const user = `Window: last ${input.windowDays} days.

Totals: ${input.totals.clicks} clicks · ${input.totals.conversions} conversions · $${(input.totals.revenueCents / 100).toFixed(2)} revenue.

By channel:
${input.byPlatform.map((p) => `- ${p.platform}: $${(p.revenueCents / 100).toFixed(2)} across ${p.posts} posts (${p.clicks} clicks, ${p.conversions} conv)`).join("\n") || "- (none)"}

Top ads:
${input.byAd.slice(0, 5).map((a) => `- ${a.title}: $${(a.revenueCents / 100).toFixed(2)} (${a.postsShipped} posts, ${a.conversions} conv)`).join("\n") || "- (none)"}

Hook variants that have shipped:
${input.byHook.slice(0, 10).map((h) => `- [${h.label}] "${h.hook}" — $${(h.revenueCents / 100).toFixed(2)} across ${h.postsShipped} posts (${h.conversions}/${h.clicks})`).join("\n") || "- (none)"}

Return JSON only.`;

  return askJSON<InsightsOutput>({
    system: SYSTEM,
    user,
    schema: SCHEMA,
    maxTokens: 2048,
  });
}
