const RESET_TIME_PAST_GRACE_MS = 15 * 60_000;

function toIsoLocalDateTime(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function parseResetAt(resetText: string | undefined, fetchedAt: string): string | undefined {
  if (!resetText) {
    return undefined;
  }

  const normalized = resetText
    .replace(/^Resets\s+/i, "")
    .replace(/\s*\([^)]+\)\s*$/i, "")
    .trim();
  const fetchedDate = new Date(fetchedAt);

  const durationText = normalized.replace(/^in\s+/i, "");
  const compactMatch = durationText.match(/^(?:(\d+)h)?(?:(\d+)m)?$/i);
  const verboseMatch = !compactMatch?.[1] && !compactMatch?.[2]
    ? durationText.match(/^(?:(\d+)\s*(?:hr|hours?)\s*)?(?:(\d+)\s*(?:min|minutes?)\s*)?$/i)
    : null;
  const durationMatch = (compactMatch?.[1] || compactMatch?.[2]) ? compactMatch : verboseMatch;
  if (durationMatch && (durationMatch[1] || durationMatch[2])) {
    const hours = durationMatch[1] ? Number.parseInt(durationMatch[1], 10) : 0;
    const minutes = durationMatch[2] ? Number.parseInt(durationMatch[2], 10) : 0;
    const candidate = new Date(fetchedDate.getTime() + (hours * 60 + minutes) * 60_000);
    return toIsoLocalDateTime(candidate);
  }

  const monthDayMatch = normalized.match(/^([A-Za-z]{3})\s+(\d{1,2})\s+at\s+(.+)$/i);
  if (monthDayMatch) {
    const timeStr = monthDayMatch[3]!
      .replace(/^(\d{1,2})(am|pm)$/i, "$1:00 $2")
      .replace(/^(\d{1,2}:\d{2})(am|pm)$/i, "$1 $2");
    const candidate = new Date(`${monthDayMatch[1]} ${monthDayMatch[2]} ${fetchedDate.getFullYear()} ${timeStr}`);
    if (!Number.isNaN(candidate.getTime())) {
      return toIsoLocalDateTime(candidate);
    }
  }

  const timeOnlyMatch = normalized.match(/^(.+)$/);
  if (timeOnlyMatch) {
    const candidate = new Date(fetchedDate);
    const [hourValue, minuteValue, meridiemValue] = normalized
      .replace(/\s+/g, "")
      .match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/i)
      ?.slice(1) ?? [];

    if (hourValue && meridiemValue) {
      let hours = Number.parseInt(hourValue, 10);
      if (meridiemValue.toLowerCase() === "pm") {
        hours += 12;
      }
      candidate.setHours(hours, minuteValue ? Number.parseInt(minuteValue, 10) : 0, 0, 0);
      if (candidate.getTime() < fetchedDate.getTime() - RESET_TIME_PAST_GRACE_MS) {
        candidate.setDate(candidate.getDate() + 1);
      }
      return toIsoLocalDateTime(candidate);
    }
  }

  return undefined;
}
