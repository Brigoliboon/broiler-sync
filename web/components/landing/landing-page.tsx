import type { ReactNode } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { Compare } from "./compare";
import { DashboardPan } from "./dashboard-pan";
import { HeroStageDesktop, HeroStagePhone } from "./hero-scene";
import { HowItWorks } from "./how-it-works";
import { Icon, type IconName } from "./icons";
import { LandingMotion } from "./landing-motion";
import { Reveal } from "./reveal";
import "./landing.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

function SectionHeader({
  icon,
  eyebrow,
  title,
  sub,
}: {
  icon: IconName;
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <Reveal className="x-hd">
      <span className="x-eb">
        <Icon name={icon} size={16} color="#1D4ED8" />
        {eyebrow}
      </span>
      <h2 className="x-h2">{title}</h2>
      <p className="x-sub">{sub}</p>
    </Reveal>
  );
}

function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className="x-brand" style={small ? { fontSize: 16 } : undefined}>
      <span className="x-ibx" style={small ? { width: 32, height: 32 } : undefined}>
        <Icon name="bird" size={small ? 18 : 20} color="#1D4ED8" />
      </span>
      BroilerSync
    </span>
  );
}

function Nav() {
  return (
    <header className="x-nav">
      <Brand />
      <nav className="x-links" aria-label="Page sections">
        <a href="#features">
          <Icon name="sparkles" size={16} color="#475569" />
          Features
        </a>
        <a href="#how">
          <Icon name="target" size={16} color="#475569" />
          How it works
        </a>
        <a href="#compare">
          <Icon name="code" size={16} color="#475569" />
          Compare
        </a>
      </nav>
      <Link className="x-btn pri" href="/login">
        <Icon name="lock" size={18} color="#fff" />
        Sign in
      </Link>
    </header>
  );
}

function Hero() {
  return (
    <section className="x-sec x-hero">
      <div className="x-ht">
        <span className="x-eb">
          <Icon name="radio" size={16} color="#1D4ED8" />
          Live broiler house monitoring
        </span>
        <h1 className="x-h1">Know your broiler house is in range, from anywhere.</h1>
        <p className="x-lead">
          BroilerSync reads both compartments of your house and alerts your phone when something
          drifts.
        </p>
        <div className="x-ctas">
          <Link className="x-btn pri" href="/login">
            <Icon name="lock" size={18} color="#fff" />
            Sign in
          </Link>
          <a className="x-btn sec" href="#how">
            <Icon name="play" size={18} color="#0F172A" />
            See how it works
          </a>
        </div>
        <ul className="x-ben">
          <li>
            <Icon name="thermometer" size={18} color="#166534" />
            <span>Live temperature, humidity and air speed</span>
          </li>
          <li>
            <Icon name="bellRing" size={18} color="#166534" />
            <span>Alerts when a value leaves its range</span>
          </li>
          <li>
            <Icon name="fan" size={18} color="#166534" />
            <span>Fan and lamp status, Auto or Manual</span>
          </li>
        </ul>
      </div>
      <div className="bsl-d">
        <HeroStageDesktop />
      </div>
      <div className="bsl-p">
        <HeroStagePhone />
      </div>
    </section>
  );
}

const FACTS: { icon: IconName; color: string; background: string; title: string; body: string }[] = [
  { icon: "thermometer", color: "#C2410C", background: "#FFEDD5", title: "3 readings", body: "Temperature, humidity and air speed" },
  { icon: "box", color: "#6D28D9", background: "#EDE9FE", title: "2 compartments", body: "Experimental and Control, side by side" },
  { icon: "cpu", color: "#0F172A", background: "#F1F5F9", title: "1 ESP32 per farm", body: "A small sensor on the house wall" },
  { icon: "bot", color: "#166534", background: "#DCFCE7", title: "Auto or Manual", body: "Fan and lamp status for each compartment" },
];

function Value() {
  return (
    <section className="x-sec x-val">
      <Reveal className="x-vq">
        <span className="x-qi">
          <Icon name="eye" size={24} color="#1D4ED8" />
        </span>
        <div>
          <h2 className="x-h3">Conditions in a broiler house change through the day.</h2>
          <p className="x-sub">BroilerSync keeps watch so you don’t have to walk in to check.</p>
        </div>
      </Reveal>
      <div className="x-facts">
        {FACTS.map((f, i) => (
          <Reveal key={f.title} className="x-fact" index={i}>
            <span className="x-ft" style={{ background: f.background }}>
              <Icon name={f.icon} size={24} color={f.color} />
            </span>
            <div>
              <b>{f.title}</b>
              <span>{f.body}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function CompareSection() {
  return (
    <section id="compare" className="x-sec">
      <SectionHeader
        icon="code"
        eyebrow="Compare compartments"
        title="Experimental vs Control, day by day"
        sub="See how the Experimental compartment holds the target next to Control, day by day."
      />
      <Compare />
    </section>
  );
}

function PanSection() {
  return (
    <section className="x-sec x-pan">
      <SectionHeader
        icon="move"
        eyebrow="See the dashboard"
        title="The whole house on one screen"
        sub="Drag across the real dashboard. Each part lights up as it comes into view."
      />
      <DashboardPan />
    </section>
  );
}

type Feature = {
  icon: IconName;
  color: string;
  background: string;
  title: string;
  body: string;
  preview: ReactNode;
};

const FEATURES: Feature[] = [
  {
    icon: "thermometer",
    color: "#C2410C",
    background: "#FFEDD5",
    title: "Live readings",
    body: "Temperature, humidity and air speed for each compartment.",
    preview: (
      <div className="x-mini x-mrow">
        {(
          [
            ["thermometer", "#C2410C", "#FFEDD5", "25.4°"],
            ["droplet", "#1D4ED8", "#DBEAFE", "64%"],
            ["wind", "#0369A1", "#E0F2FE", "0.12"],
          ] as const
        ).map(([icon, color, background, value]) => (
          <div className="x-mm" key={icon}>
            <span className="x-mt" style={{ background }}>
              <Icon name={icon} size={14} color={color} />
            </span>
            <b>{value}</b>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: "bellRing",
    color: "#991B1B",
    background: "#FEE2E2",
    title: "Instant alerts",
    body: "Know when a value leaves its range, with the compartment named.",
    preview: (
      <div className="x-mini">
        <div className="x-mal">
          <Icon name="alert" size={16} color="#991B1B" />
          <span>
            <b>Control:</b> humidity 72%, above 70%
          </span>
        </div>
      </div>
    ),
  },
  {
    icon: "code",
    color: "#6D28D9",
    background: "#EDE9FE",
    title: "Compare compartments",
    body: "Experimental and Control side by side, with status at a glance.",
    preview: (
      <div className="x-mini x-mrow">
        <div className="x-mm2">
          <span className="fx" style={{ gap: 4 }}>
            <Icon name="flask" size={14} color="#1D4ED8" />
            Exp
          </span>
          <b>25.4°</b>
          <span className="x-ok">
            <Icon name="check" size={12} color="#166534" />
            In range
          </span>
        </div>
        <div className="x-mm2 bad">
          <span className="fx" style={{ gap: 4 }}>
            <Icon name="box" size={14} color="#C2410C" />
            Ctrl
          </span>
          <b>25.9°</b>
          <span className="x-no">
            <Icon name="alert" size={12} color="#991B1B" />1 alert
          </span>
        </div>
      </div>
    ),
  },
  {
    icon: "chartLine",
    color: "#1D4ED8",
    background: "#DBEAFE",
    title: "History",
    body: "Daily min, max and average against the target band.",
    preview: (
      <div className="x-mini">
        <svg width="100%" height="56" viewBox="0 0 280 56" preserveAspectRatio="none" aria-hidden="true">
          <rect y="18" width="280" height="20" fill="#DCFCE7" />
          <polyline points="0,34 40,30 80,32 120,24 160,26 200,20 240,24 280,22" fill="none" stroke="#1D4ED8" strokeWidth="2.5" />
          <polyline
            points="0,26 40,22 80,26 120,14 160,20 200,12 240,18 280,16"
            fill="none"
            stroke="#C2410C"
            strokeWidth="2.5"
            strokeDasharray="6 4"
          />
        </svg>
      </div>
    ),
  },
  {
    icon: "download",
    color: "#166534",
    background: "#DCFCE7",
    title: "CSV export",
    body: "Pick a range and download the readings as a spreadsheet.",
    preview: (
      <div className="x-mini x-mrow" aria-hidden="true">
        <span className="x-chip0">
          <Icon name="calendar" size={14} color="#475569" />
          Last 7 days
        </span>
        <span className="x-mbtn">
          <Icon name="download" size={14} color="#fff" />
          Export CSV
        </span>
      </div>
    ),
  },
  {
    icon: "house",
    color: "#0F172A",
    background: "#F1F5F9",
    title: "Multiple farms",
    body: "Switch farms in one tap. Each farm has its own sensor.",
    preview: (
      <div className="x-mini x-farms">
        <div>
          <Icon name="house" size={14} color="#1D4ED8" />
          <b>Dela Cruz Farm</b>
          <span className="x-on">
            <Icon name="wifi" size={12} color="#166534" />
            Online
          </span>
        </div>
        <div>
          <Icon name="house" size={14} color="#475569" />
          <span>Second farm</span>
          <span className="x-on">
            <Icon name="wifi" size={12} color="#166534" />
            Online
          </span>
        </div>
      </div>
    ),
  },
];

function Features() {
  return (
    <section id="features" className="x-sec x-feat">
      <SectionHeader
        icon="sparkles"
        eyebrow="Features"
        title="Everything the house tells you"
        sub="Each feature is a real screen in the app."
      />
      <ul className="x-fg">
        {FEATURES.map((f, i) => (
          <Reveal as="li" key={f.title} className="x-fc" index={i}>
            {f.preview}
            <div className="x-fh">
              <span className="x-ft2" style={{ background: f.background }}>
                <Icon name={f.icon} size={18} color={f.color} />
              </span>
              <h3>{f.title}</h3>
            </div>
            <p>{f.body}</p>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="x-sec x-ctaw">
      <Reveal className="x-cta">
        <div className="x-ctt">
          <span className="x-eb2">
            <Icon name="users" size={16} color="#fff" />
            Accounts by invite
          </span>
          <h2 className="x-h2" style={{ color: "#fff" }}>
            Ready to check on your flock?
          </h2>
          <p className="x-ctp">
            Your farm admin creates your account. Ask them for access if you don’t have one yet.
          </p>
          <Link className="x-btn wht" href="/login">
            <Icon name="lock" size={18} color="#1D4ED8" />
            Sign in
          </Link>
        </div>
        {/* A preview of the sign-in screen. The whole card opens the real login page. */}
        <Link className="x-login bsl-login-card" href="/login" aria-label="Open the sign-in page" tabIndex={-1}>
          <span className="x-lh" aria-hidden="true">
            <span className="x-ibx">
              <Icon name="bird" size={18} color="#1D4ED8" />
            </span>
            <b>Sign in to BroilerSync</b>
          </span>
          <span className="bsl-label" aria-hidden="true">
            <Icon name="mail" size={14} color="#334155" />
            Email
          </span>
          <span className="x-inp" aria-hidden="true">
            juan@example.com
          </span>
          <span className="bsl-label" aria-hidden="true">
            <Icon name="lock" size={14} color="#334155" />
            Password
          </span>
          <span className="x-inp" aria-hidden="true">
            ••••••••
          </span>
          <span className="x-lbtn" aria-hidden="true">
            <Icon name="lock" size={16} color="#fff" />
            Sign in
          </span>
        </Link>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="x-foot">
      <Brand small />
      <nav className="x-fl" aria-label="Footer">
        <a href="#features">Features</a>
        <a href="#how">How it works</a>
        <Link href="/login">Sign in</Link>
      </nav>
      <span className="x-copy">© 2026 BroilerSync · Draft copy · Sample data</span>
    </footer>
  );
}

/** BroilerSync landing page v2 (Clean Flat). Styles are scoped to `.bsl`. */
export function LandingPage() {
  return (
    <LandingMotion>
      <div className={`bsl ${inter.className}`}>
        <Nav />
        <main>
          <Hero />
          <Value />
          <HowItWorks />
          <CompareSection />
          <PanSection />
          <Features />
          <ClosingCta />
        </main>
        <Footer />
      </div>
    </LandingMotion>
  );
}
