export type LocationLike = Pick<Location, "pathname" | "search" | "hash">;

export type AppRoute =
  | { mode: "editor" }
  | { mode: "shared-resume"; slug: string };

export function resolveAppRoute(location: LocationLike): AppRoute {
  throw new Error('not implemented')
}
