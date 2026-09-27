import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

function makeEvent(overrides: Partial<UsageEvent> & { project: string }): UsageEvent {
  return {
    source: "claude-code",
    sessionId: "session-1",
    filePath: "/tmp/session.jsonl",
    eventKey: "key-1",
    timestamp: "2024-01-01T00:00:00.000Z",
    model: "claude",
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

  it("summarizes a single event", () => {
    const result = summarizeProjects([
      makeEvent({ project: "myproject", estimatedCostUsd: 1.5, inputTokens: 10, outputTokens: 20 }),
    ]);

    expect(result).toEqual([
      {
        project: "myproject",
        displayProject: "myproject",
        rawProjects: ["myproject"],
        events: 1,
        estimatedCostUsd: 1.5,
        totalInputTokens: 10,
        totalOutputTokens: 20,
      },
    ]);
  });

  it("sums fields and counts events for repeated raw projects", () => {
    const result = summarizeProjects([
      makeEvent({ project: "myproject", estimatedCostUsd: 1, inputTokens: 10, outputTokens: 20 }),
      makeEvent({ project: "myproject", estimatedCostUsd: 2, inputTokens: 5, outputTokens: 7 }),
    ]);

    expect(result).toEqual([
      {
        project: "myproject",
        displayProject: "myproject",
        rawProjects: ["myproject"],
        events: 2,
        estimatedCostUsd: 3,
        totalInputTokens: 15,
        totalOutputTokens: 27,
      },
    ]);
  });

  it("only reads project, estimatedCostUsd, inputTokens and outputTokens", () => {
    const result = summarizeProjects([
      makeEvent({
        project: "myproject",
        estimatedCostUsd: 1,
        inputTokens: 10,
        outputTokens: 20,
        source: "cursor",
        model: "irrelevant-model",
        totalTokens: 999999,
      }),
    ]);

    expect(result[0]).toEqual({
      project: "myproject",
      displayProject: "myproject",
      rawProjects: ["myproject"],
      events: 1,
      estimatedCostUsd: 1,
      totalInputTokens: 10,
      totalOutputTokens: 20,
    });
  });

  describe("normalization", () => {
    it("keeps a plain identifier as-is", () => {
      const [summary] = summarizeProjects([makeEvent({ project: "myproject" })]);
      expect(summary.displayProject).toBe("myproject");
    });

    describe("path identifiers (leading /)", () => {
      it("with no counting marker, uses the last two segments joined with /", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "/a/b/c" })]);
        expect(summary.displayProject).toBe("b/c");
      });

      it("falls back to the raw identifier when segments are empty", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "/" })]);
        expect(summary.displayProject).toBe("/");
      });

      it("uses the single segment when only one is present", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "/a" })]);
        expect(summary.displayProject).toBe("a");
      });

      it("does not count a marker occurring in the final segment", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "/a/code" })]);
        expect(summary.displayProject).toBe("a/code");
      });

      it("uses the segments after the last occurrence of a counting marker", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "/h/code/acme/web" })]);
        expect(summary.displayProject).toBe("acme/web");
      });

      it("collapses a repeated final pair to one segment", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "/h/code/api/api" })]);
        expect(summary.displayProject).toBe("api");
      });

      it("collapses a repeated final pair even when more segments precede it", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "/h/code/x/api/api" })]);
        expect(summary.displayProject).toBe("api");
      });

      it("prefers earlier markers in the priority list over later ones", () => {
        const [summary] = summarizeProjects([
          makeEvent({ project: "/home/workspace/proj/code/api" }),
        ]);
        expect(summary.displayProject).toBe("proj/code/api");
      });

      it("uses the last occurrence of a marker", () => {
        const [summary] = summarizeProjects([
          makeEvent({ project: "/code/one/code/two" }),
        ]);
        expect(summary.displayProject).toBe("two");
      });
    });

    describe("dash identifiers (leading -)", () => {
      it("falls back to the raw identifier when no pieces remain", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "-" })]);
        expect(summary.displayProject).toBe("-");
      });

      it("joins all pieces with - when there is no counting marker", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "-foo-bar-baz" })]);
        expect(summary.displayProject).toBe("foo-bar-baz");
      });

      it("collapses to the single piece when exactly two identical pieces remain with no marker", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "-app-app" })]);
        expect(summary.displayProject).toBe("app");
      });

      it("uses the pieces after the last occurrence of a counting marker", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "-h-projects-my-app" })]);
        expect(summary.displayProject).toBe("my-app");
      });

      it("collapses a repeated pair after a marker only when exactly two pieces remain", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "-h-code-api-api" })]);
        expect(summary.displayProject).toBe("api");
      });

      it("does not collapse a repeated pair after a marker when more than two pieces remain", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "-h-code-x-api-api" })]);
        expect(summary.displayProject).toBe("x-api-api");
      });

      it("does not count a marker occurring in the final piece", () => {
        const [summary] = summarizeProjects([makeEvent({ project: "-a-code" })]);
        expect(summary.displayProject).toBe("a-code");
      });
    });
  });

  describe("merging", () => {
    it("merges raw identifiers that normalize to the same display name", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/other/place/code/myapp", estimatedCostUsd: 1, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "/home/dik/code/myapp", estimatedCostUsd: 2, inputTokens: 2, outputTokens: 2 }),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].displayProject).toBe("myapp");
      expect(result[0].events).toBe(2);
      expect(result[0].estimatedCostUsd).toBe(3);
      expect(result[0].totalInputTokens).toBe(3);
      expect(result[0].totalOutputTokens).toBe(3);
    });

    it("sorts rawProjects ascending regardless of input order", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/other/place/code/myapp" }),
        makeEvent({ project: "/home/dik/code/myapp" }),
      ]);

      expect(result[0].rawProjects).toEqual(["/home/dik/code/myapp", "/other/place/code/myapp"]);
    });

    it("uses the raw identifier that appeared first in the input, even if not first alphabetically", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/other/place/code/myapp" }),
        makeEvent({ project: "/home/dik/code/myapp" }),
      ]);

      expect(result[0].project).toBe("/other/place/code/myapp");
    });
  });

  describe("ordering", () => {
    it("orders summaries by total cost, highest first", () => {
      const result = summarizeProjects([
        makeEvent({ project: "cheap", estimatedCostUsd: 1 }),
        makeEvent({ project: "expensive", estimatedCostUsd: 10 }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["expensive", "cheap"]);
    });

    it("breaks cost ties by event count, highest first", () => {
      const result = summarizeProjects([
        makeEvent({ project: "few-events", estimatedCostUsd: 5 }),
        makeEvent({ project: "many-events", estimatedCostUsd: 5 }),
        makeEvent({ project: "many-events", estimatedCostUsd: 0 }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["many-events", "few-events"]);
    });

    it("breaks remaining ties by displayProject ascending localeCompare", () => {
      const result = summarizeProjects([
        makeEvent({ project: "zeta", estimatedCostUsd: 5 }),
        makeEvent({ project: "alpha", estimatedCostUsd: 5 }),
        makeEvent({ project: "mid", estimatedCostUsd: 5 }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["alpha", "mid", "zeta"]);
    });
  });
});
