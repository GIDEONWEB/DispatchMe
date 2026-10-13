# DispatchMe

On-demand dispatch rider platform. Next.js 15 (App Router, plain JavaScript) — dispatch riders for **Port Harcourt, Rivers State** — two surfaces in one app:

| Route | What it is |
|---|---|
| `/customer` | Register/login · request delivery · pickup & destination · price estimate · request rider · live tracking · history · rate rider |
| `/admin` | Demo dashboard: customers, riders, deliveries done, platform revenue (20%), approve/reject pending rider verifications (**unprotected — add auth before launch**) |
| `/rider` | Register/login · verification (plate, license, NIN, live photo, bike docs) · online/offline · receive & accept requests · pickup/drop-off details · status updates · earnings |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # pricing / tracking / validation unit tests
npm run build && npm start
```

## Mapbox (Port Harcourt)

1. Sign up at [mapbox.com](https://www.mapbox.com/) and copy your **default public token** (`pk.…`) from [account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens/). Optionally add URL restrictions (`http://localhost:3000`, your production domain).
2. `cp .env.example .env.local` and set `NEXT_PUBLIC_MAPBOX_TOKEN=pk...`, then restart `npm run dev`.

With a token: pickup/drop-off use type-ahead search limited to Port Harcourt (Search Box API), the map (Mapbox GL JS) shows the real road route, and the price uses real road distance and traffic-aware time (Directions API, `driving-traffic`). Without a token (or if Mapbox rejects it) the app falls back to a Port Harcourt area list + typed address and a simple SVG map.

## Try the full flow (2 minutes)

1. Open `/customer` in one tab and register. Open `/rider` in a second tab and register.
2. Rider → **Profile**: fill plate (`ABC-123-XY`), license no., NIN (11 digits), upload license photo, take the live photo, upload bike docs, submit (status becomes **pending**).
3. Open `/admin` (link on the home page) and **Approve** the rider. Then rider: flip **Online** (top right).
4. Customer: search pickup + drop-off in Port Harcourt, see the price, **Request rider**.
5. Rider: **Requests → Accept**, then tap through *arrived → picked up → delivered*. The customer's map and timeline update live.
6. Customer rates the rider; rider sees the fare in **Earnings**.

## How it's built

- `lib/core.js` — pure logic: Port Harcourt areas, pricing (`₦500 + ₦120/km + package surcharge`, min ₦800, rider keeps 80%), status flow, simulated rider position, validators.
- `lib/db.js` — **demo data layer** on `localStorage` (tabs sync via the `storage` event). Every function maps to a table/RPC in `supabase/schema.sql`.
- `lib/mapbox.js` — Mapbox Search Box (restricted to Port Harcourt), Directions (distance/time/path), reverse geocode.
- `components/` — shared UI, Mapbox + SVG maps, place picker, auth form, live camera capture.
- `supabase/schema.sql` — production schema: profiles, riders, deliveries, ratings, RLS policies, atomic `accept_delivery()` RPC, one-active-delivery-per-customer/rider constraints.

## Going to production (what the demo fakes)

| Demo | Production |
|---|---|
| localStorage + SHA-256 passwords | Supabase Auth + the schema in `supabase/schema.sql`; replace `lib/db.js` functions with Supabase queries; subscribe to Realtime on `deliveries` |
| Simulated rider movement along the route | Rider app streams GPS into `riders.lat/lng`; customer map subscribes via Realtime |
| Photos stored as small data URLs | Supabase Storage private bucket `rider-docs` |
| Admin page is open to anyone |  Protect `/admin` with an admin role (Supabase RLS + middleware) |
| Verification approved manually by admin | Add an identity provider for NIN lookup and **face match** of live photo vs. license (e.g. Smile ID, Dojah, Prembly) |
| Cash only | Paystack/Flutterwave for card/transfer, rider payouts & wallet |
| Price computed in browser | Compute server-side (Postgres function / Edge Function) so clients can't tamper |

Also before launch: encrypt the NIN column, add phone OTP, push notifications for new requests (FCM/OneSignal), rider request timeouts & re-dispatch, cancellation fees, support/dispute flow, and Terms/NDPR privacy consent for ID data.
