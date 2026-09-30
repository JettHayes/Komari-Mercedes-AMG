export type StatusTone = "ok" | "warn" | "crit" | "neutral";

export function usageTone(pct: number): StatusTone {
  if (!Number.isFinite(pct)) return "neutral";
  if (pct >= 90) return "crit";
  if (pct >= 75) return "warn";
  return "ok";
}

export function toneClass(tone: StatusTone): string {
  switch (tone) {
    case "ok":
      return "rc-tone-ok";
    case "warn":
      return "rc-tone-warn";
    case "crit":
      return "rc-tone-crit";
    default:
      return "text-muted-foreground";
  }
}

export function expiryTone(expiredAt?: string | null): StatusTone {
  if (!expiredAt) return "neutral";
  const ts = Date.parse(expiredAt);
  if (!Number.isFinite(ts)) return "neutral";
  const days = (ts - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "crit";
  if (days <= 7) return "warn";
  return "ok";
}

export function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function pct(used: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, (used / total) * 100));
}
