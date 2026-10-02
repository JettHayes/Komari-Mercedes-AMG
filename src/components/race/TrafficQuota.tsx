"use client";

import { useTranslation } from "react-i18next";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { Record as LiveRecord } from "@/types/LiveData";
import { formatBytes } from "@/utils/unitHelper";
import {
  getTrafficQuotaPercent,
  getTrafficUsed,
  hasTrafficLimit,
} from "@/utils/trafficQuota";
import { StatusMeter } from "@/components/race/StatusMeter";
import { cn } from "@/lib/utils";

type TrafficQuotaProps = {
  node: NodeBasicInfo;
  rec?: LiveRecord | null;
  /** large: labeled meter; compact: meter only; inline: table cell */
  variant?: "large" | "compact" | "inline";
  className?: string;
};

export function TrafficQuota({
  node,
  rec,
  variant = "large",
  className,
}: TrafficQuotaProps) {
  const { t } = useTranslation();
  const limited = hasTrafficLimit(node.traffic_limit);

  if (!limited) {
    if (variant === "inline") {
      return (
        <div className={cn("rc-mono text-[10px] text-muted-foreground", className)}>
          {t("raceControl.trafficNoLimit")}
        </div>
      );
    }

    return (
      <div className={cn("min-w-0 space-y-1", className)}>
        <div className="rc-label">{t("raceControl.traffic")}</div>
        <div className="rc-mono text-[10px] text-muted-foreground">
          {t("raceControl.trafficNoLimit")}
        </div>
      </div>
    );
  }

  const used = rec
    ? getTrafficUsed(rec.network.totalUp, rec.network.totalDown, node.traffic_limit_type)
    : 0;
  const limit = node.traffic_limit;
  const percent = getTrafficQuotaPercent(used, limit);
  const detail = `${formatBytes(used)} / ${formatBytes(limit)}`;

  if (variant === "inline") {
    return (
      <div className={cn("min-w-0 space-y-1", className)}>
        <StatusMeter value={percent} showValue />
        <div className="rc-mono text-[10px] text-muted-foreground truncate">{detail}</div>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <StatusMeter label={t("raceControl.traffic")} value={percent} />
      <div className="rc-mono text-[10px] text-muted-foreground truncate">{detail}</div>
    </div>
  );
}
