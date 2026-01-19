"use client";

import { useEffect, useMemo, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;

  // formatting
  locale?: string;

  // set to "currency" to show $; default "number" for counts
  format?: "number" | "currency" | "percent";
  currency?: string;

  // number formatting controls
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;

  // optional: avoid commas for tiny KPIs if you want
  useGrouping?: boolean;
};

export function AnimatedNumber({
  value,
  className,
  prefix = "",
  suffix = "",
  locale = "en-AU",
  format = "currency",
  currency = "AUD",
  minimumFractionDigits,
  maximumFractionDigits,
  useGrouping = true,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 600;
    const startValue = display;
    let frame: number;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const current = startValue + (value - startValue) * t;
      setDisplay(current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const formatted = useMemo(() => {
    // default digits:
    const minFD =
      minimumFractionDigits ??
      (format === "currency" ? 0 : format === "percent" ? 0 : 0);

    const maxFD =
      maximumFractionDigits ??
      (format === "currency" ? 0 : format === "percent" ? 0 : 0);

    const nf = new Intl.NumberFormat(locale, {
      style: format === "currency" ? "currency" : format === "percent" ? "percent" : "decimal",
      currency: format === "currency" ? currency : undefined,
      minimumFractionDigits: minFD,
      maximumFractionDigits: maxFD,
      useGrouping,
    });

    // percent expects 0–1
    const v = format === "percent" ? display : display;
    return nf.format(v);
  }, [currency, display, format, locale, maximumFractionDigits, minimumFractionDigits, useGrouping]);

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
