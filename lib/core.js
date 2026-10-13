// Pure business logic: locations, pricing, status flow, rider tracking.
// No browser APIs here so it can be unit-tested with plain Node.

// Port Harcourt, Rivers State. These areas power the offline fallback (no Mapbox token) and the map framing.
export const CITY = {
  name: "Port Harcourt",
  state: "Rivers State",
  center: { lat: 4.8156, lng: 7.0498 },
  // Bounding box used to keep Mapbox search suggestions inside Port Harcourt (and its immediate surroundings).
  bounds: { south: 4.7, west: 6.9, north: 4.98, east: 7.14 },
};

export const LOCATIONS = [
  { id: "oldgra", name: "Old GRA", lat: 4.7947, lng: 7.0066 },
  { id: "gra2", name: "GRA Phase 2", lat: 4.8236, lng: 7.0212 },
  { id: "gra3", name: "GRA Phase 3", lat: 4.8387, lng: 7.0127 },
  { id: "rumuola", name: "Rumuola", lat: 4.8274, lng: 7.0086 },
  { id: "rumuokoro", name: "Rumuokoro", lat: 4.8718, lng: 6.9929 },
  { id: "rumuigbo", name: "Rumuigbo", lat: 4.8504, lng: 7.0173 },
  { id: "eliozu", name: "Eliozu", lat: 4.8685, lng: 7.0449 },
  { id: "choba", name: "Choba / UNIPORT", lat: 4.8972, lng: 6.9235 },
  { id: "mile1", name: "Mile 1 (Diobu)", lat: 4.7912, lng: 6.9919 },
  { id: "mile3", name: "Mile 3", lat: 4.8044, lng: 6.9966 },
  { id: "diobu", name: "Diobu", lat: 4.7983, lng: 6.9833 },
  { id: "borokiri", name: "Borokiri", lat: 4.7714, lng: 7.0153 },
  { id: "transamadi", name: "Trans Amadi", lat: 4.8049, lng: 7.0436 },
  { id: "woji", name: "Woji", lat: 4.8133, lng: 7.0597 },
  { id: "elelenwo", name: "Elelenwo", lat: 4.8345, lng: 7.0836 },
  { id: "rukpokwu", name: "Rukpokwu", lat: 4.8801, lng: 7.0321 },
  { id: "adageorge", name: "Ada George", lat: 4.8398, lng: 7.0372 },
  { id: "dline", name: "D-Line", lat: 4.7857, lng: 7.0068 },
  { id: "rumuomasi", name: "Rumuomasi", lat: 4.8222, lng: 7.0309 },
  { id: "peterodili", name: "Peter Odili Road", lat: 4.8128, lng: 7.0242 },
];

export const PACKAGE_TYPES = [
  { id: "documents", label: "Documents", extra: 0 },
  { id: "small", label: "Small parcel", extra: 0 },
  { id: "food", label: "Food / groceries", extra: 150 },
  { id: "medium", label: "Medium box", extra: 300 },
  { id: "large", label: "Large / bulky", extra: 600 },
];

export const PRICING = {
  base: 500, // NGN
  perKm: 120,
  minimum: 800,
  riderShare: 0.8, // rider keeps 80%, platform 20%
  avgSpeedKmh: 25,
  roadFactor: 1.3, // straight-line distance -> road distance
};

export const STATUS = {
  requested: { label: "Looking for a rider", step: 0 },
  accepted: { label: "Rider on the way to pickup", step: 1 },
  arrived: { label: "Rider arrived at pickup", step: 2 },
  in_transit: { label: "Package on the way", step: 3 },
  delivered: { label: "Delivered", step: 4 },
  cancelled: { label: "Cancelled", step: -1 },
};

export const NEXT_STATUS = {
  accepted: { to: "arrived", action: "I've arrived at pickup" },
  arrived: { to: "in_transit", action: "Package picked up — start trip" },
  in_transit: { to: "delivered", action: "Mark as delivered" },
};

export const ACTIVE_STATUSES = ["requested", "accepted", "arrived", "in_transit"];

export const getLocation = (id) => LOCATIONS.find((l) => l.id === id);

// A place object stored on a delivery: { name, address, lat, lng }
export const areaToPlace = (id, address = "") => {
  const l = getLocation(id);
  return l ? { name: l.name, address, lat: l.lat, lng: l.lng } : null;
};

export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Accepts coordinate points ({lat, lng}).
// `route` is optional real road data from Mapbox ({ km, minutes }); otherwise we approximate from straight-line distance.
export function estimate(a, b, packageId = "small", route = null) {
  if (!a || !b) return null;
  const km = Math.max(1, route?.km ?? haversineKm(a, b) * PRICING.roadFactor);
  const extra = PACKAGE_TYPES.find((p) => p.id === packageId)?.extra ?? 0;
  const raw = PRICING.base + km * PRICING.perKm + extra;
  const price = Math.max(PRICING.minimum, Math.round(raw / 50) * 50);
  const minutes = Math.max(5, Math.round(route?.minutes ?? (km / PRICING.avgSpeedKmh) * 60) + 5);
  return {
    km: Math.round(km * 10) / 10,
    minutes,
    price,
    riderEarning: Math.round(price * PRICING.riderShare),
  };
}

// Decode an encoded polyline (precision 5, as returned by Mapbox Directions) into [{lat, lng}, ...]
export function decodePolyline(str) {
  const pts = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, byte;
      do {
        byte = str.charCodeAt(i++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta; else lng += delta;
    }
    pts.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return pts;
}

// Point at fraction t (0..1) along a path, by distance.
export function pointAlong(path, t) {
  if (!path?.length) return null;
  if (path.length === 1 || t <= 0) return path[0];
  const seg = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const d = haversineKm(path[i - 1], path[i]);
    seg.push(d);
    total += d;
  }
  let target = Math.min(1, t) * total;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) return lerp(path[i], path[i + 1], seg[i] ? Math.min(1, target / seg[i]) : 0);
    target -= seg[i];
  }
  return path[path.length - 1];
}

export const naira = (n) => "₦" + Math.round(n).toLocaleString("en-NG");

const lerp = (a, b, t) => ({
  lat: a.lat + (b.lat - a.lat) * t,
  lng: a.lng + (b.lng - a.lng) * t,
});

// Simulated live position of the rider, derived from status + timestamps.
// In production this comes from the rider's GPS (Supabase Realtime row).
// Uses the real road path (d.path, an encoded polyline) for the trip to the destination when we have it.
export function riderPosition(d, now = Date.now()) {
  if (!d.riderId || d.status === "requested" || d.status === "cancelled") return null;
  const pickup = d.pickup;
  const dest = d.dest;
  const start = { lat: pickup.lat + 0.018, lng: pickup.lng - 0.014 };
  const prog = (from, secs) => Math.min(1, Math.max(0, (now - from) / (secs * 1000)));
  if (d.status === "accepted") return lerp(start, pickup, Math.min(0.95, prog(d.acceptedAt, 40)));
  if (d.status === "arrived") return pickup;
  if (d.status === "in_transit") {
    const t = Math.min(0.95, prog(d.pickedUpAt, 60));
    return (d.path && pointAlong(decodePolyline(d.path), t)) || lerp(pickup, dest, t);
  }
  return dest; // delivered
}

export const validators = {
  nin: (v) => /^\d{11}$/.test(v.trim()),
  plate: (v) => /^[A-Za-z]{3}[- ]?\d{2,3}[- ]?[A-Za-z]{2}$/.test(v.trim()),
  phone: (v) => /^(\+?234|0)\d{10}$/.test(v.replace(/\s/g, "")),
  email: (v) => /^\S+@\S+\.\S+$/.test(v.trim()),
};
