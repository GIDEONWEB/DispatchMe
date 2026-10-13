"use client";
import { cloneElement, isValidElement, useEffect, useId, useState } from "react";
import Link from "next/link";
import { LOCATIONS, STATUS, ACTIVE_STATUSES } from "@/lib/core";
import { mapsEnabled } from "@/lib/mapbox";
import MapboxRouteMap from "@/components/MapboxRouteMap";

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function Logo({ title }) {
  return (
    <>
      <img src="/dispatch-bike.svg" alt="" className="logo-bike" />
      Dispatch<b>Me</b>
      {title ? <span className="muted" style={{ fontWeight: 500 }}> · {title}</span> : null}
    </>
  );
}

export function Shell({ title, right, tabs, tab, onTab, wide, children }) {
  return (
    <div className={"shell" + (wide ? " wide" : "")}>
      <header className="topbar">
        <Link href="/" className="logo">
          <Logo title={title} />
        </Link>
        <div>{right}</div>
      </header>
      <main className="content">{children}</main>
      {tabs && (
        <nav className="tabs" aria-label="Main">
          <div className="tabs-inner">
            {tabs.map((t) => (
              <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => onTab(t.id)}>
                <span className="ico" aria-hidden>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export function Stars({ value = 0, onChange, size }) {
  if (!onChange)
    return (
      <span className="stars ro" aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= Math.round(value) ? "on" : ""} style={size ? { fontSize: size } : null}>★</span>
        ))}
      </span>
    );
  return (
    <span className="stars" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={n <= value ? "on" : ""} onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>★</button>
      ))}
    </span>
  );
}

export function StatusBadge({ status }) {
  const cls = status === "delivered" ? "ok" : status === "cancelled" ? "bad" : ACTIVE_STATUSES.includes(status) ? "" : "warn";
  return <span className={"badge " + cls}>{STATUS[status]?.label ?? status}</span>;
}

export function Timeline({ status }) {
  const step = STATUS[status]?.step ?? 0;
  const items = ["requested", "accepted", "arrived", "in_transit", "delivered"];
  const labels = ["Request sent", "Rider accepted", "Rider at pickup", "Package on the way", "Delivered"];
  return (
    <ul className="timeline">
      {items.map((s, i) => (
        <li key={s} className={i < step ? "done" : i === step ? "now" : ""}>
          <span className="dot" />
          {labels[i]}
        </li>
      ))}
    </ul>
  );
}

/* Offline fallback map of Port Harcourt (SVG). Used when no Mapbox token is configured. */
const LATS = LOCATIONS.map((l) => l.lat);
const LNGS = LOCATIONS.map((l) => l.lng);
const BOX = { minLat: Math.min(...LATS) - 0.03, maxLat: Math.max(...LATS) + 0.03, minLng: Math.min(...LNGS) - 0.03, maxLng: Math.max(...LNGS) + 0.03 };
const W = 480, H = 320;
const proj = (p) => ({
  x: ((p.lng - BOX.minLng) / (BOX.maxLng - BOX.minLng)) * W,
  y: H - ((p.lat - BOX.minLat) / (BOX.maxLat - BOX.minLat)) * H,
});

export function RouteMap({ pickup, dest, rider, path, editable, active, onPick, hint }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const f = () => setFailed(true);
    window.addEventListener("maps-failed", f);
    return () => window.removeEventListener("maps-failed", f);
  }, []);
  if (mapsEnabled() && !failed)
    return <MapboxRouteMap pickup={pickup} dest={dest} rider={rider} path={path} onFail={() => setFailed(true)}
      editable={editable} active={active} onPick={onPick} hint={hint} />;
  return <SvgMap pickup={pickup} dest={dest} rider={rider} />;
}

function SvgMap({ pickup, dest, rider }) {
  const a = pickup && proj(pickup);
  const b = dest && proj(dest);
  const r = rider && proj(rider);
  return (
    <svg className="map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Delivery map">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="var(--line)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />
      {LOCATIONS.map((l) => {
        const p = proj(l);
        return (
          <g key={l.id}>
            <circle cx={p.x} cy={p.y} r="3" fill="var(--ink-2)" opacity=".4" />
            <text x={p.x + 6} y={p.y + 3} fontSize="9" fill="var(--ink-2)" opacity=".8">{l.name}</text>
          </g>
        );
      })}
      {a && b && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--brand)" strokeWidth="3" strokeDasharray="6 5" />}
      {a && <circle cx={a.x} cy={a.y} r="8" fill="var(--ok)" stroke="#fff" strokeWidth="2" />}
      {b && <rect x={b.x - 8} y={b.y - 8} width="16" height="16" rx="3" fill="var(--bad)" stroke="#fff" strokeWidth="2" />}
      {r && (
        <g style={{ transition: "transform 1s linear" }} transform={`translate(${r.x} ${r.y})`}>
          <circle r="15" fill="var(--ink)" />
          <text textAnchor="middle" y="6" fontSize="17">🏍️</text>
        </g>
      )}
    </svg>
  );
}

export function Field({ label, children, hint }) {
  const id = useId();
  // Link the label to a single form control; multi-control fields (photos, uploads) stay a plain group.
  const single = isValidElement(children) && ["input", "select", "textarea"].includes(children.type);
  return (
    <div>
      <label htmlFor={single ? id : undefined}>{label}</label>
      {single ? cloneElement(children, { id }) : children}
      {hint ? <div className="muted" style={{ fontSize: ".78rem", marginTop: 3 }}>{hint}</div> : null}
    </div>
  );
}

export const fmtDate = (t) =>
  new Date(t).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
