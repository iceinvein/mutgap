import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

function makeEvent(overrides: Partial<UsageEvent> & { project: string }): UsageEvent {
  return {
    source: "claude-code",
    sessionId: "session",
    filePath: "/tmp/file",
    eventKey: "key",
    timestamp: "2024-01-01T00:00:00Z",
    model: "model",
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

describe("summarizeProjects", () => {
  it("returns an empty array for no events", () => {
    expect(summarizeProjects([])).toEqual([]);
  });

  it("aggregates events, cost and tokens for a single project", () => {
    const events = [
      makeEvent({ project: "myproject", estimatedCostUsd: 1, inputTokens: 10, outputTokens: 20 }),
      makeEvent({ project: "myproject", estimatedCostUsd: 2, inputTokens: 30, outputTokens: 40 }),
    ];

    const result = summarizeProjects(events);

    expect(result).toEqual([
      {
        project: "myproject",
        displayProject: "myproject",
        rawProjects: ["myproject"],
        events: 2,
        estimatedCostUsd: 3,
        totalInputTokens: 40,
        totalOutputTokens: 60,
      },
    ]);
  });

  it("keeps an identifier with no leading / or - unchanged", () => {
    const result = summarizeProjects([makeEvent({ project: "myproject" })]);
    expect(result[0].displayProject).toBe("myproject");
  });

  describe("path identifiers (starting with /)", () => {
    it("collapses a repeated final pair to a single segment", () => {
      const result = summarizeProjects([makeEvent({ project: "/h/code/api/api" })]);
      expect(result[0].displayProject).toBe("api");
    });

    it("joins the tail after the marker with / when not a repeated pair", () => {
      const result = summarizeProjects([makeEvent({ project: "/h/code/acme/web" })]);
      expect(result[0].displayProject).toBe("acme/web");
    });

    it("prefers an earlier marker in priority order over a later-occurring one", () => {
      const result = summarizeProjects([makeEvent({ project: "/h/workspace/a/src/b" })]);
      expect(result[0].displayProject).toBe("a/src/b");
    });

    it("uses the marker's last occurrence", () => {
      const result = summarizeProjects([makeEvent({ project: "/a/src/b/src/c" })]);
      expect(result[0].displayProject).toBe("c");
    });

    it("does not count a marker that is the final segment", () => {
      const result = summarizeProjects([makeEvent({ project: "/a/src" })]);
      expect(result[0].displayProject).toBe("a/src");
    });

    it("falls back to the last two segments joined with / when no marker counts", () => {
      const result = summarizeProjects([makeEvent({ project: "/foo/bar/baz" })]);
      expect(result[0].displayProject).toBe("bar/baz");
    });

    it("falls back to the raw identifier when the fallback segments are empty", () => {
      const result = summarizeProjects([makeEvent({ project: "/" })]);
      expect(result[0].displayProject).toBe("/");
    });
  });

  describe("dash identifiers (starting with -)", () => {
    it("joins the tail after the marker with -", () => {
      const result = summarizeProjects([makeEvent({ project: "-h-projects-my-app" })]);
      expect(result[0].displayProject).toBe("my-app");
    });

    it("collapses a repeated final pair (exactly two pieces) to a single segment", () => {
      const result = summarizeProjects([makeEvent({ project: "-x-workspace-app-app" })]);
      expect(result[0].displayProject).toBe("app");
    });

    it("does not count a marker that is the final segment", () => {
      const result = summarizeProjects([makeEvent({ project: "-a-b-src" })]);
      expect(result[0].displayProject).toBe("a-b-src");
    });

    it("joins all pieces with - when there is no counting marker", () => {
      const result = summarizeProjects([makeEvent({ project: "-foo-bar-baz" })]);
      expect(result[0].displayProject).toBe("foo-bar-baz");
    });

    it("collapses to a single piece when exactly two identical pieces remain with no marker", () => {
      const result = summarizeProjects([makeEvent({ project: "-foo-foo" })]);
      expect(result[0].displayProject).toBe("foo");
    });

    it("keeps the identifier as-is when nothing is left after splitting", () => {
      const result = summarizeProjects([makeEvent({ project: "-" })]);
      expect(result[0].displayProject).toBe("-");
    });
  });

  describe("merging raw identifiers", () => {
    it("merges raw identifiers that normalize to the same display name", () => {
      const events = [
        makeEvent({ project: "/h/code/acme/web", estimatedCostUsd: 1, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "/other/code/acme/web", estimatedCostUsd: 2, inputTokens: 2, outputTokens: 2 }),
      ];

      const result = summarizeProjects(events);

      expect(result).toHaveLength(1);
      expect(result[0].displayProject).toBe("acme/web");
      expect(result[0].rawProjects).toEqual(["/h/code/acme/web", "/other/code/acme/web"]);
      expect(result[0].events).toBe(2);
      expect(result[0].estimatedCostUsd).toBe(3);
      expect(result[0].totalInputTokens).toBe(3);
      expect(result[0].totalOutputTokens).toBe(3);
    });

    it("sorts rawProjects ascending but sets project to the raw id that appeared first in input", () => {
      const events = [
        makeEvent({ project: "/z/code/acme/web" }),
        makeEvent({ project: "/a/code/acme/web" }),
      ];

      const result = summarizeProjects(events);

      expect(result[0].rawProjects).toEqual(["/a/code/acme/web", "/z/code/acme/web"]);
      expect(result[0].project).toBe("/z/code/acme/web");
    });
  });

  describe("ordering", () => {
    it("orders summaries by total cost descending", () => {
      const events = [
        makeEvent({ project: "cheap", estimatedCostUsd: 1 }),
        makeEvent({ project: "expensive", estimatedCostUsd: 5 }),
      ];

      const result = summarizeProjects(events);

      expect(result.map((s) => s.displayProject)).toEqual(["expensive", "cheap"]);
    });

    it("breaks cost ties by event count descending", () => {
      const events = [
        makeEvent({ project: "fewer-events", estimatedCostUsd: 1 }),
        makeEvent({ project: "more-events", estimatedCostUsd: 1 }),
        makeEvent({ project: "more-events", estimatedCostUsd: 0 }),
      ];

      const result = summarizeProjects(events);

      expect(result.map((s) => s.displayProject)).toEqual(["more-events", "fewer-events"]);
    });

    it("breaks remaining ties by displayProject ascending localeCompare", () => {
      const events = [
        makeEvent({ project: "beta", estimatedCostUsd: 1 }),
        makeEvent({ project: "alpha", estimatedCostUsd: 1 }),
      ];

      const result = summarizeProjects(events);

      expect(result.map((s) => s.displayProject)).toEqual(["alpha", "beta"]);
    });
  });
});
