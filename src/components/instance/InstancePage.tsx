"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useTranslation } from "react-i18next";
import type { Record } from "@/types/LiveData";
import Flag from "@/components/Flag";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { useNodeList } from "@/contexts/NodeListContext";
import { liveDataToRecords } from "@/utils/RecordHelper";
import LoadChart from "./LoadChart";
import PingChart from "./PingChart";
import { StatusMeter } from "@/components/race/StatusMeter";
import { formatSpeed } from "@/components/race/OverviewModules";
import { formatUptime, pct } from "@/lib/statusTone";
import { formatBytes } from "@/utils/unitHelper";
import SpaLink from "@/components/SpaLink";
import { ArrowLeft } from "lucide-react";

const DetailsGrid = dynamic(
  () => import("@/components/DetailsGrid").then((mod) => ({ default: mod.DetailsGrid })),
  { ssr: false }
);

interface InstancePageProps {
  uuid: string;
}

export default function InstancePage({ uuid }: InstancePageProps) {
  const { t } = useTranslation();
  const { onRefresh, live_data } = useLiveData();
  const [recent, setRecent] = useState<Record[]>([]);
  const { nodeList } = useNodeList();
  const length = 30 * 5;
  const [chartView, setChartView] = useState<"load" | "ping">("load");
  const [specsOpen, setSpecsOpen] = useState(false);

  const node = nodeList?.find((n) => n.uuid === uuid);
  const live = live_data?.data?.data?.[uuid];
  const online = live_data?.data?.online?.includes(uuid) ?? false;

  useEffect(() => {
    if (!uuid) return;

    fetch(`/api/recent/${uuid}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.data)) {
          setRecent(data.data.slice(-length));
        }
      })
      .catch(() => {
        setRecent([]);
      });
  }, [uuid, length]);

  useEffect(() => {
    const unsubscribe = onRefresh((resp) => {
      if (!uuid) return;
      const data = resp.data.data[uuid];
      if (!data) return;

      setRecent((prev) => {
        const exists = prev.some((item) => item.updated_at === data.updated_at);
        if (exists) return prev;
        return [...prev, data].slice(-length);
      });
    });

    return unsubscribe;
  }, [onRefresh, uuid, length]);

  const meters = useMemo(() => {
    if (!node || !live) return null;
    return {
      cpu: live.cpu.usage,
      ram: pct(live.ram.used, node.mem_total),
      disk: pct(live.disk.used, node.disk_total),
      up: live.network.up,
      down: live.network.down,
      uptime: live.uptime,
    };
  }, [live, node]);

  return (
    <div className="container mx-auto px-4 space-y-4 max-w-[1400px]">
      <SpaLink
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[var(--amg-teal)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("raceControl.backHome")}
      </SpaLink>

      <div className="rc-panel rc-panel--flat p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Flag flag={node?.region ?? ""} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                  {node?.name ?? uuid}
                </h1>
                <span className="rc-live-dot" data-offline={!online || undefined} />
              </div>
              <div className="rc-mono text-xs text-muted-foreground truncate">{uuid}</div>
            </div>
          </div>
          <div className="sm:ml-auto flex flex-wrap gap-4 rc-mono text-xs text-muted-foreground">
            <span>{node?.region || "—"}</span>
            <span>{node?.os || "—"}</span>
            <span>{formatUptime(meters?.uptime ?? 0)}</span>
          </div>
        </div>
      </div>

      {meters ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rc-panel rc-panel--flat p-3">
            <StatusMeter label={t("raceControl.cpu")} value={meters.cpu} />
          </div>
          <div className="rc-panel rc-panel--flat p-3">
            <StatusMeter label={t("raceControl.ram")} value={meters.ram} />
            <div className="rc-mono text-[10px] text-muted-foreground mt-1">
              {live ? `${formatBytes(live.ram.used)} / ${formatBytes(node?.mem_total || 0)}` : "—"}
            </div>
          </div>
          <div className="rc-panel rc-panel--flat p-3">
            <StatusMeter label={t("raceControl.disk")} value={meters.disk} />
            <div className="rc-mono text-[10px] text-muted-foreground mt-1">
              {live ? `${formatBytes(live.disk.used)} / ${formatBytes(node?.disk_total || 0)}` : "—"}
            </div>
          </div>
          <div className="rc-panel rc-panel--flat p-3">
            <div className="rc-label mb-1">{t("raceControl.uplink")}</div>
            <div className="rc-mono text-sm font-semibold">{formatSpeed(meters.up)}</div>
          </div>
          <div className="rc-panel rc-panel--flat p-3 col-span-2 lg:col-span-1">
            <div className="rc-label mb-1">{t("raceControl.downlink")}</div>
            <div className="rc-mono text-sm font-semibold">{formatSpeed(meters.down)}</div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-4 min-w-0">
          <div className="flex justify-center">
            <SegmentedControl
              value={chartView}
              onValueChange={(value) => setChartView(value as "load" | "ping")}
            >
              <SegmentedControlItem value="load" className="capitalize">
                {t("nodeCard.load")}
              </SegmentedControlItem>
              <SegmentedControlItem value="ping" className="capitalize">
                {t("nodeCard.ping")}
              </SegmentedControlItem>
            </SegmentedControl>
          </div>

          <div className="rc-panel rc-panel--flat p-2 sm:p-4 overflow-hidden">
            {chartView === "load" ? (
              <LoadChart uuid={uuid} data={liveDataToRecords(uuid, recent)} />
            ) : (
              <PingChart uuid={uuid} />
            )}
          </div>
        </div>

        <div className="xl:block">
          <button
            type="button"
            className="xl:hidden mb-2 rc-label cursor-pointer"
            onClick={() => setSpecsOpen((v) => !v)}
          >
            {specsOpen ? t("raceControl.hideSpecs") : t("raceControl.showSpecs")}
          </button>
          <div className={`${specsOpen ? "block" : "hidden"} xl:block`}>
            <div className="rc-panel rc-panel--flat p-4">
              <div className="rc-label mb-3">{t("raceControl.hardwareSpecs")}</div>
              <DetailsGrid box align="start" uuid={uuid} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
