import Link from "next/link";
import LandingNav from "@/components/LandingNav";
import "./landing.css";

export const metadata = {
  title: "Dispatch Me — on-demand dispatch riders in Port Harcourt",
  description:
    "Request a verified dispatch rider in minutes. See your price upfront, track every delivery live and rate your rider.",
};

/* Small inline icon set (stroke icons, inherit currentColor) */
const I = ({ children }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const icons = {
  price: <I><path d="M7 5v14M7 5h6a4 4 0 0 1 0 8H7M5 10h8M5 14h8" /></I>,
  pin: <I><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></I>,
  shield: <I><path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6l7-3z" /><path d="M9 12l2.2 2.2L15 10" /></I>,
  star: <I><path d="M12 3.5l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.9l6-.9L12 3.5z" /></I>,
  bolt: <I><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></I>,
  wallet: <I><path d="M4 7a2 2 0 0 1 2-2h12v4M4 7v10a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2z" /><circle cx="16.5" cy="14" r="1" /></I>,
  box: <I><path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z" /><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9" /></I>,
  heart: <I><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></I>,
  eye: <I><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></I>,
  check: <I><path d="M5 12.5l4.5 4.5L19 7.5" /></I>,
};

const STEPS = [
  { n: "01", t: "Tell us where", d: "Enter pickup and drop-off anywhere in Port Harcourt, or drop a pin on the map. Add what you’re sending." },
  { n: "02", t: "See your price", d: "Your fare is calculated from the real road distance before you confirm. No haggling, no surprises." },
  { n: "03", t: "Track it live", d: "A verified rider accepts, picks up and delivers. Follow every stage on the map until it’s done." },
];

const FEATURES = [
  { i: "price", t: "Upfront pricing", d: "A clear fare before you request. It starts at ₦800 and is based on distance and package size." },
  { i: "pin", t: "Live tracking", d: "Watch your rider move on the map and follow each status, from accepted to delivered." },
  { i: "shield", t: "Verified riders", d: "Every rider submits plate, licence and ID, plus a live photo, and is approved before going online." },
  { i: "bolt", t: "Fast dispatch", d: "Nearby online riders see your request instantly. The first to accept takes the job." },
  { i: "star", t: "Rated by you", d: "Rate every delivery. Good riders rise to the top and everyone stays accountable." },
  { i: "box", t: "Parcels of all sizes", d: "Documents, food, gadgets, shop orders. If it fits on a bike, we’ll move it." },
];

const VALUES = [
  { i: "eye", t: "Transparent", d: "You see the price and the rider’s progress. Nothing is hidden." },
  { i: "shield", t: "Trustworthy", d: "Verification comes before the first delivery, not after a problem." },
  { i: "heart", t: "Fair to riders", d: "Riders keep 80% of every fare. Good work should pay properly." },
];

const FAQ = [
  ["Where does Dispatch Me operate?", "Dispatch Me is built for Port Harcourt, Rivers State. Pickup and drop-off search is focused on the city and its neighbourhoods."],
  ["How is the price worked out?", "Your fare is based on the road distance between pickup and drop-off, plus a small surcharge for larger packages. The minimum fare is ₦800, and you see the total before you request."],
  ["How do I know a rider is trustworthy?", "Riders must submit their plate number, licence, ID number, a live photo and bike documents. An admin reviews them and only approved riders can go online."],
  ["Can I follow my delivery?", "Yes. Once a rider accepts, you can follow each stage (accepted, at pickup, on the way, delivered) on the live map."],
  ["How do I become a rider?", "Create a rider account, complete the verification form and wait for approval. Once approved, go online and start accepting requests."],
  ["How do I pay?", "Payment is cash on delivery for now. Card and transfer payments are on the way."],
];

export default function Home() {
  return (
    <div className="lp" id="top">
      <LandingNav />

      {/* ---------- HERO ---------- */}
      <section className="hero-lp">
        <div className="glow g1" aria-hidden />
        <div className="glow g2" aria-hidden />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="pill"><i className="dot" /> Now dispatching in Port Harcourt</span>
            <h1>
              Get it there.<br />
              <span className="grad">Fast.</span>
            </h1>
            <p className="lead">
              On-demand dispatch riders across Port Harcourt. See your price upfront, track every delivery live and rate your rider.
            </p>
            <div className="cta-row">
              <Link href="/customer" className="lp-btn primary lg">
                Request a rider
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
              <Link href="/rider" className="lp-btn ghost lg">Become a rider</Link>
            </div>
            <ul className="trust">
              <li>{icons.check} Upfront pricing</li>
              <li>{icons.check} Verified riders</li>
              <li>{icons.check} Live tracking</li>
            </ul>
          </div>

          {/* Illustrative tracking card */}
          <div className="hero-art" aria-hidden="true">
            <div className="phone">
              <div className="map-mock">
                <svg viewBox="0 0 320 250" preserveAspectRatio="xMidYMid slice">
                  <g className="streets">
                    <path d="M-10 60 L330 40" /><path d="M-10 140 L330 165" /><path d="M-10 215 L330 205" />
                    <path d="M70 -10 L90 260" /><path d="M170 -10 L160 260" /><path d="M255 -10 L275 260" />
                  </g>
                  <path className="route-bg" d="M58 190 C 110 190, 120 110, 170 110 S 235 70, 262 52" />
                  <path className="route" d="M58 190 C 110 190, 120 110, 170 110 S 235 70, 262 52" />
                  <circle cx="58" cy="190" r="9" className="pu" /><circle cx="58" cy="190" r="3.5" fill="#fff" />
                  <rect x="252" y="42" width="20" height="20" rx="6" className="de" /><circle cx="262" cy="52" r="3.5" fill="#fff" />
                  <g className="rider-g">
                    <circle r="16" className="halo" />
                    <circle r="8" className="rd" />
                    <animateMotion dur="7s" repeatCount="indefinite" path="M58 190 C 110 190, 120 110, 170 110 S 235 70, 262 52" />
                  </g>
                </svg>
              </div>
              <div className="sheet">
                <div className="sheet-top">
                  <span className="badge-lp">On the way</span>
                  <span className="eta">8 min</span>
                </div>
                <div className="steps-mini">
                  <i className="on" /><i className="on" /><i className="on" /><i /><i />
                </div>
                <div className="sheet-row">
                  <div className="avatar">T</div>
                  <div className="who"><b>Your rider</b><small>Verified · ★ 4.9</small></div>
                  <div className="fare">₦1,850</div>
                </div>
              </div>
            </div>
            <div className="float f1"><span className="fi">{icons.shield}</span><div><b>Rider verified</b><small>ID + live photo</small></div></div>
            <div className="float f2"><span className="fi o">{icons.price}</span><div><b>Price locked</b><small>Before you book</small></div></div>
          </div>
        </div>
      </section>

      {/* ---------- STATS STRIP ---------- */}
      <section className="strip">
        <div className="wrap strip-grid">
          <div><b>₦800</b><span>minimum fare, shown upfront</span></div>
          <div><b>80%</b><span>of every fare goes to the rider</span></div>
          <div><b>100%</b><span>of riders verified before going online</span></div>
          <div><b>Live</b><span>tracking from pickup to drop-off</span></div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="sec" id="how">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">How it works</span>
            <h2>Three taps from “I need this sent” to delivered.</h2>
            <p>No calls, no negotiation, no guessing where your package is.</p>
          </div>
          <ol className="steps">
            {STEPS.map((s) => (
              <li key={s.n} className="step">
                <span className="num">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section className="sec alt" id="features">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Features</span>
            <h2>Built for speed, trust and clarity.</h2>
            <p>Everything you need to send something across the city with confidence.</p>
          </div>
          <div className="feat-grid">
            {FEATURES.map((f) => (
              <article key={f.t} className="feat">
                <span className="ficon">{icons[f.i]}</span>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- ABOUT US ---------- */}
      <section className="sec" id="about">
        <div className="wrap about-grid">
          <div className="about-copy">
            <span className="eyebrow">About us</span>
            <h2>Moving Port Harcourt, one delivery at a time.</h2>
            <p>
              Dispatch Me exists to make sending things across the city simple. Too often it means phone calls, vague prices and no idea where your package is. We built one place where you can request a rider, see the cost, and watch the delivery happen.
            </p>
            <p>
              We’re also building something better for the riders who make it all possible: clear verification, steady requests and fair pay, with riders keeping 80% of every fare.
            </p>
            <div className="mission">
              <b>Our mission</b>
              <span>Make everyday delivery in Port Harcourt fast, transparent and trusted, for customers and riders alike.</span>
            </div>
          </div>
          <div className="values">
            {VALUES.map((v) => (
              <div key={v.t} className="value">
                <span className="ficon">{icons[v.i]}</span>
                <div><h3>{v.t}</h3><p>{v.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FOR RIDERS ---------- */}
      <section className="sec" id="riders">
        <div className="wrap">
          <div className="rider-band">
            <div className="rb-copy">
              <span className="eyebrow light">Ride with us</span>
              <h2>Got a bike? Start earning on your schedule.</h2>
              <p>Go online when you’re ready, accept the requests you want and keep 80% of every fare.</p>
              <ul>
                <li>{icons.check} Go online or offline whenever you like</li>
                <li>{icons.check} See pickup, drop-off and fare before you accept</li>
                <li>{icons.check} Track your earnings in the app</li>
              </ul>
              <Link href="/rider" className="lp-btn accent lg">Become a rider</Link>
            </div>
            <div className="rb-art" aria-hidden="true">
              <div className="rb-card"><small>Today’s earnings</small><b>₦12,400</b><span>Illustrative example</span></div>
              <div className="rb-card b"><small>Rider share</small><b>80%</b><span>of every fare</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="sec alt" id="faq">
        <div className="wrap narrow">
          <div className="sec-head">
            <span className="eyebrow">FAQ</span>
            <h2>Questions, answered.</h2>
          </div>
          <div className="faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}<span aria-hidden className="plus" /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="sec final">
        <div className="wrap">
          <div className="cta-card">
            <h2>Ready to get it there?</h2>
            <p>Request your first rider in under a minute.</p>
            <div className="cta-row center">
              <Link href="/customer" className="lp-btn accent lg">Request a rider</Link>
              <Link href="/rider" className="lp-btn outline-light lg">Become a rider</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="foot">
        <div className="wrap foot-grid">
          <div className="foot-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Dispatch Me" />
            <p>On-demand dispatch riders for Port Harcourt, Rivers State.</p>
          </div>
          <nav aria-label="Product">
            <h4>Product</h4>
            <Link href="/customer">Request a rider</Link>
            <Link href="/rider">Become a rider</Link>
            <a href="#how">How it works</a>
          </nav>
          <nav aria-label="Company">
            <h4>Company</h4>
            <a href="#about">About us</a>
            <a href="#features">Features</a>
            <a href="#faq">FAQ</a>
          </nav>
        </div>
        <div className="wrap foot-bottom">
          <span>© {new Date().getFullYear()} Dispatch Me. All rights reserved.</span>
          <Link href="/admin">Admin</Link>
        </div>
      </footer>
    </div>
  );
}
