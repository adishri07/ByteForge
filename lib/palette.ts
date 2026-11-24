// Measures the main colours of an image and flags those far from every brand colour.
// Uses the "sharp" image library — this is maths on the pixels, not AI.
// Owner: Member 2
import sharp from "sharp";
import { colourDistance, hexToRgb, rgbToHex } from "./contrast";
import type { BrandColor } from "./types";

export type OffPaletteColour = { hex: string; share: number; nearestHex: string; nearestLabel: string | null; distance: number };

const MIN_SHARE = 0.08; // a colour must cover at least 8% of the image to matter
const MAX_DISTANCE = 60; // further than this from every brand colour = off-brand

function isNeutral([r, g, b]: [number, number, number]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return (min > 225) || (max < 30) || (max - min < 12 && (max > 200 || max < 50)); // near white, near black, flat grey extremes
}

export async function dominantColours(image: Buffer, count = 5) {
  const { data, info } = await sharp(image).rotate().resize(48, 48, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map<string, { sum: [number, number, number]; n: number }>();
  const total = info.width * info.height;
  for (let i = 0; i < data.length; i += 3) {
    const rgb: [number, number, number] = [data[i], data[i + 1], data[i + 2]];
    const key = rgb.map((v) => v >> 5).join(","); // 8 levels per channel
    const b = buckets.get(key) ?? { sum: [0, 0, 0], n: 0 };
    b.sum = [b.sum[0] + rgb[0], b.sum[1] + rgb[1], b.sum[2] + rgb[2]];
    b.n++;
    buckets.set(key, b);
  }
  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((b) => ({ rgb: [b.sum[0] / b.n, b.sum[1] / b.n, b.sum[2] / b.n] as [number, number, number], share: b.n / total }));
}

export async function offPalette(image: Buffer, brandColors: BrandColor[]): Promise<OffPaletteColour[]> {
  const palette = brandColors.map((c) => ({ label: c.label, rgb: hexToRgb(c.value), hex: c.value })).filter((c) => c.rgb);
  if (palette.length === 0) return [];

  const colours = await dominantColours(image);
  const out: OffPaletteColour[] = [];
  for (const c of colours) {
    if (c.share < MIN_SHARE || isNeutral(c.rgb)) continue;
    let best = palette[0];
    let bestD = Infinity;
    for (const p of palette) {
      const d = colourDistance(c.rgb, p.rgb as [number, number, number]);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (bestD > MAX_DISTANCE) {
      out.push({ hex: rgbToHex(c.rgb), share: Math.round(c.share * 100) / 100, nearestHex: best.hex, nearestLabel: best.label, distance: Math.round(bestD) });
    }
  }
  return out.slice(0, 2);
}
