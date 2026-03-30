"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AnimatedList({
  className,
  children,
  delay = 600,
}: {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  const childrenArray = React.Children.toArray(children);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < childrenArray.length - 1) {
      const t = setTimeout(() => setIndex((i) => i + 1), delay);
      return () => clearTimeout(t);
    }
  }, [index, delay, childrenArray.length]);

  // Reset when children change (new pipeline result)
  useEffect(() => {
    setIndex(0);
  }, [childrenArray.length]);

  const visible = useMemo(
    () => childrenArray.slice(0, index + 1),
    [index, childrenArray],
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <AnimatePresence initial={false}>
        {visible.map((child) => (
          <motion.div
            key={(child as React.ReactElement).key}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            layout
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
