import { spawn } from "node:child_process";

/**
 * Resolve the ffmpeg binary: the `ffmpeg-static` npm build first (so renders
 * work after a plain `npm install`), then whatever `ffmpeg` is on PATH.
 */
export function ffmpegBin(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const p = require("ffmpeg-static") as string | null;
    if (p) return p;
  } catch {
    // not installed — fall through to PATH
  }
  return "ffmpeg";
}

export async function ffmpegAvailable(): Promise<boolean> {
  try {
    await runFfmpeg(["-version"], { silent: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run ffmpeg with the given args. When `stdin` is provided the caller gets
 * a writable stream (used to pipe PNG frames in without touching disk).
 */
export function runFfmpeg(
  args: string[],
  opts: {
    silent?: boolean;
    feed?: (stdin: NodeJS.WritableStream) => Promise<void>;
  } = {},
): Promise<{ stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBin(), args, {
      stdio: [opts.feed ? "pipe" : "ignore", "ignore", opts.silent ? "ignore" : "pipe"],
    });
    let stderr = "";
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 20_000) stderr = stderr.slice(-10_000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stderr });
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-400)}`));
    });
    if (opts.feed && child.stdin) {
      const stdin = child.stdin;
      stdin.on("error", () => {
        // ffmpeg closed early — the close handler reports the real error.
      });
      opts.feed(stdin).then(
        () => stdin.end(),
        (e) => {
          child.kill("SIGKILL");
          reject(e);
        },
      );
    }
  });
}

/** Duration in seconds of a media file, parsed from ffmpeg's banner. */
export async function mediaDuration(file: string): Promise<number | null> {
  // `ffmpeg -i x` with no output always exits non-zero; read stderr anyway.
  const stderr = await new Promise<string>((resolve) => {
    const child = spawn(ffmpegBin(), ["-hide_banner", "-i", file]);
    let out = "";
    child.stderr.on("data", (d) => (out += d.toString()));
    child.on("error", () => resolve(""));
    child.on("close", () => resolve(out));
  });
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}
