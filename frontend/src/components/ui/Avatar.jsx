import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";

function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function accessibleName(alt, name) {
  if (alt === "") return "";
  const value = (typeof alt === "string" ? alt : name).trim();
  return value || "Profile";
}

export function Avatar({ src, name = "", size = 40, className, alt }) {
  const [failed, setFailed] = useState(!src);
  const label = accessibleName(alt, name);
  const decorative = label === "";

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  const box = { width: size, height: size };

  if (failed || !src) {
    return (
      <span
        style={box}
        className={cn(
          "avatar-fallback inline-flex shrink-0 items-center justify-center rounded-full text-small font-semibold",
          className,
        )}
        role={decorative ? undefined : "img"}
        aria-hidden={decorative ? true : undefined}
        aria-label={decorative ? undefined : label}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={label}
      width={size}
      height={size}
      style={box}
      className={cn("inline-block shrink-0 rounded-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
