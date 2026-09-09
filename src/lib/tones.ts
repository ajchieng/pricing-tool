// Semantic tone → utility-class map. The single place that pairs a tone with
// its text / solid / soft-block classes so badges, chips, KPI tiles and result
// visuals never hand-roll status colours. Colours come from globals.css tokens.

export type Tone = "ok" | "warn" | "high" | "alert" | "info" | "teal" | "muted";

export interface ToneClasses {
  /** Foreground-only class for inline text. */
  text: string;
  /** Solid fill for bars / markers. */
  bg: string;
  /** Tinted block: soft bg + fg + border (includes the `border` class). */
  soft: string;
}

export const TONE: Record<Tone, ToneClasses> = {
  ok: {
    text: "text-ok",
    bg: "bg-ok",
    soft: "border bg-ok-soft text-ok border-ok/25",
  },
  warn: {
    text: "text-warn",
    bg: "bg-warn",
    soft: "border bg-warn-soft text-warn border-warn/30",
  },
  high: {
    text: "text-high",
    bg: "bg-high",
    soft: "border bg-high-soft text-high border-high/30",
  },
  alert: {
    text: "text-alert",
    bg: "bg-alert",
    soft: "border bg-alert-soft text-alert border-alert/30",
  },
  info: {
    text: "text-info",
    bg: "bg-info",
    soft: "border bg-info-soft text-info border-info/25",
  },
  teal: {
    text: "text-teal",
    bg: "bg-teal",
    soft: "border bg-teal-soft text-teal border-teal/25",
  },
  muted: {
    text: "text-muted",
    bg: "bg-border-strong",
    soft: "border bg-panel text-muted border-border",
  },
};
