/**
 * Cartoon sketch — the typed hand-off between the Cartoonist agent (Claude
 * writes the comedy) and the renderer (draws + animates it). Every enum here
 * maps to something the renderer knows how to draw, so Claude can only ask
 * for things we can actually put on screen.
 */

export const CHARACTER_KINDS = [
  "blob",
  "cat",
  "dog",
  "bear",
  "frog",
  "robot",
  "bird",
  "human",
] as const;
export type CharacterKind = (typeof CHARACTER_KINDS)[number];

export const ACCESSORIES = [
  "none",
  "party-hat",
  "top-hat",
  "cap",
  "crown",
  "glasses",
  "bow",
] as const;
export type Accessory = (typeof ACCESSORIES)[number];

export const VOICES = ["high", "mid", "low"] as const;
export type Voice = (typeof VOICES)[number];

export const EXPRESSIONS = [
  "neutral",
  "happy",
  "laughing",
  "shocked",
  "angry",
  "sad",
  "smug",
  "confused",
  "scared",
  "love",
] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export const ACTIONS = [
  "idle",
  "bounce",
  "shake",
  "jump",
  "enter-left",
  "enter-right",
  "fall-in",
  "spin",
] as const;
export type Action = (typeof ACTIONS)[number];

export const SETTINGS = [
  "kitchen",
  "office",
  "living-room",
  "street",
  "park",
  "beach",
  "space",
  "store",
] as const;
export type Setting = (typeof SETTINGS)[number];

export const POSITIONS = ["left", "center", "right"] as const;
export type Position = (typeof POSITIONS)[number];

export type CastMember = {
  id: string;
  name: string;
  kind: CharacterKind;
  color: string; // hex body color
  accessory: Accessory;
  voice: Voice;
};

export type PanelCharacter = {
  id: string;
  position: Position;
  expression: Expression;
  action: Action;
};

export type Panel = {
  setting: Setting;
  characters: PanelCharacter[];
  /** Cast id of whoever speaks this panel, or "" for no dialogue. */
  speaker: string;
  line: string;
  /** Big comic sound effect ("BONK!", "WHOOSH"), or "". */
  sfx: string;
  /** Narrator caption strip at the bottom, or "". */
  caption: string;
  durationSec: number;
};

export type CartoonSketch = {
  title: string;
  logline: string;
  cast: CastMember[];
  panels: Panel[];
  /** End-card line, e.g. "Ember Mug 2 — link in bio". */
  cta: string;
};

export const CARTOON_STYLES = [
  "slapstick",
  "deadpan",
  "wholesome",
  "chaotic",
  "parody",
] as const;
export type CartoonStyle = (typeof CARTOON_STYLES)[number];

/**
 * remix = study a shared script/video and write an ORIGINAL sketch in the
 *         same format ("make something similar").
 * adapt = the user's own script/video, turned into a cartoon as written.
 */
export const REFERENCE_MODES = ["remix", "adapt"] as const;
export type ReferenceMode = (typeof REFERENCE_MODES)[number];

/** Shown on the studio page so you can see what a cartoon was based on. */
export type InspiredBy = {
  kind: "script" | "video";
  mode: ReferenceMode;
  name?: string;
  excerpt: string;
};
