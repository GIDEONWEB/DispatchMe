"use client";
import { useEffect, useRef, useState } from "react";
import PlacePicker from "@/components/PlacePicker";
import { computeRoute, mapsEnabled, reverseGeocode, inPortHarcourt } from "@/lib/mapbox";
import AuthForm from "@/components/AuthForm";
import { Shell, RouteMap, Timeline, StatusBadge, Stars, Field, useNow, fmtDate } from "@/components/ui";
import { useCurrentUser, logout, createDelivery, cancelDelivery, rateDelivery, riderRating } from "@/lib/db";
import { PACKAGE_TYPES, ACTIVE_STATUSES, estimate, naira, riderPosition, validators } from "@/lib/core";

const TABS = [
  { id: "request", label: "Request", icon: "📦" },
  { id: "track", label: "Track", icon: "📍" },
  { id: "history", label: "History", icon: "🧾" },
  { id: "account", label: "Account", icon: "👤" },
];

export default function CustomerApp() {
  const { db, user } = useCurrentUser("customer");
  const [tab, setTab] = useState("request");
  if (!user) return <AuthForm role="customer" />;

  const mine = db.deliveries.filter((d) => d.customerId === user.id).sort((a, b) => b.createdAt - a.createdAt);
  const active = mine.find((d) => ACTIVE_STATUSES.includes(d.status));
  const unrated = mine.find((d) => d.status === "delivered" && !d.rating);

  return (
    <Shell title="Customer" tabs={TABS} tab={tab} onTab={setTab}
      right={<span className="muted">Hi, {user.name.split(" ")[0]}</span>}>
      {tab === "request" && (active ? <ActiveNotice d={active} go={() => setTab("track")} /> : <RequestForm user={user} onDone={() => setTab("track")} unrated={unrated} />)}
      {tab === "track" && <Track db={db} user={user} d={active || unrated || mine[0]} />}
      {tab === "history" && <History db={db} user={user} list={mine} />}
      {tab === "account" && (
        <div className="card stack">
          <h3>{user.name}</h3>
          <div className="muted">{user.email}<br />{user.phone}</div>
          <div className="muted">{mine.filter((d) => d.status === "delivered").length} completed deliveries</div>
          <button className="btn ghost" onClick={() => logout("customer")}>Log out</button>
        </div>
      )}
    </Shell>
  );
}

function ActiveNotice({ d, go }) {
  return (
    <div className="card stack">
      <h3>You have a delivery in progress</h3>
      <StatusBadge status={d.status} />
      <button className="btn" onClick={go}>Track delivery</button>
    </div>
  );
}

// mapsEnabled() flips to false if Mapbox rejects the token; re-render when that happens.
function useMapsOn() {
  const [on, setOn] = useState(mapsEnabled());
  useEffect(() => {
    const f = () => setOn(false);
    window.addEventListener("maps-failed", f);
    return () => window.removeEventListener("maps-failed", f);
  }, []);
  return on;
}

function RequestForm({ user, onDone, unrated }) {
  const [f, setF] = useState({
    pickup: null, dest: null,
    packageId: "small", recipientName: "", recipientPhone: "", note: "",
  });
  const [err, setErr] = useState("");
  const [route, setRoute] = useState(null); // real road data from Mapbox, when available
  const [routing, setRouting] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setPlace = (k) => (p) => setF((cur) => ({ ...cur, [k]: p }));

  const maps = useMapsOn();
  const [active, setActive] = useState("pickup"); // which point a map tap sets
  const [mapMsg, setMapMsg] = useState("");
  const [locating, setLocating] = useState(false);
  const pickSeq = useRef({ pickup: 0, dest: 0 });

  // A tap / pin drag / "my location": drop the pin immediately, then fill in the street address.
  async function pickOnMap(kind, { lat, lng }) {
    if (!inPortHarcourt({ lat, lng })) { setMapMsg("That spot is outside Port Harcourt."); return; }
    setMapMsg("");
    const mine = ++pickSeq.current[kind];
    setPlace(kind)({ name: "Pinned location", address: "Finding address…", lat, lng });
    let p = null;
    try { p = await reverseGeocode({ lat, lng }); } catch { /* keep the coordinates */ }
    if (mine !== pickSeq.current[kind]) return; // a newer pick superseded this one
    setPlace(kind)(p ? { ...p, lat, lng } : { name: "Pinned location", address: `Pinned location (${lat.toFixed(5)}, ${lng.toFixed(5)})`, lat, lng });
    if (kind === "pickup" && !f.dest) setActive("dest"); // Bolt-style: move on to the drop-off
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setMapMsg("Your browser can't share its location.");
    setLocating(true);
    setMapMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); pickOnMap("pickup", { lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      (e) => { setLocating(false); setMapMsg(e.code === 1 ? "Location permission was denied — search or tap the map instead." : "Couldn't get your location."); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }

  function swap() {
    pickSeq.current.pickup++; pickSeq.current.dest++;
    setF((cur) => ({ ...cur, pickup: cur.dest, dest: cur.pickup }));
  }

  const { pickup, dest } = f;
  useEffect(() => {
    setRoute(null);
    if (!pickup || !dest || !mapsEnabled()) return;
    let live = true;
    setRouting(true);
    computeRoute(pickup, dest).then((r) => { if (live) { setRoute(r); setRouting(false); } });
    return () => { live = false; };
  }, [pickup?.lat, pickup?.lng, dest?.lat, dest?.lng]);

  const est = estimate(pickup, dest, f.packageId, route);

  function submit(e) {
    e.preventDefault();
    setErr("");
    if (!f.pickup || !f.dest) return setErr("Choose a pickup and a destination in Port Harcourt.");
    if (!mapsEnabled() && (!f.pickup.address.trim() || !f.dest.address.trim()))
      return setErr("Add the street address for pickup and destination.");
    if (!f.recipientName.trim()) return setErr("Add the recipient's name.");
    if (!validators.phone(f.recipientPhone)) return setErr("Enter a valid recipient phone number.");
    try {
      createDelivery(user.id, { ...f, route });
      onDone();
    } catch (x) {
      setErr(x.message);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      {unrated && <div className="note">You haven't rated your last rider yet — open the Track tab.</div>}
      <div className="card stack">
        <h3>Where to? <span className="muted" style={{ fontWeight: 500 }}>· Port Harcourt</span></h3>
        {maps ? (
          <>
            <div className={"locfield" + (active === "pickup" ? " on" : "")}>
              <span className="locdot pu" aria-hidden>A</span>
              <div className="locinput">
                <PlacePicker id="pickup" value={f.pickup} onChange={setPlace("pickup")} onFocus={() => setActive("pickup")} placeholder="Search pickup, e.g. Ada George Road" />
              </div>
              <button type="button" className="locbtn" onClick={useMyLocation} disabled={locating} title="Use my current location" aria-label="Use my current location">
                {locating ? "…" : "◎"}
              </button>
            </div>
            <div className={"locfield" + (active === "dest" ? " on" : "")}>
              <span className="locdot de" aria-hidden>B</span>
              <div className="locinput">
                <PlacePicker id="dest" value={f.dest} onChange={setPlace("dest")} onFocus={() => setActive("dest")} placeholder="Search drop-off, e.g. Port Harcourt Mall" />
              </div>
              <button type="button" className="locbtn" onClick={swap} disabled={!f.pickup && !f.dest} title="Swap pickup and drop-off" aria-label="Swap pickup and drop-off">⇅</button>
            </div>
            {mapMsg && <div className="err" role="alert" style={{ marginTop: 0 }}>{mapMsg}</div>}
            <RouteMap pickup={pickup} dest={dest} path={route?.polyline} editable active={active} onPick={pickOnMap}
              hint={active === "pickup" ? "Tap the map or drag pin A to set pickup" : "Tap the map or drag pin B to set drop-off"} />
          </>
        ) : (
          <>
            <Field label="Pickup"><PlacePicker value={f.pickup} onChange={setPlace("pickup")} placeholder="Pickup street address / landmark" /></Field>
            <Field label="Drop-off"><PlacePicker value={f.dest} onChange={setPlace("dest")} placeholder="Drop-off street address / landmark" /></Field>
          </>
        )}
      </div>

      <div className="card stack">
        <h3>Package & recipient</h3>
        <Field label="What are you sending?">
          <select value={f.packageId} onChange={set("packageId")}>
            {PACKAGE_TYPES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <div className="grid2">
          <Field label="Recipient name"><input value={f.recipientName} onChange={set("recipientName")} /></Field>
          <Field label="Recipient phone"><input value={f.recipientPhone} onChange={set("recipientPhone")} inputMode="tel" /></Field>
        </div>
        <Field label="Note for rider (optional)"><textarea rows={2} value={f.note} onChange={set("note")} /></Field>
      </div>

      <div className="card">
        {est ? (
          <>
            <div className="muted">Estimated price</div>
            <div className="price">{naira(est.price)}</div>
            <div className="muted">≈ {est.km} km · about {est.minutes} min · pay cash to the rider{routing ? " · checking route…" : ""}</div>
          </>
        ) : (
          <div className="muted">Choose pickup and drop-off to see your price.</div>
        )}
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn block" disabled={!est || routing}>Request rider{est ? ` · ${naira(est.price)}` : ""}</button>
    </form>
  );
}

function Track({ db, user, d }) {
  const now = useNow();
  const [err, setErr] = useState("");
  if (!d) return <div className="empty">No deliveries yet. Request your first rider!</div>;
  const pickup = d.pickup;
  const dest = d.dest;
  const rider = d.riderId ? db.users.find((u) => u.id === d.riderId) : null;
  const rr = rider ? riderRating(db, rider.id) : null;
  const pos = riderPosition(d, now);

  return (
    <div className="stack">
      <RouteMap pickup={pickup} dest={dest} rider={pos} path={d.path} />
      <div className="card stack">
        <div className="row"><StatusBadge status={d.status} /><b>{naira(d.price)}</b></div>
        {d.status !== "cancelled" && <Timeline status={d.status} />}
        {d.status === "requested" && <div className="muted">Waiting for a nearby rider to accept… keep this page open.</div>}
        <div className="muted">
          <b>From:</b> {pickup.address}<br />
          <b>To:</b> {dest.address}<br />
          <b>Recipient:</b> {d.recipientName} · {d.recipientPhone}
        </div>
      </div>
      {rider && (
        <div className="card row">
          <div>
            <h3>{rider.name}</h3>
            <div className="muted">Plate {rider.verification.plate} · {rider.phone}</div>
            {rr.count > 0 ? <div><Stars value={rr.avg} /> <span className="muted">{rr.avg} ({rr.count})</span></div> : <span className="muted">New rider</span>}
          </div>
          <a className="btn sm" href={`tel:${rider.phone}`}>Call</a>
        </div>
      )}
      {err && <div className="err">{err}</div>}
      {["requested", "accepted"].includes(d.status) && (
        <button className="btn ghost danger block" style={{ color: "var(--bad)" }}
          onClick={() => { try { cancelDelivery(user.id, d.id); } catch (x) { setErr(x.message); } }}>
          Cancel delivery
        </button>
      )}
      {d.status === "delivered" && <RateBox d={d} user={user} rider={rider} />}
    </div>
  );
}

function RateBox({ d, user, rider }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  if (d.rating)
    return <div className="okbox">You rated {rider?.name.split(" ")[0] ?? "your rider"} <Stars value={d.rating.stars} /> — thank you!</div>;
  return (
    <div className="card stack">
      <h3>How was {rider?.name.split(" ")[0] ?? "your rider"}?</h3>
      <Stars value={stars} onChange={setStars} />
      <textarea rows={2} placeholder="Leave a comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      {err && <div className="err">{err}</div>}
      <button className="btn" disabled={!stars}
        onClick={() => { try { rateDelivery(user.id, d.id, stars, comment); } catch (x) { setErr(x.message); } }}>
        Submit rating
      </button>
    </div>
  );
}

function History({ db, list }) {
  const [open, setOpen] = useState(null);
  if (!list.length) return <div className="empty">No deliveries yet.</div>;
  return (
    <div>
      {list.map((d) => {
        const rider = d.riderId ? db.users.find((u) => u.id === d.riderId) : null;
        return (
          <div className="card" key={d.id} onClick={() => setOpen(open === d.id ? null : d.id)} style={{ cursor: "pointer" }}>
            <div className="row">
              <b>{d.pickup.name} → {d.dest.name}</b>
              <b>{naira(d.price)}</b>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <span className="muted">{fmtDate(d.createdAt)}</span>
              <StatusBadge status={d.status} />
            </div>
            {open === d.id && (
              <div className="muted" style={{ marginTop: 10 }}>
                {d.pickup.address} → {d.dest.address}<br />
                Recipient: {d.recipientName} · {d.km} km<br />
                Rider: {rider ? `${rider.name} (${rider.verification.plate})` : "—"}<br />
                {d.rating ? <>Your rating: <Stars value={d.rating.stars} />{d.rating.comment ? ` — “${d.rating.comment}”` : ""}</> : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
