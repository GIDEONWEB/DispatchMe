"use client";
// Offline map (no Mapbox token). Fully interactive:
//  - drag to pan (mouse or one finger), wheel / pinch / +− buttons to zoom
//  - tap an area dot to see its name, tap a pin to see what it is
//  - ⌖ button re-centres on the route; the rider moves smoothly along it
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LOCATIONS } from "@/lib/core";

const LATS = LOCATIONS.map((l) => l.lat);
const LNGS = LOCATIONS.map((l) => l.lng);
const BOX = { minLat: Math.min(...LATS) - 0.03, maxLat: Math.max(...LATS) + 0.03, minLng: Math.min(...LNGS) - 0.03, maxLng: Math.max(...LNGS) + 0.03 };
const W = 480, H = 320;
const MIN_W = 48; // max zoom = 10x
const proj = (p) => ({
  x: ((p.lng - BOX.minLng) / (BOX.maxLng - BOX.minLng)) * W,
  y: H - ((p.lat - BOX.minLat) / (BOX.maxLat - BOX.minLat)) * H,
});

const clampVB = (v) => {
  const w = Math.min(W, Math.max(MIN_W, v.w));
  const h = (w * H) / W;
  return { w, h, x: Math.min(W - w, Math.max(0, v.x)), y: Math.min(H - h, Math.max(0, v.y)) };
};

function fitTo(points) {
  const pts = points.filter(Boolean).map(proj);
  if (!pts.length) return { x: 0, y: 0, w: W, h: H };
  const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
  const pad = 60;
  let w = Math.max(MIN_W * 2.5, maxX - minX + pad * 2);
  w = Math.max(w, ((maxY - minY + pad * 2) * W) / H);
  const h = (w * H) / W;
  return clampVB({ w, h, x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - h / 2 });
}

export default function InteractiveSvgMap({ pickup, dest, rider }) {
  const svgRef = useRef(null);
  const [vb, setVb] = useState({ x: 0, y: 0, w: W, h: H });
  const [tip, setTip] = useState(null); // { x, y, text } in world coords
  const [dragging, setDragging] = useState(false);
  const ptrs = useRef(new Map()); // active pointers
  const gesture = useRef({ moved: 0, pinch: 0 });
  const userMoved = useRef(false);

  const keyPts = useMemo(() => [pickup, dest], [pickup?.lat, pickup?.lng, dest?.lat, dest?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const recenter = useCallback(() => { userMoved.current = false; setVb(fitTo(keyPts)); setTip(null); }, [keyPts]);

  // frame the route whenever pickup / drop-off change
  useEffect(() => { setVb(fitTo(keyPts)); userMoved.current = false; setTip(null); }, [keyPts]);

  const zoomAt = useCallback((factor, cx, cy) => {
    userMoved.current = true;
    setVb((v) => {
      const w = Math.min(W, Math.max(MIN_W, v.w / factor));
      const f = w / v.w;
      const nx = cx - (cx - v.x) * f;
      const ny = cy - (cy - v.y) * f;
      return clampVB({ x: nx, y: ny, w, h: (w * H) / W });
    });
  }, []);

  // screen px -> world coords
  const toWorld = (clientX, clientY) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: vb.x + ((clientX - r.left) / r.width) * vb.w, y: vb.y + ((clientY - r.top) / r.height) * vb.h };
  };

  // wheel zoom (needs a non-passive listener to stop the page from scrolling)
  useEffect(() => {
    const el = svgRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setVb((v) => {
        const cx = v.x + ((e.clientX - r.left) / r.width) * v.w;
        const cy = v.y + ((e.clientY - r.top) / r.height) * v.h;
        const factor = Math.exp(-e.deltaY * 0.0022);
        const w = Math.min(W, Math.max(MIN_W, v.w / factor));
        const f = w / v.w;
        userMoved.current = true;
        return clampVB({ x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f, w, h: (w * H) / W });
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onDown = (e) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { moved: 0, pinch: 0 };
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      gesture.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    setDragging(true);
  };
  const onMove = (e) => {
    const prev = ptrs.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    ptrs.current.set(e.pointerId, cur);
    const r = svgRef.current.getBoundingClientRect();
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.pinch) {
        const mid = toWorld((a.x + b.x) / 2, (a.y + b.y) / 2);
        zoomAt(d / gesture.current.pinch, mid.x, mid.y);
      }
      gesture.current.pinch = d;
      gesture.current.moved += 10;
      return;
    }
    const dx = cur.x - prev.x, dy = cur.y - prev.y;
    gesture.current.moved += Math.abs(dx) + Math.abs(dy);
    if (gesture.current.moved < 4) return;
    if (!svgRef.current.hasPointerCapture?.(e.pointerId)) svgRef.current.setPointerCapture?.(e.pointerId); // capture only once it is a real drag, so taps still reach pins
    userMoved.current = true;
    setVb((v) => clampVB({ ...v, x: v.x - (dx / r.width) * v.w, y: v.y - (dy / r.height) * v.h }));
  };
  const onUp = (e) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) gesture.current.pinch = 0;
    if (!ptrs.current.size) setDragging(false);
  };

  const scale = vb.w / W; // keeps pins / labels a constant on-screen size while zooming
  const showTip = (e, x, y, text) => { e.stopPropagation(); if (gesture.current.moved < 6) setTip({ x, y, text }); };
  const a = pickup && proj(pickup);
  const b = dest && proj(dest);
  const r = rider && proj(rider);
  const zoomed = vb.w < W - 1;

  return (
    <div className="mapwrap svgmap">
      <svg
        ref={svgRef}
        className={"map" + (dragging ? " grabbing" : "")}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        role="application"
        aria-label="Delivery map. Drag to pan, scroll or pinch to zoom."
        style={{ touchAction: "none" }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onClick={() => { if (gesture.current.moved < 6) setTip(null); }}
        onDoubleClick={(e) => { const p = toWorld(e.clientX, e.clientY); zoomAt(2, p.x, p.y); }}
      >
        <defs>
          <pattern id="mgrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="var(--line)" strokeWidth={1 * scale} vectorEffect="non-scaling-stroke" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#mgrid)" />
        <rect x="0" y="0" width={W} height={H} fill="none" stroke="var(--line)" vectorEffect="non-scaling-stroke" />

        {LOCATIONS.map((l) => {
          const p = proj(l);
          return (
            <g key={l.id} transform={`translate(${p.x} ${p.y}) scale(${scale})`} className="areadot"
              onClick={(e) => showTip(e, p.x, p.y, l.name)}>
              <circle r="9" fill="transparent" />
              <circle r="3" fill="var(--ink-2)" opacity=".45" />
              <text x="6" y="3" fontSize="9" fill="var(--ink-2)" opacity=".85" pointerEvents="none">{l.name}</text>
            </g>
          );
        })}

        {a && b && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--brand)" strokeWidth="3" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />}
        {a && (
          <g transform={`translate(${a.x} ${a.y}) scale(${scale})`} className="areadot" onClick={(e) => showTip(e, a.x, a.y, `Pickup — ${pickup.address || pickup.name}`)}>
            <circle r="8" fill="#1a9e55" stroke="#fff" strokeWidth="2" />
          </g>
        )}
        {b && (
          <g transform={`translate(${b.x} ${b.y}) scale(${scale})`} className="areadot" onClick={(e) => showTip(e, b.x, b.y, `Drop-off — ${dest.address || dest.name}`)}>
            <rect x="-8" y="-8" width="16" height="16" rx="3" fill="#d93a3a" stroke="#fff" strokeWidth="2" />
          </g>
        )}
        {r && (
          <g style={{ transition: "transform 1s linear" }} transform={`translate(${r.x} ${r.y}) scale(${scale})`} className="areadot" onClick={(e) => showTip(e, r.x, r.y, "Your rider")}>
            <circle r="15" fill="#1b1b1f" stroke="#fff" strokeWidth="2" />
            <text textAnchor="middle" y="6" fontSize="17" pointerEvents="none">🏍️</text>
          </g>
        )}

        {tip && (
          <g transform={`translate(${tip.x} ${tip.y}) scale(${scale})`} pointerEvents="none">
            <rect x={-6 - tip.text.length * 2.9} y="-44" width={12 + tip.text.length * 5.8} height="22" rx="11" fill="#1b1b1f" opacity=".92" />
            <text textAnchor="middle" y="-29" fontSize="11" fontWeight="700" fill="#fff">{tip.text}</text>
          </g>
        )}
      </svg>

      <div className="mapctl" role="group" aria-label="Map controls">
        <button type="button" onClick={() => zoomAt(1.6, vb.x + vb.w / 2, vb.y + vb.h / 2)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomAt(1 / 1.6, vb.x + vb.w / 2, vb.y + vb.h / 2)} aria-label="Zoom out" disabled={!zoomed}>−</button>
        <button type="button" onClick={recenter} aria-label="Re-centre on route" title="Re-centre">⌖</button>
      </div>
    </div>
  );
}
