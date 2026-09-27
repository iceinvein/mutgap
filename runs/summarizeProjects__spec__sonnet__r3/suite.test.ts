import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

let counter = 0;

function makeEvent(overrides: {
  project: string;
  estimatedCostUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
}): UsageEvent {
  counter += 1;
  return {
    source: "claude-code",
    project: overrides.project,
    sessionId: `session-${counter}`,
    filePath: `/tmp/file-${counter}.jsonl`,
    eventKey: `event-${counter}`,
    timestamp: "2026-01-01T00:00:00.000Z",
    model: "claude-sonnet-5",
    inputTokens: overrides.inputTokens ?? 0,
    outputTokens: overrides.outputTokens ?? 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    webSearchRequests: 0,
    totalTokens: (overrides.inputTokens ?? 0) + (overrides.outputTokens ?? 0),
    tokenBreakdownKnown: true,
    speed: "standard",
    estimatedCostUsd: overrides.estimatedCostUsd ?? 0,
  };
}

describe("summarizeProjects", () => {
  it("returns an empty array for empty input", () => {
    expect(summarizeProjects([])).toEqual([]);
  });

  describe("aggregation", () => {
    it("sums cost/tokens and counts events for a single project", () => {
      const events = [
        makeEvent({ project: "myproj", estimatedCostUsd: 1.5, inputTokens: 100, outputTokens: 50 }),
        makeEvent({ project: "myproj", estimatedCostUsd: 2.5, inputTokens: 200, outputTokens: 75 }),
      ];

      const result = summarizeProjects(events);

      expect(result).toEqual([
        {
          project: "myproj",
          displayProject: "myproj",
          rawProjects: ["myproj"],
          events: 2,
          estimatedCostUsd: 4,
          totalInputTokens: 300,
          totalOutputTokens: 125,
        },
      ]);
    });
  });

  describe("normalization - plain identifiers", () => {
    it("keeps an identifier that doesn't start with / or - as-is", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "myproj" })]);
      expect(summary.displayProject).toBe("myproj");
      expect(summary.rawProjects).toEqual(["myproj"]);
    });
  });

  describe("normalization - path identifiers", () => {
    it("collapses a repeated final pair after the marker (spec example)", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/h/code/api/api" })]);
      expect(summary.displayProject).toBe("api");
    });

    it("joins the segments after the marker with / (spec example)", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/h/code/acme/web" })]);
      expect(summary.displayProject).toBe("acme/web");
    });

    it("uses the last occurrence of the marker", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/code/a/code/b" })]);
      expect(summary.displayProject).toBe("b");
    });

    it("does not count a marker that is the final segment", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/a/code" })]);
      // "code" is the final segment so it doesn't count; falls back to
      // "no counting marker" behaviour: last two segments joined with /.
      expect(summary.displayProject).toBe("a/code");
    });

    it("falls back to the last two segments when no marker counts", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/a/b/c" })]);
      expect(summary.displayProject).toBe("b/c");
    });

    it("uses the single remaining segment when there is only one", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/foo" })]);
      expect(summary.displayProject).toBe("foo");
    });

    it("falls back to the raw identifier when the split yields nothing", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "///" })]);
      expect(summary.displayProject).toBe("///");
    });

    it("collapses a repeated final pair even with segments before it", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/h/code/a/b/b" })]);
      expect(summary.displayProject).toBe("a/b");
    });
  });

  describe("normalization - dash identifiers", () => {
    it("joins the segments after the marker with - (spec example)", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "-h-projects-my-app" })]);
      expect(summary.displayProject).toBe("my-app");
    });

    it("collapses to a single piece when exactly two identical pieces remain after the marker", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "-h-code-api-api" })]);
      expect(summary.displayProject).toBe("api");
    });

    it("does not collapse when more than two pieces remain after the marker, even if repeated", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "-h-code-a-b-b" })]);
      expect(summary.displayProject).toBe("a-b-b");
    });

    it("joins all pieces with - when no marker counts", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "-a-b-c" })]);
      expect(summary.displayProject).toBe("a-b-c");
    });

    it("collapses to the single piece when there are exactly two identical pieces and no marker", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "-app-app" })]);
      expect(summary.displayProject).toBe("app");
    });

    it("joins two distinct pieces with - when no marker counts", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "-foo-bar" })]);
      expect(summary.displayProject).toBe("foo-bar");
    });

    it("keeps the identifier as-is when splitting on - leaves no pieces", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "-" })]);
      expect(summary.displayProject).toBe("-");
    });
  });

  describe("marker priority", () => {
    it("prefers workspace over src/projects/repos/code even if they appear later", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/a/src/b/workspace/c" })]);
      expect(summary.displayProject).toBe("c");
    });

    it("falls through to the next marker when an earlier one is absent", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "/a/repos/b/c" })]);
      expect(summary.displayProject).toBe("b/c");
    });
  });

  describe("merging raw identifiers into one summary", () => {
    it("merges raw ids that normalise to the same display name", () => {
      const events = [
        makeEvent({ project: "/y/code/acme/web", estimatedCostUsd: 1, inputTokens: 10, outputTokens: 1 }),
        makeEvent({ project: "/x/code/acme/web", estimatedCostUsd: 2, inputTokens: 20, outputTokens: 2 }),
        makeEvent({ project: "/y/code/acme/web", estimatedCostUsd: 3, inputTokens: 30, outputTokens: 3 }),
      ];

      const result = summarizeProjects(events);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        project: "/y/code/acme/web",
        displayProject: "acme/web",
        rawProjects: ["/x/code/acme/web", "/y/code/acme/web"],
        events: 3,
        estimatedCostUsd: 6,
        totalInputTokens: 60,
        totalOutputTokens: 6,
      });
    });
  });

  describe("ordering", () => {
    it("orders by total cost desc, then events desc, then displayProject ascending", () => {
      const events = [
        makeEvent({ project: "gamma", estimatedCostUsd: 50, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "zeta", estimatedCostUsd: 20, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "beta", estimatedCostUsd: 25, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "zeta", estimatedCostUsd: 20, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "zeta", estimatedCostUsd: 20, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "zeta", estimatedCostUsd: 20, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "zeta", estimatedCostUsd: 20, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "beta", estimatedCostUsd: 25, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "beta", estimatedCostUsd: 25, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "alpha", estimatedCostUsd: 25, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "alpha", estimatedCostUsd: 25, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "alpha", estimatedCostUsd: 25, inputTokens: 1, outputTokens: 1 }),
      ];
      // zeta: cost 100, events 5
      // beta: cost 75, events 3
      // alpha: cost 75, events 3
      // gamma: cost 50, events 1

      const result = summarizeProjects(events);

      expect(result.map((s) => s.displayProject)).toEqual(["zeta", "alpha", "beta", "gamma"]);
    });
  });
});
