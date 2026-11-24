// Reads an uploaded image with Gemini: the text in it, text/background colours,
// whether the approved logo is present, and a suggested alt text.
// The AI only DESCRIBES the image — the pass/fail decisions are made in code (lib/visualChecks.ts).
// Owner: Member 1
import { Type } from "@google/genai";
import { callGeminiJSON, type InlineImage } from "./gemini";
import type { VisionResult } from "./types";

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    text_in_image: { type: Type.STRING },
    alt_text_suggestion: { type: Type.STRING },
    text_blocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { text: { type: Type.STRING }, fg_hex: { type: Type.STRING }, bg_hex: { type: Type.STRING } },
        required: ["text", "fg_hex", "bg_hex"],
      },
    },
    logo: {
      type: Type.OBJECT,
      properties: {
        present: { type: Type.BOOLEAN },
        matches_approved: { type: Type.BOOLEAN, nullable: true },
        note: { type: Type.STRING },
      },
      required: ["present", "note"],
    },
  },
  required: ["text_in_image", "alt_text_suggestion", "text_blocks", "logo"],
};

export async function analyseImage(image: InlineImage, brandName: string, approvedLogo: InlineImage | null): Promise<VisionResult> {
  const prompt = `You are checking a marketing image for the brand "${brandName}".
${approvedLogo ? "The FIRST image is the brand's APPROVED LOGO. The SECOND image is the marketing image to check." : "The image below is the marketing image to check."}

Return:
- text_in_image: all readable text in the marketing image, in reading order, exactly as written (keep capitals, numbers, punctuation and emojis). Empty string if none.
- text_blocks: up to 6 main text blocks, each with its text, the text colour (fg_hex) and the colour directly behind it (bg_hex), as #RRGGBB.
- logo: present = is a logo for ${brandName} visible in the marketing image?
  ${approvedLogo ? "matches_approved = does it look like the APPROVED LOGO (same design and colours, not stretched or recoloured)? null if no logo is present." : "matches_approved = null (no approved logo was provided)."}
  note = one short sentence describing what you see.
- alt_text_suggestion: a concise, useful alt text (max 25 words) describing the image for a screen-reader user, including its key text.`;

  const images = approvedLogo ? [approvedLogo, image] : [image];
  const raw = await callGeminiJSON<VisionResult>(prompt, SCHEMA, { images, timeoutMs: 35000 });

  return {
    text_in_image: String(raw?.text_in_image ?? "").trim().slice(0, 5000),
    alt_text_suggestion: String(raw?.alt_text_suggestion ?? "").trim().slice(0, 300),
    text_blocks: (raw?.text_blocks ?? []).slice(0, 6).map((b) => ({ text: String(b.text ?? "").slice(0, 200), fg_hex: String(b.fg_hex ?? ""), bg_hex: String(b.bg_hex ?? "") })),
    logo: {
      present: !!raw?.logo?.present,
      matches_approved: approvedLogo && raw?.logo?.present ? (raw.logo.matches_approved ?? null) : null,
      note: String(raw?.logo?.note ?? "").slice(0, 300),
    },
  };
}
