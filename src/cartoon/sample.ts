import type { CartoonSketch } from "./types";

/** A known-good sketch used by tests and the renderer smoke check. */
export const SAMPLE_SKETCH: CartoonSketch = {
  title: "The Cold Coffee Crisis",
  logline: "Two office pals discover the horror of lukewarm latte.",
  cast: [
    { id: "gus", name: "Gus", kind: "blob", color: "#ffb13b", accessory: "glasses", voice: "low" },
    { id: "mimi", name: "Mimi", kind: "cat", color: "#b78cff", accessory: "bow", voice: "high" },
    { id: "bolt", name: "Bolt", kind: "robot", color: "#5ec8ff", accessory: "none", voice: "mid" },
  ],
  panels: [
    {
      setting: "office",
      characters: [
        { id: "gus", position: "left", expression: "happy", action: "idle" },
        { id: "mimi", position: "right", expression: "neutral", action: "enter-right" },
      ],
      speaker: "gus",
      line: "Fresh latte. Best part of my morning!",
      sfx: "",
      caption: "9:00 AM",
      durationSec: 3,
    },
    {
      setting: "office",
      characters: [
        { id: "gus", position: "left", expression: "shocked", action: "shake" },
        { id: "mimi", position: "right", expression: "smug", action: "idle" },
      ],
      speaker: "mimi",
      line: "It's been three meetings, Gus. It's iced now.",
      sfx: "GASP!",
      caption: "",
      durationSec: 3,
    },
    {
      setting: "space",
      characters: [
        { id: "bolt", position: "center", expression: "love", action: "fall-in" },
        { id: "gus", position: "left", expression: "confused", action: "idle" },
        { id: "mimi", position: "right", expression: "laughing", action: "bounce" },
      ],
      speaker: "bolt",
      line: "Behold: the mug that keeps it hot for three hours.",
      sfx: "BOOM!",
      caption: "Meanwhile, in space...",
      durationSec: 3.5,
    },
  ],
  cta: "Ember Mug 2 — link in bio",
};
