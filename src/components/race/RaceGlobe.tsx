"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  geoArea,
  geoCentroid,
  geoContains,
  geoDistance,
  geoGraticule10,
  geoOrthographic,
  geoPath,
  type GeoPermissibleObjects,
} from "d3-geo";
import { feature } from "topojson-client";
import { useTranslation } from "react-i18next";
import { Orbit } from "lucide-react";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "@/types/LiveData";
import { buildMapViewSummary, type MapRegionSummary } from "@/utils/mapRegions";
import Flag from "@/components/Flag";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getRegionDisplayName } from "@/utils/regionHelper";

import "./RaceGlobe.css";

const MAX_SIZE = 460;
const ROTATE_SPEED = 0.018; // deg per ms
const FRAME_MS = 33;
const INITIAL_ROTATION: [number, number] = [20, -18];
// ~0.4° ≈ 1.6px at MAX_SIZE, finer vertices are invisible but cost a full projection each frame
const SIMPLIFY_DEG = 0.4;
const CALLOUT_WIDTH = 248;
const CALLOUT_GAP = 44;
const CALLOUT_EDGE = 76;
const CALLOUT_NODE_LIMIT = 4;

type Callout = {
  id: number;
  key: string;
  x: number;
  y: number;
  size: number;
  side: "left" | "right";
  docked: boolean;
};

type GeoFeature = GeoPermissibleObjects & { properties?: { name?: string }; id?: string };
type Ring = number[][];
type LooseGeometry = { type: string; coordinates?: unknown; geometries?: LooseGeometry[] };

function simplifyRing(ring: Ring): Ring | null {
  if (ring.length < 4) return ring;
  const out: Ring = [ring[0]];
  let [px, py] = ring[0];
  for (let i = 1; i < ring.length - 1; i++) {
    const [x, y] = ring[i];
    // antimeridian / pole cut points define ring winding on the sphere, never drop them
    const onEdge = Math.abs(x) >= 179.9 || Math.abs(y) >= 89.9;
    const dx = (x - px) * Math.cos((y * Math.PI) / 180);
    const dy = y - py;
    if (onEdge || dx * dx + dy * dy >= SIMPLIFY_DEG * SIMPLIFY_DEG) {
      out.push(ring[i]);
      px = x;
      py = y;
    }
  }
  out.push(ring[ring.length - 1]);
  return out.length >= 4 ? out : null;
}

const HEMISPHERE_SR = 2 * Math.PI;

function simplifyPolygon(rings: Ring[]): Ring[] | null {
  const outer = simplifyRing(rings[0]);
  if (!outer) return null;
  // a collapsed sliver can flip winding and d3 would then fill the whole sphere
  if (
    geoArea({ type: "Polygon", coordinates: [outer] } as GeoPermissibleObjects) > HEMISPHERE_SR &&
    geoArea({ type: "Polygon", coordinates: [rings[0]] } as GeoPermissibleObjects) <= HEMISPHERE_SR
  ) {
    return null;
  }
  const holes = rings.slice(1).map(simplifyRing).filter((r): r is Ring => r !== null);
  return [outer, ...holes];
}

function simplifyGeometry(geometry: LooseGeometry): LooseGeometry | null {
  if (geometry.type === "Polygon") {
    const coordinates = simplifyPolygon(geometry.coordinates as Ring[]);
    return coordinates ? { type: "Polygon", coordinates } : null;
  }
  if (geometry.type === "MultiPolygon") {
    const coordinates = (geometry.coordinates as Ring[][])
      .map(simplifyPolygon)
      .filter((p): p is Ring[] => p !== null);
    return coordinates.length ? { type: "MultiPolygon", coordinates } : null;
  }
  if (geometry.type === "GeometryCollection") {
    const geometries = (geometry.geometries ?? [])
      .map(simplifyGeometry)
      .filter((g): g is LooseGeometry => g !== null);
    return geometries.length ? { type: "GeometryCollection", geometries } : null;
  }
  return geometry;
}

/** Tiny shapes that vanish after simplification (e.g. Singapore) fall back to the original. */
function simplifyShape<T extends GeoPermissibleObjects>(shape: T): T {
  const source = shape as unknown as {
    type: string;
    geometry?: LooseGeometry | null;
    features?: { geometry?: LooseGeometry | null }[];
  };
  if (source.type === "FeatureCollection" && source.features) {
    return {
      ...source,
      features: source.features.map((f) => simplifyShape(f as unknown as GeoPermissibleObjects)),
    } as unknown as T;
  }
  if (source.type === "Feature") {
    const geometry = source.geometry ? simplifyGeometry(source.geometry) : null;
    return (geometry ? { ...source, geometry } : shape) as T;
  }
  return (simplifyGeometry(source as LooseGeometry) ?? shape) as T;
}

type WorldData = {
  land: GeoPermissibleObjects;
  countries: Map<string, GeoFeature>;
};

type ActiveRegion = {
  region: MapRegionSummary;
  feature: GeoFeature;
  shape: GeoFeature;
  centroid: [number, number];
};

type Palette = {
  ocean: string;
  land: string;
  graticule: string;
  teal: string;
  ok: string;
  warn: string;
  crit: string;
};

let worldPromise: Promise<WorldData> | null = null;

function loadWorld(): Promise<WorldData> {
  if (!worldPromise) {
    worldPromise = import("@/data/world-countries-50m.json").then((mod) => {
      const topo = ((mod as { default?: unknown }).default ?? mod) as {
        objects: { land: never; countries: never };
      };
      const land = simplifyShape(
        feature(topo as never, topo.objects.land) as unknown as GeoPermissibleObjects,
      );
      const collection = feature(topo as never, topo.objects.countries) as unknown as {
        features: GeoFeature[];
      };
      const countries = new Map<string, GeoFeature>();
      for (const country of collection.features) {
        countries.set(country.properties?.name ?? String(country.id ?? "unknown"), country);
      }
      return { land, countries };
    });
  }
  return worldPromise;
}

function readPalette(el: Element): Palette {
  const style = getComputedStyle(el);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    ocean: read("--amg-map-ocean", "#b7cdd4"),
    land: read("--amg-map-land", "#8fa3aa"),
    graticule: read("--amg-map-graticule", "rgb(0 140 132 / 0.16)"),
    teal: read("--amg-teal", "#1ad9bc"),
    ok: read("--amg-ok", "#16a34a"),
    warn: read("--amg-warn", "#d97706"),
    crit: read("--amg-crit", "#e11d48"),
  };
}

function statusColor(palette: Palette, status: MapRegionSummary["status"]) {
  if (status === "online") return palette.ok;
  if (status === "partial") return palette.warn;
  return palette.crit;
}

const GRATICULE = geoGraticule10();
const SPHERE = { type: "Sphere" } as const;

export default function RaceGlobe({
  nodes,
  liveData,
}: {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}) {
  const { t, i18n } = useTranslation();
  const summary = useMemo(() => buildMapViewSummary(nodes, liveData), [nodes, liveData]);
  const onlineSet = useMemo(() => new Set(liveData?.online ?? []), [liveData]);
  const [autoRotate, setAutoRotate] = useLocalStorage("raceGlobe.autoOrbit", true);
  const [callout, setCallout] = useState<Callout | null>(null);
  const [calloutOpen, setCalloutOpen] = useState(false);
  const [world, setWorld] = useState<WorldData | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const projectionRef = useRef(geoOrthographic().clipAngle(90).precision(0));
  const rotationRef = useRef<[number, number]>([...INITIAL_ROTATION]);
  const sizeRef = useRef(0);
  const dprRef = useRef(1);
  const paletteRef = useRef<Palette | null>(null);
  const activeRef = useRef<ActiveRegion[]>([]);
  const worldRef = useRef<WorldData | null>(null);
  const autoRotateRef = useRef(autoRotate);
  const hoverPausedRef = useRef(false);
  const visibleRef = useRef(true);
  const dirtyRef = useRef(true);
  const hoverKeyRef = useRef<string | null>(null);
  const dragRef = useRef({ active: false, x: 0, y: 0, rotation: [...INITIAL_ROTATION] as [number, number] });

  useEffect(() => {
    autoRotateRef.current = autoRotate;
    dirtyRef.current = true;
  }, [autoRotate]);

  useEffect(() => {
    let cancelled = false;
    void loadWorld().then((data) => {
      if (cancelled) return;
      worldRef.current = data;
      setWorld(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!world) return;
    const list: ActiveRegion[] = [];
    for (const region of summary.regions) {
      const country = world.countries.get(region.mapName);
      if (!country) continue;
      list.push({
        region,
        feature: country,
        shape: simplifyShape(country),
        centroid: geoCentroid(country),
      });
    }
    activeRef.current = list;
    dirtyRef.current = true;
  }, [summary.regions, world]);

  const draw = useCallback((now: number, pulse: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const size = sizeRef.current;
    if (!canvas || !ctx || !size) return;

    if (!paletteRef.current) paletteRef.current = readPalette(canvas);
    const palette = paletteRef.current;
    const dpr = dprRef.current;
    const center = size / 2;
    const radius = center - 6;
    const [lambda, phi] = rotationRef.current;

    const projection = projectionRef.current
      .translate([center, center])
      .scale(radius)
      .rotate([lambda, phi, 0]);
    const path = geoPath(projection, ctx);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    path(SPHERE);
    ctx.fillStyle = palette.ocean;
    ctx.fill();

    ctx.beginPath();
    path(GRATICULE);
    ctx.strokeStyle = palette.graticule;
    ctx.lineWidth = 0.6;
    ctx.stroke();

    const data = worldRef.current;
    if (data) {
      ctx.beginPath();
      path(data.land);
      ctx.fillStyle = palette.land;
      ctx.fill();

      for (const item of activeRef.current) {
        const color = statusColor(palette, item.region.status);
        ctx.beginPath();
        path(item.shape);
        ctx.globalAlpha = hoverKeyRef.current === item.region.key ? 0.95 : 0.78;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = color;
        ctx.stroke();
      }
    }

    const shade = ctx.createRadialGradient(
      center - radius * 0.35,
      center - radius * 0.4,
      radius * 0.05,
      center,
      center,
      radius,
    );
    shade.addColorStop(0, "rgba(255,255,255,0.3)");
    shade.addColorStop(0.55, "rgba(255,255,255,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.beginPath();
    path(SPHERE);
    ctx.fillStyle = shade;
    ctx.fill();

    const viewCenter: [number, number] = [-lambda, -phi];
    const phase = (now % 2400) / 2400;
    for (const item of activeRef.current) {
      if (geoDistance(item.centroid, viewCenter) > Math.PI / 2 - 0.04) continue;
      const point = projection(item.centroid);
      if (!point) continue;
      const color = statusColor(palette, item.region.status);
      if (pulse) {
        ctx.beginPath();
        ctx.arc(point[0], point[1], 4 + phase * 10, 0, Math.PI * 2);
        ctx.globalAlpha = 0.7 * (1 - phase);
        ctx.strokeStyle = palette.teal;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(point[0], point[1], 3.4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.stroke();
    }

    ctx.beginPath();
    path(SPHERE);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = palette.teal;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const resize = () => {
      const size = Math.floor(Math.min(stage.clientWidth, MAX_SIZE));
      if (!size || size === sizeRef.current) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = size;
      dprRef.current = dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      dirtyRef.current = true;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [summary.totalNodes]);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      paletteRef.current = null;
      dirtyRef.current = true;
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class", "style"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) dirtyRef.current = true;
      },
      { threshold: 0.05 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, [summary.totalNodes]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = performance.now();
    let acc = 0;

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      const dt = Math.min(100, now - last);
      last = now;
      if (!visibleRef.current || document.hidden) return;

      const spinning =
        autoRotateRef.current && !hoverPausedRef.current && !dragRef.current.active;
      if (!spinning && !dirtyRef.current) return;

      acc += dt;
      if (spinning && acc < FRAME_MS) return;
      if (spinning) {
        rotationRef.current = [(rotationRef.current[0] + acc * ROTATE_SPEED) % 360, rotationRef.current[1]];
      }
      acc = 0;
      dirtyRef.current = false;
      draw(now, spinning && !reduceMotion);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [draw]);

  const pickRegion = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const center = sizeRef.current / 2;
    const radius = center - 6;
    if ((x - center) ** 2 + (y - center) ** 2 > radius ** 2) return null;
    const lonLat = projectionRef.current.invert?.([x, y]);
    if (!lonLat) return null;
    return activeRef.current.find((item) => geoContains(item.feature, lonLat))?.region ?? null;
  }, []);

  const updateHover = useCallback((region: MapRegionSummary | null, clientX = 0, clientY = 0) => {
    const key = region?.key ?? null;
    if (hoverKeyRef.current === key) return;
    hoverKeyRef.current = key;
    dirtyRef.current = true;
    if (!region) {
      setCalloutOpen(false);
      return;
    }

    const size = sizeRef.current;
    const center = size / 2;
    const rect = canvasRef.current?.getBoundingClientRect();
    let x = rect ? clientX - rect.left : center;
    let y = rect ? clientY - rect.top : center;
    const item = activeRef.current.find((entry) => entry.region.key === key);
    const [lambda, phi] = rotationRef.current;
    if (item && geoDistance(item.centroid, [-lambda, -phi]) < Math.PI / 2 - 0.04) {
      const point = projectionRef.current(item.centroid);
      if (point) [x, y] = point;
    }

    const gutter = ((stageRef.current?.clientWidth ?? size) - size) / 2;
    setCallout((prev) => ({
      id: (prev?.id ?? 0) + 1,
      key: region.key,
      x,
      y,
      size,
      side: x < center ? "left" : "right",
      docked: gutter < CALLOUT_WIDTH + CALLOUT_GAP + 12,
    }));
    setCalloutOpen(true);
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    updateHover(null);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      x: event.clientX,
      y: event.clientY,
      rotation: rotationRef.current,
    };
  }, [updateHover]);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (drag.active) {
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        const [lambda, phi] = drag.rotation;
        rotationRef.current = [
          (lambda + dx * 0.28 + 360) % 360,
          Math.max(-68, Math.min(68, phi - dy * 0.28)),
        ];
        dirtyRef.current = true;
        return;
      }
      if (event.pointerType === "mouse") {
        updateHover(pickRegion(event.clientX, event.clientY), event.clientX, event.clientY);
      }
    },
    [pickRegion, updateHover],
  );

  const endDrag = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  if (!summary.totalNodes) {
    return (
      <div className="race-globe race-globe--empty">
        <p className="text-sm text-muted-foreground">
          {t("nodes.empty", { defaultValue: "No node data" })}
        </p>
      </div>
    );
  }

  const calloutRegion = callout
    ? summary.regions.find((region) => region.key === callout.key) ?? null
    : null;
  const regionLang = i18n.language?.toLowerCase().startsWith("zh") ? "zh" : "en";

  const renderCalloutCard = (region: MapRegionSummary) => {
    const localName = getRegionDisplayName(region.emoji, regionLang);
    const name = localName && localName !== region.emoji ? localName : region.label;
    const ratio = region.total ? (region.online / region.total) * 100 : 0;
    const extra = region.nodes.length - CALLOUT_NODE_LIMIT;
    return (
      <>
        <div className="race-globe__callout-head">
          <span className="race-globe__callout-code rc-mono">{region.flagCode}</span>
          <span className="race-globe__callout-status" data-status={region.status}>
            {t(`mapView.status.${region.status}`)}
          </span>
        </div>
        <div className="race-globe__callout-title">
          <Flag flag={region.flagCode} />
          <span>{name}</span>
        </div>
        {name !== region.label ? (
          <div className="race-globe__callout-sub">{region.label}</div>
        ) : null}
        <div className="race-globe__callout-meter">
          <span style={{ width: `${ratio}%` }} />
        </div>
        <div className="race-globe__callout-stats rc-mono">
          <span className="race-globe__callout-online">
            {t("mapView.online", { count: region.online })}
          </span>
          <span>{t("mapView.offline", { count: region.offline })}</span>
        </div>
        <ul className="race-globe__callout-nodes">
          {region.nodes.slice(0, CALLOUT_NODE_LIMIT).map((node) => (
            <li key={node.uuid} data-online={onlineSet.has(node.uuid) ? "true" : "false"}>
              <span className="race-globe__callout-dot" aria-hidden="true" />
              <span className="race-globe__callout-node">{node.name}</span>
            </li>
          ))}
          {extra > 0 ? <li className="race-globe__callout-more rc-mono">+{extra}</li> : null}
        </ul>
      </>
    );
  };

  const sideCallout = callout && calloutRegion && !callout.docked && callout.size ? callout : null;
  const dockedRegion = callout?.docked && calloutOpen ? calloutRegion : null;
  let leader: { points: string; endX: number; y: number } | null = null;
  if (sideCallout) {
    const size = sideCallout.size;
    const center = size / 2;
    const radius = center - 6;
    const dir = sideCallout.side === "left" ? -1 : 1;
    const y = Math.max(CALLOUT_EDGE, Math.min(size - CALLOUT_EDGE, sideCallout.y));
    const elbowX = center + dir * (radius + 14);
    const endX = sideCallout.side === "left" ? -CALLOUT_GAP : size + CALLOUT_GAP;
    leader = {
      points: `${sideCallout.x},${sideCallout.y} ${elbowX},${y} ${endX},${y}`,
      endX,
      y,
    };
  }

  return (
    <div className="race-globe">
      <div className="race-globe__meta">
        <div>
          <div className="rc-label">{t("raceControl.map")}</div>
          <div className="race-globe__title">
            {t("mapView.title", { defaultValue: "Global Distribution" })}
          </div>
        </div>
        <div className="race-globe__stats">
          <div className="race-globe__stat">
            <span className="race-globe__stat-label">{t("raceControl.regions")}</span>
            <span className="race-globe__stat-value rc-mono">{summary.regions.length}</span>
          </div>
          <div className="race-globe__stat race-globe__stat--ok">
            <span className="race-globe__stat-label">
              {t("raceControl.onlineNodes", { defaultValue: "Online" })}
            </span>
            <span className="race-globe__stat-value rc-mono">{summary.onlineNodes}</span>
          </div>
        </div>
      </div>

      <div className="race-globe__stage" ref={stageRef}>
        <div className="race-globe__viewport">
          <div className="race-globe__halo" aria-hidden="true" />
          <canvas
            ref={canvasRef}
            className="race-globe__canvas"
            role="img"
            aria-label={t("mapView.ariaLabel", { defaultValue: "Rotating globe of nodes" })}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") hoverPausedRef.current = true;
            }}
            onPointerLeave={() => {
              hoverPausedRef.current = false;
              updateHover(null);
            }}
          />

          {sideCallout && calloutRegion && leader ? (
            <div
              className="race-globe__overlay"
              data-open={calloutOpen ? "true" : "false"}
              data-side={sideCallout.side}
              aria-hidden={!calloutOpen}
            >
              <svg
                key={`leader-${sideCallout.id}`}
                className="race-globe__leader"
                width={sideCallout.size}
                height={sideCallout.size}
                data-status={calloutRegion.status}
              >
                <polyline points={leader.points} pathLength={1} />
                <circle className="race-globe__leader-ring" cx={sideCallout.x} cy={sideCallout.y} r={9} />
                <circle className="race-globe__leader-dot" cx={sideCallout.x} cy={sideCallout.y} r={3.6} />
                <circle className="race-globe__leader-end" cx={leader.endX} cy={leader.y} r={2.6} />
              </svg>
              <div
                key={`card-${sideCallout.id}`}
                className="race-globe__callout"
                data-status={calloutRegion.status}
                style={{ top: leader.y, width: CALLOUT_WIDTH }}
              >
                {renderCalloutCard(calloutRegion)}
              </div>
            </div>
          ) : null}
        </div>

        <div className="race-globe__dock">
          <button
            type="button"
            className="race-globe__orbit"
            data-live={autoRotate ? "true" : "false"}
            aria-pressed={autoRotate}
            aria-label={t("raceControl.globeAutoRotate", { defaultValue: "Auto-rotate" })}
            onClick={() => setAutoRotate((prev) => !prev)}
          >
            <span className="race-globe__orbit-icon" aria-hidden="true">
              <Orbit className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="race-globe__orbit-copy">
              <span className="race-globe__orbit-kicker">
                {t("raceControl.globeAutoRotate", { defaultValue: "Auto-rotate" })}
              </span>
              <span className="race-globe__orbit-state rc-mono">
                {autoRotate
                  ? t("raceControl.globeOrbitLive", { defaultValue: "LIVE" })
                  : t("raceControl.globeOrbitHold", { defaultValue: "HOLD" })}
              </span>
            </span>
            <span className="race-globe__orbit-track" aria-hidden="true">
              <span className="race-globe__orbit-thumb" />
            </span>
          </button>

          {dockedRegion ? (
            <div
              key={`docked-${callout?.id}`}
              className="race-globe__callout race-globe__callout--docked"
              data-status={dockedRegion.status}
            >
              {renderCalloutCard(dockedRegion)}
            </div>
          ) : (
            <p className="race-globe__hint">
              {autoRotate
                ? t("raceControl.globeHintOrbit", {
                    defaultValue: "Auto-orbit on · Hover globe to pause · Drag to aim",
                  })
                : t("raceControl.globeHintStatic", {
                    defaultValue: "Auto-orbit off · Drag to aim",
                  })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
