export function chatChannelId(a, b) {
  return [String(a), String(b)].sort().join("-");
}

export function chatUserIdFromRoute(routeId, myId) {
  if (routeId == null) return "";
  const raw = String(routeId);
  if (myId == null || myId === "") return raw;
  const mine = String(myId);
  const parts = raw.split("-");
  if (parts.length === 2 && parts.every(Boolean) && (parts[0] === mine || parts[1] === mine)) {
    return parts[0] === mine ? parts[1] : parts[0];
  }
  return raw;
}
