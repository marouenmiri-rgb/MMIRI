import type { Metadata } from "next";
import { MakeFlow } from "./MakeFlow";

export const metadata: Metadata = {
  title: "Make an ad — AdGen",
  description:
    "Paste a product link. Get a vertical 9:16 video ad with subtitles, ready to download and post.",
};

export default function MakePage() {
  return <MakeFlow />;
}
