import type { HTMLAttributes } from "react";

type SurfaceTone = "default" | "warm" | "soft";
type SurfacePadding = "none" | "sm" | "md" | "lg";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: SurfaceTone;
  padding?: SurfacePadding;
}

const tones: Record<SurfaceTone, string> = {
  default: "border border-border-subtle bg-surface shadow-panel",
  warm: "border border-border-subtle bg-surface-warm shadow-panel",
  soft: "border border-transparent bg-surface-soft",
};

const paddings: Record<SurfacePadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-card",
  lg: "p-8",
};

export function Surface({
  tone = "default",
  padding = "md",
  className = "",
  ...props
}: SurfaceProps) {
  return (
    <div
      className={`rounded-panel ${tones[tone]} ${paddings[padding]} ${className}`}
      {...props}
    />
  );
}
