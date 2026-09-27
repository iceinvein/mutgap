export function safeFilename(raw: string, extension: string): string {
  const base = raw
    .trim()
    .replace(/[\\/:*?"<>|]/g, "") // forbidden path chars across OSes
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  const safe = base.length > 0 ? base : "resume";
  const ext = `.${extension}`;
  return `${safe}${ext}`;
}
