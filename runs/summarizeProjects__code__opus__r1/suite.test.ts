import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

let counter = 0;

function makeEvent(overrides: Partial<UsageEvent> = {}): UsageEvent {
  counter += 1;
  return {
    source: "claude-code",
    project: "my-project",
    sessionId: "session-1",
    filePath: "/tmp/session-1.jsonl",
    eventKey: `event-${counter}`,
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

function displayNameFor(project: string): string {
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
        makeEvent({ project: "alpha", estimatedCostUsd: 1.5, inputTokens: 100, outputTokens: 20 }),
      ]);

      expect(result).toEqual([
        {
          project: "alpha",
          displayProject: "alpha",
          rawProjects: ["alpha"],
          events: 1,
          estimatedCostUsd: 1.5,
          totalInputTokens: 100,
          totalOutputTokens: 20,
        },
      ]);
    });

    it("sums events, cost and tokens for the same project", () => {
      const result = summarizeProjects([
        makeEvent({ project: "alpha", estimatedCostUsd: 1, inputTokens: 10, outputTokens: 1 }),
        makeEvent({ project: "alpha", estimatedCostUsd: 2, inputTokens: 20, outputTokens: 2 }),
        makeEvent({ project: "alpha", estimatedCostUsd: 3, inputTokens: 30, outputTokens: 3 }),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        rawProjects: ["alpha"],
        events: 3,
        estimatedCostUsd: 6,
        totalInputTokens: 60,
        totalOutputTokens: 6,
      });
    });

    it("only aggregates input and output tokens, ignoring cache and total tokens", () => {
      const [summary] = summarizeProjects([
        makeEvent({
          inputTokens: 5,
          outputTokens: 7,
          cacheReadTokens: 1000,
          cacheWriteTokens: 2000,
          totalTokens: 3012,
        }),
      ]);

      expect(summary.totalInputTokens).toBe(5);
      expect(summary.totalOutputTokens).toBe(7);
    });

    it("keeps unrelated projects separate", () => {
      const result = summarizeProjects([
        makeEvent({ project: "alpha", estimatedCostUsd: 2 }),
        makeEvent({ project: "beta", estimatedCostUsd: 1 }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["alpha", "beta"]);
      expect(result.map((s) => s.events)).toEqual([1, 1]);
    });

    it("groups across sources for the same project", () => {
      const result = summarizeProjects([
        makeEvent({ project: "alpha", source: "claude-code" }),
        makeEvent({ project: "alpha", source: "codex-cli" }),
        makeEvent({ project: "alpha", source: "cursor" }),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].events).toBe(3);
    });
  });

  describe("grouping raw projects by display name", () => {
    it("merges raw projects that normalize to the same display name", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/Users/me/code/app", estimatedCostUsd: 1, inputTokens: 10, outputTokens: 1 }),
        makeEvent({ project: "-Users-me-code-app", estimatedCostUsd: 2, inputTokens: 20, outputTokens: 2 }),
        makeEvent({ project: "app", estimatedCostUsd: 4, inputTokens: 40, outputTokens: 4 }),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        displayProject: "app",
        rawProjects: ["-Users-me-code-app", "/Users/me/code/app", "app"],
        events: 3,
        estimatedCostUsd: 7,
        totalInputTokens: 70,
        totalOutputTokens: 7,
      });
    });

    it("lists each raw project only once and sorted", () => {
      const [summary] = summarizeProjects([
        makeEvent({ project: "app" }),
        makeEvent({ project: "/home/me/repos/app" }),
        makeEvent({ project: "app" }),
        makeEvent({ project: "/home/me/repos/app" }),
      ]);

      expect(summary.rawProjects).toEqual(["/home/me/repos/app", "app"]);
      expect(summary.events).toBe(4);
    });

    it("uses the first-seen raw project as `project`, not the alphabetically first", () => {
      const [summary] = summarizeProjects([
        makeEvent({ project: "app" }),
        makeEvent({ project: "/home/me/repos/app" }),
      ]);

      expect(summary.project).toBe("app");
      expect(summary.rawProjects).toEqual(["/home/me/repos/app", "app"]);
    });
  });

  describe("sorting", () => {
    it("sorts by estimated cost descending", () => {
      const result = summarizeProjects([
        makeEvent({ project: "low", estimatedCostUsd: 1 }),
        makeEvent({ project: "high", estimatedCostUsd: 10 }),
        makeEvent({ project: "mid", estimatedCostUsd: 5 }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["high", "mid", "low"]);
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
        makeEvent({ project: "apple" }),
        makeEvent({ project: "cherry" }),
        makeEvent({ project: "banana" }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["cherry", "banana", "apple"]);
    });

    it("sorts by the grouped totals, not per raw project", () => {
      const result = summarizeProjects([
        makeEvent({ project: "solo", estimatedCostUsd: 3 }),
        makeEvent({ project: "/x/code/merged", estimatedCostUsd: 2 }),
        makeEvent({ project: "-x-code-merged", estimatedCostUsd: 2 }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["merged", "solo"]);
    });
  });

  describe("display name normalization", () => {
    describe("plain names", () => {
      it.each([
        ["my-project", "my-project"],
        ["alpha", "alpha"],
        ["", ""],
      ])("leaves %j unchanged", (input, expected) => {
        expect(displayNameFor(input)).toBe(expected);
      });
    });

    describe("absolute paths", () => {
      it.each([
        ["/Users/me/code/app", "app"],
        ["/Users/me/workspace/app", "app"],
        ["/Users/me/src/app", "app"],
        ["/Users/me/projects/app", "app"],
        ["/Users/me/repos/app", "app"],
        ["/Users/me/code/org/app", "org/app"],
        ["/Users/me/code/app/", "app"],
      ])("normalizes %j to %j using the segment after a marker", (input, expected) => {
        expect(displayNameFor(input)).toBe(expected);
      });

      it("collapses a trailing duplicated segment after a marker", () => {
        expect(displayNameFor("/Users/me/code/app/app")).toBe("app");
        expect(displayNameFor("/Users/me/code/org/app/app")).toBe("app");
      });

      it("uses the last occurrence of a marker", () => {
        expect(displayNameFor("/code/old/code/app")).toBe("app");
      });

      it("checks markers in priority order (workspace before src)", () => {
        expect(displayNameFor("/home/workspace/app/src/lib")).toBe("app/src/lib");
      });

      it("ignores a marker that is the last segment", () => {
        expect(displayNameFor("/Users/me/code")).toBe("me/code");
      });

      it("falls back to the last two segments without a marker", () => {
        expect(displayNameFor("/Users/me/app")).toBe("me/app");
        expect(displayNameFor("/app")).toBe("app");
      });

      it("returns the input unchanged for the root path", () => {
        expect(displayNameFor("/")).toBe("/");
      });
    });

    describe("dash-encoded paths", () => {
      it.each([
        ["-Users-me-code-app", "app"],
        ["-Users-me-workspace-app", "app"],
        ["-Users-me-src-app", "app"],
        ["-Users-me-projects-app", "app"],
        ["-Users-me-repos-app", "app"],
        ["-Users-me-code-my-app", "my-app"],
      ])("normalizes %j to %j using the segments after a marker", (input, expected) => {
        expect(displayNameFor(input)).toBe(expected);
      });

      it("collapses exactly two duplicated segments after a marker", () => {
        expect(displayNameFor("-Users-me-code-app-app")).toBe("app");
      });

      it("does not collapse duplicates when more than two segments follow a marker", () => {
        expect(displayNameFor("-Users-me-code-org-app-app")).toBe("org-app-app");
      });

      it("ignores a marker that is the last segment", () => {
        expect(displayNameFor("-Users-me-code")).toBe("Users-me-code");
      });

      it("collapses two duplicated segments without a marker", () => {
        expect(displayNameFor("-app-app")).toBe("app");
      });

      it("strips leading and repeated dashes when there is no marker", () => {
        expect(displayNameFor("-Users-me-app")).toBe("Users-me-app");
        expect(displayNameFor("--Users--me")).toBe("Users-me");
      });

      it("returns the input unchanged when it is only dashes", () => {
        expect(displayNameFor("-")).toBe("-");
        expect(displayNameFor("---")).toBe("---");
      });
    });
  });
});
