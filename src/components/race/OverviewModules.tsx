"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "@/types/LiveData";
import { formatBytes } from "@/utils/unitHelper";
import { expiryTone, formatUptime, pct, usageTone } from "@/lib/statusTone";
import { AlertTriangle, Cpu, HardDrive, MemoryStick, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import Flag from "@/components/Flag";
import { getRegionDisplayName } from "@/utils/regionHelper";

function formatSpeed(bytes: number): string {
  if (!bytes) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const size = bytes / 1024 ** i;
  return `${size >= 100 ? size.toFixed(0) : size.toFixed(1)} ${units[i]}`;
}

export function RaceClock() {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const locale = i18n.language?.replace("_", "-") || "zh-CN";
  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  const timeText = now
    ? now.toLocaleTimeString(locale, { hour12: false })
    : "--:--:--";
  const dateText = now
    ? now.toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      })
    : "—";
  const utcText = now
    ? now.toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" })
    : "--:--:--";
  const unixText = now ? String(Math.floor(now.getTime() / 1000)) : "—";
  const seconds = now?.getSeconds() ?? 0;
  const secondProgress = now ? ((seconds + now.getMilliseconds() / 1000) / 60) * 100 : 0;
  const offsetMinutes = now ? -now.getTimezoneOffset() : 0;
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const offsetAbs = Math.abs(offsetMinutes);
  const offsetText = `UTC${offsetSign}${String(Math.floor(offsetAbs / 60)).padStart(2, "0")}:${String(offsetAbs % 60).padStart(2, "0")}`;

  const dayOfYear = now
    ? Math.floor(
        (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
          Date.UTC(now.getFullYear(), 0, 0)) /
          86400000,
      )
    : 0;
  const isoWeek = now
    ? (() => {
        const tmp = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = tmp.getUTCDay() || 7;
        tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
        return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      })()
    : 0;

  return (
    <div className="rc-panel rc-panel--flat p-4 h-full flex flex-col gap-3 min-h-0">
      <div className="shrink-0">
        <div className="rc-label">{t("raceControl.sessionClock")}</div>
        <div className="mt-2 rc-mono text-[1.85rem] sm:text-3xl font-bold tracking-tight text-foreground leading-none">
          {timeText}
        </div>
        <div className="mt-1.5 text-xs text-muted-foreground leading-snug">{dateText}</div>
      </div>

      <div className="shrink-0">
        <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <span>{t("raceControl.clockMinute", { defaultValue: "Minute" })}</span>
          <span className="rc-mono normal-case tracking-normal">{String(seconds).padStart(2, "0")}s</span>
        </div>
        <div
          className="h-1.5 rounded-full bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-[var(--amg-teal)]/80 transition-[width] duration-200 linear"
            style={{ width: `${secondProgress}%` }}
          />
        </div>
      </div>

      <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[var(--amg-glass-border)] pt-3 text-xs">
        <div className="min-w-0">
          <dt className="text-muted-foreground">{t("raceControl.clockUtc")}</dt>
          <dd className="rc-mono font-semibold truncate">{utcText}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">{t("raceControl.clockUnix")}</dt>
          <dd className="rc-mono font-semibold truncate">{unixText}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">{t("raceControl.clockWeek", { defaultValue: "Week" })}</dt>
          <dd className="rc-mono font-semibold">W{isoWeek}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">{t("raceControl.clockDayOfYear", { defaultValue: "Day" })}</dt>
          <dd className="rc-mono font-semibold">D{dayOfYear}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="text-muted-foreground">{t("raceControl.clockTimezone")}</dt>
          <dd className="rc-mono font-semibold truncate" title={timeZone}>
            {timeZone}
            <span className="text-muted-foreground font-normal"> · {offsetText}</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function FleetKpiBar({
  nodes,
  liveData,
}: {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}) {
  const { t } = useTranslation();
  const stats = useMemo(() => {
    const onlineSet = new Set(liveData.online);
    let cpu = 0;
    let ram = 0;
    let up = 0;
    let down = 0;
    let totalUp = 0;
    let totalDown = 0;
    let counted = 0;

    for (const node of nodes) {
      if (!onlineSet.has(node.uuid)) continue;
      const rec = liveData.data[node.uuid];
      if (!rec) continue;
      counted += 1;
      cpu += rec.cpu.usage;
      ram += pct(rec.ram.used, node.mem_total);
      up += rec.network.up;
      down += rec.network.down;
      totalUp += rec.network.totalUp;
      totalDown += rec.network.totalDown;
    }

    return {
      online: liveData.online.length,
      total: nodes.length,
      avgCpu: counted ? cpu / counted : 0,
      avgRam: counted ? ram / counted : 0,
      up,
      down,
      totalUp,
      totalDown,
    };
  }, [liveData, nodes]);

  const items = [
    { key: "online", label: t("raceControl.online"), value: `${stats.online}/${stats.total}` },
    { key: "avgCpu", label: t("raceControl.avgCpu"), value: `${Math.round(stats.avgCpu)}%` },
    { key: "avgRam", label: t("raceControl.avgRam"), value: `${Math.round(stats.avgRam)}%` },
    { key: "uplink", label: t("raceControl.uplink"), value: formatSpeed(stats.up) },
    { key: "downlink", label: t("raceControl.downlink"), value: formatSpeed(stats.down) },
    {
      key: "traffic",
      label: t("raceControl.traffic"),
      value: `${formatBytes(stats.totalUp)} ↑ / ${formatBytes(stats.totalDown)} ↓`,
    },
  ];

  return (
    <div className="rc-panel rc-panel--flat p-3 sm:p-4">
      <div className="rc-label mb-3">{t("raceControl.fleetTelemetry")}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {items.map((item) => (
          <div key={item.key} className="min-w-0">
            <div className="rc-label mb-1">{item.label}</div>
            <div className="rc-mono text-sm sm:text-base font-semibold truncate">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

type AlertItem = {
  id: string;
  level: "warn" | "crit";
  title: string;
  detail: string;
};

export function AlertPanel({
  nodes,
  liveData,
}: {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}) {
  const { t } = useTranslation();
  const alerts = useMemo(() => {
    const onlineSet = new Set(liveData.online);
    const list: AlertItem[] = [];

    for (const node of nodes) {
      const online = onlineSet.has(node.uuid);
      const rec = liveData.data[node.uuid];

      if (!online) {
        list.push({
          id: `${node.uuid}-offline`,
          level: "crit",
          title: node.name,
          detail: t("raceControl.agentOffline"),
        });
        continue;
      }

      if (!rec) continue;

      const cpuTone = usageTone(rec.cpu.usage);
      const ramTone = usageTone(pct(rec.ram.used, node.mem_total));
      const diskTone = usageTone(pct(rec.disk.used, node.disk_total));
      const expTone = expiryTone(node.expired_at);

      if (cpuTone === "crit" || cpuTone === "warn") {
        list.push({
          id: `${node.uuid}-cpu`,
          level: cpuTone,
          title: node.name,
          detail: `${t("raceControl.cpu")} ${Math.round(rec.cpu.usage)}%`,
        });
      }
      if (ramTone === "crit" || ramTone === "warn") {
        list.push({
          id: `${node.uuid}-ram`,
          level: ramTone,
          title: node.name,
          detail: `${t("raceControl.ram")} ${Math.round(pct(rec.ram.used, node.mem_total))}%`,
        });
      }
      if (diskTone === "crit" || diskTone === "warn") {
        list.push({
          id: `${node.uuid}-disk`,
          level: diskTone,
          title: node.name,
          detail: `${t("raceControl.disk")} ${Math.round(pct(rec.disk.used, node.disk_total))}%`,
        });
      }
      if (expTone === "crit" || expTone === "warn") {
        list.push({
          id: `${node.uuid}-exp`,
          level: expTone,
          title: node.name,
          detail: expTone === "crit" ? t("raceControl.expired") : t("raceControl.expiresSoon"),
        });
      }
    }

    return list.slice(0, 8);
  }, [liveData, nodes, t]);

  return (
    <div className="rc-panel rc-panel--flat p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="rc-label">{t("raceControl.raceAlerts")}</div>
        <span className="rc-mono text-xs text-muted-foreground">{alerts.length}</span>
      </div>
      {alerts.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t("raceControl.allSystemsGreen")}</div>
      ) : (
        <ul className="space-y-2 max-h-44 overflow-auto pr-1">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex items-start gap-2 text-sm">
              {alert.level === "crit" ? (
                <WifiOff className="h-4 w-4 mt-0.5 text-[var(--amg-crit)] shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 text-[var(--amg-warn)] shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-semibold truncate">{alert.title}</div>
                <div className="rc-mono text-xs text-muted-foreground">{alert.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SpeedTrend({ liveData }: { liveData: LiveData }) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<{ up: number; down: number }[]>([]);
  const liveRef = useRef(liveData);
  liveRef.current = liveData;

  useEffect(() => {
    const push = () => {
      const values = Object.values(liveRef.current.data || {});
      const up = values.reduce((acc, n) => acc + (n.network?.up || 0), 0);
      const down = values.reduce((acc, n) => acc + (n.network?.down || 0), 0);
      setHistory((prev) => [...prev, { up, down }].slice(-48));
    };
    push();
    const id = window.setInterval(push, 2000);
    return () => window.clearInterval(id);
  }, []);

  const latest = history[history.length - 1] || { up: 0, down: 0 };

  const chart = useMemo(() => {
    const w = 320;
    const h = 120;
    const padX = 4;
    const padY = 8;
    if (history.length === 0) {
      return { upPath: "", downPath: "", upArea: "", downArea: "", w, h };
    }

    const ups = history.map((p) => p.up);
    const downs = history.map((p) => p.down);
    const lo = Math.min(...ups, ...downs);
    const hi = Math.max(...ups, ...downs);
    const flat = hi <= lo;
    const pad = flat ? Math.max(hi * 0.2, 1) : Math.max((hi - lo) * 0.35, hi * 0.04, 1);
    const domainLo = flat ? Math.max(0, hi - pad) : Math.max(0, lo - pad);
    const domainHi = hi + pad;
    const span = Math.max(domainHi - domainLo, 1);

    const xAt = (i: number) => {
      if (history.length === 1) return w / 2;
      return padX + (i / (history.length - 1)) * (w - padX * 2);
    };
    const yAt = (v: number) => {
      const ratio = (v - domainLo) / span;
      return h - padY - ratio * (h - padY * 2);
    };

    const toLine = (series: number[]) =>
      series
        .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`)
        .join(" ");

    const toArea = (series: number[]) => {
      const line = toLine(series);
      if (!line) return "";
      return `${line} L${xAt(series.length - 1).toFixed(1)},${h - padY} L${xAt(0).toFixed(1)},${h - padY} Z`;
    };

    return {
      upPath: toLine(ups),
      downPath: toLine(downs),
      upArea: toArea(ups),
      downArea: toArea(downs),
      w,
      h,
    };
  }, [history]);

  return (
    <div className="rc-panel rc-panel--flat p-4 h-full flex flex-col gap-3 min-h-0">
      <div className="flex items-start justify-between gap-3 shrink-0">
        <div className="rc-label pt-0.5">{t("raceControl.networkPace")}</div>
        <div className="flex items-end gap-4 text-right">
          <div>
            <div className="flex items-center justify-end gap-1.5 rc-label">
              <span className="inline-block size-1.5 rounded-full bg-[var(--amg-teal)]" />
              ↑ {t("raceControl.uplink")}
            </div>
            <div className="rc-mono text-sm font-semibold leading-tight">{formatSpeed(latest.up)}</div>
          </div>
          <div>
            <div className="flex items-center justify-end gap-1.5 rc-label">
              <span className="inline-block size-1.5 rounded-full bg-[var(--amg-petronas)]" />
              ↓ {t("raceControl.downlink")}
            </div>
            <div className="rc-mono text-sm font-semibold leading-tight">{formatSpeed(latest.down)}</div>
          </div>
        </div>
      </div>

      <div className="relative flex-1 min-h-[7rem] rounded-lg overflow-hidden border border-[var(--amg-glass-border)] bg-[color-mix(in_oklab,var(--amg-teal)_4%,transparent)]">
        <svg
          className="absolute inset-0 size-full"
          viewBox={`0 0 ${chart.w} ${chart.h}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            x1="0"
            x2={chart.w}
            y1={chart.h * 0.33}
            y2={chart.h * 0.33}
            stroke="var(--amg-glass-border)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="0"
            x2={chart.w}
            y1={chart.h * 0.66}
            y2={chart.h * 0.66}
            stroke="var(--amg-glass-border)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {chart.downArea ? (
            <path d={chart.downArea} fill="color-mix(in oklab, var(--amg-petronas) 20%, transparent)" />
          ) : null}
          {chart.upArea ? (
            <path d={chart.upArea} fill="color-mix(in oklab, var(--amg-teal) 16%, transparent)" />
          ) : null}
          {chart.downPath ? (
            <path
              d={chart.downPath}
              fill="none"
              stroke="var(--amg-petronas)"
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {chart.upPath ? (
            <path
              d={chart.upPath}
              fill="none"
              stroke="var(--amg-teal)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
      </div>
    </div>
  );
}

export function RegionOverview({
  nodes,
  liveData,
}: {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  const regions = useMemo(() => {
    const onlineSet = new Set(liveData.online);
    const map = new Map<string, { total: number; online: number }>();
    for (const node of nodes) {
      const key = node.region || "??";
      const cur = map.get(key) || { total: 0, online: 0 };
      cur.total += 1;
      if (onlineSet.has(node.uuid)) cur.online += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [liveData.online, nodes]);

  return (
    <div className="rc-panel rc-panel--flat p-4 h-full">
      <div className="rc-label mb-3">{t("raceControl.regions")}</div>
      <div className="space-y-2 max-h-44 overflow-auto">
        {regions.map(([region, info]) => {
          const label =
            region === "??"
              ? t("mapView.regionUnknown", { defaultValue: t("raceControl.unknown") })
              : getRegionDisplayName(region, lang);
          return (
            <div key={region} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 flex items-center gap-2 font-semibold tracking-wide">
                <Flag flag={region === "??" ? "UN" : region} />
                <span className="truncate">{label}</span>
              </span>
              <span className="rc-mono text-muted-foreground shrink-0">
                {info.online}/{info.total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { formatSpeed, formatUptime, Cpu, HardDrive, MemoryStick };
