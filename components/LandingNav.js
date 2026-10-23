"use client";
import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  ["How it works", "#how"],
  ["Features", "#features"],
  ["About us", "#about"],
  ["Ride with us", "#riders"],
  ["FAQ", "#faq"],
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="nav">
      <div className="wrap nav-in">
        <a href="#top" className="nav-logo" aria-label="Dispatch Me home" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Dispatch Me" />
        </a>
        <nav className={"nav-links" + (open ? " open" : "")} aria-label="Primary">
          {LINKS.map(([t, h]) => (
            <a key={h} href={h} onClick={() => setOpen(false)}>{t}</a>
          ))}
          <Link href="/customer" className="lp-btn primary nav-cta-mobile" onClick={() => setOpen(false)}>Request a rider</Link>
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <Link href="/customer" className="lp-btn primary sm nav-cta">Request a rider</Link>
          <button type="button" className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}
