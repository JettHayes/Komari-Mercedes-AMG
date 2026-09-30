"use client";

import { useEffect, useState } from "react";
import { useRPC2Call } from "@/contexts/RPC2Context";
import themeMetadata from "../../komari-theme.json";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();
  const [versionInfo, setVersionInfo] = useState<{ hash: string; version: string } | null>(null);
  const { call } = useRPC2Call();

  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        const data = await call("common:getVersion");
        setVersionInfo({ hash: data.hash?.slice(0, 7), version: data.version });
      } catch {
        setVersionInfo(null);
      }
    };
    void fetchVersionInfo();
  }, [call]);

  return (
    <footer className="rc-footer">
      <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="font-bold tracking-wide uppercase text-sm">AMG Race Control</div>
          <div className="text-xs text-muted-foreground mt-1">
            Trackside telemetry for Komari · Theme {themeMetadata.version}
          </div>
        </div>
        <div className="text-xs text-muted-foreground rc-mono">
          {versionInfo ? (
            <span>
              {t("raceControl.poweredByVersion", { version: versionInfo.version })}
              {versionInfo.hash ? ` · ${versionInfo.hash}` : ""}
            </span>
          ) : (
            <span>{t("raceControl.poweredBy")}</span>
          )}
        </div>
        <span className="rc-footer-badge">Mercedes-AMG PETRONAS F1 Team</span>
      </div>
    </footer>
  );
};

export default Footer;
