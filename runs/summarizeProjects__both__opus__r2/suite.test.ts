import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

let counter = 0;

function event(overrides: Partial<UsageEvent> = {}): UsageEvent {
  counter += 1;
  return {
    source: "claude-code",
    project: "proj",
    sessionId: `session-${counter}`,
    filePath: `/logs/${counter}.jsonl`,
    eventKey: `key-${counter}`,
    timestamp: "2026-01-01T00:00:00.000Z",
    model: "claude-opus-5-5",
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

function displayOf(project: string): string {
  const result = summarizeProjects([event({ project })]);
  expect(result).toHaveLength(1);
  return result[0].displayProject;
}

describe("summarizeProjects", () => {
  describe("aggregation", () => {
    it("returns an empty array for empty input", () => {
      expect(summarizeProjects([])).toEqual([]);
    });

    it("summarises a single event", () => {
      expect(
        summarizeProjects([
          event({ project: "alpha", estimatedCostUsd: 1.5, inputTokens: 10, outputTokens: 20 }),
        ]),
      ).toEqual([
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

    it("sums count, cost and tokens across events of the same project", () => {
      expect(
        summarizeProjects([
          event({ project: "alpha", estimatedCostUsd: 1.5, inputTokens: 10, outputTokens: 20 }),
          event({ project: "alpha", estimatedCostUsd: 0.25, inputTokens: 5, outputTokens: 7 }),
          event({ project: "alpha", estimatedCostUsd: 2, inputTokens: 1, outputTokens: 3 }),
        ]),
      ).toEqual([
        {
          project: "alpha",
          displayProject: "alpha",
          rawProjects: ["alpha"],
          events: 3,
          estimatedCostUsd: 3.75,
          totalInputTokens: 16,
          totalOutputTokens: 30,
        },
      ]);
    });

    it("ignores fields other than project, cost, input and output tokens", () => {
      expect(
        summarizeProjects([
          event({
            project: "alpha",
            estimatedCostUsd: 1,
            inputTokens: 2,
            outputTokens: 3,
            cacheReadTokens: 1000,
            cacheWriteTokens: 1000,
            totalTokens: 9999,
            webSearchRequests: 5,
            source: "cursor",
            speed: "fast",
          }),
        ]),
      ).toEqual([
        {
          project: "alpha",
          displayProject: "alpha",
          rawProjects: ["alpha"],
          events: 1,
          estimatedCostUsd: 1,
          totalInputTokens: 2,
          totalOutputTokens: 3,
        },
      ]);
    });

    it("keeps projects with different display names separate", () => {
      const result = summarizeProjects([
        event({ project: "alpha", estimatedCostUsd: 2, inputTokens: 1, outputTokens: 1 }),
        event({ project: "beta", estimatedCostUsd: 1, inputTokens: 4, outputTokens: 8 }),
      ]);
      expect(result).toEqual([
        {
          project: "alpha",
          displayProject: "alpha",
          rawProjects: ["alpha"],
          events: 1,
          estimatedCostUsd: 2,
          totalInputTokens: 1,
          totalOutputTokens: 1,
        },
        {
          project: "beta",
          displayProject: "beta",
          rawProjects: ["beta"],
          events: 1,
          estimatedCostUsd: 1,
          totalInputTokens: 4,
          totalOutputTokens: 8,
        },
      ]);
    });
  });

  describe("merging raw identifiers", () => {
    it("merges raw identifiers that normalise to the same display name", () => {
      expect(
        summarizeProjects([
          event({ project: "/h/code/web", estimatedCostUsd: 1, inputTokens: 1, outputTokens: 2 }),
          event({ project: "-h-code-web", estimatedCostUsd: 0.5, inputTokens: 3, outputTokens: 4 }),
          event({ project: "web", estimatedCostUsd: 0.25, inputTokens: 5, outputTokens: 6 }),
          event({ project: "/h/code/web", estimatedCostUsd: 0.25, inputTokens: 7, outputTokens: 8 }),
        ]),
      ).toEqual([
        {
          project: "/h/code/web",
          displayProject: "web",
          rawProjects: ["-h-code-web", "/h/code/web", "web"],
          events: 4,
          estimatedCostUsd: 2,
          totalInputTokens: 16,
          totalOutputTokens: 20,
        },
      ]);
    });

    it("uses the first-seen raw identifier as project, not the first after sorting", () => {
      const [summary] = summarizeProjects([
        event({ project: "/z/code/api" }),
        event({ project: "/a/code/api" }),
      ]);
      expect(summary.project).toBe("/z/code/api");
      expect(summary.rawProjects).toEqual(["/a/code/api", "/z/code/api"]);
    });

    it("lists each distinct raw identifier once", () => {
      const [summary] = summarizeProjects([
        event({ project: "/b/code/api" }),
        event({ project: "/a/code/api" }),
        event({ project: "/b/code/api" }),
        event({ project: "/a/code/api" }),
      ]);
      expect(summary.rawProjects).toEqual(["/a/code/api", "/b/code/api"]);
      expect(summary.events).toBe(4);
    });
  });

  describe("ordering", () => {
    it("orders by total cost, highest first", () => {
      const result = summarizeProjects([
        event({ project: "low", estimatedCostUsd: 1 }),
        event({ project: "high", estimatedCostUsd: 3 }),
        event({ project: "mid", estimatedCostUsd: 2 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["high", "mid", "low"]);
    });

    it("orders by summed cost rather than per-event cost", () => {
      const result = summarizeProjects([
        event({ project: "single", estimatedCostUsd: 3 }),
        event({ project: "many", estimatedCostUsd: 2 }),
        event({ project: "many", estimatedCostUsd: 2 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["many", "single"]);
    });

    it("breaks cost ties by event count, highest first", () => {
      const result = summarizeProjects([
        event({ project: "a-one", estimatedCostUsd: 2 }),
        event({ project: "z-two", estimatedCostUsd: 1 }),
        event({ project: "z-two", estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["z-two", "a-one"]);
    });

    it("breaks remaining ties by displayProject ascending", () => {
      const result = summarizeProjects([
        event({ project: "charlie", estimatedCostUsd: 1 }),
        event({ project: "alpha", estimatedCostUsd: 1 }),
        event({ project: "bravo", estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["alpha", "bravo", "charlie"]);
    });

    it("applies all three ordering keys together", () => {
      const result = summarizeProjects([
        event({ project: "d", estimatedCostUsd: 1 }),
        event({ project: "c", estimatedCostUsd: 0.5 }),
        event({ project: "c", estimatedCostUsd: 0.5 }),
        event({ project: "b", estimatedCostUsd: 1 }),
        event({ project: "a", estimatedCostUsd: 5 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["a", "c", "b", "d"]);
    });
  });

  describe("normalisation of path identifiers (leading /)", () => {
    it.each([
      ["/h/code/acme/web", "acme/web"],
      ["/h/code/api/api", "api"],
      ["/h/code/web", "web"],
      ["/h/workspace/web", "web"],
      ["/h/src/web", "web"],
      ["/h/projects/web", "web"],
      ["/h/repos/web", "web"],
      ["/h/code/a/b/c", "a/b/c"],
      ["/h/code/a/a/b", "a/a/b"],
    ])("%s -> %s", (raw, expected) => {
      expect(displayOf(raw)).toBe(expected);
    });

    it("drops empty segments", () => {
      expect(displayOf("//h//code//acme//web//")).toBe("acme/web");
    });

    it("uses the last occurrence of a marker", () => {
      expect(displayOf("/code/a/code/b")).toBe("b");
    });

    it("does not count a marker that is the final segment", () => {
      expect(displayOf("/h/x/code")).toBe("x/code");
    });

    it("ignores earlier occurrences of a marker whose last occurrence is final", () => {
      expect(displayOf("/h/code/a/code")).toBe("a/code");
    });

    it("tries markers in priority order regardless of position", () => {
      expect(displayOf("/h/code/x/workspace/y")).toBe("y");
      expect(displayOf("/h/workspace/x/code/y")).toBe("x/code/y");
      expect(displayOf("/h/src/a/projects/b")).toBe("a/projects/b");
      expect(displayOf("/h/projects/a/src/b")).toBe("b");
      expect(displayOf("/h/repos/a/projects/b")).toBe("b");
      expect(displayOf("/h/code/a/repos/b")).toBe("b");
    });

    it("moves on to the next marker when a higher-priority one is final", () => {
      expect(displayOf("/h/code/a/workspace")).toBe("a/workspace");
    });

    it("uses the last two segments when no marker counts", () => {
      expect(displayOf("/Users/me/stuff/thing")).toBe("stuff/thing");
      expect(displayOf("/Users/me/thing/thing")).toBe("thing/thing");
    });

    it("uses the only segment when there is just one", () => {
      expect(displayOf("/single")).toBe("single");
    });

    it("keeps the identifier as is when it has no segments", () => {
      expect(displayOf("/")).toBe("/");
      expect(displayOf("///")).toBe("///");
    });
  });

  describe("normalisation of dash identifiers (leading -)", () => {
    it.each([
      ["-h-projects-my-app", "my-app"],
      ["-h-code-api-api", "api"],
      ["-h-workspace-web", "web"],
      ["-h-src-web", "web"],
      ["-h-repos-web", "web"],
      ["-h-code-web", "web"],
      ["-h-code-x-api-api", "x-api-api"],
      ["-h-code-a-b", "a-b"],
    ])("%s -> %s", (raw, expected) => {
      expect(displayOf(raw)).toBe(expected);
    });

    it("drops empty pieces", () => {
      expect(displayOf("--h--code--my--app--")).toBe("my-app");
    });

    it("keeps the identifier as is when no pieces are left", () => {
      expect(displayOf("-")).toBe("-");
      expect(displayOf("---")).toBe("---");
    });

    it("uses the last occurrence of a marker", () => {
      expect(displayOf("-code-a-code-b")).toBe("b");
    });

    it("does not count a marker that is the final piece", () => {
      expect(displayOf("-h-x-code")).toBe("h-x-code");
    });

    it("tries markers in priority order regardless of position", () => {
      expect(displayOf("-h-code-x-workspace-y")).toBe("y");
      expect(displayOf("-h-workspace-x-code-y")).toBe("x-code-y");
      expect(displayOf("-h-src-a-projects-b")).toBe("a-projects-b");
      expect(displayOf("-h-repos-a-projects-b")).toBe("b");
    });

    it("moves on to the next marker when a higher-priority one is final", () => {
      expect(displayOf("-h-code-a-workspace")).toBe("a-workspace");
    });

    it("joins all pieces with - when no marker counts", () => {
      expect(displayOf("-Users-me-stuff")).toBe("Users-me-stuff");
      expect(displayOf("-a-b")).toBe("a-b");
      expect(displayOf("-a-a-a")).toBe("a-a-a");
      expect(displayOf("-single")).toBe("single");
    });

    it("collapses exactly two identical pieces when no marker counts", () => {
      expect(displayOf("-api-api")).toBe("api");
      expect(displayOf("--api--api--")).toBe("api");
    });
  });

  describe("normalisation of other identifiers", () => {
    it.each(["plain", "acme/web", "h-code-web", "code/a/b", "", "C:\\code\\web"])(
      "keeps %j as is",
      (raw) => {
        expect(displayOf(raw)).toBe(raw);
      },
    );
  });
});
