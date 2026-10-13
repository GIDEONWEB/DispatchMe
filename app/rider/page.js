"use client";
import { useState } from "react";
import AuthForm from "@/components/AuthForm";
import LiveCamera from "@/components/LiveCamera";
import { Shell, RouteMap, Timeline, StatusBadge, Stars, Field, useNow, fmtDate } from "@/components/ui";
import {
  useCurrentUser, logout, setOnline, submitVerification, acceptDelivery, advanceDelivery,
  riderRating, fileToSmallDataUrl,
} from "@/lib/db";
import { NEXT_STATUS, naira, riderPosition, validators, PRICING } from "@/lib/core";

const TABS = [
  { id: "requests", label: "Requests", icon: "🔔" },
  { id: "active", label: "Active", icon: "🏍️" },
  { id: "earnings", label: "Earnings", icon: "💰" },
  { id: "profile", label: "Profile", icon: "🪪" },
];

export default function RiderApp() {
  const { db, user } = useCurrentUser("rider");
  const [tab, setTab] = useState("requests");
  const [err, setErr] = useState("");
  if (!user) return <AuthForm role="rider" />;

  const vs = user.verification.status;
  const approved = vs === "approved";
  const active = db.deliveries.find((d) => d.riderId === user.id && ["accepted", "arrived", "in_transit"].includes(d.status));
  const open = db.deliveries.filter((d) => d.status === "requested").sort((a, b) => a.createdAt - b.createdAt);

  function toggle() {
    setErr("");
    try { setOnline(user.id, !user.online); } catch (x) { setErr(x.message); }
  }

  const right = (
    <button className={"switch" + (user.online ? " on" : "")} onClick={toggle} disabled={!approved}
      style={{ background: "none", border: 0, color: "inherit", opacity: approved ? 1 : 0.5 }}
      aria-pressed={user.online} aria-label="Toggle online status">
      <span className="track" /> {user.online ? "Online" : "Offline"}
    </button>
  );

  return (
    <Shell title="Rider" tabs={TABS} tab={tab} onTab={setTab} right={right}>
      {err && <div className="err" role="alert" style={{ marginBottom: 12 }}>{err}</div>}
      {!approved && <VerifyBanner status={vs} go={() => setTab("profile")} />}
      {tab === "requests" && (
        <Requests rider={user} approved={approved} active={active} open={open}
          onAccept={(id) => { setErr(""); try { acceptDelivery(user.id, id); setTab("active"); } catch (x) { setErr(x.message); } }} />
      )}
      {tab === "active" && <Active rider={user} d={active} onErr={setErr} />}
      {tab === "earnings" && <Earnings db={db} rider={user} />}
      {tab === "profile" && <Profile db={db} rider={user} />}
    </Shell>
  );
}

function VerifyBanner({ status, go }) {
  if (status === "pending")
    return <div className="note" style={{ marginBottom: 12 }}>Your documents are under review. We'll unlock deliveries as soon as you're approved.</div>;
  return (
    <div className="note" style={{ marginBottom: 12 }}>
      {status === "rejected" ? "Your verification was rejected. Please review and resubmit." : "Complete verification to start receiving deliveries."}{" "}
      <a href="#" onClick={(e) => { e.preventDefault(); go(); }}>{status === "rejected" ? "Fix now →" : "Verify now →"}</a>
    </div>
  );
}

function Requests({ rider, approved, active, open, onAccept }) {
  if (!approved) return <div className="empty">🔒 {rider.verification.status === "pending" ? "Verification under review." : "Verification required before you can receive requests."}</div>;
  if (!rider.online) return <div className="empty">You're offline. Switch to <b>Online</b> (top right) to see delivery requests.</div>;
  if (active) return <div className="empty">You have an active delivery — open the Active tab.</div>;
  if (!open.length)
    return <div className="empty">🟢 You're online.<br />Waiting for delivery requests…</div>;
  return (
    <div>
      {open.map((d) => {
        const a = d.pickup, b = d.dest;
        return (
          <div className="card stack" key={d.id}>
            <div className="row"><h3>{a.name} → {b.name}</h3><b>{naira(d.riderEarning)}</b></div>
            <div className="muted">
              {d.km} km · ~{d.minutes} min · {d.packageId}<br />
              <b>Pickup:</b> {a.address}<br />
              <b>Drop-off:</b> {b.address}
            </div>
            <button className="btn" onClick={() => onAccept(d.id)}>Accept delivery</button>
          </div>
        );
      })}
    </div>
  );
}

function Active({ rider, d, onErr }) {
  const now = useNow();
  if (!d) return <div className="empty">No active delivery. Accept one from Requests.</div>;
  const a = d.pickup, b = d.dest;
  const next = NEXT_STATUS[d.status];
  const target = d.status === "in_transit" ? b : a;
  return (
    <div className="stack">
      <RouteMap pickup={a} dest={b} rider={riderPosition(d, now)} path={d.path} />
      <div className="card stack">
        <div className="row"><StatusBadge status={d.status} /><b>{naira(d.riderEarning)}</b></div>
        <Timeline status={d.status} />
        <div className="muted">
          <b>Pickup:</b> {a.address}<br />
          <b>Drop-off:</b> {b.address}<br />
          <b>Recipient:</b> {d.recipientName} · <a href={`tel:${d.recipientPhone}`}>{d.recipientPhone}</a><br />
          <b>Collect cash:</b> {naira(d.price)}{d.note ? <><br /><b>Note:</b> {d.note}</> : null}
        </div>
        <a className="btn ghost sm" target="_blank" rel="noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}`}>Open in Google Maps</a>
      </div>
      {next && (
        <button className="btn block" onClick={() => { try { advanceDelivery(rider.id, d.id); } catch (x) { onErr(x.message); } }}>
          {next.action}
        </button>
      )}
    </div>
  );
}

function Earnings({ db, rider }) {
  const done = db.deliveries.filter((d) => d.riderId === rider.id && d.status === "delivered").sort((a, b) => b.deliveredAt - a.deliveredAt);
  const sum = (arr) => arr.reduce((s, d) => s + d.riderEarning, 0);
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const weekAgo = Date.now() - 7 * 864e5;
  const rr = riderRating(db, rider.id);
  return (
    <div className="stack">
      <div className="card grid2">
        <div className="stat"><div className="muted">Today</div><div className="n">{naira(sum(done.filter((d) => d.deliveredAt >= startOfDay)))}</div></div>
        <div className="stat"><div className="muted">Last 7 days</div><div className="n">{naira(sum(done.filter((d) => d.deliveredAt >= weekAgo)))}</div></div>
        <div className="stat"><div className="muted">All time</div><div className="n">{naira(sum(done))}</div></div>
        <div className="stat"><div className="muted">Rating</div><div className="n">{rr.avg ? `${rr.avg} ★` : "—"}</div><div className="muted">{done.length} trips</div></div>
      </div>
      <p className="muted">You keep {Math.round(PRICING.riderShare * 100)}% of every fare. Customers pay you cash on delivery.</p>
      {!done.length && <div className="empty">Completed trips will show up here.</div>}
      {done.map((d) => (
        <div className="card row" key={d.id}>
          <div>
            <b>{d.pickup.name} → {d.dest.name}</b>
            <div className="muted">{fmtDate(d.deliveredAt)} {d.rating ? <Stars value={d.rating.stars} /> : null}</div>
          </div>
          <b>+{naira(d.riderEarning)}</b>
        </div>
      ))}
      <button className="btn ghost" onClick={() => logout("rider")}>Log out</button>
    </div>
  );
}

function Profile({ db, rider }) {
  const v = rider.verification;
  const locked = v.status === "approved" || v.status === "pending";
  const [f, setF] = useState({
    plate: v.plate || "", license: v.license || "", nin: v.nin || "",
    livePhoto: v.livePhoto || "", licensePhoto: v.licensePhoto || "", bikeDocs: v.bikeDocs || [],
  });
  const [err, setErr] = useState("");
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function pick(key, e, multi) {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    try {
      const urls = await Promise.all(files.slice(0, 3).map((x) => fileToSmallDataUrl(x, 800)));
      setF((p) => ({ ...p, [key]: multi ? urls : urls[0] }));
    } catch (x) { setErr(x.message); }
  }

  function submit(e) {
    e.preventDefault();
    setErr("");
    if (!validators.plate(f.plate)) return setErr("Enter a valid plate number, e.g. ABC-123-XY.");
    if (f.license.trim().length < 6) return setErr("Enter your driver's license number.");
    if (!validators.nin(f.nin)) return setErr("NIN must be exactly 11 digits.");
    if (!f.licensePhoto) return setErr("Upload a photo of your driver's license.");
    if (!f.livePhoto) return setErr("Take a live photo of your face.");
    if (!f.bikeDocs.length) return setErr("Upload your dispatch bike documents.");
    try {
      submitVerification(rider.id, { ...f, plate: f.plate.trim().toUpperCase() });
    } catch {
      setErr("Photos are too large for local demo storage — try fewer or smaller images.");
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="card">
        <div className="row"><h3>{rider.name}</h3>
          <span className={"badge " + (v.status === "approved" ? "ok" : v.status === "rejected" ? "bad" : v.status === "pending" ? "warn" : "")}>{v.status}</span></div>
        <div className="muted">{rider.email} · {rider.phone}</div>
      </div>
      <div className="card stack">
        <h3>Rider verification</h3>
        <Field label="Bike plate number"><input disabled={locked} value={f.plate} onChange={set("plate")} placeholder="ABC-123-XY" /></Field>
        <Field label="Driver's license number"><input disabled={locked} value={f.license} onChange={set("license")} /></Field>
        <Field label="National Identification Number (NIN)" hint="11 digits. Stored only for identity verification.">
          <input disabled={locked} value={f.nin} onChange={set("nin")} inputMode="numeric" maxLength={11} />
        </Field>
        <Field label="Driver's license photo">
          {f.licensePhoto && <img className="thumb" src={f.licensePhoto} alt="License" />}
          {!locked && <input type="file" accept="image/*" onChange={(e) => pick("licensePhoto", e)} />}
        </Field>
        <Field label="Live photo verification" hint="Look straight at the camera in good light.">
          {locked ? (f.livePhoto && <img className="thumb" src={f.livePhoto} alt="Live" />) : <LiveCamera value={f.livePhoto} onChange={(v2) => setF((p) => ({ ...p, livePhoto: v2 }))} />}
        </Field>
        <Field label="Dispatch bike documents" hint="Registration, proof of ownership, road-worthiness (up to 3 photos).">
          <div className="grid2">{f.bikeDocs.map((u, i) => <img key={i} className="thumb" src={u} alt={`Bike document ${i + 1}`} />)}</div>
          {!locked && <input type="file" accept="image/*" multiple onChange={(e) => pick("bikeDocs", e, true)} />}
        </Field>
        {err && <div className="err" role="alert">{err}</div>}
        {v.status === "rejected" && <div className="err">Rejected{v.rejectReason ? `: ${v.rejectReason}` : "."} Update your details and resubmit.</div>}
        {v.status === "pending" && <div className="okbox">Submitted — waiting for admin approval.</div>}
        {v.status === "approved" && <div className="okbox">You're verified! Switch to Online (top right) to start receiving requests.</div>}
        {!locked && <button className="btn block">Submit for verification</button>}
      </div>
      <button type="button" className="btn ghost" onClick={() => logout("rider")}>Log out</button>
    </form>
  );
}
