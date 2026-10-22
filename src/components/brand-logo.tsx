import Image from "next/image";

export function BrandLogo({ name, logoUrl }: { name: string; logoUrl: string }) {
  if (logoUrl) {
    return (
      <span className="gm-brands__logo">
        <Image alt={name} fill src={logoUrl} style={{ objectFit: "contain" }} />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="gm-brands__logo gm-brands__logo--placeholder">
      {name}
    </span>
  );
}
