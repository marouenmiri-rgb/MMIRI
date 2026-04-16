export type ProductFacts = {
  title: string;
  description: string;
  price?: string;
  images: string[];
  reviews: string[];
  url: string;
};

export type AdScript = {
  hook: string;
  problem: string;
  solution: string;
  cta: string;
  fullScript: string;
};

export type Scene = {
  text: string;
  imageRef: string;
  durationSec: number;
  fx?: "kenburns" | "cut" | "fade";
};

export type SceneBreakdown = {
  style: string;
  scenes: Scene[];
};

export type GeneratedAd = {
  product: ProductFacts;
  script: AdScript;
  breakdown: SceneBreakdown;
  voiceoverUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
};

export type ShopifyStore = {
  storeName: string;
  websiteUrl: string;
  email?: string;
  socials: { twitter?: string; instagram?: string; facebook?: string };
  source?: string;
};

export type OutreachEmail = {
  subject: string;
  body: string;
};
