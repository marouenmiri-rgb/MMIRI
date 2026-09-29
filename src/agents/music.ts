import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Finds a music bed to lay under the ad.
 *
 * Tracks are read from a directory rather than bundled, because music is
 * licensed and the licence is the operator's to hold. Drop your files in and
 * they get used; leave it empty and videos stay silent, exactly as before.
 *
 * Point MUSIC_DIR somewhere else to keep the library outside the repo.
 */
const AUDIO_EXT = new Set([".mp3", ".m4a", ".aac", ".wav", ".ogg"]);

export async function pickMusicBed(): Promise<string | null> {
  const dir = process.env.MUSIC_DIR
    ? path.resolve(process.env.MUSIC_DIR)
    : path.join(process.cwd(), "public", "audio");

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null; // No library configured. Not an error.
  }

  const tracks = entries
    .filter((f) => AUDIO_EXT.has(path.extname(f).toLowerCase()))
    .sort();
  if (tracks.length === 0) return null;

  // Rotate rather than always taking the first, so a batch of ads made in one
  // sitting doesn't share a single track.
  const pick = tracks[Math.floor(Math.random() * tracks.length)]!;
  return path.join(dir, pick);
}
