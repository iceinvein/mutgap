import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

function makeEvent(overrides: Partial<UsageEvent> = {}): UsageEvent {
  return {
    source: "claude-code",
    project: "my-project",
    sessionId: "session-1",
    filePath: "/tmp/session-1.jsonl",
    eventKey: "event-1",
    timestamp: "2026-01-01T00:00:00.000Z",
    model: "claude-sonnet-5",
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    webSearchRequests: 0,
    totalTokens: 0,
    tokenBreakdownKnown: true,
    speed: "standard",
    estimatedCostUsd: 0,
    ...overrides,
  };
}

function displayNameOf(project: string): string {
  const [summary] = summarizeProjects([makeEvent({ project })]);
  return summary.displayProject;
}

describe("summarizeProjects", () => {
  describe("aggregation", () => {
    it("returns an empty array for no events", () => {
      expect(summarizeProjects([])).toEqual([]);
    });

    it("summarizes a single event", () => {
      const result = summarizeProjects([
        makeEvent({ project: "alpha", inputTokens: 10, outputTokens: 20, estimatedCostUsd: 1.5 }),
      ]);

      expect(result).toEqual([
        {
          project: "alpha",
          displayProject: "alpha",
          rawProjects: ["alpha"],
          events: 1,
          estimatedCostUsd: 1.5,
          totalInputTokens: 10,
          totalOutputTokens: 20,
        },
      ]);
    });

    it("sums events, cost, and input/output tokens per project", () => {
      const result = summarizeProjects([
        makeEvent({ project: "alpha", inputTokens: 10, outputTokens: 1, estimatedCostUsd: 0.25 }),
        makeEvent({ project: "alpha", inputTokens: 5, outputTokens: 2, estimatedCostUsd: 0.5 }),
        makeEvent({ project: "alpha", inputTokens: 1, outputTokens: 3, estimatedCostUsd: 1 }),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        events: 3,
        estimatedCostUsd: 1.75,
        totalInputTokens: 16,
        totalOutputTokens: 6,
      });
    });

    it("does not include cache, web search, or total tokens in the token sums", () => {
      const [summary] = summarizeProjects([
        makeEvent({
          inputTokens: 1,
          outputTokens: 2,
          cacheWriteTokens: 100,
          cacheReadTokens: 200,
          webSearchRequests: 300,
          totalTokens: 400,
        }),
      ]);

      expect(summary.totalInputTokens).toBe(1);
      expect(summary.totalOutputTokens).toBe(2);
    });

    it("keeps distinct projects separate", () => {
      const result = summarizeProjects([
        makeEvent({ project: "alpha", inputTokens: 1, estimatedCostUsd: 2 }),
        makeEvent({ project: "beta", inputTokens: 7, estimatedCostUsd: 1 }),
        makeEvent({ project: "alpha", inputTokens: 3, estimatedCostUsd: 2 }),
      ]);

      expect(result).toEqual([
        {
          project: "alpha",
          displayProject: "alpha",
          rawProjects: ["alpha"],
          events: 2,
          estimatedCostUsd: 4,
          totalInputTokens: 4,
          totalOutputTokens: 0,
        },
        {
          project: "beta",
          displayProject: "beta",
          rawProjects: ["beta"],
          events: 1,
          estimatedCostUsd: 1,
          totalInputTokens: 7,
          totalOutputTokens: 0,
        },
      ]);
    });
  });

  describe("grouping by normalized name", () => {
    it("merges raw projects that normalize to the same display name", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/Users/me/code/app", inputTokens: 1, outputTokens: 10, estimatedCostUsd: 1 }),
        makeEvent({ project: "-Users-me-code-app", inputTokens: 2, outputTokens: 20, estimatedCostUsd: 2 }),
        makeEvent({ project: "/Users/me/code/app", inputTokens: 4, outputTokens: 40, estimatedCostUsd: 4 }),
      ]);

      expect(result).toEqual([
        {
          project: "/Users/me/code/app",
          displayProject: "app",
          rawProjects: ["-Users-me-code-app", "/Users/me/code/app"],
          events: 3,
          estimatedCostUsd: 7,
          totalInputTokens: 7,
          totalOutputTokens: 70,
        },
      ]);
    });

    it("uses the first-seen raw project as `project`, even though rawProjects is sorted", () => {
      const [summary] = summarizeProjects([
        makeEvent({ project: "/work/code/app" }),
        makeEvent({ project: "/home/code/app" }),
        makeEvent({ project: "-home-code-app" }),
      ]);

      expect(summary.project).toBe("/work/code/app");
      expect(summary.rawProjects).toEqual(["-home-code-app", "/home/code/app", "/work/code/app"]);
    });

    it("lists each raw project once regardless of how many events it has", () => {
      const [summary] = summarizeProjects([
        makeEvent({ project: "/a/code/app" }),
        makeEvent({ project: "/a/code/app" }),
        makeEvent({ project: "/b/code/app" }),
      ]);

      expect(summary.rawProjects).toEqual(["/a/code/app", "/b/code/app"]);
      expect(summary.events).toBe(3);
    });
  });

  describe("sorting", () => {
    it("sorts by estimated cost descending", () => {
      const result = summarizeProjects([
        makeEvent({ project: "cheap", estimatedCostUsd: 1 }),
        makeEvent({ project: "pricey", estimatedCostUsd: 10 }),
        makeEvent({ project: "middle", estimatedCostUsd: 5 }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["pricey", "middle", "cheap"]);
    });

    it("breaks cost ties by event count descending", () => {
      const result = summarizeProjects([
        makeEvent({ project: "few", estimatedCostUsd: 2 }),
        makeEvent({ project: "many", estimatedCostUsd: 1 }),
        makeEvent({ project: "many", estimatedCostUsd: 1 }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["many", "few"]);
    });

    it("breaks cost and event ties by display name in reverse alphabetical order", () => {
      const result = summarizeProjects([
        makeEvent({ project: "beta" }),
        makeEvent({ project: "alpha" }),
        makeEvent({ project: "gamma" }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["gamma", "beta", "alpha"]);
    });

    it("sorts on the grouped totals, not individual raw projects", () => {
      const result = summarizeProjects([
        makeEvent({ project: "solo", estimatedCostUsd: 3 }),
        makeEvent({ project: "/x/code/app", estimatedCostUsd: 2 }),
        makeEvent({ project: "-x-code-app", estimatedCostUsd: 2 }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["app", "solo"]);
    });
  });

  describe("display name normalization", () => {
    it.each([
      ["my-project", "my-project"],
      ["my-code-app", "my-code-app"],
      ["", ""],
    ])("leaves plain name %j unchanged", (raw, expected) => {
      expect(displayNameOf(raw)).toBe(expected);
    });

    describe("absolute paths", () => {
      it.each([
        ["/home/me/workspace/app", "app"],
        ["/home/me/src/app", "app"],
        ["/home/me/projects/app", "app"],
        ["/home/me/repos/app", "app"],
        ["/home/me/code/app", "app"],
      ])("uses the segments after a marker directory: %s", (raw, expected) => {
        expect(displayNameOf(raw)).toBe(expected);
      });

      it("joins multiple segments after the marker with a slash", () => {
        expect(displayNameOf("/home/me/code/org/repo")).toBe("org/repo");
      });

      it("collapses a trailing duplicated segment", () => {
        expect(displayNameOf("/home/me/code/app/app")).toBe("app");
        expect(displayNameOf("/home/me/code/org/app/app")).toBe("app");
      });

      it("does not collapse duplicates that are not the last two segments", () => {
        expect(displayNameOf("/home/me/code/app/app/lib")).toBe("app/app/lib");
      });

      it("handles a marker as the first segment", () => {
        expect(displayNameOf("/code/app")).toBe("app");
      });

      it("uses the last occurrence of a marker", () => {
        expect(displayNameOf("/home/code/old/code/app")).toBe("app");
      });

      it("checks markers in priority order rather than by position", () => {
        // "workspace" is checked before "code", even though "code" appears later.
        expect(displayNameOf("/home/workspace/team/code/app")).toBe("team/code/app");
        // "src" is checked before "code".
        expect(displayNameOf("/home/src/code/app")).toBe("code/app");
      });

      it("ignores a marker that is the final segment", () => {
        expect(displayNameOf("/home/me/code")).toBe("me/code");
      });

      it("falls back to the last two segments when there is no marker", () => {
        expect(displayNameOf("/home/me/stuff/app")).toBe("stuff/app");
      });

      it("returns a single segment when that is all there is", () => {
        expect(displayNameOf("/app")).toBe("app");
      });

      it("ignores empty segments from repeated or trailing slashes", () => {
        expect(displayNameOf("/home//me/code//app/")).toBe("app");
      });

      it("returns the root path unchanged", () => {
        expect(displayNameOf("/")).toBe("/");
      });
    });

    describe("dash-encoded paths", () => {
      it.each([
        ["-home-me-workspace-app", "app"],
        ["-home-me-src-app", "app"],
        ["-home-me-projects-app", "app"],
        ["-home-me-repos-app", "app"],
        ["-home-me-code-app", "app"],
      ])("uses the segments after a marker: %s", (raw, expected) => {
        expect(displayNameOf(raw)).toBe(expected);
      });

      it("joins multiple segments after the marker with a dash", () => {
        expect(displayNameOf("-home-me-code-my-app")).toBe("my-app");
      });

      it("collapses exactly two duplicated segments after the marker", () => {
        expect(displayNameOf("-home-me-code-app-app")).toBe("app");
      });

      it("does not collapse duplicates when more than two segments follow the marker", () => {
        expect(displayNameOf("-home-me-code-org-app-app")).toBe("org-app-app");
      });

      it("handles a marker as the first segment", () => {
        expect(displayNameOf("-code-app")).toBe("app");
      });

      it("uses the last occurrence of a marker", () => {
        expect(displayNameOf("-home-code-old-code-app")).toBe("app");
      });

      it("checks markers in priority order rather than by position", () => {
        expect(displayNameOf("-home-src-code-app")).toBe("code-app");
      });

      it("ignores a marker that is the final segment", () => {
        expect(displayNameOf("-home-me-code")).toBe("home-me-code");
      });

      it("strips the leading dash when there is no marker", () => {
        expect(displayNameOf("-home-me-app")).toBe("home-me-app");
      });

      it("collapses exactly two duplicated segments when there is no marker", () => {
        expect(displayNameOf("-app-app")).toBe("app");
        expect(displayNameOf("-app-app-app")).toBe("app-app-app");
      });

      it("ignores empty segments from repeated dashes", () => {
        expect(displayNameOf("--app--app")).toBe("app");
        expect(displayNameOf("-home--code--my-app")).toBe("my-app");
      });

      it("returns an all-dash name unchanged", () => {
        expect(displayNameOf("-")).toBe("-");
        expect(displayNameOf("---")).toBe("---");
      });
    });
  });
});
