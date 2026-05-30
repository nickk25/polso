export const NONE_VALUE = "__none__"

export const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

export const ENTRY_TYPE_BADGE_VARIANT = {
  fixed: "secondary",
  variable: "outline",
} as const satisfies Record<string, "secondary" | "outline">
