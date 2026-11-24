// WCAG contrast ratio between two colours — measured with the official formula, not guessed.
// Owner: Member 2
import { normaliseHex } from "./extractRules";

export function hexToRgb(hex: string): [number, number, number] | null {
  const h = normaliseHex(hex);
  if (!h) return null;
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function luminance([r, g, b]: [number, number, number]) {
  const ch = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

// returns e.g. 4.5 (meaning 4.5 : 1), or null if a colour is invalid
export function contrastRatio(fgHex: string, bgHex: string): number | null {
  const a = hexToRgb(fgHex);
  const b = hexToRgb(bgHex);
  if (!a || !b) return null;
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
}

export function rgbToHex([r, g, b]: [number, number, number]) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function colourDistance(a: [number, number, number], b: [number, number, number]) {
  // weighted RGB distance (closer to how people see colour differences)
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db) / 3;
}
