// Coloured risk label. Always shows the word too, not just the colour (accessibility).
// Owner: Member 4
const STYLES: Record<string, string> = {
  Low: "bg-green-100 text-green-800 border-green-300",
  Medium: "bg-yellow-100 text-yellow-900 border-yellow-300",
  High: "bg-orange-100 text-orange-900 border-orange-300",
  Critical: "bg-red-100 text-red-800 border-red-300",
};
const ICONS: Record<string, string> = { Low: "●", Medium: "▲", High: "◆", Critical: "■" };

export default function RiskBadge({ level, size = "md" }: { level: string | null; size?: "sm" | "md" }) {
  const l = level ?? "Low";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${STYLES[l] ?? STYLES.Low} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
    >
      <span aria-hidden>{ICONS[l]}</span>
      {l} risk
    </span>
  );
}
