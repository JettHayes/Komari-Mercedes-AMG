"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { LiveDataResponse } from "../types/LiveData";
import { useRPC2Call } from "./RPC2Context";

interface LiveDataContextType {
  live_data: LiveDataResponse | null;
  showCallout: boolean;
  onRefresh: (callback: (data: LiveDataResponse) => void) => () => void;
}

const LiveDataContext = createContext<LiveDataContextType>({
  live_data: null,
  showCallout: true,
  onRefresh: () => () => {},
});

const EMPTY_LIVE: LiveDataResponse = {
  data: { online: [], data: {} },
  status: "ok",
};

export const LiveDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [live_data, setLiveData] = useState<LiveDataResponse | null>(null);
  const [showCallout, setShowCallout] = useState(true);
  const refreshCallbacksRef = useRef<Set<(data: LiveDataResponse) => void>>(new Set());
  const { call } = useRPC2Call();

  const onRefresh = useCallback((callback: (data: LiveDataResponse) => void) => {
    refreshCallbacksRef.current.add(callback);
    return () => {
      refreshCallbacksRef.current.delete(callback);
    };
  }, []);

  const notifyRefreshCallbacks = useCallback((data: LiveDataResponse) => {
    refreshCallbacksRef.current.forEach((callback) => callback(data));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timer: number | undefined;
    let stopped = false;
    let running = false;
    const intervalMs = 2000;

    const fetchLatest = async () => {
      if (running) return;
      running = true;
      try {
        const result: Record<string, any> = await Promise.race([
          call("common:getNodesLatestStatus"),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error("RPC timeout")), 3500),
          ),
        ]);

        if (!result || typeof result !== "object" || Object.keys(result).length === 0) {
          setLiveData(EMPTY_LIVE);
          setShowCallout(true);
          notifyRefreshCallbacks(EMPTY_LIVE);
          return;
        }

        const online = Object.values(result)
          .filter((v: any) => v?.online)
          .map((v: any) => v.client as string);

        const dataMap: Record<string, any> = {};
        for (const [uuid, v] of Object.entries(result)) {
          const rec = v as any;
          dataMap[uuid] = {
            cpu: { usage: typeof rec.cpu === "number" ? rec.cpu : 0 },
            ram: { used: rec.ram ?? 0 },
            swap: { used: rec.swap ?? 0 },
            load: {
              load1: rec.load ?? 0,
              load5: rec.load5 ?? 0,
              load15: rec.load15 ?? 0,
            },
            disk: { used: rec.disk ?? 0 },
            network: {
              up: rec.net_out ?? 0,
              down: rec.net_in ?? 0,
              totalUp: rec.net_total_out ?? rec.net_total_up ?? 0,
              totalDown: rec.net_total_in ?? rec.net_total_down ?? 0,
            },
            connections: {
              tcp: rec.connections ?? 0,
              udp: rec.connections_udp ?? 0,
            },
            gpu:
              rec.gpu !== undefined
                ? { count: 0, average_usage: rec.gpu, detailed_info: [] }
                : undefined,
            uptime: rec.uptime ?? 0,
            process: rec.process ?? 0,
            message: "",
            updated_at: rec.time ?? 0,
          };
        }

        const live: LiveDataResponse = {
          data: { online, data: dataMap },
          status: "ok",
        };
        setLiveData(live);
        setShowCallout(true);
        notifyRefreshCallbacks(live);
      } catch {
        setLiveData((prev) => prev ?? EMPTY_LIVE);
        setShowCallout(true);
      } finally {
        running = false;
        if (!stopped) {
          timer = window.setTimeout(fetchLatest, intervalMs);
        }
      }
    };

    fetchLatest();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [call, notifyRefreshCallbacks]);

  const contextValue = useMemo(
    () => ({ live_data, showCallout, onRefresh }),
    [live_data, showCallout, onRefresh],
  );

  return (
    <LiveDataContext.Provider value={contextValue}>{children}</LiveDataContext.Provider>
  );
};

export const useLiveData = () => useContext(LiveDataContext);

export default LiveDataContext;
