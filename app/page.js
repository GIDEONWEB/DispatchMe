import Link from "next/link";
import { Logo } from "@/components/ui";

export default function Home() {
  return (
    <div className="shell">
      <header className="topbar">
        <span className="logo"><Logo /></span>
      </header>
      <main className="content">
        <section className="hero">
          <h1>Get it there.<br /><b>Fast.</b></h1>
          <p className="muted">On-demand dispatch riders across Port Harcourt. See your price upfront, track every delivery live, and rate your rider.</p>
        </section>
        <div className="pick">
          <Link href="/customer">
            <div className="card"><span className="big">📦</span><div><h3>I need a delivery</h3><span className="muted">Request a rider, see the price, track live.</span></div></div>
          </Link>
          <Link href="/rider">
            <div className="card"><span className="big">🏍️</span><div><h3>I'm a dispatch rider</h3><span className="muted">Get verified, go online, start earning.</span></div></div>
          </Link>
        </div>
        <p className="muted" style={{ marginTop: 24, textAlign: "center", fontSize: ".82rem" }}><Link href="/admin">Admin</Link></p>
        <p className="muted" style={{ marginTop: 8, textAlign: "center", fontSize: ".82rem" }}>
          Demo mode: open the customer and rider apps in two browser tabs — they share data live.
        </p>
      </main>
    </div>
  );
}
