"use client";
import { useEffect, useRef, useState } from "react";

// Live selfie capture. Falls back to the phone's camera via <input capture> if the
// browser blocks getUserMedia (e.g. no HTTPS or permission denied).
export default function LiveCamera({ value, onChange }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setOn(false);
  };
  useEffect(() => stop, []);

  async function start() {
    setErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = s;
      setOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setErr("Camera unavailable. Use the button below to take a photo instead.");
    }
  }

  function snap() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 480 / v.videoWidth);
    const c = document.createElement("canvas");
    c.width = v.videoWidth * scale;
    c.height = v.videoHeight * scale;
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    onChange(c.toDataURL("image/jpeg", 0.6));
    stop();
  }

  async function fromFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { fileToSmallDataUrl } = await import("@/lib/db");
    onChange(await fileToSmallDataUrl(file, 480));
  }

  return (
    <div className="stack">
      {value && !on && <img className="thumb" src={value} alt="Your live photo" style={{ maxHeight: 220 }} />}
      {on && <video ref={videoRef} className="cam" playsInline muted />}
      {err && <div className="note">{err}</div>}
      <div className="row" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        {!on && <button type="button" className="btn ghost sm" onClick={start}>{value ? "Retake with camera" : "Open camera"}</button>}
        {on && <button type="button" className="btn sm" onClick={snap}>Capture</button>}
        {on && <button type="button" className="btn ghost sm" onClick={stop}>Cancel</button>}
        {!on && (
          <label className="btn ghost sm" style={{ margin: 0 }}>
            Take photo
            <input type="file" accept="image/*" capture="user" hidden onChange={fromFile} />
          </label>
        )}
      </div>
    </div>
  );
}
