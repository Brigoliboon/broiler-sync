"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { HouseScene } from "./house-scene";
import { Icon } from "./icons";
import { EASE_STANDARD } from "./motion";

type Phase = "idle" | "update" | "alert";

const PHASE_MS = 2500;
const NEXT: Record<Phase, Phase> = { idle: "update", update: "alert", alert: "idle" };

const READINGS: Record<Phase, { temp: string; hum: string; air: string; ago: string }> = {
  idle: { temp: "25.9", hum: "66", air: "0.08", ago: "1 min ago" },
  update: { temp: "26.1", hum: "68", air: "0.09", ago: "Just now" },
  alert: { temp: "26.1", hum: "72", air: "0.09", ago: "Just now" },
};

const SCENE_LABEL =
  "Animated scene: a broiler house sensor sends live readings to the BroilerSync phone app, which shows an alert when humidity goes above 70 percent.";

/**
 * Drives the 7.5 s hero loop (idle, readings update, alert). The resting
 * state, also used for reduced motion and before hydration, is "update".
 */
function useHeroLoop() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25 });
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState<Phase>("update");
  const [cycle, setCycle] = useState(0);
  const [started, setStarted] = useState(false);
  const running = started && inView && !paused && !reduced;

  // Start after first paint.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setStarted(true);
      setPhase("idle");
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      setPhase((current) => {
        const next = NEXT[current];
        if (next === "update") setCycle((c) => c + 1);
        return next;
      });
    }, PHASE_MS);
    return () => window.clearTimeout(timer);
  }, [running, phase]);

  const shown: Phase = reduced ? "update" : phase;
  return { ref, phase: shown, cycle, paused, setPaused, running, reduced };
}

function Value({ value }: { value: string }) {
  return (
    <span className="bsl-val">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -6, opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE_STANDARD }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function PauseButton({
  paused,
  onToggle,
}: {
  paused: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="bsl-pause"
      aria-pressed={paused}
      onClick={onToggle}
    >
      <Icon name={paused ? "play" : "pause"} size={16} />
      {paused ? "Play animation" : "Pause animation"}
    </button>
  );
}

function PhoneRows({ phase }: { phase: Phase }) {
  const r = READINGS[phase];
  const bad = phase === "alert";
  return (
    <div className="pcard">
      <div className="pr">
        <span className="pt" style={{ background: "#FFEDD5" }}>
          <Icon name="thermometer" size={14} color="#C2410C" />
        </span>
        <span className="pl">Temp</span>
        <b>
          <Value value={`${r.temp}°C`} />
        </b>
      </div>
      <div className="bsl-stack">
        <div className="pr">
          <span className="pt" style={{ background: "#DBEAFE" }}>
            <Icon name="droplet" size={14} color="#1D4ED8" />
          </span>
          <span className="pl">Humidity</span>
          <b>
            <Value value={`${READINGS[bad ? "update" : phase].hum}%`} />
          </b>
        </div>
        <div className="pr prbad bsl-fade" data-on={bad}>
          <span className="pt" style={{ background: "#FEE2E2" }}>
            <Icon name="alert" size={14} color="#991B1B" />
          </span>
          <span className="pl">Humidity</span>
          <b>72%</b>
        </div>
      </div>
      <div className="pr">
        <span className="pt" style={{ background: "#E0F2FE" }}>
          <Icon name="wind" size={14} color="#0369A1" />
        </span>
        <span className="pl">Air</span>
        <b>
          <Value value={`${r.air} m/s`} />
        </b>
      </div>
      <div className="pr">
        <span className="pt" style={{ background: "#F1F5F9" }}>
          <Icon name="fan" size={14} color="#64748B" />
        </span>
        <span className="pl">Fan</span>
        <b>
          <span className="tg off">OFF</span>
        </b>
      </div>
      <div className="pr">
        <span className="pt" style={{ background: "#FFEDD5" }}>
          <Icon name="lightbulb" size={14} color="#C2410C" />
        </span>
        <span className="pl">Lamp</span>
        <b>
          <span className="tg wn">ON</span>
        </b>
      </div>
    </div>
  );
}

/** The phone mockup used in the hero (desktop) and the how-it-works stage. */
export function PhoneMockup({
  phase,
  alertShown,
}: {
  phase: Phase;
  alertShown: boolean;
}) {
  return (
    <div className="phone">
      <div className="notch" />
      <div className="pin">
        <div className="ph1">
          Dela Cruz Farm <Icon name="chevronDown" size={14} color="#0F172A" />
        </div>
        <div className="ph2">
          <Icon name="box" size={14} color="#475569" />
          Control
          <span className="dot" />
          <Icon name="clock" size={12} color="#64748B" />
          <Value value={READINGS[phase].ago} />
        </div>
        <PhoneRows phase={phase} />
        <div className="pcard pch">
          <div className="pct">
            <Icon name="thermometer" size={14} color="#C2410C" />
            Temp, 24 h
          </div>
          <svg width="164" height="44" viewBox="0 0 164 44" aria-hidden="true">
            <rect x="0" y="12" width="164" height="16" fill="#EFF6FF" />
            <polyline
              points="0,26 18,24 36,25 54,20 72,19 90,22 108,17 126,18 144,15 164,12"
              fill="none"
              stroke="#C2410C"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <div className="notif bsl-notif" data-on={alertShown}>
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

function Delta({ show, children, tone }: { show: boolean; children: string; tone: "temp" | "hum" }) {
  const color = tone === "temp" ? "#9A3412" : "#1E40AF";
  const background = tone === "temp" ? "#FFEDD5" : "#DBEAFE";
  return (
    <span className="dl bsl-fade" data-on={show} style={{ color, background }}>
      <Icon name="trendingUp" size={12} color={color} />
      {children}
    </span>
  );
}

/** Desktop hero: house cutaway, reading chips and the phone. */
export function HeroStageDesktop() {
  const { ref, phase, cycle, paused, setPaused, running } = useHeroLoop();
  const r = READINGS[phase];
  const updated = phase !== "idle";
  const alert = phase === "alert";
  return (
    <div ref={ref} className="x-stage bsl-hero" data-running={running}>
      <div className="hero" role="img" aria-label={SCENE_LABEL}>
        <HouseScene width={480} height={420} glowOpacity={updated ? 0.8 : 0.45} />
        <svg className="lead" width="480" height="420" viewBox="0 0 480 420">
          <g fill="none" stroke="#1D4ED8" strokeWidth="1.5" strokeDasharray="3 4" opacity=".55">
            <path d="M86 76 C 86 150, 200 150, 228 214" />
            <path d="M268 142 L 244 188" />
            <path d="M400 76 C 400 150, 290 150, 254 214" />
          </g>
          <g fill="#1D4ED8">
            <circle cx="86" cy="76" r="3" />
            <circle cx="268" cy="142" r="3" />
            <circle cx="400" cy="76" r="3" />
          </g>
        </svg>
        <div className="stag">
          <Icon name="cpu" size={12} color="#fff" />
          ESP32
        </div>
        <div className="chip c1">
          {updated ? <span key={cycle} className="bsl-pulse" /> : null}
          <span className="tile" style={{ background: "#FFEDD5" }}>
            <Icon name="thermometer" size={18} color="#C2410C" />
          </span>
          <span className="ctx">
            <span className="cl">Control · Temp</span>
            <span className="cv">
              <Value value={r.temp} />
              <small>°C</small>
              <Delta show={updated} tone="temp">
                +0.2
              </Delta>
            </span>
          </span>
        </div>
        <div className="chip c2">
          <span className="tile" style={{ background: "#DBEAFE" }}>
            <Icon name="droplet" size={18} color="#1D4ED8" />
          </span>
          <span className="ctx">
            <span className="cl">Control · Humidity</span>
            <span className="cv">
              <Value value={READINGS[alert ? "update" : phase].hum} />
              <small>%</small>
              <Delta show={updated} tone="hum">
                +2
              </Delta>
            </span>
          </span>
        </div>
        <div className="chip c2 bad bsl-fade" data-on={alert}>
          <span className="tile" style={{ background: "#FEE2E2" }}>
            <Icon name="droplet" size={18} color="#991B1B" />
          </span>
          <span className="ctx">
            <span className="cl" style={{ color: "#991B1B" }}>
              Control · Humidity
            </span>
            <span className="cv">
              72<small>%</small>
              <span className="dl" style={{ color: "#991B1B", background: "#FEE2E2" }}>
                <Icon name="alert" size={12} color="#991B1B" />
                Above 70%
              </span>
            </span>
          </span>
        </div>
        <div className="chip c3">
          <span className="tile" style={{ background: "#E0F2FE" }}>
            <Icon name="wind" size={18} color="#0369A1" />
          </span>
          <span className="ctx">
            <span className="cl">Control · Air</span>
            <span className="cv">
              <Value value={r.air} />
              <small>m/s</small>
            </span>
          </span>
        </div>
        <PhoneMockup phase={phase} alertShown={alert} />
      </div>
      <span className="x-sd" aria-hidden="true">
        <Icon name="info" size={12} color="#92400E" />
        Sample data
      </span>
      <PauseButton paused={paused} onToggle={() => setPaused((p) => !p)} />
    </div>
  );
}

/** Phone hero (below 1024 px): cropped house with the three chips in a row. */
export function HeroStagePhone() {
  const { ref, phase, paused, setPaused, running } = useHeroLoop();
  const r = READINGS[phase];
  const alert = phase === "alert";
  return (
    <div ref={ref} className="x-pstage bsl-hero" data-running={running}>
      <div className="x-pscene">
        <div className="bsl-fill" role="img" aria-label={SCENE_LABEL}>
          <HouseScene
            width={358}
            height={242}
            viewBox="0 96 480 324"
            glowOpacity={phase === "idle" ? 0.45 : 0.8}
          />
          <span className="x-sd" aria-hidden="true">
            <Icon name="info" size={12} color="#92400E" />
            Sample data
          </span>
        </div>
        <PauseButton paused={paused} onToggle={() => setPaused((p) => !p)} />
      </div>
      <div className="x-mcs" aria-hidden="true">
        <div className="x-mc">
          <span className="x-mt" style={{ background: "#FFEDD5" }}>
            <Icon name="thermometer" size={16} color="#C2410C" />
          </span>
          <span>
            <span className="x-ml">Temp</span>
            <b>
              <Value value={r.temp} />
              <small>°C</small>
            </b>
          </span>
        </div>
        <div className="bsl-stack">
          <div className="x-mc">
            <span className="x-mt" style={{ background: "#DBEAFE" }}>
              <Icon name="droplet" size={16} color="#1D4ED8" />
            </span>
            <span>
              <span className="x-ml">Humidity</span>
              <b>
                <Value value={READINGS[alert ? "update" : phase].hum} />
                <small>%</small>
              </b>
            </span>
          </div>
          <div className="x-mc bsl-mc-bad bsl-fade" data-on={alert}>
            <span className="x-mt" style={{ background: "#FEE2E2" }}>
              <Icon name="alert" size={16} color="#991B1B" />
            </span>
            <span>
              <span className="x-ml">Above 70%</span>
              <b>
                72<small>%</small>
              </b>
            </span>
          </div>
        </div>
        <div className="x-mc">
          <span className="x-mt" style={{ background: "#E0F2FE" }}>
            <Icon name="wind" size={16} color="#0369A1" />
          </span>
          <span>
            <span className="x-ml">Air</span>
            <b>
              <Value value={r.air} />
              <small>m/s</small>
            </b>
          </span>
        </div>
      </div>
      <div className="x-pcap">
        <Icon name="box" size={14} color="#475569" />
        Control compartment · updated just now
      </div>
    </div>
  );
}
