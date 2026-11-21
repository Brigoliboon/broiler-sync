"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Icon, type IconName } from "./icons";
import { PhoneMockup } from "./hero-scene";
import { EASE_STANDARD } from "./motion";
import { Reveal } from "./reveal";
import { useMediaQuery } from "./use-media-query";

const STEPS: { title: string; icon: IconName; body: string }[] = [
  {
    title: "Sensor reads",
    icon: "cpu",
    body: "The ESP32 on the wall reads temperature, humidity and air speed in both compartments.",
  },
  {
    title: "Syncs to the cloud",
    icon: "cloud",
    body: "Each reading goes over Wi-Fi and is saved to your farm’s history.",
  },
  {
    title: "Alert on your phone",
    icon: "bellRing",
    body: "If a value leaves its range, your phone shows an alert.",
  },
];

/** Pin only on desktop, on screens tall enough to hold the stage, without reduced motion. */
const PIN_QUERY =
  "(min-width: 1024px) and (min-height: 720px) and (prefers-reduced-motion: no-preference)";

const T_STD = { duration: 0.4, ease: EASE_STANDARD };

function stepFor(progress: number) {
  if (progress < 0.34) return 1;
  if (progress < 0.67) return 2;
  return 3;
}

function RailSegment({ fill }: { fill: MotionValue<number> | number }) {
  return (
    <span className="bsl-seg" aria-hidden="true">
      <motion.span className="bsl-seg-fill" style={{ scaleY: fill }} />
    </span>
  );
}

function Rail({
  step,
  pinned,
  progress,
}: {
  step: number;
  pinned: boolean;
  progress: MotionValue<number>;
}) {
  const seg1 = useTransform(progress, [0, 0.34], [0, 1]);
  const seg2 = useTransform(progress, [0.34, 0.67], [0, 1]);
  const fills = [seg1, seg2];
  return (
    <ol className="x-rail bsl-rail">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const state = !pinned ? "static" : n < step ? "done" : n === step ? "active" : "todo";
        return (
          <li key={s.title} data-state={state} aria-current={pinned && n === step ? "step" : undefined}>
            {i < STEPS.length - 1 ? <RailSegment fill={pinned ? fills[i] : 1} /> : null}
            <span className="x-nd" aria-hidden="true">
              {state === "done" ? <Icon name="check" size={16} color="#fff" /> : n}
            </span>
            <div>
              <div className="x-rt">
                <Icon name={s.icon} size={18} color={state === "todo" ? "#64748B" : "#1D4ED8"} />
                {s.title}
              </div>
              <div className="x-rd">{s.body}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const PACKETS: { label: string; icon: IconName; color: string; background: string }[] = [
  { label: "26.1°", icon: "thermometer", color: "#9A3412", background: "#FFEDD5" },
  { label: "72%", icon: "droplet", color: "#1E40AF", background: "#DBEAFE" },
  { label: "0.09", icon: "wind", color: "#075985", background: "#E0F2FE" },
];

/** Reading pills in the phone layout's first step (resting values). */
const PILLS = PACKETS.map((p) => (p.icon === "droplet" ? { ...p, label: "68%" } : p));

function Packet({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const p = PACKETS[index];
  // Each packet crosses in 14% of the scroll; starts 9.5% apart keep them ~70 px apart.
  const start = 0.35 + index * 0.095;
  const x = useTransform(progress, [start, start + 0.14], [0, 104]);
  const opacity = useTransform(
    progress,
    [start - 0.01, start + 0.02, start + 0.12, start + 0.15],
    [0, 1, 1, 0],
  );
  return (
    <motion.div
      className="pk"
      style={{ left: 182, top: 176, x, opacity, background: p.background, color: p.color }}
    >
      <Icon name={p.icon} size={14} color={p.color} />
      {p.label}
    </motion.div>
  );
}

function Stage({
  step,
  pinned,
  progress,
}: {
  step: number;
  pinned: boolean;
  progress: MotionValue<number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const entered = useInView(ref, { once: true, amount: 0.4 });
  const show = (n: number) => !pinned || (entered && step >= n);
  const fade = (n: number, rise = 0) => ({
    initial: pinned ? { opacity: 0, y: rise } : false,
    animate: show(n) ? { opacity: 1, y: 0 } : { opacity: 0, y: rise },
    transition: T_STD,
  });

  return (
    <div ref={ref} className="x-hstage" aria-hidden="true">
      <svg width="720" height="420" viewBox="0 0 720 420" style={{ position: "absolute", left: 0, top: 0 }}>
        <rect x="70" y="24" width="84" height="372" fill="#E2E8F0" />
        <text x="112" y="388" textAnchor="middle" fontSize="12" fontWeight="600" fill="#475569">
          House wall
        </text>
        <motion.path
          d="M178 210 C 240 210, 250 210, 312 210"
          fill="none"
          stroke="#93C5FD"
          strokeWidth="3"
          strokeDasharray="6 6"
          strokeLinecap="round"
          {...fade(2)}
        />
        <motion.path
          d="M408 210 C 440 210, 450 210, 492 210"
          fill="none"
          stroke="#FCA5A5"
          strokeWidth="3"
          strokeDasharray="6 6"
          strokeLinecap="round"
          {...fade(3)}
        />
        <motion.g {...fade(1, 16)}>
          <g transform="translate(112,210) scale(0.7)">
          <rect x="-80" y="-50" width="160" height="100" rx="10" fill="#0F172A" />
          <rect x="-64" y="-58" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="-64" y="48" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="-48" y="-58" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="-48" y="48" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="-32" y="-58" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="-32" y="48" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="-16" y="-58" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="-16" y="48" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="0" y="-58" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="0" y="48" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="16" y="-58" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="16" y="48" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="32" y="-58" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="32" y="48" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="48" y="-58" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="48" y="48" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="64" y="-58" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="64" y="48" width="6" height="10" rx="1" fill="#94A3B8" />
          <rect x="-46" y="-30" width="56" height="56" rx="6" fill="#334155" />
          <rect x="-34" y="-18" width="32" height="32" rx="3" fill="#475569" />
          <path d="M26 -34 h36 v12 h-28 v12 h28 v12 h-28" fill="none" stroke="#FACC15" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="54" cy="32" r="5" fill="#22C55E" />
          <circle cx="54" cy="32" r="10" fill="#22C55E" opacity=".25" />
          <text x="-72" y="40" fontSize="12" fontWeight="700" fill="#E2E8F0">ESP32</text>
          </g>
        </motion.g>
      </svg>

      <motion.div
        className="rtag"
        style={{ left: 24, top: 96 }}
        initial={pinned ? { opacity: 0, scale: 0.9 } : false}
        animate={show(1) ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ ...T_STD, duration: 0.6, delay: pinned ? 0.15 : 0 }}
      >
        <span className="tile" style={{ background: "#FFEDD5" }}>
          <Icon name="thermometer" size={16} color="#C2410C" />
        </span>
        <span>
          <span className="cl">Temp</span>
          <b>26.1 °C</b>
        </span>
      </motion.div>
      <motion.div
        className="rtag"
        style={{ left: 24, top: 280 }}
        initial={pinned ? { opacity: 0, scale: 0.9 } : false}
        animate={show(1) ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ ...T_STD, duration: 0.6, delay: pinned ? 0.3 : 0 }}
      >
        <span className="tile" style={{ background: "#DBEAFE" }}>
          <Icon name="droplet" size={16} color="#1D4ED8" />
        </span>
        <span>
          <span className="cl">Humidity</span>
          <b>72 %</b>
        </span>
      </motion.div>

      <motion.div className="nodeb big" style={{ left: 312, top: 162, background: "#1D4ED8" }} {...fade(2)}>
        <Icon name="cloud" size={40} color="#fff" />
      </motion.div>
      <motion.div className="nlab" style={{ left: 290, top: 268, width: 140 }} {...fade(2)}>
        BroilerSync cloud
      </motion.div>
      <motion.div
        className="saved"
        style={{ left: 294, top: 294 }}
        initial={pinned ? { opacity: 0, scale: 0.8 } : false}
        animate={show(2) ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.25, ease: EASE_STANDARD, delay: pinned && show(2) ? 0.3 : 0 }}
      >
        <Icon name="database" size={14} color="#166534" />
        Saved to history
      </motion.div>

      {pinned ? (
        PACKETS.map((p, i) => <Packet key={p.label} index={i} progress={progress} />)
      ) : (
        <div className="pk" style={{ left: 206, top: 176, background: "#DBEAFE", color: "#1E40AF" }}>
          <Icon name="droplet" size={14} color="#1E40AF" />
          72%
        </div>
      )}
      <motion.div
        className="pk"
        style={{ left: 416, top: 176, background: "#FEE2E2", color: "#991B1B" }}
        {...fade(3)}
      >
        <Icon name="alert" size={14} color="#991B1B" />
        Alert
      </motion.div>

      <motion.div className="x-ph" style={{ left: 500, top: 14 }} {...fade(3, 16)}>
        <PhoneMockup phase="alert" alertShown={show(3)} />
        {pinned && show(3) ? (
          <>
            <span className="bsl-ring bsl-ring-1" />
            <span className="bsl-ring bsl-ring-2" />
          </>
        ) : null}
      </motion.div>

      <motion.span className="x-num" style={{ left: 156, top: 146 }} {...fade(1)}>
        1
      </motion.span>
      <motion.span className="x-num" style={{ left: 346, top: 112 }} {...fade(2)}>
        2
      </motion.span>
      <motion.span className="x-num" style={{ left: 456, top: 40 }} {...fade(3)}>
        3
      </motion.span>
      <span className="x-sd" style={{ left: 16, top: 16, bottom: "auto" }}>
        <Icon name="info" size={12} color="#92400E" />
        Sample data
      </span>
    </div>
  );
}

function HowDesktop() {
  const pinned = useMediaQuery(PIN_QUERY);
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });
  const [step, setStep] = useState(1);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = stepFor(v);
    if (next !== step) setStep(next);
  });

  return (
    <div ref={trackRef} className="bsl-how-track bsl-d" data-pinned={pinned}>
      <div className="bsl-how-sticky">
        <HowHeader />
        <div className="x-hgrid">
          <Rail step={step} pinned={pinned} progress={scrollYProgress} />
          <Stage step={step} pinned={pinned} progress={scrollYProgress} />
        </div>
      </div>
    </div>
  );
}

function HowHeader() {
  return (
    <div className="x-hd">
      <span className="x-eb">
        <Icon name="target" size={16} color="#1D4ED8" />
        How it works
      </span>
      <h2 className="x-h2">From the house to your phone</h2>
      <p className="x-sub">Set up once. After that, every reading takes the same short trip.</p>
    </div>
  );
}

function PhoneStepVisual({ index }: { index: number }): ReactNode {
  if (index === 0) {
    return (
      <div className="x-sv">
        <span className="x-dk">
          <Icon name="cpu" size={22} color="#fff" />
        </span>
        <div className="x-pills">
          {PILLS.map((p) => (
            <span key={p.label} style={{ background: p.background, color: p.color }}>
              <Icon name={p.icon} size={14} color={p.color} />
              {p.label}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="x-sv">
        <span className="x-dk">
          <Icon name="cpu" size={22} color="#fff" />
        </span>
        <span className="x-dash" />
        <span className="x-dk" style={{ background: "#1D4ED8" }}>
          <Icon name="cloud" size={22} color="#fff" />
        </span>
        <span className="saved" style={{ position: "static" }}>
          <Icon name="database" size={14} color="#166534" />
          Saved
        </span>
      </div>
    );
  }
  return (
    <div className="x-sv">
      <div className="x-ntf">
        <span className="nt">
          <Icon name="bellRing" size={16} color="#991B1B" />
        </span>
        <div>
          <div className="nm">BroilerSync · now</div>
          <div className="nb">Humidity 72%</div>
          <div className="nm" style={{ color: "#334155" }}>
            Control · above 70%
          </div>
        </div>
      </div>
    </div>
  );
}

function HowPhone() {
  return (
    <div className="bsl-p">
      <HowHeader />
      <ol className="x-rail x-prail">
        {STEPS.map((s, i) => (
          <Reveal as="li" key={s.title}>
            <span className="x-nd" aria-hidden="true">
              {i + 1}
            </span>
            <div className="x-pstep">
              <div className="x-rt">
                <Icon name={s.icon} size={18} color="#1D4ED8" />
                {s.title}
              </div>
              <div className="x-rd">{s.body}</div>
              <div aria-hidden="true">
                <PhoneStepVisual index={i} />
              </div>
            </div>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

/** Section 2 of the motion spec: the scroll story (desktop) and stacked steps (phone). */
export function HowItWorks() {
  return (
    <section id="how" className="x-sec x-how">
      <HowDesktop />
      <HowPhone />
    </section>
  );
}
