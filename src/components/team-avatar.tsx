import Image from "next/image";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function TeamAvatar({
  name,
  photoUrl,
  size = 72,
}: {
  name: string;
  photoUrl: string;
  size?: number;
}) {
  if (photoUrl) {
    return (
      <span className="gm-about__avatar" style={{ width: size, height: size }}>
        <Image
          alt={name}
          height={size}
          src={photoUrl}
          style={{ objectFit: "cover" }}
          width={size}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="gm-about__avatar gm-about__avatar--placeholder"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}
