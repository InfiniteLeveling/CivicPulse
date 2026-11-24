"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MotionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delayMs?: number;
}

/**
 * Lightweight, accessible fade-in transition container.
 * Automatically respects prefers-reduced-motion.
 */
export function FadeIn({ children, className, delayMs = 0, style, ...props }: MotionProps) {
  return (
    <div
      className={cn("animate-cp-fade-in", className)}
      style={{
        animationDelay: delayMs > 0 ? `${delayMs}ms` : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Smooth upward slide entrance with spring easing.
 */
export function SlideUp({ children, className, delayMs = 0, style, ...props }: MotionProps) {
  return (
    <div
      className={cn("animate-cp-slide-up", className)}
      style={{
        animationDelay: delayMs > 0 ? `${delayMs}ms` : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Soft scale-in transition for modals, cards, and feedback elements.
 */
export function ScaleIn({ children, className, delayMs = 0, style, ...props }: MotionProps) {
  return (
    <div
      className={cn("animate-cp-scale-in", className)}
      style={{
        animationDelay: delayMs > 0 ? `${delayMs}ms` : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Animated SVG checkmark for confirmed submissions and verified community actions.
 */
export function SuccessCheckmark({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 p-3", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 6L9 17L4 12" className="animate-cp-draw-check" />
      </svg>
    </div>
  );
}
