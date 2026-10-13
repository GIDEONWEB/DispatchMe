"use client";
import { useState } from "react";
import { Shell, fmtDate } from "@/components/ui";
import { useDB, reviewRider } from "@/lib/db";
import { naira, PRICING } from "@/lib/core";

export default function AdminApp() {
  const db = useDB();
  const [err, setErr] = useState("");
  const riders = db.users.filter((u) => u.role === "rider");
  const customers = db.users.filter((u) => u.role === "customer");
  const done = db.deliveries.filter((d) => d.status === "delivered");
  const revenue = done.reduce((s, d) => s + (d.price - d.riderEarning), 0);
  const pending = riders
    .filter((r) => r.verification?.status === "pending")
    .sort((a, b) => a.verification.submittedAt - b.verification.submittedAt);

  function review(id, approve) {
    setErr("");
    let reason = "";
    if (!approve) {
      reason = window.prompt("Reason for rejecting (shown to the rider):", "Documents unclear") ;
      if (reason === null) return;
    }
    try { reviewRider(id, approve, reason); } catch (x) { setErr(x.message); }
  }

  return (
    <Shell title="Admin">
      <div className="stack">
        <div className="note">Demo admin — unprotected. Lock this down before launch.</div>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="card grid2">
          <div className="stat"><div className="n">{customers.length}</div><div className="muted">Customers</div></div>
          <div className="stat"><div className="n">{riders.length}</div><div className="muted">Riders</div></div>
          <div className="stat"><div className="n">{done.length}</div><div className="muted">Deliveries done</div></div>
          <div className="stat"><div className="n">{naira(revenue)}</div><div className="muted">Platform revenue ({Math.round((1 - PRICING.riderShare) * 100)}%)</div></div>
        </div>

        <h2>Pending verification ({pending.length})</h2>
        {!pending.length && <div className="empty">No riders waiting for review.</div>}
        {pending.map((r) => {
          const v = r.verification;
          return (
            <div className="card stack" key={r.id}>
              <div className="row"><h3>{r.name}</h3><span className="muted">{fmtDate(v.submittedAt)}</span></div>
              <div className="muted">
                {r.email} · {r.phone}<br />
                Plate: <b>{v.plate}</b> · License: <b>{v.license}</b> · NIN: <b>{v.nin}</b>
              </div>
              <div className="grid2">
                <Doc label="Live photo" src={v.livePhoto} />
                <Doc label="License" src={v.licensePhoto} />
                {(v.bikeDocs || []).map((u, i) => <Doc key={i} label={`Bike document ${i + 1}`} src={u} />)}
              </div>
              <div className="grid2">
                <button className="btn" onClick={() => review(r.id, true)}>Approve</button>
                <button className="btn ghost" onClick={() => review(r.id, false)}>Reject</button>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function Doc({ label, src }) {
  return (
    <figure style={{ margin: 0 }}>
      {src ? <a href={src} target="_blank" rel="noreferrer"><img className="thumb" src={src} alt={label} /></a> : <div className="thumb" />}
      <figcaption className="muted" style={{ fontSize: ".8rem", marginTop: 4 }}>{label}</figcaption>
    </figure>
  );
}
