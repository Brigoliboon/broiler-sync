"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

/** Honors prefers-reduced-motion for every Framer Motion animation on the landing page. */
export function LandingMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
