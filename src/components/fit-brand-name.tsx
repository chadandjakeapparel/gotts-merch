"use client";

import { useLayoutEffect, useRef, useState } from "react";

const MAX_FONT_REM = 1.15;
const MIN_FONT_REM = 0.75;
const STEP_REM = 0.05;

// Shrinks the brand name's font size, in small steps, until it fits on a
// single line within its card — so a longer name never wraps while shorter
// ones keep the full default size.
export function FitBrandName({ name }: { name: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [fontSize, setFontSize] = useState(MAX_FONT_REM);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    function fit() {
      if (!el) return;
      let size = MAX_FONT_REM;
      el.style.fontSize = `${size}rem`;
      while (el.scrollWidth > el.clientWidth && size > MIN_FONT_REM) {
        size = Math.max(MIN_FONT_REM, size - STEP_REM);
        el.style.fontSize = `${size}rem`;
      }
      setFontSize(size);
    }

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [name]);

  return (
    <h3 className="gm-brands__name" ref={ref} style={{ fontSize: `${fontSize}rem` }}>
      {name}
    </h3>
  );
}
