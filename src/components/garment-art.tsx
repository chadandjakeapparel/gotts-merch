import type { DesignProduct } from "@/lib/design-constants";

const TEE_OUTLINE =
  "M140,90 L260,90 L300,130 L340,180 L300,210 L280,190 L280,440 L260,460 L140,460 L120,440 L120,190 L100,210 L60,180 L100,130 Z";
const COLLAR = "M165,95 Q200,150 235,95";

function shade(hex: string, amount: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 0xff) + amount);
  const g = clamp(((n >> 8) & 0xff) + amount);
  const b = clamp((n & 0xff) + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

/** A simple placeholder garment outline, in the product's base color, standing in until real photos are provided. */
export function GarmentArt({ product }: { product: DesignProduct }) {
  const base = product === "black-tee" ? "#1b1b1b" : product === "white-hoodie" ? "#f5f5f3" : "#9aa0a8";
  const stroke = shade(base, product === "white-hoodie" ? -40 : -30);
  const accent = shade(base, product === "white-hoodie" ? -25 : 20);

  return (
    <svg aria-hidden="true" height="100%" viewBox="0 0 400 480" width="100%" xmlns="http://www.w3.org/2000/svg">
      <path d={TEE_OUTLINE} fill={base} stroke={stroke} strokeLinejoin="round" strokeWidth={4} />
      <path d={COLLAR} fill="none" stroke={stroke} strokeLinecap="round" strokeWidth={4} />

      {product === "white-hoodie" ? (
        <>
          <path d="M150,95 Q200,15 250,95" fill={base} stroke={stroke} strokeLinejoin="round" strokeWidth={4} />
          <line stroke={stroke} strokeLinecap="round" strokeWidth={4} x1="183" x2="178" y1="98" y2="140" />
          <line stroke={stroke} strokeLinecap="round" strokeWidth={4} x1="217" x2="222" y1="98" y2="140" />
          <circle cx="178" cy="142" fill={stroke} r="4" />
          <circle cx="222" cy="142" fill={stroke} r="4" />
          <rect fill="none" height="60" rx="10" stroke={stroke} strokeWidth={3} width="110" x="145" y="330" />
        </>
      ) : null}

      {product === "grey-crewneck" ? (
        <>
          <path d="M160,96 Q200,128 240,96" fill="none" stroke={accent} strokeLinecap="round" strokeWidth={8} />
          <rect fill={accent} height="10" rx="4" width="150" x="125" y="448" />
          <rect fill={accent} height="26" rx="4" width="16" x="66" y="156" />
          <rect fill={accent} height="26" rx="4" width="16" x="318" y="156" />
        </>
      ) : null}
    </svg>
  );
}
