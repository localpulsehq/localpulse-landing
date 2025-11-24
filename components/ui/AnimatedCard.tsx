"use client";

import { ReactNode, Children, isValidElement, cloneElement } from "react";
import clsx from "clsx";

type AnimatedCardProps = {
  children: ReactNode;
  className?: string;
  delay?: number; // ms
  variant?: "fade" | "slide-up" | "scale";
  hoverTilt?: boolean;
  glass?: boolean;
  shimmer?: boolean;
};

export default function AnimatedCard({
  children,
  className,
  delay = 0,
  variant = "fade",
  hoverTilt = true,
  glass = false,
  shimmer = false,
}: AnimatedCardProps) {
  
  const animationClass = 
    variant === "slide-up"
    ? "opacity-0 translate-y-2 animate-card-slide-up"
    : variant === "scale"
    ? "opacity-0 scale-[0.97] animate-card-scale-in"
    : "opacity-0 animate-card-in";

  return (
    <div
      className={clsx(
        "rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:p-5 shadow-sm",
        "opacity-0 animate-card-in",
        "transition-transform transition-colors duration-200",
        "hover:-translate-y-0.5 hover:border-sky-500/60 hover:shadow-lg hover:shadow-sky-500/10",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {shimmer && (
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
}


/* 
 Wrap several <AnimatedCard> children and 
 automatically stagger their delays.

 Usage:
  <AnimatedCardGroup>
    <AnimatedCard> ... </AnimatedCard>
    <AnimatedCard> ... </AnimatedCard>
  </AnimatedCardGroup>
*/

type AnimatedCardGroupProps = {
  children: ReactNode;
  baseDelay?: number; // ms
  step?: number; // ms between cards
}

export function AnimatedCardGroup({
  children,
  baseDelay = 0,
  step = 80,
}: AnimatedCardGroupProps) { 
  let index = 0;

  return (
    <>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        if ((child.type as any) !== AnimatedCard) return child;

        const delay = baseDelay + index * step;
        index += 1;

        return cloneElement(child, {
          ...(child.props as any),
          delay,
        });
      })}
    </>
  );
}
