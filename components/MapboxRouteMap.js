"use client";
import { useEffect, useRef } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { CITY, decodePolyline } from "@/lib/core";
import { MAPBOX_TOKEN, markMapsFailed } from "@/lib/mapbox";

const pin = (bg, shape, label) => {
  const el = document.createElement("div");
  el.style.cssText = `width:${label ? 26 : 18}px;height:${label ? 26 : 18}px;background:${bg};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45);border-radius:${shape === "sq" ? "6px" : "50%"};color:#fff;font:700 11px/20px system-ui,sans-serif;text-align:center;touch-action:none`;
  if (label) el.textContent = label;
  return el;
};
const riderPin = () => {
  const el = document.createElement("div");
  el.textContent = "🏍️";
  el.style.cssText = "width:34px;height:34px;border-radius:50%;background:#1b1b1f;display:grid;place-items:center;font-size:18px;border:2px solid #fff";
  return el;
};
const ll = (p) => [p.lng, p.lat];

const KINDS = {
  pickup: { color: "#1a9e55", shape: "round", label: "Pickup" },
  dest: { color: "#d93a3a", shape: "sq", label: "Drop-off" },
};

// Live Mapbox map: pickup (green), drop-off (red), road route, and the rider.
//
// Read-only by default (tracking). With `editable` it behaves like a ride-hailing picker:
//  - tap the map to set the `active` point ("pickup" | "dest")
//  - drag either pin to fine-tune it
//  - one-finger pan / pinch zoom, and the map flies to places chosen from search
// `onPick(kind, { lat, lng })` is called for both taps and drags.
export default function MapboxRouteMap({ pickup, dest, rider, path, onFail, editable = false, active = "pickup", onPick, hint }) {
  const box = useRef(null);
  const g = useRef({}); // mapboxgl module, map, markers
  const live = useRef({}); // latest props for event handlers created once
  live.current = { editable, active, onPick };

  // create map once
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (dead || !box.current) return;
        mapboxgl.accessToken = MAPBOX_TOKEN;
        const map = new mapboxgl.Map({
          container: box.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: ll(CITY.center),
          zoom: 11,
          attributionControl: true,
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), "top-right");
        map.addControl(new mapboxgl.FullscreenControl(), "top-right");
        map.on("error", (e) => {
          const s = e?.error?.status;
          if (s === 401 || s === 403) { markMapsFailed(); onFail?.(); }
        });
        map.on("click", (e) => {
          const { editable: ed, active: act, onPick: pick } = live.current;
          if (!ed || !pick) return;
          g.current.skipFit = true; // don't yank the camera away from where the user just tapped
          setTimeout(() => { if (g.current) g.current.skipFit = false; }, 1500); // in case the tap was rejected
          pick(act, { lat: e.lngLat.lat, lng: e.lngLat.lng });
        });
        g.current.mapboxgl = mapboxgl;
        g.current.map = map;
        map.on("load", () => { g.current.loaded = true; g.current.ready?.(); });
      } catch {
        onFail?.();
      }
    })();
    return () => { dead = true; g.current.map?.remove(); g.current = {}; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // crosshair cursor while picking
  useEffect(() => {
    const c = g.current.map?.getCanvas?.();
    if (c) c.style.cursor = editable ? "crosshair" : "";
  }, [editable, g.current.loaded]);

  // pickup / dest markers + route
  useEffect(() => {
    const draw = () => {
      const { map, mapboxgl } = g.current;
      if (!map || !g.current.loaded) return;

      const upsert = (kind, p) => {
        const slot = kind === "pickup" ? "pu" : "de";
        if (!p) { g.current[slot]?.remove(); g.current[slot] = null; return; }
        if (!g.current[slot]) {
          const k = KINDS[kind];
          const el = pin(k.color, k.shape, editable ? (kind === "pickup" ? "A" : "B") : "");
          el.title = editable ? `${k.label} — drag to adjust` : k.label;
          el.addEventListener("click", (ev) => ev.stopPropagation());
          const m = new mapboxgl.Marker({ element: el, draggable: editable }).setLngLat(ll(p)).addTo(map);
          if (editable) {
            m.on("dragend", () => {
              const { lat, lng } = m.getLngLat();
              g.current.skipFit = true;
              live.current.onPick?.(kind, { lat, lng });
            });
          }
          g.current[slot] = m;
        } else {
          g.current[slot].setLngLat(ll(p));
        }
      };
      upsert("pickup", pickup);
      upsert("dest", dest);

      if (map.getLayer("route")) map.removeLayer("route");
      if (map.getSource("route")) map.removeSource("route");
      const bounds = new mapboxgl.LngLatBounds();
      if (pickup) bounds.extend(ll(pickup));
      if (dest) bounds.extend(ll(dest));
      if (pickup && dest) {
        const pts = (path ? decodePolyline(path) : [pickup, dest]).map(ll);
        map.addSource("route", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: pts } } });
        map.addLayer({
          id: "route", type: "line", source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#ff6a00", "line-width": 5, "line-opacity": path ? 0.9 : 0.6, ...(path ? {} : { "line-dasharray": [2, 2] }) },
        });
        pts.forEach((p) => bounds.extend(p));
      }

      if (g.current.skipFit) { g.current.skipFit = false; return; }
      if (bounds.isEmpty()) return;
      const duration = editable && g.current.fitted ? 700 : 0; // animate after the first frame in picker mode
      if (pickup && dest) map.fitBounds(bounds, { padding: 64, maxZoom: 16, duration });
      else map.flyTo({ center: bounds.getCenter(), zoom: Math.max(map.getZoom(), 15), duration: editable ? 800 : 0, essential: true });
      g.current.fitted = true;
    };
    if (g.current.loaded) draw(); else g.current.ready = draw;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lat, pickup?.lng, dest?.lat, dest?.lng, path]);

  // rider marker (moves without re-fitting the map)
  useEffect(() => {
    const move = () => {
      const { map, mapboxgl } = g.current;
      if (!map) return;
      if (!rider) { g.current.rd?.remove(); g.current.rd = null; return; }
      if (!g.current.rd) g.current.rd = new mapboxgl.Marker({ element: riderPin() }).setLngLat(ll(rider)).addTo(map);
      else g.current.rd.setLngLat(ll(rider));
    };
    if (g.current.map) move(); else { const prev = g.current.ready; g.current.ready = () => { prev?.(); move(); }; }
  }, [rider?.lat, rider?.lng]);

  const recenter = () => {
    const { map, mapboxgl } = g.current;
    if (!map) return;
    const b = new mapboxgl.LngLatBounds();
    [pickup, dest, rider].filter(Boolean).forEach((p) => b.extend(ll(p)));
    if (!b.isEmpty()) map.fitBounds(b, { padding: 64, maxZoom: 16, duration: 600 });
  };

  return (
    <div className="mapwrap">
      <div ref={box} className={"map gmap" + (editable ? " picker" : "")} role="region" aria-label={editable ? "Pick pickup and drop-off on the map" : "Delivery map"} />
      <div className="mapctl"><button type="button" onClick={recenter} aria-label="Re-centre on route" title="Re-centre">⌖</button></div>
      {editable && hint && <div className="maphint" aria-live="polite">{hint}</div>}
    </div>
  );
}
