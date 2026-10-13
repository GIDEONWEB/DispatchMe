"use client";
import { useState } from "react";
import { register, login } from "@/lib/db";
import { validators } from "@/lib/core";
import { Field, Shell } from "./ui";

export default function AuthForm({ role }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const isRider = role === "rider";

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!validators.email(f.email)) return setErr("Enter a valid email address.");
    if (mode === "register") {
      if (f.name.trim().length < 2) return setErr("Enter your full name.");
      if (!validators.phone(f.phone)) return setErr("Enter a valid Nigerian phone number (e.g. 08012345678).");
      if (f.password.length < 6) return setErr("Password must be at least 6 characters.");
    }
    setBusy(true);
    try {
      if (mode === "register") await register(role, f);
      else await login(role, f.email, f.password);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title={isRider ? "Rider" : "Customer"}>
      <div className="hero" style={{ paddingTop: 16 }}>
        <div style={{ fontSize: "3rem" }}>{isRider ? "🏍️" : "📦"}</div>
        <h2>{mode === "login" ? "Welcome back" : isRider ? "Ride with DispatchMe" : "Create your account"}</h2>
        <p className="muted">
          {isRider ? "Earn on your own schedule. Get verified, go online, accept deliveries." : "Send anything across the city with a verified rider."}
        </p>
      </div>
      <form className="card stack" onSubmit={submit}>
        {mode === "register" && (
          <>
            <Field label="Full name"><input value={f.name} onChange={set("name")} autoComplete="name" /></Field>
            <Field label="Phone number"><input value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" placeholder="08012345678" /></Field>
          </>
        )}
        <Field label="Email"><input type="email" value={f.email} onChange={set("email")} autoComplete="email" /></Field>
        <Field label="Password">
          <input type="password" value={f.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </Field>
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn block" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
        <button type="button" className="btn ghost block" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }}>
          {mode === "login" ? "New here? Register" : "Have an account? Log in"}
        </button>
      </form>
    </Shell>
  );
}
