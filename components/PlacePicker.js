"use client";
import { useEffect, useRef, useState } from "react";
import { LOCATIONS, areaToPlace } from "@/lib/core";
import { mapsEnabled, suggestPlaces, newSessionToken, placeFromPrediction, inPortHarcourt } from "@/lib/mapbox";

// Chooses a place in Port Harcourt.
//  - With a Mapbox token: type-ahead search limited to Port Harcourt (Search Box API).
//  - Without: pick an area from the list + type the street address.
// `value` is { name, address, lat, lng } or null.
export default function PlacePicker({ id, value, onChange, placeholder, onFocus, usingKey = mapsEnabled() }) {
  return usingKey ? (
    <PlaceSearch id={id} value={value} onChange={onChange} placeholder={placeholder} onFocus={onFocus} />
  ) : (
    <AreaFallback id={id} value={value} onChange={onChange} placeholder={placeholder} />
  );
}

function PlaceSearch({ id, value, onChange, placeholder, onFocus }) {
  const [text, setText] = useState(value?.address ?? "");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const token = useRef(null);
  const seq = useRef(0);
  const typing = useRef(false);

  // Keep the box in sync when the place is set from outside (map tap, dragged pin, "my location", swap).
  useEffect(() => {
    if (value) { setText(value.address); setItems([]); setMsg(""); }
    else if (typing.current) typing.current = false; // user is editing; keep what they typed
    else setText("");
  }, [value]);

  useEffect(() => {
    const q = text.trim();
    if (q.length < 3 || (value && value.address === text)) { setItems([]); return; }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        token.current ||= await newSessionToken();
        const list = await suggestPlaces(q, token.current);
        if (mine === seq.current) { setItems(list); setMsg(list.length ? "" : "No match in Port Harcourt — try a landmark or street name."); }
      } catch {
        if (mine === seq.current) { setItems([]); setMsg("Search is unavailable right now."); }
      }
    }, 250);
    return () => clearTimeout(t);
  }, [text, value]);

  async function choose(it) {
    setBusy(true);
    try {
      const p = await placeFromPrediction(it.prediction);
      token.current = null; // a session ends when a place is selected
      if (!inPortHarcourt(p)) { setMsg("That place is outside Port Harcourt."); return; }
      setText(p.address);
      setItems([]);
      setOpen(false);
      setMsg("");
      onChange(p);
    } catch {
      setMsg("Couldn't load that place. Try another.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="place">
      <input
        id={id}
        value={text}
        autoComplete="off"
        placeholder={placeholder || "Search a place in Port Harcourt…"}
        onChange={(e) => { typing.current = true; setText(e.target.value); setOpen(true); if (value) onChange(null); else typing.current = false; }}
        onFocus={(e) => { setOpen(true); onFocus?.(); e.target.select(); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        role="combobox" aria-expanded={open && items.length > 0} aria-autocomplete="list"
      />
      {open && items.length > 0 && (
        <ul className="suggest" role="listbox">
          {items.map((it, i) => (
            <li key={i} role="option" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(it)}>
              <b>{it.main}</b>{it.secondary ? <span className="muted"> · {it.secondary}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {(busy || msg) && <div className="muted" style={{ fontSize: ".78rem", marginTop: 3 }}>{busy ? "Loading…" : msg}</div>}
    </div>
  );
}

function AreaFallback({ id, value, onChange, placeholder }) {
  const [areaId, setAreaId] = useState(() => LOCATIONS.find((l) => l.name === value?.name)?.id ?? "");
  const [detail, setDetail] = useState(value?.address ?? "");
  useEffect(() => { if (!value) { setAreaId(""); setDetail(""); } }, [value]);
  const emit = (a, d) => onChange(a ? areaToPlace(a, d) : null);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <select id={id} value={areaId} onChange={(e) => { setAreaId(e.target.value); emit(e.target.value, detail); }}>
        <option value="">Select area in Port Harcourt…</option>
        {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <input value={detail} placeholder={placeholder || "Street address / landmark"}
        onChange={(e) => { setDetail(e.target.value); emit(areaId, e.target.value); }} />
    </div>
  );
}
