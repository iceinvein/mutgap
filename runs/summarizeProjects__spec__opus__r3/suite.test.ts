import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

let counter = 0;

function makeEvent(overrides: Partial<UsageEvent> = {}): UsageEvent {
  counter += 1;
  return {
    source: "claude-code",
    project: "proj",
    sessionId: `session-${counter}`,
    filePath: `/tmp/file-${counter}.jsonl`,
    eventKey: `key-${counter}`,
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

/** Display name produced for a single raw project identifier. */
function displayOf(project: string): string {
  const result = summarizeProjects([makeEvent({ project })]);
  expect(result).toHaveLength(1);
  return result[0].displayProject;
}

describe("summarizeProjects", () => {
  describe("aggregation", () => {
    it("returns an empty array for empty input", () => {
      expect(summarizeProjects([])).toEqual([]);
    });

    it("summarises a single event", () => {
      const result = summarizeProjects([
        makeEvent({
          project: "/h/code/acme/web",
          estimatedCostUsd: 1.5,
          inputTokens: 100,
          outputTokens: 20,
        }),
      ]);
      expect(result).toEqual([
        {
          project: "/h/code/acme/web",
          displayProject: "acme/web",
          rawProjects: ["/h/code/acme/web"],
          events: 1,
          estimatedCostUsd: 1.5,
          totalInputTokens: 100,
          totalOutputTokens: 20,
        },
      ]);
    });

    it("sums cost, input tokens and output tokens and counts events per group", () => {
      const result = summarizeProjects([
        makeEvent({ project: "alpha", estimatedCostUsd: 0.5, inputTokens: 10, outputTokens: 1 }),
        makeEvent({ project: "alpha", estimatedCostUsd: 0.25, inputTokens: 20, outputTokens: 2 }),
        makeEvent({ project: "alpha", estimatedCostUsd: 1, inputTokens: 30, outputTokens: 3 }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        events: 3,
        estimatedCostUsd: 1.75,
        totalInputTokens: 60,
        totalOutputTokens: 6,
      });
    });

    it("handles non-exact floating point costs", () => {
      const result = summarizeProjects([
        makeEvent({ project: "a", estimatedCostUsd: 0.1 }),
        makeEvent({ project: "a", estimatedCostUsd: 0.2 }),
      ]);
      expect(result[0].estimatedCostUsd).toBeCloseTo(0.3, 10);
    });

    it("ignores fields other than project, cost, input and output tokens", () => {
      const result = summarizeProjects([
        makeEvent({
          project: "a",
          estimatedCostUsd: 1,
          inputTokens: 5,
          outputTokens: 7,
          cacheWriteTokens: 1000,
          cacheReadTokens: 2000,
          totalTokens: 99999,
          webSearchRequests: 3,
          source: "cursor",
          model: "other",
        }),
        makeEvent({ project: "a", source: "codex-cli", sessionId: "same", speed: "fast" }),
      ]);
      expect(result).toEqual([
        {
          project: "a",
          displayProject: "a",
          rawProjects: ["a"],
          events: 2,
          estimatedCostUsd: 1,
          totalInputTokens: 5,
          totalOutputTokens: 7,
        },
      ]);
    });

    it("keeps separate groups for different display names", () => {
      const result = summarizeProjects([
        makeEvent({ project: "a", estimatedCostUsd: 2 }),
        makeEvent({ project: "b", estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["a", "b"]);
    });

    it("does not mutate the input", () => {
      const events = [
        makeEvent({ project: "b", estimatedCostUsd: 1 }),
        makeEvent({ project: "a", estimatedCostUsd: 2 }),
      ];
      const snapshot = structuredClone(events);
      summarizeProjects(events);
      expect(events).toEqual(snapshot);
    });
  });

  describe("merging raw identifiers", () => {
    it("merges raw identifiers that normalise to the same display name", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/Users/zed/code/api", estimatedCostUsd: 1, inputTokens: 1, outputTokens: 10 }),
        makeEvent({ project: "/Users/amy/src/api", estimatedCostUsd: 2, inputTokens: 2, outputTokens: 20 }),
        makeEvent({ project: "api", estimatedCostUsd: 4, inputTokens: 4, outputTokens: 40 }),
        makeEvent({ project: "-Users-bob-projects-api", estimatedCostUsd: 8, inputTokens: 8, outputTokens: 80 }),
      ]);
      expect(result).toEqual([
        {
          project: "/Users/zed/code/api",
          displayProject: "api",
          rawProjects: ["-Users-bob-projects-api", "/Users/amy/src/api", "/Users/zed/code/api", "api"],
          events: 4,
          estimatedCostUsd: 15,
          totalInputTokens: 15,
          totalOutputTokens: 150,
        },
      ]);
    });

    it("lists each raw identifier only once, sorted ascending", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/z/code/app" }),
        makeEvent({ project: "/a/code/app" }),
        makeEvent({ project: "/z/code/app" }),
        makeEvent({ project: "/a/code/app" }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].rawProjects).toEqual(["/a/code/app", "/z/code/app"]);
      expect(result[0].events).toBe(4);
    });

    it("uses the first raw identifier seen in the input as project, not the first sorted", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/zzz/code/app" }),
        makeEvent({ project: "/aaa/code/app" }),
      ]);
      expect(result[0].project).toBe("/zzz/code/app");
      expect(result[0].rawProjects).toEqual(["/aaa/code/app", "/zzz/code/app"]);
    });

    it("tracks the first raw identifier per group independently", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/y/code/one", estimatedCostUsd: 2 }),
        makeEvent({ project: "/b/code/two", estimatedCostUsd: 1 }),
        makeEvent({ project: "/a/code/one", estimatedCostUsd: 2 }),
        makeEvent({ project: "/a/code/two", estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => [s.displayProject, s.project])).toEqual([
        ["one", "/y/code/one"],
        ["two", "/b/code/two"],
      ]);
    });

    it("does not merge a path and a dash identifier whose joined forms differ", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/h/code/acme/web", estimatedCostUsd: 2 }),
        makeEvent({ project: "-h-code-acme-web", estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["acme/web", "acme-web"]);
    });
  });

  describe("normalisation of path identifiers", () => {
    it("takes segments after a marker and joins them with /", () => {
      expect(displayOf("/h/code/acme/web")).toBe("acme/web");
      expect(displayOf("/h/workspace/a/b/c")).toBe("a/b/c");
    });

    it.each(["workspace", "src", "projects", "repos", "code"])(
      "recognises the %s marker",
      (marker) => {
        expect(displayOf(`/home/me/${marker}/thing`)).toBe("thing");
      },
    );

    it("collapses a repeated final pair to one segment", () => {
      expect(displayOf("/h/code/api/api")).toBe("api");
    });

    it("tries markers in priority order, not by position", () => {
      // "src" is tried before "code" even though "code" appears first
      expect(displayOf("/h/code/src/app")).toBe("app");
      // "workspace" beats "src" even though "src" appears later
      expect(displayOf("/h/workspace/x/src/y")).toBe("x/src/y");
      // "projects" beats "repos" and "code"
      expect(displayOf("/h/code/repos/projects/p")).toBe("p");
    });

    it("uses the last occurrence of a marker", () => {
      expect(displayOf("/code/a/code/b")).toBe("b");
    });

    it("skips a marker that is the final segment and falls through to the next", () => {
      expect(displayOf("/h/code/foo/src")).toBe("foo/src");
    });

    it("does not fall back to an earlier occurrence when the last one is final", () => {
      // last "src" is final, so "src" does not count; no other marker → last two segments
      expect(displayOf("/h/src/a/src")).toBe("a/src");
    });

    it("drops empty segments", () => {
      expect(displayOf("//h//code//acme//web//")).toBe("acme/web");
      expect(displayOf("/h/x//y/")).toBe("x/y");
    });

    it("matches markers case-sensitively as whole segments", () => {
      expect(displayOf("/h/Code/x/y")).toBe("x/y");
      expect(displayOf("/h/mycode/x/y")).toBe("x/y");
      expect(displayOf("/h/code-x/a/b")).toBe("a/b");
    });

    it("uses the last two segments when there is no marker", () => {
      expect(displayOf("/Users/me/stuff/thing")).toBe("stuff/thing");
      expect(displayOf("/a/b")).toBe("a/b");
    });

    it("uses the only segment when there is one and no marker", () => {
      expect(displayOf("/solo")).toBe("solo");
    });

    it("uses the marker itself when it is the only segment", () => {
      expect(displayOf("/code")).toBe("code");
    });

    it("keeps the identifier as is when no segments remain", () => {
      expect(displayOf("/")).toBe("/");
      expect(displayOf("///")).toBe("///");
    });
  });

  describe("normalisation of dash identifiers", () => {
    it("takes pieces after a marker and joins them with -", () => {
      expect(displayOf("-h-projects-my-app")).toBe("my-app");
      expect(displayOf("-Users-me-code-acme-web")).toBe("acme-web");
    });

    it.each(["workspace", "src", "projects", "repos", "code"])(
      "recognises the %s marker",
      (marker) => {
        expect(displayOf(`-home-me-${marker}-thing`)).toBe("thing");
      },
    );

    it("collapses exactly two identical remaining pieces to one", () => {
      expect(displayOf("-h-code-api-api")).toBe("api");
    });

    it("does not collapse a repeated final pair when more than two pieces remain", () => {
      expect(displayOf("-h-code-x-api-api")).toBe("x-api-api");
    });

    it("tries markers in priority order and uses the last occurrence", () => {
      expect(displayOf("-h-code-src-app")).toBe("app");
      expect(displayOf("-src-a-src-b")).toBe("b");
    });

    it("skips a marker that is the final piece", () => {
      expect(displayOf("-h-code-foo-src")).toBe("foo-src");
    });

    it("drops empty pieces", () => {
      expect(displayOf("-h--code--my--app-")).toBe("my-app");
    });

    it("joins all pieces with - when there is no marker", () => {
      expect(displayOf("-Users-me-stuff-thing")).toBe("Users-me-stuff-thing");
      expect(displayOf("-solo")).toBe("solo");
    });

    it("collapses exactly two identical pieces when there is no marker", () => {
      expect(displayOf("-foo-foo")).toBe("foo");
      expect(displayOf("-foo-foo-foo")).toBe("foo-foo-foo");
      expect(displayOf("-bar-foo-foo")).toBe("bar-foo-foo");
    });

    it("keeps the identifier as is when no pieces remain", () => {
      expect(displayOf("-")).toBe("-");
      expect(displayOf("---")).toBe("---");
    });
  });

  describe("normalisation of other identifiers", () => {
    it.each([
      "my-project",
      "code/app",
      "projects-app",
      "C:\\Users\\me\\code\\app",
      "",
      " /h/code/app",
    ])("keeps %j as is", (raw) => {
      expect(displayOf(raw)).toBe(raw);
    });
  });

  describe("ordering", () => {
    it("orders by total cost, highest first", () => {
      const result = summarizeProjects([
        makeEvent({ project: "low", estimatedCostUsd: 1 }),
        makeEvent({ project: "high", estimatedCostUsd: 5 }),
        makeEvent({ project: "mid", estimatedCostUsd: 3 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["high", "mid", "low"]);
    });

    it("orders by summed group cost rather than individual event cost", () => {
      const result = summarizeProjects([
        makeEvent({ project: "single", estimatedCostUsd: 3 }),
        makeEvent({ project: "many", estimatedCostUsd: 2 }),
        makeEvent({ project: "many", estimatedCostUsd: 2 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["many", "single"]);
    });

    it("breaks cost ties by event count, highest first", () => {
      const result = summarizeProjects([
        makeEvent({ project: "aaa", estimatedCostUsd: 2 }),
        makeEvent({ project: "zzz", estimatedCostUsd: 1 }),
        makeEvent({ project: "zzz", estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["zzz", "aaa"]);
    });

    it("breaks remaining ties by displayProject ascending", () => {
      const result = summarizeProjects([
        makeEvent({ project: "charlie", estimatedCostUsd: 1 }),
        makeEvent({ project: "alpha", estimatedCostUsd: 1 }),
        makeEvent({ project: "bravo", estimatedCostUsd: 1 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["alpha", "bravo", "charlie"]);
    });

    it("breaks name ties using displayProject, not the raw identifier", () => {
      const result = summarizeProjects([
        makeEvent({ project: "/a/code/zeta" }),
        makeEvent({ project: "/z/code/alpha" }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["alpha", "zeta"]);
    });

    it("uses localeCompare for the name tie-break", () => {
      const names = ["b", "B", "a", "A", "é", "e"];
      const result = summarizeProjects(names.map((project) => makeEvent({ project })));
      const expected = [...names].sort((x, y) => x.localeCompare(y));
      expect(result.map((s) => s.displayProject)).toEqual(expected);
    });

    it("sorts zero-cost projects after paid ones", () => {
      const result = summarizeProjects([
        makeEvent({ project: "free" }),
        makeEvent({ project: "free" }),
        makeEvent({ project: "paid", estimatedCostUsd: 0.01 }),
      ]);
      expect(result.map((s) => s.displayProject)).toEqual(["paid", "free"]);
    });
  });
});
