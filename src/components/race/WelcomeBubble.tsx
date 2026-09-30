"use client";

import { useEffect, useState, type ReactNode } from "react";

const LOGO_URL = "/assets/Mercedes-Benz.png";

function getOperatingSystem(userAgent: string): string {
  if (/android/i.test(userAgent)) return "Android";
  if (/iPad|iPhone|iPod/.test(userAgent)) return "iOS";
  if (/macintosh|mac os x/i.test(userAgent)) return "macOS";
  if (/windows phone/i.test(userAgent)) return "Windows Phone";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Unknown device";
}

function getBrowserName(userAgent: string): string {
  if (userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  return "Unknown browser";
}

function OsIcon({ osName }: { osName: string }) {
  const name = osName.toLowerCase();
  if (name.includes("windows")) {
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
        <path d="M0 3.45 9.75 2.1v9.45H0V3.45Zm10.95-1.5L24 0v11.4H10.95V1.95ZM0 12.6h9.75v9.45L0 20.7v-8.1Zm10.95 0H24V24l-13.05-1.8v-9.6Z" />
      </svg>
    );
  }
  if (/mac|ios/.test(name)) {
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.8 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25Z" />
      </svg>
    );
  }
  if (name.includes("android")) {
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
        <path d="m17.6 9.48 1.84-3.18a.62.62 0 0 0-.26-.85.64.64 0 0 0-.83.22l-1.88 3.24a11.43 11.43 0 0 0-8.94 0L5.65 5.67a.64.64 0 0 0-.87-.2.62.62 0 0 0-.22.83L6.4 9.48A10.81 10.81 0 0 0 1 18h22a10.81 10.81 0 0 0-5.4-8.52ZM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}

async function fetchVisitorIp(): Promise<string | null> {
  const endpoints: [string, (response: Response) => Promise<string | null>][] = [
    ["https://api.ip.sb/ip", async (response) => (await response.text()).trim()],
    [
      "https://ipwho.is",
      async (response) => {
        const data = await response.json();
        return data?.success ? data.ip : null;
      },
    ],
    [
      "https://api.ipify.org?format=json",
      async (response) => (await response.json()).ip,
    ],
  ];
  for (const [url, parse] of endpoints) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const ip = await parse(response);
        if (ip) return ip;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

function InfoRow({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <p className="amg-welcome-info">
      {icon}
      <span className="data-text">{children}</span>
    </p>
  );
}

export default function WelcomeBubble() {
  const [ready, setReady] = useState(false);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [tabVisible, setTabVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [bootOnce, setBootOnce] = useState(true);
  const [busy, setBusy] = useState(false);
  const [osName, setOsName] = useState("Unknown device");
  const [browser, setBrowser] = useState("Unknown browser");
  const [ip, setIp] = useState("Fetching...");
  const [dateText, setDateText] = useState("");
  const [logoFallback, setLogoFallback] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setOsName(getOperatingSystem(ua));
    setBrowser(getBrowserName(ua));
    setDateText(
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Shanghai",
      }),
    );

    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        setReady(true);
        timers.push(
          window.setTimeout(() => {
            setBubbleOpen(true);
            timers.push(
              window.setTimeout(() => setBootOnce(false), 800),
            );
          }, 60),
        );
      }, 1200),
    );

    void fetchVisitorIp().then((value) => {
      setIp(value || "Unavailable");
    });

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  const closeBubble = () => {
    if (busy || !bubbleOpen) return;
    setBusy(true);
    setLeaving(true);
    setBubbleOpen(false);
    window.setTimeout(() => {
      setLeaving(false);
      setTabVisible(true);
      setBusy(false);
    }, 320);
  };

  const openBubble = () => {
    if (busy || bubbleOpen) return;
    setBusy(true);
    setTabVisible(false);
    window.setTimeout(() => {
      setBootOnce(true);
      setBubbleOpen(true);
      window.setTimeout(() => {
        setBootOnce(false);
        setBusy(false);
      }, 720);
    }, 220);
  };

  if (!ready) return null;

  const bubbleClass = [
    "amg-welcome-bubble",
    bubbleOpen ? "show" : "",
    leaving ? "is-leaving" : "",
    bootOnce && bubbleOpen ? "is-booting" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={bubbleClass} aria-hidden={!bubbleOpen}>
        <div className="amg-welcome-header">
          <div
            className="amg-welcome-logo"
            aria-hidden="true"
            data-logo-fallback={logoFallback ? "true" : undefined}
          >
            {!logoFallback ? (
              <img
                src={LOGO_URL}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setLogoFallback(true)}
              />
            ) : null}
          </div>
          <div className="amg-welcome-brand">
            <p className="amg-welcome-kicker">Mercedes-AMG PETRONAS</p>
            <h3 className="amg-welcome-title">
              <span>Control Panel Ready</span>
              <span className="amg-welcome-subtitle">Race Control theme active</span>
            </h3>
          </div>
          <button
            className="amg-welcome-close"
            type="button"
            title="Close welcome"
            onClick={closeBubble}
            disabled={busy}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="amg-welcome-content">
          <InfoRow
            icon={
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            }
          >
            Welcome back — Race Control is ready
          </InfoRow>
          <InfoRow icon={<span id="amg-os-icon"><OsIcon osName={osName} /></span>}>
            {osName}
          </InfoRow>
          <InfoRow
            icon={
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            }
          >
            {browser}
          </InfoRow>
          <InfoRow
            icon={
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="2" width="6" height="6" rx="1" />
                <rect x="2" y="16" width="6" height="6" rx="1" />
                <rect x="16" y="16" width="6" height="6" rx="1" />
                <path d="M12 8v4" />
                <path d="M12 12H5v4" />
                <path d="M12 12h7v4" />
              </svg>
            }
          >
            {ip}
          </InfoRow>
          <InfoRow
            icon={
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          >
            {dateText}
          </InfoRow>
        </div>
      </div>

      <button
        type="button"
        className={`amg-collapse-tab${tabVisible ? " visible" : ""}`}
        onClick={openBubble}
        disabled={busy}
        aria-hidden={!tabVisible}
        tabIndex={tabVisible ? 0 : -1}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Race Control
      </button>
    </>
  );
}
