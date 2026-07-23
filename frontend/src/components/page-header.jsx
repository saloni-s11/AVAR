import React from "react";

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-border pb-6">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
