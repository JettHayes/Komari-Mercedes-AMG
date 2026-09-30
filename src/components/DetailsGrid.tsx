import { useTranslation } from "react-i18next";
import { useNodeList } from "@/contexts/NodeListContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { formatUptime } from "@/lib/statusTone";
import { formatBytes } from "@/utils/unitHelper";

type DetailsGridProps = {
  uuid: string;
  gap?: string;
  box?: boolean;
  align?: "start" | "center" | "end";
};

const StatRow = ({
  title,
  value,
  subValue,
}: {
  title: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
}) => (
  <div className="min-w-0 border-b border-[var(--amg-glass-border)] py-2.5 last:border-b-0">
    <div className="rc-label mb-1">{title}</div>
    <div className="text-sm font-semibold break-all">{value}</div>
    {subValue ? (
      <div className="rc-mono text-[10px] text-muted-foreground mt-0.5 break-all">{subValue}</div>
    ) : null}
  </div>
);

export const DetailsGrid = ({ uuid }: DetailsGridProps) => {
  const { t, i18n } = useTranslation();
  const { nodeList } = useNodeList();
  const { live_data } = useLiveData();
  const node = nodeList?.find((n) => n.uuid === uuid);
  const data = live_data?.data.data[uuid ?? ""];
  const unknown = t("raceControl.unknown");

  return (
    <div className="w-full">
      <StatRow
        title={t("raceControl.cpu")}
        value={node?.cpu_name || unknown}
        subValue={
          typeof node?.cpu_cores === "number"
            ? t("raceControl.cores", { count: node.cpu_cores })
            : unknown
        }
      />
      <StatRow title={t("nodeCard.arch")} value={node?.arch || unknown} />
      <StatRow title={t("nodeCard.virtualization")} value={node?.virtualization || unknown} />
      <StatRow title="GPU" value={node?.gpu_name || "—"} />
      <StatRow
        title={t("nodeCard.os")}
        value={node?.os || unknown}
        subValue={`${t("nodeCard.kernelVersion")}: ${node?.kernel_version || unknown}`}
      />
      <StatRow title={t("nodeCard.ram")} value={formatBytes(node?.mem_total || 0)} />
      <StatRow title={t("nodeCard.swap")} value={formatBytes(node?.swap_total || 0)} />
      <StatRow title={t("nodeCard.disk")} value={formatBytes(node?.disk_total || 0)} />
      <StatRow title={t("nodeCard.uptime")} value={data?.uptime ? formatUptime(data.uptime) : "—"} />
      <StatRow
        title={t("nodeCard.last_updated")}
        value={
          node?.updated_at
            ? new Date(data?.updated_at || node.updated_at).toLocaleString(
                i18n.language?.replace("_", "-") || "zh-CN"
              )
            : "—"
        }
      />
    </div>
  );
};
