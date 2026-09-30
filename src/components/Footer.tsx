"use client";

import { useEffect, useState } from "react";
import { useRPC2Call } from "@/contexts/RPC2Context";
import themeMetadata from "../../komari-theme.json";

const REPO_URL = "https://github.com/JettHayes/Komari-Mercedes-AMG";

const Footer = () => {
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

  const poweredBy = versionInfo
    ? `Powered by Komari Monitor. ${versionInfo.version}${versionInfo.hash ? ` (${versionInfo.hash})` : ""}`
    : "Powered by Komari Monitor.";

  return (
    <footer className="rc-footer">
      <div className="rc-footer__inner">
        <div className="rc-footer__brand">
          <div className="rc-footer__title">AMG Race Control</div>
          <div className="rc-footer__sub">
            Trackside telemetry · Theme v{themeMetadata.version}
          </div>
        </div>

        <div className="rc-footer__meta">
          <span className="rc-footer__powered rc-mono">{poweredBy}</span>
          <a
            className="rc-footer__repo"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="rc-footer__repo-icon">
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            <span>JettHayes / Komari-Mercedes-AMG</span>
          </a>
        </div>

        <span className="rc-footer-badge">Mercedes-AMG PETRONAS F1 Team</span>
      </div>
    </footer>
  );
};

export default Footer;
