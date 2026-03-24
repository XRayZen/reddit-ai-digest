"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
  delay = 0,
  offset = 24,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  offset?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, {
    once: true,
    margin: "-10% 0px",
  });
  const reduceMotion = useReducedMotion();
  // observer がまだ動いていない初期表示でも内容は見せ、演出は in-view 判定後に限定する。
  const revealAnimation =
    reduceMotion || !isInView
      ? undefined
      : {
          opacity: 1,
          y: 0,
        };

  return (
    <motion.div
      ref={containerRef}
      className={cn(className)}
      initial={false}
      animate={revealAnimation}
      transition={{
        duration: reduceMotion ? 0.01 : 0.45,
        ease: "easeOut",
        delay,
      }}
      style={
        isInView || reduceMotion
          ? undefined
          : {
              transform: `translateY(${offset}px)`,
            }
      }
    >
      {children}
    </motion.div>
  );
}
