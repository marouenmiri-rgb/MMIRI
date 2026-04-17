/**
 * Hook Radar — curated bank of proven short-form video hook patterns.
 *
 * Each entry is a pattern (formula) with category, momentum (a 0-100
 * "trending" score), and 1-2 real-world example openings. Future revs
 * replace the static `momentum` with a real ingestion pipeline that
 * scores hooks by how well they're performing on TikTok/Reels right now;
 * the schema doesn't change, only the source of `momentum`.
 */

export type HookCategory =
  | "PATTERN_INTERRUPT"
  | "SPECIFICITY_SHOCK"
  | "CURIOSITY_GAP"
  | "SOCIAL_PROOF"
  | "CONTROVERSY"
  | "QUESTION"
  | "STORY"
  | "DEMO";

export const CATEGORIES: { id: HookCategory; label: string; color: string }[] = [
  { id: "PATTERN_INTERRUPT", label: "Pattern interrupt", color: "#a78bfa" },
  { id: "SPECIFICITY_SHOCK", label: "Specificity shock", color: "#c3ff3e" },
  { id: "CURIOSITY_GAP", label: "Curiosity gap", color: "#f59e0b" },
  { id: "SOCIAL_PROOF", label: "Social proof", color: "#22d3ee" },
  { id: "CONTROVERSY", label: "Controversy", color: "#ef4444" },
  { id: "QUESTION", label: "Question hook", color: "#e94a85" },
  { id: "STORY", label: "Story open", color: "#a78bfa" },
  { id: "DEMO", label: "Demonstration", color: "#c3ff3e" },
];

export type HookTemplate = {
  id: string;
  category: HookCategory;
  formula: string;        // the pattern, e.g. "Stop {action} if you {context}"
  examples: string[];     // 1-2 real openings using this pattern
  momentum: number;       // 0-100, used to sort & glow the visual
  blurb: string;          // 1-line guidance on when to use it
};

export const HOOK_TEMPLATES: HookTemplate[] = [
  // PATTERN_INTERRUPT
  {
    id: "pi-1",
    category: "PATTERN_INTERRUPT",
    formula: "Stop scrolling if you {pain point}.",
    examples: [
      "Stop scrolling if your coffee goes cold by 9am.",
      "Stop scrolling if your dog still sheds on every couch you own.",
    ],
    momentum: 94,
    blurb: "The classic. Calls out a specific pain to halt the thumb mid-flick.",
  },
  {
    id: "pi-2",
    category: "PATTERN_INTERRUPT",
    formula: "Wait — this is actually genius.",
    examples: [
      "Wait — this is actually genius. I've been doing it wrong for years.",
    ],
    momentum: 81,
    blurb: "Self-correcting open. Implies discovery, hooks the curiosity.",
  },
  {
    id: "pi-3",
    category: "PATTERN_INTERRUPT",
    formula: "I shouldn't be sharing this but...",
    examples: [
      "I shouldn't be sharing this but our supplier is going to hate me.",
    ],
    momentum: 73,
    blurb: "Forbidden-knowledge framing. Use sparingly — overplayed.",
  },

  // SPECIFICITY_SHOCK
  {
    id: "sp-1",
    category: "SPECIFICITY_SHOCK",
    formula: "I saved ${amount} last year by doing this one thing.",
    examples: [
      "I saved $1,847 last year by switching to {product}.",
    ],
    momentum: 92,
    blurb: "Numbers > adjectives. Always cite the exact dollar amount.",
  },
  {
    id: "sp-2",
    category: "SPECIFICITY_SHOCK",
    formula: "From {bad outcome} to {good outcome} in {n} days.",
    examples: [
      "From 3-coffee-a-day exhausted to clear-headed by 10am in 14 days.",
    ],
    momentum: 88,
    blurb: "Transformation arc compressed into one number.",
  },
  {
    id: "sp-3",
    category: "SPECIFICITY_SHOCK",
    formula: "{Surprising stat} of people don't know this about {category}.",
    examples: [
      "94% of skincare buyers don't know this about retinol.",
    ],
    momentum: 67,
    blurb: "A real statistic creates instant authority. Don't fake it.",
  },

  // CURIOSITY_GAP
  {
    id: "cg-1",
    category: "CURIOSITY_GAP",
    formula: "POV: you finally figured out {hard thing}.",
    examples: [
      "POV: you finally figured out how to actually wash your shoes.",
    ],
    momentum: 90,
    blurb: "POV format dominates Gen-Z feeds. Pair with a satisfying reveal.",
  },
  {
    id: "cg-2",
    category: "CURIOSITY_GAP",
    formula: "Nobody talks about {thing} but it changed everything for me.",
    examples: [
      "Nobody talks about jaw posture but it changed how my face looks.",
    ],
    momentum: 78,
    blurb: "Hidden-gem framing. Works best with non-obvious benefits.",
  },
  {
    id: "cg-3",
    category: "CURIOSITY_GAP",
    formula: "Here's the {n}-second trick {audience} swear by.",
    examples: [
      "Here's the 30-second trick chefs swear by for crispy skin.",
    ],
    momentum: 71,
    blurb: "Borrowed authority + a time bound. Reliable opener.",
  },

  // SOCIAL_PROOF
  {
    id: "sc-1",
    category: "SOCIAL_PROOF",
    formula: "Why {n} {audience} switched from {old} to {new} this month.",
    examples: [
      "Why 6,400 runners switched from cushioned soles to minimalist this month.",
    ],
    momentum: 86,
    blurb: "Specific number + named audience + recency. Hard to fake.",
  },
  {
    id: "sc-2",
    category: "SOCIAL_PROOF",
    formula: "This is why everyone's buying {product} right now.",
    examples: [
      "This is why everyone's buying mineral SPF right now.",
    ],
    momentum: 79,
    blurb: "FOMO frame. Pair with a real reason in the next line.",
  },

  // CONTROVERSY
  {
    id: "co-1",
    category: "CONTROVERSY",
    formula: "Your {old solution} is actually making {problem} worse.",
    examples: [
      "Your moisturizer is actually making your dry skin worse.",
    ],
    momentum: 83,
    blurb: "Accuses the obvious solution. Must back it up immediately.",
  },
  {
    id: "co-2",
    category: "CONTROVERSY",
    formula: "Unpopular opinion: {bold claim}.",
    examples: [
      "Unpopular opinion: your French press is making bad coffee.",
    ],
    momentum: 76,
    blurb: "Take a stance creators won't take. Earned attention.",
  },
  {
    id: "co-3",
    category: "CONTROVERSY",
    formula: "{Big brand} doesn't want you to know this.",
    examples: [
      "Nike doesn't want you to know this about cushioning.",
    ],
    momentum: 64,
    blurb: "Risky — cite the specific receipt or it reads as clickbait.",
  },

  // QUESTION
  {
    id: "qu-1",
    category: "QUESTION",
    formula: "Have you ever noticed {subtle thing nobody talks about}?",
    examples: [
      "Have you ever noticed how every gym water bottle smells weird after a week?",
    ],
    momentum: 84,
    blurb: "Universal-experience question. Builds 'me too' resonance fast.",
  },
  {
    id: "qu-2",
    category: "QUESTION",
    formula: "What if I told you {surprising claim}?",
    examples: [
      "What if I told you the temperature of your coffee drops 30°F in 12 minutes?",
    ],
    momentum: 70,
    blurb: "Sets up a reveal. Make sure the answer over-delivers.",
  },

  // STORY
  {
    id: "st-1",
    category: "STORY",
    formula: "I tried {thing} for 30 days. Here's what happened.",
    examples: [
      "I tried Ember Mug for 30 days. Here's what happened to my morning.",
    ],
    momentum: 91,
    blurb: "30-day-challenge framing is a TikTok evergreen. Bring receipts.",
  },
  {
    id: "st-2",
    category: "STORY",
    formula: "This is the {product} that quietly changed my routine.",
    examples: [
      "This is the travel mug that quietly changed my morning meetings.",
    ],
    momentum: 75,
    blurb: "Lower-key, anti-hype frame. Works for premium brands.",
  },
  {
    id: "st-3",
    category: "STORY",
    formula: "I bought {product} as a joke. Now I use it every day.",
    examples: [
      "I bought this $90 mug as a joke. Now my whole office has one.",
    ],
    momentum: 87,
    blurb: "Conversion arc — skeptic to believer. Reads authentic.",
  },

  // DEMO
  {
    id: "dm-1",
    category: "DEMO",
    formula: "Watch what happens when you {specific action}.",
    examples: [
      "Watch what happens when you pour iced coffee into this mug.",
    ],
    momentum: 89,
    blurb: "Visual-first hook. Every word delays the payoff — keep it short.",
  },
  {
    id: "dm-2",
    category: "DEMO",
    formula: "{Product} vs the alternative — side by side.",
    examples: [
      "Ember Mug 2 vs your old Yeti — side by side, in real time.",
    ],
    momentum: 80,
    blurb: "Comparison shots over-perform. Promise honesty in the format.",
  },
  {
    id: "dm-3",
    category: "DEMO",
    formula: "Three things this {product} does that nothing else does.",
    examples: [
      "Three things Ember Mug does that no other mug does.",
    ],
    momentum: 72,
    blurb: "Listicle structure that the algorithm loves. Cap at 3 items.",
  },
];

export function categoryMeta(id: HookCategory) {
  return CATEGORIES.find((c) => c.id === id)!;
}
