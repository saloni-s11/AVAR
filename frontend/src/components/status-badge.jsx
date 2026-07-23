import React from "react";
import { cn } from "@/lib/utils";

const tones = {
  success: "bg-success/10 text-success ring-success/20",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
  warning: "bg-warning/15 text-warning-foreground ring-warning/30",
  neutral: "bg-muted text-muted-foreground ring-border",
  info: "bg-primary/10 text-primary ring-primary/20",
};

export function StatusBadge({
  tone = "neutral",
  children,
  dot = true,
  className,
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "success" && "bg-success",
            tone === "danger" && "bg-destructive",
            tone === "warning" && "bg-warning",
            tone === "neutral" && "bg-muted-foreground",
            tone === "info" && "bg-primary",
          )}
        />
      )}
      {children}
    </span>
  );
}
