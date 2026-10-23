"use client";
import { cloneElement, isValidElement, useEffect, useId, useState } from "react";
import Link from "next/link";
import { STATUS, ACTIVE_STATUSES } from "@/lib/core";
import { mapsEnabled } from "@/lib/mapbox";
import MapboxRouteMap from "@/components/MapboxRouteMap";
import InteractiveSvgMap from "@/components/InteractiveSvgMap";

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="Dispatch Me" />
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
  return <InteractiveSvgMap pickup={pickup} dest={dest} rider={rider} />;
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
