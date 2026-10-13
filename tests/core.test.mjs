import test from "node:test";
import assert from "node:assert/strict";
import {
  estimate, haversineKm, riderPosition, validators, PRICING, getLocation, areaToPlace,
  decodePolyline, pointAlong, LOCATIONS, CITY,
} from "../lib/core.js";

const P = (id) => areaToPlace(id, "x");

test("all locations are inside Port Harcourt bounds", () => {
  for (const l of LOCATIONS) {
    assert.ok(l.lat >= CITY.bounds.south && l.lat <= CITY.bounds.north, l.name);
    assert.ok(l.lng >= CITY.bounds.west && l.lng <= CITY.bounds.east, l.name);
  }
});

test("estimate respects minimum fare and rider share", () => {
  const e = estimate(P("mile1"), P("mile3"), "small");
  assert.ok(e.price >= PRICING.minimum);
  assert.equal(e.riderEarning, Math.round(e.price * PRICING.riderShare));
});

test("longer trips cost more; bulky packages cost more", () => {
  const near = estimate(P("mile1"), P("diobu"), "small");
  const far = estimate(P("choba"), P("elelenwo"), "small");
  assert.ok(far.price > near.price && far.km > near.km);
  assert.ok(estimate(P("choba"), P("elelenwo"), "large").price > far.price);
});

test("real road route overrides straight-line estimate", () => {
  const a = P("oldgra"), b = P("woji");
  const road = estimate(a, b, "small", { km: 20, minutes: 50 });
  assert.equal(road.km, 20);
  assert.equal(road.minutes, 55);
  assert.ok(road.price > estimate(a, b, "small").price);
});

test("missing place gives null", () => assert.equal(estimate(null, P("woji")), null));

test("haversine is symmetric and zero for same point", () => {
  const a = getLocation("oldgra"), b = getLocation("choba");
  assert.equal(haversineKm(a, a), 0);
  assert.ok(Math.abs(haversineKm(a, b) - haversineKm(b, a)) < 1e-9);
});

test("decodePolyline matches the documented example", () => {
  const pts = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
  assert.deepEqual(pts, [
    { lat: 38.5, lng: -120.2 },
    { lat: 40.7, lng: -120.95 },
    { lat: 43.252, lng: -126.453 },
  ]);
});

test("pointAlong walks the path", () => {
  const path = [{ lat: 4.8, lng: 7.0 }, { lat: 4.8, lng: 7.1 }, { lat: 4.9, lng: 7.1 }];
  assert.deepEqual(pointAlong(path, 0), path[0]);
  assert.ok(Math.abs(pointAlong(path, 1).lat - 4.9) < 1e-9);
  const mid = pointAlong(path, 0.5);
  assert.ok(mid.lng > 7.0 && mid.lng <= 7.1);
});

test("rider position follows status", () => {
  const d = { riderId: "r", pickup: P("oldgra"), dest: P("choba"), status: "requested", acceptedAt: 0, pickedUpAt: 0 };
  assert.equal(riderPosition(d), null);
  assert.equal(riderPosition({ ...d, status: "arrived" }).lat, getLocation("oldgra").lat);
  assert.equal(riderPosition({ ...d, status: "delivered" }).lat, getLocation("choba").lat);
  const mid = riderPosition({ ...d, status: "in_transit", pickedUpAt: 1000 }, 31000);
  assert.ok(mid.lat > getLocation("oldgra").lat && mid.lat < getLocation("choba").lat);
});

test("validators", () => {
  assert.ok(validators.nin("12345678901"));
  assert.ok(!validators.nin("1234567890"));
  assert.ok(validators.plate("ABC-123-XY") && validators.plate("abc123xy"));
  assert.ok(!validators.plate("12-ABC"));
  assert.ok(validators.phone("08012345678") && validators.phone("+2348012345678"));
  assert.ok(!validators.phone("0801234"));
});
