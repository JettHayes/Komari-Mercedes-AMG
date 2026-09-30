"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useTheme as useNextTheme } from "next-themes";
import { updateSettings } from "@/lib/api";
import i18n, {
  DEFAULT_LANGUAGE,
  detectClientLanguage,
  normalizeLanguage,
} from "@/i18n/config";

export type NodeViewMode = "auto" | "grid" | "table" | "large";
export type Appearance = "light" | "dark";

export interface ThemeConfig {
  showRamDiskTotal: boolean;
}

/** Overview module visibility (Race Control) */
export type StatusCardsVisibility = {
  clock: boolean;
  fleetKpi: boolean;
  alerts: boolean;
  speedTrend: boolean;
  map: boolean;
  region: boolean;
};

export type GuestDisplaySettings = {
  showPrice: boolean;
  showExpiredAt: boolean;
};

export interface ManagedThemeSettings extends Partial<ThemeConfig> {
  statusCardsVisibility?: Partial<StatusCardsVisibility>;
  guestDisplay?: Partial<GuestDisplaySettings>;
  nodeViewMode?: NodeViewMode;
  appearance?: Appearance;
  language?: string;
  offlineServerPosition?: "First" | "Keep" | "Last";
}

interface ThemeContextType {
  themeConfig: ThemeConfig;
  managedThemeSettings: ManagedThemeSettings;
  isThemeSettingsAdmin: boolean;
  isThemeLoaded: boolean;
  isLoggedIn: boolean;
  statusCardsVisibility: StatusCardsVisibility;
  guestDisplay: GuestDisplaySettings;
  nodeViewMode: NodeViewMode;
  appearance: Appearance;
  language: string;
  setShowRamDiskTotal: (show: boolean) => void;
  setStatusCardVisibility: (key: keyof StatusCardsVisibility, checked: boolean) => void;
  setGuestDisplay: (key: keyof GuestDisplaySettings, checked: boolean) => void;
  setNodeViewMode: (value: NodeViewMode) => void;
  setAppearance: (value: Appearance) => void;
  setLanguage: (value: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_OVERRIDES_STORAGE_KEY = "komari-theme-config-overrides";
const STATUS_CARDS_STORAGE_KEY = "statusCardsVisibility";
const NODE_VIEW_STORAGE_KEY = "nodeViewMode";
const APPEARANCE_STORAGE_KEY = "komari-appearance";
const LANGUAGE_STORAGE_KEY = "komari-language";
const LOCAL_OVERRIDE_BASE_SIGNATURE_KEY = "komari-theme-local-override-base";

const NODE_VIEW_MODES: NodeViewMode[] = ["auto", "grid", "table", "large"];
const APPEARANCES: Appearance[] = ["light", "dark"];
const MODULE_KEYS: (keyof StatusCardsVisibility)[] = [
  "clock",
  "fleetKpi",
  "alerts",
  "speedTrend",
  "map",
  "region",
];

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  showRamDiskTotal: true,
};

export const DEFAULT_STATUS_CARDS_VISIBILITY: StatusCardsVisibility = {
  clock: true,
  fleetKpi: true,
  alerts: true,
  speedTrend: true,
  map: true,
  region: true,
};

export const DEFAULT_GUEST_DISPLAY_SETTINGS: GuestDisplaySettings = {
  showPrice: true,
  showExpiredAt: true,
};

export const DEFAULT_NODE_VIEW_MODE: NodeViewMode = "large";
export const DEFAULT_APPEARANCE: Appearance = "dark";

type AdminState = "loading" | "yes" | "no";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readJsonStorage(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

function writeJsonStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    if (isRecord(value) && Object.keys(value).length === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function writeStringStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function removeStorage(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function pickBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function pickEnum<T extends string>(value: unknown, allowed: T[]): T | undefined {
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as T)
    : undefined;
}

function readDottedValue(source: Record<string, unknown>, path: string): unknown {
  if (path in source) return source[path];
  const parts = path.split(".");
  let cur: unknown = source;
  for (const part of parts) {
    if (!isRecord(cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

function parseThemeSettings(raw: unknown): ManagedThemeSettings {
  const source = isRecord(raw) ? raw : {};
  const result: ManagedThemeSettings = {};

  const showRamDiskTotal = pickBoolean(source.showRamDiskTotal);
  if (showRamDiskTotal !== undefined) result.showRamDiskTotal = showRamDiskTotal;

  const nodeViewMode = pickEnum(source.nodeViewMode, NODE_VIEW_MODES);
  if (nodeViewMode) result.nodeViewMode = nodeViewMode;

  const offlineServerPosition = pickEnum(source.offlineServerPosition, [
    "First",
    "Keep",
    "Last",
  ] as const);
  if (offlineServerPosition) result.offlineServerPosition = offlineServerPosition;

  const appearance = pickEnum(source.appearance, APPEARANCES);
  if (appearance) result.appearance = appearance;

  const language =
    typeof source.language === "string" ? normalizeLanguage(source.language) : undefined;
  if (language) result.language = language;

  const statusCardsVisibility: Partial<StatusCardsVisibility> = {};
  for (const key of MODULE_KEYS) {
    const value = pickBoolean(readDottedValue(source, `statusCardsVisibility.${key}`));
    if (value !== undefined) statusCardsVisibility[key] = value;
  }
  // migrate legacy mapView → map
  if (statusCardsVisibility.map === undefined) {
    const legacyMap = pickBoolean(readDottedValue(source, "statusCardsVisibility.mapView"));
    if (legacyMap !== undefined) statusCardsVisibility.map = legacyMap;
  }
  if (Object.keys(statusCardsVisibility).length > 0) {
    result.statusCardsVisibility = statusCardsVisibility;
  }

  const guestDisplay: Partial<GuestDisplaySettings> = {};
  for (const key of ["showPrice", "showExpiredAt"] as const) {
    const value = pickBoolean(readDottedValue(source, `guestDisplay.${key}`));
    if (value !== undefined) guestDisplay[key] = value;
  }
  if (Object.keys(guestDisplay).length > 0) result.guestDisplay = guestDisplay;

  return result;
}

function sanitizeLocalOverrides(raw: unknown): Partial<ThemeConfig> {
  if (!isRecord(raw)) return {};
  const showRamDiskTotal = pickBoolean(raw.showRamDiskTotal);
  return showRamDiskTotal === undefined ? {} : { showRamDiskTotal };
}

function sanitizeModuleOverrides(raw: unknown): Partial<StatusCardsVisibility> {
  if (!isRecord(raw)) return {};
  const next: Partial<StatusCardsVisibility> = {};
  for (const key of MODULE_KEYS) {
    const value = pickBoolean(raw[key]);
    if (value !== undefined) next[key] = value;
  }
  return next;
}

function deepMergeSettings(
  base: ManagedThemeSettings,
  patch: ManagedThemeSettings
): ManagedThemeSettings {
  return {
    ...base,
    ...patch,
    statusCardsVisibility: {
      ...(base.statusCardsVisibility || {}),
      ...(patch.statusCardsVisibility || {}),
    },
    guestDisplay: {
      ...(base.guestDisplay || {}),
      ...(patch.guestDisplay || {}),
    },
  };
}

function flattenForApi(settings: ManagedThemeSettings): Record<string, unknown> {
  const next: Record<string, unknown> = { ...settings };
  if (settings.statusCardsVisibility) {
    delete next.statusCardsVisibility;
    for (const [key, value] of Object.entries(settings.statusCardsVisibility)) {
      next[`statusCardsVisibility.${key}`] = value;
    }
  }
  if (settings.guestDisplay) {
    delete next.guestDisplay;
    for (const [key, value] of Object.entries(settings.guestDisplay)) {
      next[`guestDisplay.${key}`] = value;
    }
  }
  return next;
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { setTheme: setNextTheme } = useNextTheme();
  const [managedThemeSettings, setManagedThemeSettings] = useState<ManagedThemeSettings>({});
  const [localThemeOverrides, setLocalThemeOverrides] = useState<Partial<ThemeConfig>>({});
  const [localStatusCardsOverrides, setLocalStatusCardsOverrides] = useState<
    Partial<StatusCardsVisibility>
  >({});
  const [localNodeViewOverride, setLocalNodeViewOverride] = useState<NodeViewMode | undefined>();
  const [localAppearanceOverride, setLocalAppearanceOverride] = useState<Appearance | undefined>();
  const [localLanguageOverride, setLocalLanguageOverride] = useState<string | undefined>();
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const [adminState, setAdminState] = useState<AdminState>("loading");
  const pendingAdminPatchRef = useRef<ManagedThemeSettings>({});
  const managedRef = useRef(managedThemeSettings);
  managedRef.current = managedThemeSettings;

  useEffect(() => {
    setLocalThemeOverrides(sanitizeLocalOverrides(readJsonStorage(THEME_OVERRIDES_STORAGE_KEY)));
    setLocalStatusCardsOverrides(sanitizeModuleOverrides(readJsonStorage(STATUS_CARDS_STORAGE_KEY)));
    const storedView = pickEnum(readJsonStorage(NODE_VIEW_STORAGE_KEY), NODE_VIEW_MODES);
    if (storedView) setLocalNodeViewOverride(storedView);
    const storedAppearanceRaw =
      typeof window !== "undefined" ? window.localStorage.getItem(APPEARANCE_STORAGE_KEY) : null;
    // Migrate legacy "system" preference to light.
    const storedAppearance =
      storedAppearanceRaw === "system"
        ? "light"
        : pickEnum(storedAppearanceRaw, APPEARANCES);
    if (storedAppearance) setLocalAppearanceOverride(storedAppearance);
    const storedLanguage =
      typeof window !== "undefined" ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
    if (storedLanguage) setLocalLanguageOverride(normalizeLanguage(storedLanguage) || undefined);
  }, []);

  const themeConfig = useMemo<ThemeConfig>(
    () => ({
      ...DEFAULT_THEME_CONFIG,
      ...managedThemeSettings,
      ...localThemeOverrides,
    }),
    [localThemeOverrides, managedThemeSettings]
  );

  const statusCardsVisibility = useMemo<StatusCardsVisibility>(
    () => ({
      ...DEFAULT_STATUS_CARDS_VISIBILITY,
      ...(managedThemeSettings.statusCardsVisibility || {}),
      ...localStatusCardsOverrides,
    }),
    [localStatusCardsOverrides, managedThemeSettings.statusCardsVisibility]
  );

  const guestDisplay = useMemo<GuestDisplaySettings>(
    () => ({
      ...DEFAULT_GUEST_DISPLAY_SETTINGS,
      ...(managedThemeSettings.guestDisplay || {}),
    }),
    [managedThemeSettings.guestDisplay]
  );

  const nodeViewMode =
    localNodeViewOverride || managedThemeSettings.nodeViewMode || DEFAULT_NODE_VIEW_MODE;
  const appearance =
    localAppearanceOverride || managedThemeSettings.appearance || DEFAULT_APPEARANCE;
  const language =
    localLanguageOverride ||
    managedThemeSettings.language ||
    (typeof window !== "undefined" ? detectClientLanguage() : DEFAULT_LANGUAGE);
  const isLoggedIn = adminState === "yes";

  const persistManagedSettings = useCallback(async (patch: ManagedThemeSettings) => {
    const merged = deepMergeSettings(managedRef.current, patch);
    setManagedThemeSettings(merged);
    try {
      await updateSettings({ theme_settings: flattenForApi(merged) });
    } catch (error) {
      console.error("Failed to persist theme settings:", error);
    }
  }, []);

  const applyAdminOrLocalPatch = useCallback(
    (patch: ManagedThemeSettings): boolean => {
      if (adminState === "yes") {
        void persistManagedSettings(patch);
        return true;
      }
      if (adminState === "loading") {
        pendingAdminPatchRef.current = deepMergeSettings(pendingAdminPatchRef.current, patch);
        return false;
      }
      return false;
    },
    [adminState, persistManagedSettings]
  );

  const setShowRamDiskTotal = useCallback(
    (show: boolean) => {
      const isAdmin = applyAdminOrLocalPatch({ showRamDiskTotal: show });
      if (!isAdmin) {
        setLocalThemeOverrides((prev) => {
          const next = { ...prev, showRamDiskTotal: show };
          writeJsonStorage(THEME_OVERRIDES_STORAGE_KEY, next);
          return next;
        });
      }
    },
    [applyAdminOrLocalPatch]
  );

  const setStatusCardVisibility = useCallback(
    (key: keyof StatusCardsVisibility, checked: boolean) => {
      const patch = { statusCardsVisibility: { [key]: checked } };
      const isAdmin = applyAdminOrLocalPatch(patch);
      if (!isAdmin) {
        setLocalStatusCardsOverrides((prev) => {
          const next = { ...prev, [key]: checked };
          writeJsonStorage(STATUS_CARDS_STORAGE_KEY, next);
          return next;
        });
      }
    },
    [applyAdminOrLocalPatch]
  );

  const setGuestDisplay = useCallback(
    (key: keyof GuestDisplaySettings, checked: boolean) => {
      applyAdminOrLocalPatch({ guestDisplay: { [key]: checked } });
    },
    [applyAdminOrLocalPatch]
  );

  const setNodeViewModeValue = useCallback(
    (value: NodeViewMode) => {
      const isAdmin = applyAdminOrLocalPatch({ nodeViewMode: value });
      if (!isAdmin) {
        setLocalNodeViewOverride(value);
        writeJsonStorage(NODE_VIEW_STORAGE_KEY, value);
      }
    },
    [applyAdminOrLocalPatch]
  );

  const setAppearanceValue = useCallback(
    (value: Appearance) => {
      const isAdmin = applyAdminOrLocalPatch({ appearance: value });
      if (!isAdmin) {
        setLocalAppearanceOverride(value);
        writeStringStorage(APPEARANCE_STORAGE_KEY, value);
      }
    },
    [applyAdminOrLocalPatch]
  );

  const setLanguageValue = useCallback(
    (value: string) => {
      const nextLanguage = normalizeLanguage(value);
      if (!nextLanguage) return;

      // Always apply locally first so the UI switches immediately.
      setLocalLanguageOverride(nextLanguage);
      writeStringStorage(LANGUAGE_STORAGE_KEY, nextLanguage);
      writeStringStorage("i18nextLng", nextLanguage);
      void i18n.changeLanguage(nextLanguage);
      if (typeof document !== "undefined") {
        document.documentElement.lang = nextLanguage.replace("_", "-");
      }

      applyAdminOrLocalPatch({ language: nextLanguage });
    },
    [applyAdminOrLocalPatch]
  );

  useEffect(() => {
    let mounted = true;
    fetch("/api/public")
      .then((res) => (res.ok ? res.json() : null))
      .then((resp) => {
        if (!mounted) return;
        setManagedThemeSettings(parseThemeSettings(resp?.data?.theme_settings));
        setIsThemeLoaded(true);
      })
      .catch(() => {
        if (!mounted) return;
        setManagedThemeSettings({});
        setIsThemeLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted) setAdminState(data?.logged_in ? "yes" : "no");
      })
      .catch(() => {
        if (mounted) setAdminState("no");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (adminState === "loading") return;
    const pending = pendingAdminPatchRef.current;
    pendingAdminPatchRef.current = {};
    if (adminState === "yes" && Object.keys(pending).length > 0) {
      void persistManagedSettings(pending);
    }
  }, [adminState, persistManagedSettings]);

  useEffect(() => {
    setNextTheme(appearance);
  }, [appearance, setNextTheme]);

  useEffect(() => {
    const nextLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;
    if (i18n.language !== nextLanguage) void i18n.changeLanguage(nextLanguage);
    if (typeof document !== "undefined") {
      document.documentElement.lang = nextLanguage.replace("_", "-");
    }
  }, [language]);

  const value = useMemo<ThemeContextType>(
    () => ({
      themeConfig,
      managedThemeSettings,
      isThemeSettingsAdmin: adminState === "yes",
      isThemeLoaded,
      isLoggedIn,
      statusCardsVisibility,
      guestDisplay,
      nodeViewMode,
      appearance,
      language,
      setShowRamDiskTotal,
      setStatusCardVisibility,
      setGuestDisplay,
      setNodeViewMode: setNodeViewModeValue,
      setAppearance: setAppearanceValue,
      setLanguage: setLanguageValue,
    }),
    [
      appearance,
      adminState,
      guestDisplay,
      isThemeLoaded,
      isLoggedIn,
      language,
      managedThemeSettings,
      nodeViewMode,
      setAppearanceValue,
      setGuestDisplay,
      setLanguageValue,
      setNodeViewModeValue,
      setShowRamDiskTotal,
      setStatusCardVisibility,
      statusCardsVisibility,
      themeConfig,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
