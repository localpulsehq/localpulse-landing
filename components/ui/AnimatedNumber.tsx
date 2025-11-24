"use client";

import { useEffect, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  locale?: string;
  currency?: string; 
};

export function AnimatedNumber({
  value,
  className,
  prefix = "",
  suffix = "",
  locale = "en-AU",
  currency = "AUD",
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 600; // ms
    const startValue = display
    let frame: number;


    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const current = startValue + (value - startValue) * t 
      setDisplay(current);

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(display)

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
