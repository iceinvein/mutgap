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
        makeEvent({ project: "alpha", inputTokens: 100, outputTokens: 50, estimatedCostUsd: 1.5 }),
      ]);

      expect(result).toEqual([
        {
          project: "alpha",
          displayProject: "alpha",
          rawProjects: ["alpha"],
          events: 1,
          estimatedCostUsd: 1.5,
          totalInputTokens: 100,
          totalOutputTokens: 50,
        },
      ]);
    });

    it("sums events, cost and tokens for the same project", () => {
      const result = summarizeProjects([
        makeEvent({ project: "alpha", inputTokens: 100, outputTokens: 10, estimatedCostUsd: 1 }),
        makeEvent({ project: "alpha", inputTokens: 200, outputTokens: 20, estimatedCostUsd: 2 }),
        makeEvent({ project: "alpha", inputTokens: 300, outputTokens: 30, estimatedCostUsd: 3 }),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        events: 3,
        estimatedCostUsd: 6,
        totalInputTokens: 600,
        totalOutputTokens: 60,
      });
    });

    it("ignores cache, web search and total token fields in the token totals", () => {
      const [summary] = summarizeProjects([
        makeEvent({
          inputTokens: 10,
          outputTokens: 5,
          cacheReadTokens: 1000,
          cacheWriteTokens: 2000,
          webSearchRequests: 7,
          totalTokens: 3015,
        }),
      ]);

      expect(summary.totalInputTokens).toBe(10);
      expect(summary.totalOutputTokens).toBe(5);
    });

    it("keeps distinct projects separate", () => {
      const result = summarizeProjects([
        makeEvent({ project: "alpha", estimatedCostUsd: 1 }),
        makeEvent({ project: "beta", estimatedCostUsd: 2 }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["beta", "alpha"]);
      expect(result.map((s) => s.events)).toEqual([1, 1]);
    });

    it("merges raw projects that normalize to the same display name", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/Users/dev/code/app", inputTokens: 1, outputTokens: 2, estimatedCostUsd: 0.5 }),
        makeEvent({ project: "-Users-dev-code-app", inputTokens: 3, outputTokens: 4, estimatedCostUsd: 0.25 }),
        makeEvent({ project: "app", inputTokens: 5, outputTokens: 6, estimatedCostUsd: 0.25 }),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        project: "/Users/dev/code/app",
        displayProject: "app",
        rawProjects: ["-Users-dev-code-app", "/Users/dev/code/app", "app"],
        events: 3,
        estimatedCostUsd: 1,
        totalInputTokens: 9,
        totalOutputTokens: 12,
      });
    });

    it("uses the first-seen raw project as `project` while sorting rawProjects", () => {
      const [summary] = summarizeProjects([
        makeEvent({ project: "app" }),
        makeEvent({ project: "-Users-dev-code-app" }),
      ]);

      expect(summary.project).toBe("app");
      expect(summary.rawProjects).toEqual(["-Users-dev-code-app", "app"]);
    });

    it("lists each raw project only once in rawProjects", () => {
      const [summary] = summarizeProjects([
        makeEvent({ project: "/Users/dev/code/app" }),
        makeEvent({ project: "/Users/dev/code/app" }),
        makeEvent({ project: "-Users-dev-code-app" }),
      ]);

      expect(summary.rawProjects).toEqual(["-Users-dev-code-app", "/Users/dev/code/app"]);
      expect(summary.events).toBe(3);
    });

    it("does not mutate the input events", () => {
      const events = [makeEvent({ project: "alpha", estimatedCostUsd: 1 })];
      const snapshot = structuredClone(events);

      summarizeProjects(events);

      expect(events).toEqual(snapshot);
    });
  });

  describe("sorting", () => {
    it("sorts by estimated cost descending", () => {
      const result = summarizeProjects([
        makeEvent({ project: "cheap", estimatedCostUsd: 0.1 }),
        makeEvent({ project: "pricey", estimatedCostUsd: 10 }),
        makeEvent({ project: "mid", estimatedCostUsd: 1 }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["pricey", "mid", "cheap"]);
    });

    it("breaks cost ties by event count descending", () => {
      const result = summarizeProjects([
        makeEvent({ project: "few", estimatedCostUsd: 1 }),
        makeEvent({ project: "many", estimatedCostUsd: 0.5 }),
        makeEvent({ project: "many", estimatedCostUsd: 0.5 }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["many", "few"]);
    });

    it("breaks cost and event ties by display name in reverse order", () => {
      const result = summarizeProjects([
        makeEvent({ project: "alpha" }),
        makeEvent({ project: "charlie" }),
        makeEvent({ project: "bravo" }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["charlie", "bravo", "alpha"]);
    });

    it("sorts using merged group totals rather than individual raw projects", () => {
      const result = summarizeProjects([
        makeEvent({ project: "solo", estimatedCostUsd: 3 }),
        makeEvent({ project: "/Users/dev/code/app", estimatedCostUsd: 2 }),
        makeEvent({ project: "-Users-dev-code-app", estimatedCostUsd: 2 }),
      ]);

      expect(result.map((s) => s.displayProject)).toEqual(["app", "solo"]);
    });
  });

  describe("display name normalization", () => {
    describe("plain names", () => {
      it.each([
        ["my-project", "my-project"],
        ["foo", "foo"],
        ["foo/bar", "foo/bar"],
        ["", ""],
      ])("leaves %j unchanged", (input, expected) => {
        expect(displayNameFor(input)).toBe(expected);
      });
    });

    describe("absolute paths", () => {
      it.each([
        ["/Users/dev/code/app", "app"],
        ["/Users/dev/code/org/app", "org/app"],
        ["/Users/dev/repos/app", "app"],
        ["/home/dev/projects/app", "app"],
        ["/home/dev/src/app", "app"],
        ["/home/dev/workspace/app", "app"],
      ])("strips everything up to a marker directory: %s -> %s", (input, expected) => {
        expect(displayNameFor(input)).toBe(expected);
      });

      it("collapses a duplicated trailing directory", () => {
        expect(displayNameFor("/Users/dev/code/app/app")).toBe("app");
        expect(displayNameFor("/Users/dev/code/org/app/app")).toBe("app");
      });

      it("uses the last occurrence of a marker", () => {
        expect(displayNameFor("/code/old/code/app")).toBe("app");
      });

      it("checks markers in priority order rather than by position", () => {
        // "workspace" beats "code" even though "code" appears later.
        expect(displayNameFor("/home/workspace/code/app")).toBe("code/app");
      });

      it("ignores a marker that is the final segment", () => {
        expect(displayNameFor("/Users/dev/code")).toBe("dev/code");
      });

      it("falls back to the last two segments when there is no marker", () => {
        expect(displayNameFor("/Users/dev/app")).toBe("dev/app");
        expect(displayNameFor("/app")).toBe("app");
      });

      it("ignores trailing and repeated slashes", () => {
        expect(displayNameFor("/Users//dev/code/app/")).toBe("app");
      });

      it("returns the root path unchanged", () => {
        expect(displayNameFor("/")).toBe("/");
      });
    });

    describe("dash-encoded paths", () => {
      it.each([
        ["-Users-dev-code-app", "app"],
        ["-Users-dev-code-my-app", "my-app"],
        ["-Users-dev-repos-app", "app"],
        ["-home-dev-projects-app", "app"],
        ["-home-dev-src-app", "app"],
        ["-home-dev-workspace-app", "app"],
      ])("strips everything up to a marker segment: %s -> %s", (input, expected) => {
        expect(displayNameFor(input)).toBe(expected);
      });

      it("collapses exactly two identical trailing segments", () => {
        expect(displayNameFor("-Users-dev-code-app-app")).toBe("app");
      });

      it("does not collapse duplicates when more than two segments follow the marker", () => {
        expect(displayNameFor("-Users-dev-code-org-app-app")).toBe("org-app-app");
      });

      it("collapses a two-segment duplicate with no marker", () => {
        expect(displayNameFor("-app-app")).toBe("app");
      });

      it("rejoins segments when there is no marker", () => {
        expect(displayNameFor("-Users-dev-app")).toBe("Users-dev-app");
      });

      it("ignores repeated dashes", () => {
        expect(displayNameFor("-Users--dev-code-app")).toBe("app");
      });

      it("returns a bare dash unchanged", () => {
        expect(displayNameFor("-")).toBe("-");
        expect(displayNameFor("---")).toBe("---");
      });
    });
  });
});
