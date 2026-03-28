"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 800,
    damping: 40,
    mass: 0.1,
  });

  // ページ遷移時に即座に 0 にリセット
  useEffect(() => {
    scaleX.set(0);
  }, [pathname, scaleX]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 origin-left bg-gradient-to-r from-primary/55 via-primary to-cyan-300/80"
      style={{ scaleX: reduceMotion ? scrollYProgress : scaleX }}
    />
  );
}
