"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { EASE_STANDARD } from "./motion";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Position in a grid, for the 60 ms stagger (capped at 6 items). */
  index?: number;
  as?: "div" | "li";
};

/**
 * Reveal on enter (motion spec section 5): fade in and rise 16 px, once.
 * Under prefers-reduced-motion, landing.css forces [data-reveal] visible.
 */
export function Reveal({ children, className, index = 0, as = "div" }: RevealProps) {
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag
      data-reveal=""
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.4,
        ease: EASE_STANDARD,
        delay: Math.min(index, 5) * 0.06,
      }}
    >
      {children}
    </Tag>
  );
}
