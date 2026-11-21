"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { Icon } from "./icons";
import { EASE_STANDARD } from "./motion";

/** Sample data: daily average temperature (°C), flock days 6–12. */
const DAYS = [6, 7, 8, 9, 10, 11, 12];
const EXP = [25.1, 25.4, 24.8, 25.6, 25.2, 25.0, 25.4];
const CTRL = [25.9, 26.6, 26.2, 27.1, 26.4, 25.8, 26.3];
const TARGET = { min: 24, max: 26 };
const LAST = DAYS.length - 1;
const MID = 3; // Day 9

const outOfRange = (t: number) => t < TARGET.min || t > TARGET.max;
const inRangeCount = (values: number[]) => values.filter((t) => !outOfRange(t)).length;
const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

function valueText(i: number) {
  return `Day ${DAYS[i]}: Experimental ${EXP[i]} degrees, Control ${CTRL[i]} degrees`;
}

// Desktop chart geometry (832 x 280).
const W = 832;
const H = 280;
const X0 = 40;
const DX = 126;
const BASE = 248;
const dx = (i: number) => X0 + DX * i;
const dy = (t: number) => 219 - (t - 24) * 58;

function points(values: number[], x: (i: number) => number, y: (t: number) => number) {
  return values.map((t, i) => `${x(i)},${y(t)}`).join(" ");
}

function area(values: number[]) {
  return `M${dx(0)},${BASE} ${values.map((t, i) => `L${dx(i)},${dy(t)}`).join(" ")} L${dx(LAST)},${BASE} Z`;
}

function Dots({
  values,
  color,
  x,
  y,
}: {
  values: number[];
  color: string;
  x: (i: number) => number;
  y: (t: number) => number;
}) {
  return (
    <>
      {values.map((t, i) =>
        outOfRange(t) ? (
          <circle key={i} cx={x(i)} cy={y(t)} r="5" fill="#fff" stroke="#DC2626" strokeWidth="2.5" />
        ) : (
          <circle key={i} cx={x(i)} cy={y(t)} r="4" fill={color} />
        ),
      )}
    </>
  );
}

function CompareDesktop() {
  const reduced = useReducedMotion();
  const pos = useMotionValue(MID);
  const divider = useTransform(pos, (p) => dx(p));
  const rightWidth = useTransform(divider, (x) => W - x);
  const handleX = useTransform(divider, (x) => x - 22);
  const [day, setDay] = useState(MID);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const seen = useInView(cardRef, { once: true, amount: 0.5 });

  const settle = (i: number) => {
    const next = Math.max(0, Math.min(LAST, i));
    setDay(next);
    if (reduced) pos.set(next);
    else animate(pos, next, { duration: 0.15, ease: EASE_STANDARD });
  };

  const posFromPointer = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return pos.get();
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    return Math.max(0, Math.min(LAST, (x - X0) / DX));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    pos.stop();
    pos.set(posFromPointer(e.clientX));
    handleRef.current?.focus({ preventScroll: true });
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    pos.set(posFromPointer(e.clientX));
  };
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    settle(Math.round(pos.get()));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowLeft: day - 1,
      ArrowDown: day - 1,
      ArrowRight: day + 1,
      ArrowUp: day + 1,
      Home: 0,
      End: LAST,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    settle(keys[e.key]);
  };

  // The summary card for the larger side gets the blue outline.
  const expLarger = day >= MID;

  return (
    <div className="x-cgrid bsl-d">
      <div className="x-card0 bsl-fit-cmp" ref={cardRef}>
        <div className="cf">
          <div className="chd">
            <div>
              <div className="ct">Same house, two setups</div>
              <div className="cs">
                <Icon name="thermometer" size={16} color="#C2410C" />
                Temperature, last 7 days
              </div>
            </div>
            <div className="lg">
              <span className="fx">
                <Icon name="check" size={14} color="#166534" />
                In range
              </span>
              <span className="fx">
                <span className="oo" />
                Out of range
              </span>
            </div>
          </div>
          <div
            className="cw bsl-cw"
            data-dragging={dragging}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <span className="side l">
              <Icon name="flask" size={16} color="#1D4ED8" />
              Experimental
            </span>
            <span className="side r">
              <Icon name="box" size={16} color="#C2410C" />
              Control
            </span>
            <svg
              ref={svgRef}
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <clipPath id="bsl-cmp-left">
                  <motion.rect x="0" y="0" width={divider} height={H} />
                </clipPath>
                <clipPath id="bsl-cmp-right">
                  <motion.rect x={divider} y="0" width={rightWidth} height={H} />
                </clipPath>
              </defs>
              {[24, 25, 26, 27].map((t) => (
                <g key={t}>
                  <line x1={X0} x2={dx(LAST)} y1={dy(t)} y2={dy(t)} stroke="#F1F5F9" />
                  <text x="32" y={dy(t) + 4} textAnchor="end" fontSize="12" fill="#64748B">
                    {t}°
                  </text>
                </g>
              ))}
              <rect
                x={X0}
                y={dy(TARGET.max)}
                width={dx(LAST) - X0}
                height={dy(TARGET.min) - dy(TARGET.max)}
                fill="#DCFCE7"
                opacity=".6"
              />
              <text x="48" y={dy(TARGET.min) - 8} fontSize="12" fontWeight="600" fill="#166534">
                Target 24–26 °C
              </text>
              <g clipPath="url(#bsl-cmp-left)">
                <polyline points={points(CTRL, dx, dy)} fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="5 4" />
                <path d={area(EXP)} fill="#DBEAFE" opacity=".55" />
                <polyline points={points(EXP, dx, dy)} fill="none" stroke="#1D4ED8" strokeWidth="3" strokeLinejoin="round" />
                <Dots values={EXP} color="#1D4ED8" x={dx} y={dy} />
              </g>
              <g clipPath="url(#bsl-cmp-right)">
                <polyline points={points(EXP, dx, dy)} fill="none" stroke="#CBD5E1" strokeWidth="2" />
                <path d={area(CTRL)} fill="#FFEDD5" opacity=".6" />
                <polyline
                  points={points(CTRL, dx, dy)}
                  fill="none"
                  stroke="#C2410C"
                  strokeWidth="3"
                  strokeDasharray="7 4"
                  strokeLinejoin="round"
                />
                <Dots values={CTRL} color="#C2410C" x={dx} y={dy} />
              </g>
              <motion.line x1={divider} x2={divider} y1="8" y2={BASE} stroke="#0F172A" strokeWidth="2" />
              {DAYS.map((d, i) => (
                <text
                  key={d}
                  x={dx(i)}
                  y="272"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#64748B"
                  fontWeight={i === day ? 700 : 400}
                >
                  Day {d}
                </text>
              ))}
            </svg>
            <motion.div
              ref={handleRef}
              className="hdl bsl-hdl"
              style={{ x: handleX }}
              role="slider"
              tabIndex={0}
              aria-label="Compare Experimental and Control by day"
              aria-valuemin={0}
              aria-valuemax={LAST}
              aria-valuenow={day}
              aria-valuetext={valueText(day)}
              onKeyDown={onKeyDown}
            >
              <Icon name="code" size={20} color="#0F172A" />
            </motion.div>
            <motion.div className="bsl-hint-pos" style={{ x: divider }} aria-hidden="true">
              <motion.div
                className="cmphint"
                animate={seen && !reduced ? { x: [0, 8, -8, 0] } : { x: 0 }}
                transition={{ duration: 0.4, ease: EASE_STANDARD }}
              >
                <Icon name="hand" size={16} color="#fff" />
                {dragging ? "Release to settle" : "Drag to compare"}
              </motion.div>
            </motion.div>
          </div>
          <div className="stats">
            <div className={`stt2 ${expLarger ? "on" : ""}`}>
              <span className="tile" style={{ background: "#DBEAFE" }}>
                <Icon name="flask" size={18} color="#1D4ED8" />
              </span>
              <div>
                <div className="sl2">Experimental</div>
                <div className="sv">
                  {inRangeCount(EXP)} of {EXP.length} days in range · avg {avg(EXP).toFixed(1)} °C
                </div>
              </div>
            </div>
            <div className={`stt2 ${expLarger ? "" : "on"}`}>
              <span className="tile" style={{ background: "#FFEDD5" }}>
                <Icon name="box" size={18} color="#C2410C" />
              </span>
              <div>
                <div className="sl2">Control</div>
                <div className="sv">
                  {inRangeCount(CTRL)} of {CTRL.length} days in range · avg {avg(CTRL).toFixed(1)} °C
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ul className="x-look">
        <li>
          <span className="x-lt" style={{ background: "#DCFCE7" }}>
            <Icon name="target" size={18} color="#166534" />
          </span>
          <span>The green band is the target range</span>
        </li>
        <li>
          <span className="x-lt" style={{ background: "#FEE2E2" }}>
            <Icon name="alertCircle" size={18} color="#991B1B" />
          </span>
          <span>Red rings mark days out of range</span>
        </li>
        <li>
          <span className="x-lt" style={{ background: "#F1F5F9" }}>
            <Icon name="code" size={18} color="#0F172A" />
          </span>
          <span>Drag the handle or use the arrow keys</span>
        </li>
      </ul>
    </div>
  );
}

// Phone chart geometry (326 x 170).
const px = (i: number) => 32 + 47 * i;
const py = (t: number) => 125.75 - (t - 24) * 32.5;

type Tab = "exp" | "ctrl";
const TABS: { id: Tab; label: string }[] = [
  { id: "exp", label: "Experimental" },
  { id: "ctrl", label: "Control" },
];

function ComparePhone() {
  const [tab, setTab] = useState<Tab>("exp");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isExp = tab === "exp";
  const active = isExp ? EXP : CTRL;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next: Tab =
      e.key === "Home" ? "exp" : e.key === "End" ? "ctrl" : isExp ? "ctrl" : "exp";
    setTab(next);
    tabRefs.current[next === "exp" ? 0 : 1]?.focus();
  };

  return (
    <div className="x-pcmp bsl-p">
      <div className="x-tabs" role="tablist" aria-label="Compartment" onKeyDown={onKeyDown}>
        {TABS.map((t, i) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`bsl-tab-${t.id}`}
              aria-selected={selected}
              aria-controls="bsl-tabpanel"
              tabIndex={selected ? 0 : -1}
              className={selected ? "on" : undefined}
              onClick={() => setTab(t.id)}
            >
              <Icon
                name={t.id === "exp" ? "flask" : "box"}
                size={16}
                color={selected ? "#1E40AF" : "#475569"}
              />
              {t.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id="bsl-tabpanel" aria-labelledby={`bsl-tab-${tab}`}>
        <div className="x-pcs">
          <Icon name="thermometer" size={16} color="#C2410C" />
          Temperature by flock day · {isExp ? "Experimental" : "Control"}
        </div>
        <svg className="bsl-pchart" viewBox="0 0 326 170" aria-hidden="true" focusable="false">
          {[24, 26].map((t) => (
            <g key={t}>
              <line x1="32" x2="314" y1={py(t)} y2={py(t)} stroke="#F1F5F9" />
              <text x="26" y={py(t) + 4} textAnchor="end" fontSize="12" fill="#64748B">
                {t}°
              </text>
            </g>
          ))}
          <rect x="32" y={py(26)} width="282" height={py(24) - py(26)} fill="#DCFCE7" opacity=".6" />
          <g className="bsl-fade" data-on={isExp}>
            <polyline points={points(CTRL, px, py)} fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="5 4" />
            <polyline points={points(EXP, px, py)} fill="none" stroke="#1D4ED8" strokeWidth="3" strokeLinejoin="round" />
            <Dots values={EXP} color="#1D4ED8" x={px} y={py} />
          </g>
          <g className="bsl-fade" data-on={!isExp}>
            <polyline points={points(EXP, px, py)} fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="5 4" />
            <polyline
              points={points(CTRL, px, py)}
              fill="none"
              stroke="#C2410C"
              strokeWidth="3"
              strokeDasharray="7 4"
              strokeLinejoin="round"
            />
            <Dots values={CTRL} color="#C2410C" x={px} y={py} />
          </g>
          {DAYS.map((d, i) => (
            <text key={d} x={px(i)} y="164" textAnchor="middle" fontSize="12" fill="#64748B">
              {d}
            </text>
          ))}
        </svg>
        <div className="x-leg">
          <span>
            {isExp ? (
              <Icon name="check" size={14} color="#166534" />
            ) : (
              <span className="oo" aria-hidden="true" />
            )}
            {inRangeCount(active)} of {active.length} days in range
          </span>
          <span>
            <span className="x-gl" />
            {isExp ? "Control" : "Experimental"}, faded
          </span>
        </div>
      </div>
    </div>
  );
}

/** Section 3 of the motion spec: compare slider (desktop) and tabs (phone). */
export function Compare() {
  return (
    <>
      <CompareDesktop />
      <ComparePhone />
    </>
  );
}
