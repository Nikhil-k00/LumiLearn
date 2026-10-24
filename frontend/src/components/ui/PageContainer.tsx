import type { HTMLAttributes } from "react";

type PageWidth = "narrow" | "content" | "wide" | "full";

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  width?: PageWidth;
}

const widths: Record<PageWidth, string> = {
  narrow: "max-w-3xl",
  content: "max-w-5xl",
  wide: "max-w-7xl",
  full: "",
};

export function PageContainer({
  width = "wide",
  className = "",
  ...props
}: PageContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-page ${widths[width]} ${className}`}
      {...props}
    />
  );
}
