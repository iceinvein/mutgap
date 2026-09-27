import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

function makeEvent(overrides: Partial<UsageEvent> & { project: string }): UsageEvent {
  return {
    source: "claude-code",
    sessionId: "session-1",
    filePath: "/tmp/session.jsonl",
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

describe("summarizeProjects", () => {
  it("returns an empty array for empty input", () => {
    expect(summarizeProjects([])).toEqual([]);
  });

  it("aggregates events, tokens and cost for a single project", () => {
    const events = [
      makeEvent({ project: "acme", estimatedCostUsd: 1.5, inputTokens: 100, outputTokens: 10 }),
      makeEvent({ project: "acme", estimatedCostUsd: 2.5, inputTokens: 200, outputTokens: 20 }),
    ];

    const result = summarizeProjects(events);

    expect(result).toEqual([
      {
        project: "acme",
        displayProject: "acme",
        rawProjects: ["acme"],
        events: 2,
        estimatedCostUsd: 4,
        totalInputTokens: 300,
        totalOutputTokens: 30,
      },
    ]);
  });

  describe("literal identifiers (no leading / or -)", () => {
    it("keeps a plain identifier as-is", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "acme" })]);
      expect(summary.displayProject).toBe("acme");
      expect(summary.rawProjects).toEqual(["acme"]);
    });
  });

  describe("path identifiers (leading /)", () => {
    it("uses the first counting marker in priority order and joins segments after it with /", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/h/code/acme/web" })]);
      expect(summary.displayProject).toBe("acme/web");
    });

    it("collapses a repeated final pair to one segment", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/h/code/api/api" })]);
      expect(summary.displayProject).toBe("api");
    });

    it("prefers workspace over src, projects, repos, code when multiple markers are present", () => {
      // "src" occurs earlier in the string, but "workspace" outranks it in priority,
      // so segments after "workspace" (not "src") are used.
      const [summary] = summarizeProjects([
        makeEvent({ project: "/h/src/workspace/acme/web" }),
      ]);
      expect(summary.displayProject).toBe("acme/web");
    });

    it("does not count a marker that is the final segment", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/h/acme/code" })]);
      // "code" is the last segment, so it doesn't count; no marker counts.
      // Falls back to the last two segments joined with /.
      expect(summary.displayProject).toBe("acme/code");
    });

    it("falls back to the last two segments when no marker counts", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/home/user/acme/web" })]);
      expect(summary.displayProject).toBe("acme/web");
    });

    it("falls back to the identifier itself when segments are empty", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/" })]);
      expect(summary.displayProject).toBe("/");
    });

    it("drops empty segments produced by repeated slashes", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "//h//code//acme//web//" })]);
      expect(summary.displayProject).toBe("acme/web");
    });

    it("uses the last occurrence of a marker", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/code/h/code/acme/web" })]);
      expect(summary.displayProject).toBe("acme/web");
    });
  });

  describe("dash identifiers (leading -)", () => {
    it("joins the segments after the first counting marker with -", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "-h-projects-my-app" })]);
      expect(summary.displayProject).toBe("my-app");
    });

    it("collapses a repeated final pair to one piece only when exactly two pieces remain", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "-h-code-api-api" })]);
      expect(summary.displayProject).toBe("api");
    });

    it("does not collapse a repeated final pair when more than two pieces remain", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "-h-code-a-b-b" })]);
      expect(summary.displayProject).toBe("a-b-b");
    });

    it("falls back to all pieces joined with - when no marker counts", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "-h-acme-web" })]);
      expect(summary.displayProject).toBe("h-acme-web");
    });

    it("falls back to a single piece when there are exactly two identical pieces and no marker counts", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "-acme-acme" })]);
      expect(summary.displayProject).toBe("acme");
    });

    it("keeps the identifier as-is when splitting on - leaves no pieces", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "-" })]);
      expect(summary.displayProject).toBe("-");
    });

    it("drops empty pieces produced by repeated dashes", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "--h--projects--my--app--" })]);
      expect(summary.displayProject).toBe("my-app");
    });
  });

  describe("merging raw identifiers into one summary", () => {
    it("merges different raw identifiers that normalise to the same display name", () => {
      const events = [
        makeEvent({ project: "/h/code/acme/web", estimatedCostUsd: 1, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "/other/code/acme/web", estimatedCostUsd: 2, inputTokens: 2, outputTokens: 2 }),
      ];

      const result = summarizeProjects(events);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        displayProject: "acme/web",
        events: 2,
        estimatedCostUsd: 3,
        totalInputTokens: 3,
        totalOutputTokens: 3,
      });
      expect(result[0].rawProjects).toEqual(["/h/code/acme/web", "/other/code/acme/web"]);
    });

    it("uses the raw identifier that appeared first in the input for the project field", () => {
      const events = [
        makeEvent({ project: "/other/code/acme/web" }),
        makeEvent({ project: "/h/code/acme/web" }),
      ];

      const [summary] = summarizeProjects(events);

      expect(summary.project).toBe("/other/code/acme/web");
      expect(summary.rawProjects).toEqual(["/h/code/acme/web", "/other/code/acme/web"]);
    });

    it("keeps distinct display names as separate summaries", () => {
      const events = [
        makeEvent({ project: "/h/code/acme/web" }),
        makeEvent({ project: "/h/code/acme/api" }),
      ];

      const result = summarizeProjects(events);

      expect(result.map((s) => s.displayProject).sort()).toEqual(["acme/api", "acme/web"]);
    });
  });

  describe("ordering", () => {
    it("orders summaries by total cost descending", () => {
      const events = [
        makeEvent({ project: "low", estimatedCostUsd: 1 }),
        makeEvent({ project: "high", estimatedCostUsd: 10 }),
      ];

      const result = summarizeProjects(events);

      expect(result.map((s) => s.displayProject)).toEqual(["high", "low"]);
    });

    it("breaks a cost tie by event count descending", () => {
      const events = [
        makeEvent({ project: "fewer-events", estimatedCostUsd: 5 }),
        makeEvent({ project: "more-events", estimatedCostUsd: 5 }),
        makeEvent({ project: "more-events", estimatedCostUsd: 0 }),
      ];

      const result = summarizeProjects(events);

      expect(result.map((s) => s.displayProject)).toEqual(["more-events", "fewer-events"]);
    });

    it("breaks a remaining tie by displayProject ascending", () => {
      const events = [
        makeEvent({ project: "zebra", estimatedCostUsd: 5 }),
        makeEvent({ project: "alpha", estimatedCostUsd: 5 }),
      ];

      const result = summarizeProjects(events);

      expect(result.map((s) => s.displayProject)).toEqual(["alpha", "zebra"]);
    });
  });
});
