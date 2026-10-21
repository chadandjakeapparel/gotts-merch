export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      <path
        d="M24 4a20 20 0 1 0 20 20h-9a11 11 0 1 1-3.1-13.9"
        fill="none"
        stroke="#0b2545"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path d="M27 17.5h12.5L33 24.5H25.5L27 17.5Z" fill="#1d4e89" />
    </svg>
  );
}

export function LogoMark({
  logoUrl,
  brandName,
  size = 34,
}: {
  logoUrl: string;
  brandName: string;
  size?: number;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- intrinsic size of an uploaded logo mark isn't known ahead of time
      <img alt={`${brandName} mark`} className="gm-brand-mark" height={size} src={logoUrl} />
    );
  }

  return <Logo size={size} />;
}

// Splits "Gotts Merch" into ["Gotts", "Merch"] so the last word can be
// styled as the accent color, matching the brand's wordmark treatment.
function splitWordmark(brandName: string): [string, string] {
  const trimmed = brandName.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) return [trimmed, ""];
  return [trimmed.slice(0, lastSpace), trimmed.slice(lastSpace + 1)];
}

export function Wordmark({ brandName, size = 20 }: { brandName: string; size?: number }) {
  const [lead, accent] = splitWordmark(brandName);
  return (
    <span className="gm-wordmark" style={{ fontSize: size }}>
      {lead ? lead.toUpperCase() : null}
      {accent ? <span>{accent.toUpperCase()}</span> : null}
    </span>
  );
}

export function BrandMark({
  logoUrl,
  brandName,
  logoSize = 30,
  wordmarkSize = 16,
}: {
  logoUrl: string;
  brandName: string;
  logoSize?: number;
  wordmarkSize?: number;
}) {
  return (
    <>
      <LogoMark brandName={brandName} logoUrl={logoUrl} size={logoSize} />
      <Wordmark brandName={brandName} size={wordmarkSize} />
    </>
  );
}
