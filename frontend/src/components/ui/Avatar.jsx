import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";

function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Avatar({ src, name = "", size = 40, className, alt }) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  const box = { width: size, height: size };

  if (failed || !src) {
    return (
      <span
        style={box}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-[rgb(58_15_52)] text-small font-semibold text-[rgb(221_227_232)]",
          className,
        )}
        role="img"
        aria-label={alt ?? name}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? name}
      width={size}
      height={size}
      style={box}
      className={cn("inline-block shrink-0 rounded-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
