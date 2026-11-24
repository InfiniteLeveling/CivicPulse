"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MotionProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}

/**
 * Lightweight, accessible animation wrapper.
 * Pure CSS animations with zero runtime dependency overhead.
 * Automatically disabled when user prefers reduced motion.
 */
export function FadeIn({ children, className, delayMs = 0 }: MotionProps) {
  return (
    <div
      className={cn("animate-fade-in", className)}
      style={delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function SlideIn({ children, className, delayMs = 0 }: MotionProps) {
  return (
    <div
      className={cn("animate-slide-up", className)}
      style={delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function ScaleIn({ children, className, delayMs = 0 }: MotionProps) {
  return (
    <div
      className={cn("animate-scale-in", className)}
      style={delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function AnimatedCard({
  children,
  className,
  delayMs = 0,
}: MotionProps) {
  return (
    <div
      className={cn(
        "animate-slide-up transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
      style={delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
