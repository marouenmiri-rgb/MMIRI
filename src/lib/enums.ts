/**
 * String-union "enums".
 *
 * SQLite has no native ENUM type, so every domain enum is stored as a
 * String column. This file is the single source of truth for the allowed
 * values — write paths validate against these, reads narrow via the
 * TypeScript types.
 */

export const PLANS_TIERS = [
  "FREE",
  "STARTER",
  "STUDIO",
  "SCALE",
  "AGENCY",
] as const;
export type PlanTier = (typeof PLANS_TIERS)[number];

export const AD_STATUSES = [
  "QUEUED",
  "SCRAPING",
  "WRITING",
  "DIRECTING",
  "RENDERING",
  "READY",
  "FAILED",
] as const;
export type AdStatus = (typeof AD_STATUSES)[number];

export const JOB_KINDS = [
  "AD_GENERATION",
  "SHOPIFY_DISCOVERY",
  "OUTREACH_SEND",
] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export const JOB_STATUSES = [
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const OUTREACH_STATUSES = [
  "DRAFT",
  "QUEUED",
  "SENT",
  "OPENED",
  "REPLIED",
  "BOUNCED",
] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const SOCIAL_PLATFORMS = [
  "TIKTOK",
  "INSTAGRAM",
  "YOUTUBE",
  "X",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_POST_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
] as const;
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];

export const VARIANT_KINDS = ["HOOK", "ANGLE", "CTA"] as const;
export type VariantKind = (typeof VARIANT_KINDS)[number];

export const INSIGHT_KINDS = [
  "WEEKLY_BRIEF",
  "WINNING_HOOK",
  "LOSING_HOOK",
  "BUDGET_SHIFT",
] as const;
export type InsightKind = (typeof INSIGHT_KINDS)[number];

export const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "PAUSED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
