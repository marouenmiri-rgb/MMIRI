import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasClaude, hasDb } from "@/lib/env";
import { checkLimit } from "@/lib/billing";
import { runCartoonPipeline, type ReferenceInput } from "@/agents/cartoon-pipeline";
import { MAX_REFERENCE_CHARS, MAX_VIDEO_BYTES } from "@/cartoon/reference";
import { CARTOON_STYLES, REFERENCE_MODES } from "@/cartoon/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi)$/i;

const Body = z
  .object({
    topic: z.string().trim().max(400).default(""),
    style: z.enum(CARTOON_STYLES).default("slapstick"),
    productUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
    /** "remix" = make something similar; "adapt" = animate it as-is. */
    mode: z.enum(REFERENCE_MODES).default("remix"),
    script: z.string().trim().max(MAX_REFERENCE_CHARS).optional(),
  })
  .transform((b) => ({ ...b, script: b.script || undefined }));

/**
 * JSON: { topic, style, productUrl?, mode?, script? }
 * multipart/form-data: the same fields plus `video` (a file) — used when
 * the user uploads a video to base the cartoon on.
 */
export async function POST(req: Request) {
  let raw: Record<string, unknown> = {};
  let video: File | null = null;
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    for (const key of ["topic", "style", "productUrl", "mode", "script"]) {
      const v = form.get(key);
      if (typeof v === "string") raw[key] = v;
    }
    const f = form.get("video");
    if (f && typeof f !== "string" && f.size > 0) video = f;
  } else {
    raw = await req.json().catch(() => ({}));
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const hasReference = Boolean(video || parsed.data.script);
  if (!hasReference && parsed.data.topic.length < 3) {
    return NextResponse.json(
      { error: "Give the cartoon a topic, or share a script or video to base it on." },
      { status: 400 },
    );
  }
  if (video) {
    if (video.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: `Video is too large (max ${MAX_VIDEO_BYTES / 1024 / 1024} MB).` },
        { status: 413 },
      );
    }
    if (!video.type.startsWith("video/") && !VIDEO_EXT.test(video.name)) {
      return NextResponse.json(
        { error: "That file doesn't look like a video. Use MP4, MOV or WebM." },
        { status: 415 },
      );
    }
  }

  if (!hasDb || !hasClaude) {
    return NextResponse.json(
      {
        error: "Server not configured",
        detail: "Set ANTHROPIC_API_KEY in .env to write cartoons",
      },
      { status: 503 },
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  // Cartoons count as ads for plan quota.
  const gate = await checkLimit(userId, "ad");
  if (!gate.ok) {
    return NextResponse.json(
      {
        error: "plan_limit_exceeded",
        message: gate.reason,
        tier: gate.tier,
        used: gate.used,
        limit: gate.limit,
        upgradeUrl: "/pricing",
      },
      { status: 402 },
    );
  }

  const { topic, style, productUrl, mode, script } = parsed.data;

  // Stash the upload in a temp file; the pipeline deletes it once studied.
  let reference: ReferenceInput | undefined;
  if (video) {
    const ext = (video.name.match(VIDEO_EXT)?.[0] ?? ".mp4").toLowerCase();
    const videoPath = path.join(os.tmpdir(), `adgen-upload-${crypto.randomUUID()}${ext}`);
    await fs.writeFile(videoPath, new Uint8Array(await video.arrayBuffer()));
    reference = { kind: "video", mode, videoPath, name: video.name.slice(0, 120) };
  } else if (script) {
    reference = { kind: "script", mode, text: script };
  }

  const label =
    topic ||
    (reference?.kind === "video"
      ? `${mode === "remix" ? "Inspired by" : "Adapted from"} ${reference.name ?? "a video"}`
      : `${mode === "remix" ? "Inspired by" : "Adapted from"} a script`);

  const ad = await db.ad.create({
    data: {
      userId,
      format: "CARTOON",
      topic: label,
      // Empty when the cartoon isn't selling anything — posts then ship
      // without a tracking link.
      productUrl: productUrl ?? "",
      status: "QUEUED",
    },
  });

  runCartoonPipeline({ adId: ad.id, topic, style, productUrl, userId, reference }).catch(
    async (err) => {
      if (reference?.kind === "video") {
        await fs.rm(reference.videoPath, { force: true }).catch(() => {});
      }
      await db.ad.update({
        where: { id: ad.id },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : String(err),
        },
      });
    },
  );

  return NextResponse.json({ id: ad.id, status: ad.status }, { status: 202 });
}
