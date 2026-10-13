"use client";
// Local demo data layer (browser localStorage) so the customer app and rider app
// talk to each other across tabs with zero backend. Every function here maps 1:1 to a
// Supabase table/query in supabase/schema.sql — swap this file to go live.
import { useSyncExternalStore } from "react";
import { estimate } from "./core";

const KEY = "dispatchme_db_v2"; // v2: deliveries store pickup/dest places (Port Harcourt)
const EMPTY = { users: [], deliveries: [] };
let cacheRaw = null;
let cacheVal = EMPTY;
const listeners = new Set();

function read() {
  if (typeof window === "undefined") return EMPTY;
  const raw = localStorage.getItem(KEY);
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cacheVal = raw ? JSON.parse(raw) : EMPTY;
  }
  return cacheVal;
}

function write(db) {
  const raw = JSON.stringify(db);
  localStorage.setItem(KEY, raw); // may throw on quota — callers handle it
  cacheRaw = raw;
  cacheVal = db;
  listeners.forEach((l) => l());
}

function subscribe(cb) {
  listeners.add(cb);
  const onStorage = (e) => {
    if (e.key === KEY || e.key === null) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export const useDB = () => useSyncExternalStore(subscribe, read, () => EMPTY);

function mutate(fn) {
  const db = structuredClone(read());
  const result = fn(db);
  write(db);
  return result;
}

const uid = (p) => p + "_" + Math.random().toString(36).slice(2, 10);

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- session (per role, so you can be logged in as both in one browser) ---------- */
const sessKey = (role) => `dispatchme_session_${role}`;
const sessListeners = new Set();
export function useSessionId(role) {
  return useSyncExternalStore(
    (cb) => {
      sessListeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        sessListeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => localStorage.getItem(sessKey(role)),
    () => null
  );
}
const setSession = (role, id) => {
  if (id) localStorage.setItem(sessKey(role), id);
  else localStorage.removeItem(sessKey(role));
  sessListeners.forEach((l) => l());
};

export function useCurrentUser(role) {
  const db = useDB();
  const id = useSessionId(role);
  return { db, user: db.users.find((u) => u.id === id && u.role === role) || null };
}

/* ---------- auth ---------- */
export async function register(role, { name, email, phone, password }) {
  const passHash = await sha256(password);
  return mutate((db) => {
    const e = email.trim().toLowerCase();
    if (db.users.some((u) => u.email === e && u.role === role))
      throw new Error("An account with this email already exists.");
    const user = {
      id: uid(role === "rider" ? "rdr" : "cus"),
      role,
      name: name.trim(),
      email: e,
      phone: phone.trim(),
      passHash,
      createdAt: Date.now(),
      ...(role === "rider" ? { verification: { status: "unsubmitted" }, online: false } : {}),
    };
    db.users.push(user);
    setSession(role, user.id);
    return user;
  });
}

export async function login(role, email, password) {
  const passHash = await sha256(password);
  const user = read().users.find(
    (u) => u.role === role && u.email === email.trim().toLowerCase() && u.passHash === passHash
  );
  if (!user) throw new Error("Wrong email or password.");
  setSession(role, user.id);
  return user;
}

export const logout = (role) => setSession(role, null);

/* ---------- rider verification ---------- */
// A complete submission goes to "pending" and waits for an admin (/admin) to approve or reject it.
// (Add an identity provider for NIN / face-match checks before real launch — see README.)
export function submitVerification(riderId, data) {
  mutate((db) => {
    const r = db.users.find((u) => u.id === riderId);
    r.verification = { ...data, status: "pending", submittedAt: Date.now() };
  });
}

export function reviewRider(riderId, approve, reason = "") {
  mutate((db) => {
    const r = db.users.find((u) => u.id === riderId && u.role === "rider");
    if (!r || r.verification?.status !== "pending") throw new Error("Nothing to review.");
    r.verification = approve
      ? { ...r.verification, status: "approved", approvedAt: Date.now() }
      : { ...r.verification, status: "rejected", rejectedAt: Date.now(), rejectReason: reason.trim() };
    if (!approve) r.online = false;
  });
}

export const setOnline = (riderId, online) =>
  mutate((db) => {
    const r = db.users.find((u) => u.id === riderId);
    if (r.verification?.status !== "approved") throw new Error("Complete verification first.");
    if (!online && db.deliveries.some((d) => d.riderId === riderId && ["accepted", "arrived", "in_transit"].includes(d.status)))
      throw new Error("Finish your current delivery before going offline.");
    r.online = online;
  });

/* ---------- deliveries ---------- */
// form: { pickup, dest, packageId, recipientName, recipientPhone, note, route? }
// pickup/dest are { name, address, lat, lng }; route is optional Mapbox road data { km, minutes, polyline }.
export function createDelivery(customerId, form) {
  const { pickup, dest, route, ...rest } = form;
  const est = estimate(pickup, dest, form.packageId, route);
  if (!est) throw new Error("Choose a pickup and destination.");
  if (pickup.lat === dest.lat && pickup.lng === dest.lng && !pickup.address && !dest.address)
    throw new Error("Pickup and destination are the same — add address details.");
  return mutate((db) => {
    if (db.deliveries.some((d) => d.customerId === customerId && ["requested", "accepted", "arrived", "in_transit"].includes(d.status)))
      throw new Error("You already have an active delivery.");
    const d = {
      id: uid("dlv"),
      customerId,
      ...rest,
      pickup,
      dest,
      path: route?.polyline ?? null,
      ...est,
      status: "requested",
      createdAt: Date.now(),
      riderId: null,
      rating: null,
    };
    db.deliveries.push(d);
    return d;
  });
}

export function acceptDelivery(riderId, deliveryId) {
  mutate((db) => {
    const r = db.users.find((u) => u.id === riderId);
    if (!r?.online || r.verification?.status !== "approved") throw new Error("Go online first.");
    if (db.deliveries.some((d) => d.riderId === riderId && ["accepted", "arrived", "in_transit"].includes(d.status)))
      throw new Error("You already have an active delivery.");
    const d = db.deliveries.find((x) => x.id === deliveryId);
    if (!d || d.status !== "requested") throw new Error("Sorry, this request is no longer available.");
    d.status = "accepted";
    d.riderId = riderId;
    d.acceptedAt = Date.now();
  });
}

export function advanceDelivery(riderId, deliveryId) {
  mutate((db) => {
    const d = db.deliveries.find((x) => x.id === deliveryId && x.riderId === riderId);
    if (!d) throw new Error("Delivery not found.");
    const flow = { accepted: "arrived", arrived: "in_transit", in_transit: "delivered" };
    const next = flow[d.status];
    if (!next) throw new Error("Nothing to update.");
    d.status = next;
    if (next === "arrived") d.arrivedAt = Date.now();
    if (next === "in_transit") d.pickedUpAt = Date.now();
    if (next === "delivered") d.deliveredAt = Date.now();
  });
}

export function cancelDelivery(customerId, deliveryId) {
  mutate((db) => {
    const d = db.deliveries.find((x) => x.id === deliveryId && x.customerId === customerId);
    if (!d || !["requested", "accepted"].includes(d.status))
      throw new Error("It's too late to cancel this delivery.");
    d.status = "cancelled";
    d.cancelledAt = Date.now();
  });
}

export function rateDelivery(customerId, deliveryId, stars, comment = "") {
  mutate((db) => {
    const d = db.deliveries.find((x) => x.id === deliveryId && x.customerId === customerId);
    if (!d || d.status !== "delivered" || d.rating) throw new Error("Can't rate this delivery.");
    d.rating = { stars, comment: comment.trim(), at: Date.now() };
  });
}

export function riderRating(db, riderId) {
  const rated = db.deliveries.filter((d) => d.riderId === riderId && d.rating);
  if (!rated.length) return { avg: null, count: 0 };
  const avg = rated.reduce((s, d) => s + d.rating.stars, 0) / rated.length;
  return { avg: Math.round(avg * 10) / 10, count: rated.length };
}

/* ---------- images (live photo / documents) ---------- */
// Shrinks to a small JPEG data URL so it fits in localStorage for the demo.
// In production upload the original to Supabase Storage (private bucket) instead.
export function fileToSmallDataUrl(file, maxSide = 640, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = url;
  });
}
