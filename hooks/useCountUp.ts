"use client";

import { useEffect, useRef, useState } from "react";

export function useCountUp(value: number, duration = 600) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  const targetRef = useRef(value);

  useEffect(() => {
    fromRef.current = display;
    targetRef.current = value;
    startRef.current = null;

    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      const next =
        fromRef.current +
        (targetRef.current - fromRef.current) * eased;

      setDisplay(next);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}
