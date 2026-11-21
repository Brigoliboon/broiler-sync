"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type UIEvent,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Icon, type IconName } from "./icons";
import { EASE_STANDARD } from "./motion";
import { useMediaQuery } from "./use-media-query";

const SRC = "/landing/dashboard.jpg";
const ALT =
  "BroilerSync dashboard with sample data: the Dela Cruz Farm switcher, an alert that Control humidity is 72 percent, Experimental and Control readings side by side, and a 24-hour temperature chart.";

/** Dashboard image as laid out on desktop (896 x 560), viewed through 600 x 400. */
const IMG = { w: 896, h: 560 };
const VP = { w: 600, h: 400 };
const MINI = { w: 192, h: 120 };
const MINI_SCALE = MINI.w / IMG.w;

type Spot = { title: string; body: string; icon: IconName; x: number; y: number };

/** Hotspots in desktop image coordinates. */
const SPOTS: Spot[] = [
  { title: "Farm switcher", body: "Jump between farms. Each farm has its own ESP32.", icon: "house", x: 162, y: 55 },
  { title: "Live readings", body: "Temperature, humidity and air for each compartment.", icon: "thermometer", x: 305, y: 153 },
  { title: "Compartment alert", body: "The compartment out of range gets a red outline.", icon: "alert", x: 604, y: 133 },
  { title: "24-hour chart", body: "Both compartments against the target band.", icon: "chartLine", x: 520, y: 440 },
];

const REDUCED = "(prefers-reduced-motion: reduce)";
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function moveTo(mv: MotionValue<number>, value: number, reduced: boolean, duration = 0.4) {
  if (reduced) {
    mv.stop();
    mv.set(value);
  } else {
    animate(mv, value, { duration, ease: EASE_STANDARD });
  }
}

function Callout({
  spot,
  index,
  on,
  onClick,
  className = "co",
}: {
  spot: Spot;
  index: number;
  on: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <span className="cn" aria-hidden="true">
        {index + 1}
      </span>
      <span className="tile">
        <Icon name={spot.icon} size={18} color={on ? "#1D4ED8" : "#475569"} />
      </span>
      <span>
        <span className="cot">{spot.title}</span>
        <span className="cod">{spot.body}</span>
      </span>
    </>
  );
  if (!onClick) return <div className={`${className} ${on ? "on" : ""}`}>{content}</div>;
  return (
    <button
      type="button"
      className={`${className} ${on ? "on" : ""}`}
      aria-pressed={on}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

function BrowserBar() {
  return (
    <div className="bt" aria-hidden="true">
      <span className="d" style={{ background: "#FCA5A5" }} />
      <span className="d" style={{ background: "#FDE68A" }} />
      <span className="d" style={{ background: "#86EFAC" }} />
      <span className="url">
        <Icon name="lock" size={12} color="#64748B" />
        BroilerSync · Dashboard
      </span>
    </div>
  );
}

function PanDesktop() {
  const reduced = useMediaQuery(REDUCED);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const miniX = useTransform(x, (v) => -v * MINI_SCALE);
  const miniY = useTransform(y, (v) => -v * MINI_SCALE);
  const [inView, setInView] = useState<boolean[]>(() => SPOTS.map((s) => spotInView(s, 0, 0)));
  const [side, setSide] = useState("left side");
  const [hinted, setHinted] = useState(true);
  const miniDrag = useRef(false);

  const update = () => {
    const vx = x.get();
    const vy = y.get();
    setInView((prev) => {
      const next = SPOTS.map((s) => spotInView(s, vx, vy));
      return next.every((v, i) => v === prev[i]) ? prev : next;
    });
    const ratio = -vx / (IMG.w - VP.w);
    setSide(ratio < 0.33 ? "left side" : ratio > 0.66 ? "right side" : "middle");
  };
  useMotionValueEvent(x, "change", update);
  useMotionValueEvent(y, "change", update);

  const panTo = (tx: number, ty: number, duration = 0.4) => {
    moveTo(x, clamp(tx, VP.w - IMG.w, 0), reduced, duration);
    moveTo(y, clamp(ty, VP.h - IMG.h, 0), reduced, duration);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 240 : 80;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setHinted(false);
    panTo(x.get() + m[0], y.get() + m[1], 0.25);
  };

  const miniPan = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * MINI.w;
    const my = ((e.clientY - rect.top) / rect.height) * MINI.h;
    const cx = mx / MINI_SCALE - VP.w / 2;
    const cy = my / MINI_SCALE - VP.h / 2;
    x.stop();
    y.stop();
    x.set(clamp(-cx, VP.w - IMG.w, 0));
    y.set(clamp(-cy, VP.h - IMG.h, 0));
    setHinted(false);
  };

  if (reduced) {
    // Reduced motion: the whole dashboard, scaled to fit, with all callouts listed.
    const s = VP.w / IMG.w;
    return (
      <div className="pf">
        <div className="lc">
          <div className="br">
            <BrowserBar />
            <div className="vp" style={{ height: IMG.h * s }}>
              <Image src={SRC} alt={ALT} width={VP.w} height={IMG.h * s} className="bsl-fit-img" />
              {SPOTS.map((spot, i) => (
                <span key={spot.title} className="hs on" style={{ left: spot.x * s, top: spot.y * s }} aria-hidden="true">
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="rc">
          <div className="rch">
            <Icon name="sparkles" size={16} color="#1D4ED8" />
            What you’re seeing
          </div>
          {SPOTS.map((spot, i) => (
            <Callout key={spot.title} spot={spot} index={i} on />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pf">
      <div className="lc">
        <div className="br">
          <BrowserBar />
          <div
            className="vp bsl-vp"
            tabIndex={0}
            role="region"
            aria-label="Dashboard preview, use arrow keys to pan"
            onKeyDown={onKeyDown}
          >
            <motion.div
              className="bsl-pan-img"
              style={{ x, y }}
              drag
              dragConstraints={{ left: VP.w - IMG.w, right: 0, top: VP.h - IMG.h, bottom: 0 }}
              dragElastic={0}
              dragTransition={{ power: 0.15, timeConstant: 200 }}
              onDragStart={() => setHinted(false)}
            >
              <Image src={SRC} alt={ALT} width={IMG.w} height={IMG.h} draggable={false} sizes="896px" />
              {SPOTS.map((spot, i) => (
                <span
                  key={spot.title}
                  className={`hs ${inView[i] ? "on" : "dim"}`}
                  style={{ left: spot.x, top: spot.y }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
              ))}
            </motion.div>
            {hinted ? (
              <div className="panhint" aria-hidden="true">
                <Icon name="move" size={16} color="#fff" />
                Drag to explore the dashboard
              </div>
            ) : null}
          </div>
        </div>
        <div className="mmr">
          <div
            className="mm bsl-mm"
            aria-hidden="true"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              miniDrag.current = true;
              miniPan(e);
            }}
            onPointerMove={(e) => {
              if (miniDrag.current) miniPan(e);
            }}
            onPointerUp={() => {
              miniDrag.current = false;
            }}
            onPointerCancel={() => {
              miniDrag.current = false;
            }}
          >
            <Image src={SRC} alt="" width={MINI.w} height={MINI.h} draggable={false} />
            <motion.div
              className="vr"
              style={{
                left: 0,
                top: 0,
                x: miniX,
                y: miniY,
                width: VP.w * MINI_SCALE,
                height: VP.h * MINI_SCALE,
              }}
            />
          </div>
          <div>
            <div className="mmt">
              <Icon name="eye" size={16} color="#1D4ED8" />
              You’re viewing the {side}
            </div>
            <div className="mmd">The minimap shows where you are. Drag the screen or the blue box.</div>
          </div>
        </div>
      </div>
      <div className="rc">
        <div className="rch">
          <Icon name="sparkles" size={16} color="#1D4ED8" />
          What you’re seeing
        </div>
        {SPOTS.map((spot, i) => (
          <Callout
            key={spot.title}
            spot={spot}
            index={i}
            on={inView[i]}
            onClick={() => {
              setHinted(false);
              panTo(VP.w / 2 - spot.x, VP.h / 2 - spot.y);
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** A hotspot counts as in view inside the middle 60 % of the viewport width. */
function spotInView(spot: Spot, vx: number, vy: number) {
  const sx = spot.x + vx;
  const sy = spot.y + vy;
  return sx >= VP.w * 0.2 && sx <= VP.w * 0.8 && sy >= 0 && sy <= VP.h;
}

/** Phone image size and viewport height. */
const PIMG = { w: 640, h: 400 };
const PVP_H = 240;
const PS = PIMG.w / IMG.w;
/** Card width (300) + gap (12) + left margin (8) in the phone carousel. */
const CARD_STEP = 300 + 12 + 8;

function PanPhone() {
  const reduced = useMediaQuery(REDUCED);
  const vpRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const [vpW, setVpW] = useState(358);
  const [index, setIndex] = useState(0);
  const [hinted, setHinted] = useState(true);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setVpW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const panToSpot = (i: number) => {
    const s = SPOTS[i];
    moveTo(x, clamp(vpW / 2 - s.x * PS, vpW - PIMG.w, 0), reduced);
    moveTo(y, clamp(PVP_H / 2 - s.y * PS, PVP_H - PIMG.h, 0), reduced);
  };

  const go = (i: number) => {
    const next = clamp(i, 0, SPOTS.length - 1);
    carRef.current?.scrollTo({ left: next * CARD_STEP, behavior: reduced ? "auto" : "smooth" });
    setIndex(next);
    panToSpot(next);
  };

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const next = clamp(Math.round(e.currentTarget.scrollLeft / CARD_STEP), 0, SPOTS.length - 1);
    if (next !== index) {
      setIndex(next);
      panToSpot(next);
    }
  };

  return (
    <div className="bsl-p">
      <div className="x-pvp" ref={vpRef}>
        <motion.div
          className="bsl-pan-img bsl-pan-img-p"
          style={{ x, y }}
          drag
          dragConstraints={{ left: Math.min(0, vpW - PIMG.w), right: 0, top: PVP_H - PIMG.h, bottom: 0 }}
          dragElastic={0}
          dragMomentum={!reduced}
          onDragStart={() => setHinted(false)}
        >
          <Image src={SRC} alt={ALT} width={PIMG.w} height={PIMG.h} draggable={false} sizes="640px" />
          <span
            key={index}
            className="x-hs"
            style={{ left: SPOTS[index].x * PS, top: SPOTS[index].y * PS }}
            aria-hidden="true"
          >
            {index + 1}
          </span>
        </motion.div>
        {hinted ? (
          <div className="x-swp" aria-hidden="true">
            <Icon name="hand" size={16} color="#fff" />
            Swipe to explore
          </div>
        ) : null}
      </div>
      <div className="x-car bsl-car" ref={carRef} onScroll={onScroll}>
        {SPOTS.map((spot, i) => (
          <Callout key={spot.title} spot={spot} index={i} on={i === index} className="x-cc" />
        ))}
      </div>
      <div className="x-cnav">
        <button type="button" aria-label="Previous callout" onClick={() => go(index - 1)} disabled={index === 0}>
          <Icon name="chevronLeft" size={20} color="#0F172A" />
        </button>
        <span className="x-dots" aria-hidden="true">
          {SPOTS.map((spot, i) => (
            <i key={spot.title} className={i === index ? "on" : undefined} />
          ))}
        </span>
        <button
          type="button"
          aria-label="Next callout"
          onClick={() => go(index + 1)}
          disabled={index === SPOTS.length - 1}
        >
          <Icon name="chevronRight" size={20} color="#0F172A" />
        </button>
      </div>
      <p className="bsl-sr" aria-live="polite">
        Callout {index + 1} of {SPOTS.length}: {SPOTS[index].title}
      </p>
    </div>
  );
}

/** Section 4 of the motion spec: pan the dashboard. */
export function DashboardPan() {
  return (
    <>
      <div className="x-card0 bsl-d bsl-fit-pan">
        <PanDesktop />
      </div>
      <PanPhone />
    </>
  );
}
