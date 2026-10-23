"use client";
import { useEffect, useState } from "react";

// Light is the default. Dark is opt-in and remembered for next visit.
export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("dm-theme", next); } catch {}
  }

  const dark = theme === "dark";
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-pressed={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
      <span className="tt-track" aria-hidden>
        <svg className="tt-sun" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        <svg className="tt-moon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
        <span className="tt-knob" />
      </span>
    </button>
  );
}
