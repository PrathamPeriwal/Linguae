export function formatShortTime(value) {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const sameDay = date.toDateString() === new Date().toDateString();
  if (sameDay) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

const RELATIVE_STEPS = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.34524, "week"],
  [12, "month"],
  [Number.POSITIVE_INFINITY, "year"],
];

export function formatRelativeTime(value, now = Date.now()) {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  const then = date.getTime();
  if (Number.isNaN(then)) return "";

  const elapsed = then - now;
  if (Math.abs(elapsed) < 45_000) return "just now";

  let duration = elapsed / 1000;
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [amount, unit] of RELATIVE_STEPS) {
    if (Math.abs(duration) < amount) {
      return formatter.format(Math.round(duration), unit);
    }
    duration /= amount;
  }
  return "";
}
