// Turns what we measured/read from an image into cited issue cards:
// off-brand colours, low text contrast, missing or wrong logo, missing alt text.
// Each finding cites one of the brand's visual rules (V-01..V-04 by default).
// Owner: Member 2
import { contrastRatio } from "./contrast";
import { offPalette } from "./palette";
import { findRule, RULE_PATTERNS } from "./ruleLookup";
import type { Brand, Finding, VisionResult } from "./types";

const MIN_CONTRAST = 4.5;

export async function visualChecks(vision: VisionResult, image: Buffer, brand: Brand, altText: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const paletteRule = findRule(brand, RULE_PATTERNS.visualPalette);
  const logoRule = findRule(brand, RULE_PATTERNS.visualLogo);
  const contrastRule = findRule(brand, RULE_PATTERNS.visualContrast);
  const altRule = findRule(brand, RULE_PATTERNS.visualAltText);

  // 1. Colours (measured on the pixels)
  if (paletteRule && brand.colors.length > 0) {
    try {
      for (const c of await offPalette(image, brand.colors)) {
        findings.push({
          source: "rule",
          category: "visual",
          severity: paletteRule.severity,
          span_text: `Colour ${c.hex}`,
          rule_id: paletteRule.id,
          fact_id: null,
          explanation: `${c.hex} covers about ${Math.round(c.share * 100)}% of the image and isn't one of the brand colours. The closest brand colour is ${c.nearestLabel ? `${c.nearestLabel} ` : ""}${c.nearestHex}.`,
          suggested_fix: `Use ${c.nearestLabel ? `${c.nearestLabel} ` : ""}${c.nearestHex} instead of ${c.hex}`,
          confidence: 1,
        });
      }
    } catch (err) {
      console.error("palette check failed:", err);
    }
  }

  // 2. Contrast (WCAG formula on the colours the AI read for each text block)
  if (contrastRule) {
    const seen = new Set<string>();
    for (const b of vision.text_blocks) {
      const ratio = contrastRatio(b.fg_hex, b.bg_hex);
      if (ratio === null || ratio >= MIN_CONTRAST || !b.text.trim()) continue;
      const label = `Text "${b.text.trim().slice(0, 40)}"`;
      if (seen.has(label)) continue;
      seen.add(label);
      findings.push({
        source: "rule",
        category: "visual",
        severity: contrastRule.severity,
        span_text: label,
        rule_id: contrastRule.id,
        fact_id: null,
        explanation: `This text (${b.fg_hex} on ${b.bg_hex}) has a contrast ratio of ${ratio} : 1. It needs at least ${MIN_CONTRAST} : 1 to be readable for everyone.`,
        suggested_fix: `Use a darker or lighter text colour so the contrast is at least ${MIN_CONTRAST} : 1 (e.g. dark text on a light background)`,
        confidence: 0.8,
      });
    }
  }

  // 3. Logo (the AI compares with the approved logo, if the brand has uploaded one)
  if (logoRule) {
    if (!vision.logo.present) {
      findings.push({
        source: "ai",
        category: "visual",
        severity: logoRule.severity,
        span_text: "Logo missing",
        rule_id: logoRule.id,
        fact_id: null,
        explanation: `No ${brand.name} logo was found in this image. ${vision.logo.note}`.trim(),
        suggested_fix: "Add the approved logo to the image",
        confidence: 0.75,
      });
    } else if (vision.logo.matches_approved === false) {
      findings.push({
        source: "ai",
        category: "visual",
        severity: logoRule.severity,
        span_text: "Logo doesn't match",
        rule_id: logoRule.id,
        fact_id: null,
        explanation: `The logo in this image doesn't look like the approved logo. ${vision.logo.note}`.trim(),
        suggested_fix: "Replace it with the approved logo (unchanged colours and proportions)",
        confidence: 0.7,
      });
    }
  }

  // 4. Alt text (accessibility)
  if (altRule && altText.trim().length < 5) {
    findings.push({
      source: "rule",
      category: "accessibility",
      severity: altRule.severity,
      span_text: "Alt text missing",
      rule_id: altRule.id,
      fact_id: null,
      explanation: "This image has no alt text, so people using screen readers won't know what it shows.",
      suggested_fix: vision.alt_text_suggestion || "Describe the image and its key text in one sentence",
      confidence: 1,
    });
  }

  return findings;
}
