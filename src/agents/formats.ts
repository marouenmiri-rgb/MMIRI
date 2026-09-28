/**
 * How long the finished video should run, and therefore how much script and
 * how many scenes to write.
 *
 * Length is capped at 60 seconds on purpose. The only footage available is the
 * product's own photographs — usually four to eight. Stretching those over
 * three minutes means half a minute per photograph, which nobody watches. If
 * you want genuinely long video you need footage this pipeline does not have.
 */
export type AdFormat = "short" | "standard" | "long";

export const AD_FORMATS: Record<
  AdFormat,
  {
    label: string;
    /** Target runtime in seconds. */
    seconds: number;
    /** Roughly how many spoken words fit at a natural pace. */
    words: number;
    minScenes: number;
    maxScenes: number;
    blurb: string;
  }
> = {
  short: {
    label: "Short",
    seconds: 15,
    words: 45,
    minScenes: 4,
    maxScenes: 6,
    blurb: "Hook and one promise. Best completion rate.",
  },
  standard: {
    label: "Standard",
    seconds: 30,
    words: 85,
    minScenes: 6,
    maxScenes: 10,
    blurb: "Hook, problem, solution, CTA. The default.",
  },
  long: {
    label: "Long",
    seconds: 60,
    words: 165,
    // 60s over 12 scenes is 5s each — the ceiling the director is given. Any
    // fewer and the two would contradict each other.
    minScenes: 12,
    maxScenes: 18,
    blurb: "Room for proof and objections. Reels and Shorts allow it.",
  },
};

export const DEFAULT_FORMAT: AdFormat = "standard";

export function asFormat(value: unknown): AdFormat {
  return value === "short" || value === "standard" || value === "long"
    ? value
    : DEFAULT_FORMAT;
}
