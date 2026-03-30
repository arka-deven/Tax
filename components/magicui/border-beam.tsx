"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BorderBeamProps {
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
}

/**
 * Subtly pulses the border of the parent card to draw attention.
 * Parent must have `position: relative`.
 * Does NOT use backgrounds or masks — content is never obscured.
 */
export function BorderBeam({
  duration = 2.5,
  colorFrom = "#d6d3d1",
  colorTo = "#78716c",
  className,
}: BorderBeamProps) {
  return (
    <motion.div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        className,
      )}
      animate={{
        boxShadow: [
          `0 0 0 1px ${colorFrom}`,
          `0 0 0 1.5px ${colorTo}`,
          `0 0 0 1px ${colorFrom}`,
        ],
      }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
