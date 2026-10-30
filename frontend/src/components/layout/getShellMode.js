export function shellSegment(pathname) {
  return pathname.split("/").filter(Boolean)[0] ?? "";
}

export function getShellMode(pathname) {
  const segment = shellSegment(pathname);

  if (segment === "chat") return { panel: true, tabBar: false };
  if (segment === "call") return { panel: false, tabBar: false };
  if (segment === "notifications") return { panel: false, tabBar: true };
  if (segment === "chats") return { panel: false, tabBar: true };
  return { panel: true, tabBar: true };
}
