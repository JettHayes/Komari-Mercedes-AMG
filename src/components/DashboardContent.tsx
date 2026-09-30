"use client";

import { Suspense } from "react";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useNodeList } from "@/contexts/NodeListContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useStatusCardsVisibility } from "@/hooks/useStatusCardsVisibility";
import { useMounted } from "@/hooks/useMounted";
import Loading from "@/components/loading";
import RaceGlobe from "@/components/race/RaceGlobe";
import NodeFleet from "@/components/race/NodeFleet";
import {
  AlertPanel,
  FleetKpiBar,
  RaceClock,
  RegionOverview,
  SpeedTrend,
} from "@/components/race/OverviewModules";
import { useTranslation } from "react-i18next";

export default function DashboardContent() {
  const mounted = useMounted();
  const { t } = useTranslation();
  const { live_data } = useLiveData();
  const { isThemeLoaded } = useTheme();
  const { nodeList, isLoading, error } = useNodeList();
  const [modules] = useStatusCardsVisibility();

  if (isLoading) return <Loading />;
  if (error) {
    return (
      <div className="container mx-auto px-4">
        <div className="rc-panel rc-panel--flat p-6 text-[var(--amg-crit)]">
          {t("common.error", { defaultValue: "Error" })}: {error}
        </div>
      </div>
    );
  }

  const nodes = nodeList ?? [];
  const liveData = live_data?.data ?? { online: [], data: {} };

  return (
    <div className="container mx-auto px-4 space-y-4">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <div className="rc-label mb-1">Mercedes-AMG PETRONAS</div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase">
            Race Control
          </h1>
        </div>
      </div>

      {modules.fleetKpi ? <FleetKpiBar nodes={nodes} liveData={liveData} /> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {modules.clock ? <RaceClock /> : null}
        {modules.alerts ? <AlertPanel nodes={nodes} liveData={liveData} /> : null}
        {modules.speedTrend ? <SpeedTrend liveData={liveData} /> : null}
        {modules.region ? <RegionOverview nodes={nodes} liveData={liveData} /> : null}
      </div>

      {mounted && isThemeLoaded && modules.map ? (
        <div className="rc-panel rc-panel--flat overflow-hidden">
          <RaceGlobe nodes={nodes} liveData={liveData} />
        </div>
      ) : null}

      <Suspense
        fallback={
          <div className="rc-panel rc-panel--flat p-6 text-muted-foreground">
            {t("raceControl.loadingTower")}
          </div>
        }
      >
        <NodeFleet nodes={nodes} liveData={liveData} />
      </Suspense>
    </div>
  );
}
