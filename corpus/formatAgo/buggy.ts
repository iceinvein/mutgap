export function formatAgo(unixS: number | null | undefined, nowS?: number): string {
  if (unixS == null) return "–";
  const now = nowS ?? Math.floor(Date.now() / 1000);
  const d = Math.max(0, now - unixS);
  if (d <= 5) return "just now";
  if (d < 60) return `${d}s ago`;
  const m = Math.floor(d / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
