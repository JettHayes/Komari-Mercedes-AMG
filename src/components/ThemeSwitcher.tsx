"use client";

import {
  useTheme,
  DEFAULT_GUEST_DISPLAY_SETTINGS,
  type GuestDisplaySettings,
  type StatusCardsVisibility,
} from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings, LayoutGrid, LayoutPanelLeft, List, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStatusCardsVisibility } from "@/hooks/useStatusCardsVisibility";
import { useNodeViewMode } from "@/hooks/useNodeViewMode";
import { cn } from "@/lib/utils";

const MODULE_KEYS: (keyof StatusCardsVisibility)[] = [
  "fleetKpi",
  "alerts",
  "speedTrend",
  "map",
  "region",
  "clock",
];

const MODULE_LABEL_KEYS: Record<keyof StatusCardsVisibility, string> = {
  fleetKpi: "raceControl.fleetKpi",
  alerts: "raceControl.alerts",
  speedTrend: "raceControl.networkPace",
  map: "raceControl.map",
  region: "raceControl.regions",
  clock: "raceControl.sessionClock",
};

const ThemeSwitcher = () => {
  const {
    themeConfig,
    setShowRamDiskTotal,
    isThemeSettingsAdmin,
    managedThemeSettings,
    setGuestDisplay,
  } = useTheme();
  const { t } = useTranslation();
  const [statusCardsVisibility, updateStatusCardVisibility] = useStatusCardsVisibility();
  const [nodeViewMode, setNodeViewMode] = useNodeViewMode();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
          <Settings className="h-4 w-4" />
          <span className="sr-only">{t("theme.toggle", { defaultValue: "Theme settings" })}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div>
          <div className="rc-label mb-2">{t("raceControl.nodeView")}</div>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { value: "large", icon: LayoutPanelLeft, labelKey: "raceControl.viewLarge" },
                { value: "grid", icon: LayoutGrid, labelKey: "raceControl.viewCompact" },
                { value: "table", icon: List, labelKey: "raceControl.viewList" },
                { value: "auto", icon: Sparkles, labelKey: "raceControl.viewAuto" },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setNodeViewMode(item.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs cursor-pointer transition-colors",
                  nodeViewMode === item.value
                    ? "border-[var(--amg-teal)] bg-[var(--amg-teal)]/10"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(item.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="rc-label mb-2">{t("raceControl.overviewModules")}</div>
          <div className="space-y-2">
            {MODULE_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm">{t(MODULE_LABEL_KEYS[key])}</span>
                <Switch
                  checked={statusCardsVisibility[key]}
                  onCheckedChange={(checked) => updateStatusCardVisibility(key, checked)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{t("raceControl.showTotals")}</div>
            <div className="text-xs text-muted-foreground">{t("raceControl.showTotalsHint")}</div>
          </div>
          <Switch
            checked={themeConfig.showRamDiskTotal}
            onCheckedChange={setShowRamDiskTotal}
          />
        </div>

        {isThemeSettingsAdmin ? (
          <div>
            <div className="rc-label mb-2">{t("raceControl.guestDisplay")}</div>
            <div className="space-y-2">
              {(Object.keys(DEFAULT_GUEST_DISPLAY_SETTINGS) as (keyof GuestDisplaySettings)[]).map(
                (key) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-sm">
                      {key === "showPrice"
                        ? t("raceControl.showPrices")
                        : t("raceControl.showExpiration")}
                    </span>
                    <Switch
                      checked={
                        managedThemeSettings.guestDisplay?.[key] ??
                        DEFAULT_GUEST_DISPLAY_SETTINGS[key]
                      }
                      onCheckedChange={(checked) => setGuestDisplay(key, checked)}
                    />
                  </div>
                )
              )}
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

export default ThemeSwitcher;
