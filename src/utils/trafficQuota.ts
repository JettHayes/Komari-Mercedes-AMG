import type { NodeBasicInfo } from "@/contexts/NodeListContext";

export type TrafficLimitType = NodeBasicInfo["traffic_limit_type"];

/** Bytes counted toward the node traffic quota, matching Komari admin limit types. */
export function getTrafficUsed(
  totalUp: number,
  totalDown: number,
  type?: TrafficLimitType,
): number {
  switch (type) {
    case "up":
      return totalUp;
    case "down":
      return totalDown;
    case "max":
      return Math.max(totalUp, totalDown);
    case "min":
      return Math.min(totalUp, totalDown);
    case "sum":
    default:
      return totalUp + totalDown;
  }
}

export function getTrafficQuotaPercent(used: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  if (!Number.isFinite(used) || used <= 0) return 0;
  return Math.min(100, (used / limit) * 100);
}

export function hasTrafficLimit(limit: number | undefined | null): boolean {
  return typeof limit === "number" && Number.isFinite(limit) && limit > 0;
}
