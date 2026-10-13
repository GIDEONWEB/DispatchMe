"use client";
// Mapbox helpers: Search Box API (address/place search), Directions API (road distance, time, path),
// Geocoding API (reverse geocode). Everything degrades gracefully: with no token (or a rejected token)
// `mapsEnabled()` is false and the app falls back to the built-in Port Harcourt area picker + SVG map.
import { CITY } from "./core";

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

let failed = false;

export const mapsEnabled = () => !!MAPBOX_TOKEN && !failed;

// Called by the map / API helpers when Mapbox rejects the token (401/403).
export function markMapsFailed() {
  if (failed) return;
  failed = true;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("maps-failed"));
}

const API = "https://api.mapbox.com";
const BBOX = `${CITY.bounds.west},${CITY.bounds.south},${CITY.bounds.east},${CITY.bounds.north}`; // minLng,minLat,maxLng,maxLat

async function mb(path, params) {
  const qs = new URLSearchParams({ ...params, access_token: MAPBOX_TOKEN });
  const res = await fetch(`${API}${path}?${qs}`);
  if (res.status === 401 || res.status === 403) markMapsFailed();
  if (!res.ok) throw new Error(`Mapbox ${res.status}`);
  return res.json();
}

/* ---------- Search Box (type-ahead), restricted to Port Harcourt ---------- */
export const newSessionToken = async () => crypto.randomUUID(); // one token per search session (suggest… + one retrieve)

export async function suggestPlaces(input, sessionToken) {
  const data = await mb("/search/searchbox/v1/suggest", {
    q: input,
    session_token: sessionToken,
    country: "ng",
    bbox: BBOX,
    proximity: `${CITY.center.lng},${CITY.center.lat}`,
    language: "en",
    limit: "6",
  });
  return (data.suggestions || []).map((s) => ({
    prediction: { id: s.mapbox_id, sessionToken, name: s.name, full: s.full_address || s.place_formatted || "" },
    main: s.name,
    secondary: s.address || s.place_formatted || "",
  }));
}

// Turn a chosen suggestion into { name, address, lat, lng }
export async function placeFromPrediction(prediction) {
  const data = await mb(`/search/searchbox/v1/retrieve/${encodeURIComponent(prediction.id)}`, { session_token: prediction.sessionToken });
  const f = data.features?.[0];
  if (!f) throw new Error("No place returned");
  const [lng, lat] = f.geometry.coordinates;
  const p = f.properties || {};
  return {
    name: p.name || prediction.name || "",
    address: p.full_address || [p.name, p.place_formatted].filter(Boolean).join(", ") || prediction.full,
    lat,
    lng,
  };
}

// Reverse geocode (for a dragged/tapped pin or "my location").
export async function reverseGeocode({ lat, lng }) {
  const data = await mb("/search/geocode/v6/reverse", { longitude: String(lng), latitude: String(lat), language: "en" });
  const p = data.features?.[0]?.properties;
  return p ? { name: p.name || "Pinned location", address: p.full_address || p.name, lat, lng } : null;
}

export const inPortHarcourt = (p) =>
  p.lat >= CITY.bounds.south && p.lat <= CITY.bounds.north && p.lng >= CITY.bounds.west && p.lng <= CITY.bounds.east;

/* ---------- Directions API: real road distance, time and path ---------- */
export async function computeRoute(a, b) {
  if (!mapsEnabled()) return null;
  try {
    // driving-traffic is the closest Mapbox profile to a motorbike.
    const data = await mb(`/directions/v5/mapbox/driving-traffic/${a.lng},${a.lat};${b.lng},${b.lat}`, {
      geometries: "polyline", // precision 5, decoded by decodePolyline()
      overview: "full",
    });
    const r = data.routes?.[0];
    if (!r) return null;
    return { km: r.distance / 1000, minutes: r.duration / 60, polyline: r.geometry ?? null };
  } catch {
    return null; // caller falls back to straight-line estimate
  }
}
