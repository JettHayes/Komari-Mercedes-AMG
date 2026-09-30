"use client";

import { cn } from "@/lib/utils";
import { usageTone, toneClass, type StatusTone } from "@/lib/statusTone";

export function StatusMeter({
  value,
  label,
  className,
  showValue = true,
}: {
  value: number;
  label?: string;
  className?: string;
  showValue?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const tone: StatusTone = usageTone(pct);

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2">
        {label ? <span className="rc-label">{label}</span> : <span />}
        {showValue ? (
          <span className={cn("rc-mono text-xs font-medium", toneClass(tone))}>
            {Math.round(pct)}%
          </span>
        ) : null}
      </div>
      <div className="rc-meter" data-tone={tone === "ok" ? undefined : tone}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
