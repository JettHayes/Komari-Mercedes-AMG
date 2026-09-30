"use client";

import { useMemo, useState } from "react";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "@/types/LiveData";
import { formatBytes } from "@/utils/unitHelper";
import { formatUptime, pct, usageTone } from "@/lib/statusTone";
import { StatusMeter } from "@/components/race/StatusMeter";
import { formatSpeed } from "@/components/race/OverviewModules";
import SpaLink from "@/components/SpaLink";
import Flag from "@/components/Flag";
import { useTheme } from "@/contexts/ThemeContext";
import { Search, LayoutGrid, LayoutPanelLeft, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useIsMobile } from "@/hooks/use-mobile";
import { getRegionDisplayName } from "@/utils/regionHelper";
import { NodeBillingMeta } from "@/components/race/NodeBillingMeta";

function localizeGroupLabel(group: string, t: (key: string, options?: { defaultValue?: string }) => string) {
  const key = group.trim().replace(/\s+/g, "_");
  return t(`raceControl.groups.${key}`, { defaultValue: group });
}

function TimingTower({
  nodes,
  liveData,
}: {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}) {
  const { t, i18n } = useTranslation();
  const { themeConfig } = useTheme();
  const onlineSet = new Set(liveData.online);
  const regionLang = i18n.language?.toLowerCase().startsWith("zh") ? "zh" : "en";

  return (
    <div className="rc-panel overflow-hidden">
      <div
        className="hidden lg:grid px-4 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground border-b border-[var(--amg-glass-border)]"
        style={{
          gridTemplateColumns:
            "36px 14px minmax(140px, 1.4fr) repeat(3, minmax(72px, 0.7fr)) minmax(110px, 1fr) minmax(96px, 0.8fr) minmax(88px, 0.75fr) minmax(80px, 0.7fr)",
          gap: "0.75rem",
        }}
      >
        <span>{t("raceControl.pos")}</span>
        <span />
        <span>{t("raceControl.driverNode")}</span>
        <span>{t("raceControl.cpu")}</span>
        <span>{t("raceControl.ram")}</span>
        <span>{t("raceControl.disk")}</span>
        <span>{t("raceControl.network")}</span>
        <span>{t("nodeCard.price", { defaultValue: "Price" })}</span>
        <span>{t("nodeCard.expiredAt", { defaultValue: "Expires" })}</span>
        <span>{t("raceControl.uptime")}</span>
      </div>
      {nodes.map((node, index) => {
        const online = onlineSet.has(node.uuid);
        const rec = liveData.data[node.uuid];
        const cpu = rec?.cpu.usage ?? 0;
        const ram = rec ? pct(rec.ram.used, node.mem_total) : 0;
        const disk = rec ? pct(rec.disk.used, node.disk_total) : 0;

        return (
          <SpaLink
            key={node.uuid}
            href={`/instance/${node.uuid}`}
            className="rc-tower-row block no-underline text-inherit"
            data-offline={!online || undefined}
          >
            <span className="rc-mono text-sm font-bold text-[var(--amg-teal)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="rc-live-dot" data-offline={!online || undefined} />
            <div className="min-w-0 flex items-center gap-2">
              <Flag flag={node.region} />
              <div className="min-w-0">
                <div className="font-semibold truncate text-sm">{node.name}</div>
                <div className="rc-mono text-[10px] text-muted-foreground truncate">
                  {node.group
                    ? localizeGroupLabel(node.group, t)
                    : node.region
                      ? getRegionDisplayName(node.region, regionLang)
                      : t("raceControl.unknown")}
                </div>
              </div>
            </div>
            <StatusMeter value={cpu} showValue />
            <StatusMeter value={ram} showValue />
            <StatusMeter value={disk} showValue />
            <div className="rc-mono text-xs">
              <div>↑ {formatSpeed(rec?.network.up ?? 0)}</div>
              <div className="text-muted-foreground">↓ {formatSpeed(rec?.network.down ?? 0)}</div>
              {themeConfig.showRamDiskTotal && rec ? (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {formatBytes(rec.network.totalUp)} / {formatBytes(rec.network.totalDown)}
                </div>
              ) : null}
            </div>
            <NodeBillingMeta node={node} layout="cells" />
            <div className="rc-mono text-xs">{formatUptime(rec?.uptime ?? 0)}</div>
          </SpaLink>
        );
      })}
    </div>
  );
}

function TelemetryCards({
  nodes,
  liveData,
}: {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}) {
  const { t } = useTranslation();
  const onlineSet = new Set(liveData.online);

  return (
    <div className="rc-card-grid">
      {nodes.map((node, index) => {
        const online = onlineSet.has(node.uuid);
        const rec = liveData.data[node.uuid];
        const cpu = rec?.cpu.usage ?? 0;
        const ram = rec ? pct(rec.ram.used, node.mem_total) : 0;
        const disk = rec ? pct(rec.disk.used, node.disk_total) : 0;

        return (
          <SpaLink
            key={node.uuid}
            href={`/instance/${node.uuid}`}
            className="rc-panel rc-panel--flat rc-panel--lite p-4 no-underline text-inherit block hover:border-[var(--amg-teal)]/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex items-center gap-2">
                <span className="rc-mono text-xs text-[var(--amg-teal)] font-bold">
                  P{String(index + 1).padStart(2, "0")}
                </span>
                <Flag flag={node.region} />
                <div className="min-w-0">
                  <div className="font-semibold truncate text-sm">{node.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{node.cpu_name}</div>
                </div>
              </div>
              <span className="rc-live-dot mt-1" data-offline={!online || undefined} />
            </div>
            <div className="space-y-2.5">
              <StatusMeter label={t("raceControl.cpu")} value={cpu} />
              <StatusMeter label={t("raceControl.ram")} value={ram} />
              <StatusMeter label={t("raceControl.disk")} value={disk} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 rc-mono text-xs text-muted-foreground">
              <span>↑ {formatSpeed(rec?.network.up ?? 0)}</span>
              <span>↓ {formatSpeed(rec?.network.down ?? 0)}</span>
              <span>{formatUptime(rec?.uptime ?? 0)}</span>
            </div>
            <NodeBillingMeta node={node} layout="row" />
          </SpaLink>
        );
      })}
    </div>
  );
}

const RING_RADIUS = 30;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function RingGauge({ label, value, detail }: { label: string; value: number; detail?: string }) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="rc-ring" data-tone={usageTone(clamped)}>
      <div className="rc-ring__dial">
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <circle className="rc-ring__track" cx="36" cy="36" r={RING_RADIUS} />
          <circle
            className="rc-ring__value"
            cx="36"
            cy="36"
            r={RING_RADIUS}
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - clamped / 100)}
          />
        </svg>
        <span className="rc-ring__pct rc-mono">
          {Math.round(clamped)}
          <small>%</small>
        </span>
      </div>
      <span className="rc-ring__label">{label}</span>
      <span className="rc-ring__detail rc-mono">{detail ?? "—"}</span>
    </div>
  );
}

function DossierCards({
  nodes,
  liveData,
}: {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}) {
  const { t, i18n } = useTranslation();
  const onlineSet = new Set(liveData.online);
  const regionLang = i18n.language?.toLowerCase().startsWith("zh") ? "zh" : "en";

  return (
    <div className="rc-dossier-grid">
      {nodes.map((node, index) => {
        const online = onlineSet.has(node.uuid);
        const rec = liveData.data[node.uuid];
        const cpu = rec?.cpu.usage ?? 0;
        const ram = rec ? pct(rec.ram.used, node.mem_total) : 0;
        const disk = rec ? pct(rec.disk.used, node.disk_total) : 0;
        const place = node.group
          ? localizeGroupLabel(node.group, t)
          : node.region
            ? getRegionDisplayName(node.region, regionLang)
            : t("raceControl.unknown");
        const specs = [node.os, node.arch, node.virtualization].filter(Boolean).join(" · ");
        const load = rec?.load;

        return (
          <SpaLink
            key={node.uuid}
            href={`/instance/${node.uuid}`}
            className="rc-panel rc-panel--flat rc-panel--lite rc-dossier no-underline text-inherit"
            data-offline={!online || undefined}
          >
            <div className="rc-dossier__head">
              <span className="rc-dossier__pos rc-mono">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Flag flag={node.region} />
                  <span className="rc-dossier__name truncate">{node.name}</span>
                </div>
                <div className="rc-dossier__sub truncate">
                  {place}
                  {specs ? ` · ${specs}` : ""}
                </div>
              </div>
              <span className="rc-dossier__status rc-mono" data-offline={!online || undefined}>
                <span className="rc-live-dot" data-offline={!online || undefined} />
                {online ? t("raceControl.statusLive") : t("raceControl.statusOffline")}
              </span>
            </div>

            <div className="rc-dossier__gauges">
              <RingGauge
                label={t("raceControl.cpu")}
                value={cpu}
                detail={node.cpu_cores ? t("raceControl.cores", { count: node.cpu_cores }) : undefined}
              />
              <RingGauge
                label={t("raceControl.ram")}
                value={ram}
                detail={rec ? `${formatBytes(rec.ram.used)} / ${formatBytes(node.mem_total)}` : undefined}
              />
              <RingGauge
                label={t("raceControl.disk")}
                value={disk}
                detail={rec ? `${formatBytes(rec.disk.used)} / ${formatBytes(node.disk_total)}` : undefined}
              />
            </div>

            <dl className="rc-dossier__telemetry">
              <div>
                <dt>↑ {t("raceControl.uplink")}</dt>
                <dd className="rc-mono">{formatSpeed(rec?.network.up ?? 0)}</dd>
              </div>
              <div>
                <dt>↓ {t("raceControl.downlink")}</dt>
                <dd className="rc-mono">{formatSpeed(rec?.network.down ?? 0)}</dd>
              </div>
              <div>
                <dt>{t("raceControl.traffic")}</dt>
                <dd className="rc-mono">
                  {rec ? `${formatBytes(rec.network.totalUp)} / ${formatBytes(rec.network.totalDown)}` : "—"}
                </dd>
              </div>
              <div>
                <dt>{t("raceControl.uptime")}</dt>
                <dd className="rc-mono">{formatUptime(rec?.uptime ?? 0)}</dd>
              </div>
              <div>
                <dt>{t("raceControl.load")}</dt>
                <dd className="rc-mono">
                  {load ? `${load.load1.toFixed(2)} · ${load.load5.toFixed(2)} · ${load.load15.toFixed(2)}` : "—"}
                </dd>
              </div>
              <div>
                <dt>{t("raceControl.connections")}</dt>
                <dd className="rc-mono">
                  {rec ? `${rec.connections.tcp} / ${rec.connections.udp}` : "—"}
                </dd>
              </div>
            </dl>

            <NodeBillingMeta node={node} layout="row" />

            <div className="rc-dossier__foot">
              <span className="truncate">{node.cpu_name || t("raceControl.unknown")}</span>
              <span className="rc-mono shrink-0">
                {t("raceControl.processes")} {rec?.process ?? "—"}
              </span>
            </div>
          </SpaLink>
        );
      })}
    </div>
  );
}

export default function NodeFleet({
  nodes,
  liveData,
}: {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}) {
  const { t } = useTranslation();
  const { nodeViewMode, setNodeViewMode, managedThemeSettings } = useTheme();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useLocalStorage<string>("nodeSelectedGroup", "all");

  const resolvedMode = useMemo(() => {
    if (nodeViewMode === "auto") return isMobile ? "grid" : "table";
    return nodeViewMode;
  }, [isMobile, nodeViewMode]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    nodes.forEach((n) => {
      if (n.group?.trim()) set.add(n.group);
    });
    return Array.from(set).sort();
  }, [nodes]);

  const filtered = useMemo(() => {
    let list = [...nodes];
    if (selectedGroup !== "all") {
      list = list.filter((n) => n.group === selectedGroup);
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((n) =>
        [n.name, n.region, n.group, n.os, n.cpu_name, n.tags, n.ipv4, n.ipv6]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      );
    }

    const onlineSet = new Set(liveData.online ?? []);
    const offlinePos = managedThemeSettings.offlineServerPosition || "Last";
    list.sort((a, b) => {
      const aOnline = onlineSet.has(a.uuid);
      const bOnline = onlineSet.has(b.uuid);
      if (offlinePos === "First") {
        if (!aOnline && bOnline) return -1;
        if (aOnline && !bOnline) return 1;
      } else if (offlinePos !== "Keep") {
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
      }
      return (a.weight || 0) - (b.weight || 0);
    });
    return list;
  }, [nodes, searchTerm, selectedGroup, liveData.online, managedThemeSettings.offlineServerPosition]);

  return (
    <div className="space-y-3">
      <div className="rc-panel rc-panel--flat p-3 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("raceControl.searchPlaceholder")}
            className="pl-9 bg-transparent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={resolvedMode === "large" ? "default" : "outline"}
            onClick={() => setNodeViewMode("large")}
          >
            <LayoutPanelLeft className="h-4 w-4" />
            {t("raceControl.viewLarge")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={resolvedMode === "grid" ? "default" : "outline"}
            onClick={() => setNodeViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
            {t("raceControl.viewCompact")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={resolvedMode === "table" ? "default" : "outline"}
            onClick={() => setNodeViewMode("table")}
          >
            <List className="h-4 w-4" />
            {t("raceControl.viewList")}
          </Button>
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={selectedGroup === "all" ? "default" : "ghost"}
            onClick={() => setSelectedGroup("all")}
          >
            {t("raceControl.allGroups")}
          </Button>
          {groups.map((group) => (
            <Button
              key={group}
              type="button"
              size="sm"
              variant={selectedGroup === group ? "default" : "ghost"}
              onClick={() => setSelectedGroup(group)}
            >
              {localizeGroupLabel(group, t)}
            </Button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rc-panel rc-panel--flat p-8 text-center text-muted-foreground">
          {t("raceControl.noNodes")}
        </div>
      ) : resolvedMode === "table" ? (
        <TimingTower nodes={filtered} liveData={liveData} />
      ) : resolvedMode === "large" ? (
        <DossierCards nodes={filtered} liveData={liveData} />
      ) : (
        <TelemetryCards nodes={filtered} liveData={liveData} />
      )}
    </div>
  );
}
