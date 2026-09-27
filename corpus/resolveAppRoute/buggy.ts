export type LocationLike = Pick<Location, "pathname" | "search" | "hash">;

export type AppRoute =
  | { mode: "editor" }
  | { mode: "shared-resume"; slug: string };

function normalizeResumeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.mdx$/i, "")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readHashSlug(hash: string): string | null {
  const normalized = hash.trim().replace(/^#/, "").replace(/^\/+|\/+$/g, "");
  if (!normalized) return null;

  const segments = normalized.split("/").map(normalizeResumeSlug).filter(Boolean);
  if (segments.length === 0) return null;
  if (segments.length === 1) return segments[0] ?? null;
  if (segments[0] === "resume") return segments[1] ?? null;
  return null;
}

function readPathSlug(pathname: string): string | null {
  const segments = pathname
    .trim()
    .split("/")
    .map(normalizeResumeSlug)
    .filter(Boolean);
  if (segments.length === 0) return null;

  const last = segments.at(-1);
  const beforeLast = segments.at(-2);
  if (last === "resume") return "resume";
  if (beforeLast === "resume") return last ?? null;
  return null;
}

function readQuerySlug(search: string): string | null {
  const value = new URLSearchParams(search).get("resume");
  if (!value) return null;
  const normalized = normalizeResumeSlug(value);
  if (!normalized || normalized === "1" || normalized === "true" || normalized === "shared") {
    return "resume";
  }
  return normalized;
}

export function resolveAppRoute(location: LocationLike): AppRoute {
  const hashSlug = readHashSlug(location.hash);
  if (hashSlug) return { mode: "shared-resume", slug: hashSlug };

  const slug = readQuerySlug(location.search) ?? readPathSlug(location.pathname);
  if (slug) return { mode: "shared-resume", slug };
  return { mode: "editor" };
}
