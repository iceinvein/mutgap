import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

let counter = 0;

function makeEvent(overrides: Partial<UsageEvent> & { project: string }): UsageEvent {
  counter += 1;
  return {
    source: "claude-code",
    sessionId: `session-${counter}`,
    filePath: `/tmp/session-${counter}.jsonl`,
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

describe("summarizeProjects", () => {
  it("returns an empty array for an empty input", () => {
    expect(summarizeProjects([])).toEqual([]);
  });

  it("summarizes a single event for a single project", () => {
    const event = makeEvent({
      project: "myproject",
      estimatedCostUsd: 1.5,
      inputTokens: 100,
      outputTokens: 50,
    });

    expect(summarizeProjects([event])).toEqual([
      {
        project: "myproject",
        displayProject: "myproject",
        rawProjects: ["myproject"],
        events: 1,
        estimatedCostUsd: 1.5,
        totalInputTokens: 100,
        totalOutputTokens: 50,
      },
    ]);
  });

  it("sums cost and tokens and counts events across multiple events for the same raw project", () => {
    const events = [
      makeEvent({ project: "myproject", estimatedCostUsd: 1, inputTokens: 10, outputTokens: 5 }),
      makeEvent({ project: "myproject", estimatedCostUsd: 2, inputTokens: 20, outputTokens: 15 }),
      makeEvent({ project: "myproject", estimatedCostUsd: 3, inputTokens: 30, outputTokens: 25 }),
    ];

    const [summary] = summarizeProjects(events);

    expect(summary.events).toBe(3);
    expect(summary.estimatedCostUsd).toBe(6);
    expect(summary.totalInputTokens).toBe(60);
    expect(summary.totalOutputTokens).toBe(45);
  });

  it("only reads project, estimatedCostUsd, inputTokens and outputTokens from each event", () => {
    const events = [
      makeEvent({
        project: "myproject",
        source: "cursor",
        model: "some-other-model",
        speed: "fast",
        tokenBreakdownKnown: false,
        cacheWriteTokens: 999,
        cacheReadTokens: 999,
        webSearchRequests: 999,
        totalTokens: 999999,
        estimatedCostUsd: 1,
        inputTokens: 10,
        outputTokens: 5,
      }),
    ];

    const [summary] = summarizeProjects(events);

    expect(summary.estimatedCostUsd).toBe(1);
    expect(summary.totalInputTokens).toBe(10);
    expect(summary.totalOutputTokens).toBe(5);
  });

  describe("ordering", () => {
    it("orders summaries by total cost, highest first", () => {
      const events = [
        makeEvent({ project: "cheap", estimatedCostUsd: 1 }),
        makeEvent({ project: "expensive", estimatedCostUsd: 10 }),
        makeEvent({ project: "medium", estimatedCostUsd: 5 }),
      ];

      expect(summarizeProjects(events).map((s) => s.displayProject)).toEqual([
        "expensive",
        "medium",
        "cheap",
      ]);
    });

    it("breaks cost ties by event count, highest first", () => {
      const events = [
        makeEvent({ project: "few-events", estimatedCostUsd: 1 }),
        makeEvent({ project: "many-events", estimatedCostUsd: 1 }),
        makeEvent({ project: "many-events", estimatedCostUsd: 0 }),
        makeEvent({ project: "many-events", estimatedCostUsd: 0 }),
      ];

      expect(summarizeProjects(events).map((s) => s.displayProject)).toEqual([
        "many-events",
        "few-events",
      ]);
    });

    it("breaks remaining ties by displayProject ascending localeCompare", () => {
      const events = [
        makeEvent({ project: "zebra", estimatedCostUsd: 1 }),
        makeEvent({ project: "apple", estimatedCostUsd: 1 }),
        makeEvent({ project: "mango", estimatedCostUsd: 1 }),
      ];

      expect(summarizeProjects(events).map((s) => s.displayProject)).toEqual([
        "apple",
        "mango",
        "zebra",
      ]);
    });
  });

  describe("merging raw identifiers into one display project", () => {
    it("merges raw identifiers that normalise to the same display name", () => {
      const events = [
        makeEvent({ project: "/h/code/api/api", estimatedCostUsd: 1, inputTokens: 1, outputTokens: 1 }),
        makeEvent({ project: "-h-code-api-api", estimatedCostUsd: 2, inputTokens: 2, outputTokens: 2 }),
      ];

      const summaries = summarizeProjects(events);

      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toMatchObject({
        displayProject: "api",
        events: 2,
        estimatedCostUsd: 3,
        totalInputTokens: 3,
        totalOutputTokens: 3,
      });
    });

    it("lists distinct raw identifiers sorted ascending", () => {
      const events = [
        makeEvent({ project: "/h/code/api/api" }),
        makeEvent({ project: "-h-code-api-api" }),
        makeEvent({ project: "/h/code/api/api" }),
      ];

      const [summary] = summarizeProjects(events);

      expect(summary.rawProjects).toEqual(["-h-code-api-api", "/h/code/api/api"]);
    });

    it("uses the raw identifier that appeared first in the input as `project`, even if it doesn't sort first", () => {
      const events = [
        makeEvent({ project: "/h/code/api/api" }),
        makeEvent({ project: "-h-code-api-api" }),
      ];

      const [summary] = summarizeProjects(events);

      expect(summary.project).toBe("/h/code/api/api");
    });
  });

  describe("display name normalisation", () => {
    function normalise(project: string): string {
      const [summary] = summarizeProjects([makeEvent({ project })]);
      return summary.displayProject;
    }

    it("keeps identifiers that don't start with / or - as they are", () => {
      expect(normalise("myproject")).toBe("myproject");
    });

    it("collapses a repeated final pair after the marker to one segment (path)", () => {
      expect(normalise("/h/code/api/api")).toBe("api");
    });

    it("joins segments after the marker with / when not a repeated pair (path)", () => {
      expect(normalise("/h/code/acme/web")).toBe("acme/web");
    });

    it("joins pieces after the marker with - when not a repeated pair (dash)", () => {
      expect(normalise("-h-projects-my-app")).toBe("my-app");
    });

    it("collapses a repeated final pair after the marker for dash identifiers only when exactly two pieces remain", () => {
      expect(normalise("-a-projects-app-app")).toBe("app");
    });

    it("does not collapse a repeated final pair for dash identifiers when more than two pieces remain", () => {
      expect(normalise("-a-projects-x-app-app")).toBe("x-app-app");
    });

    it("tries markers in priority order: workspace, src, projects, repos, code", () => {
      // "src" outranks "code", so it is used even though "code" also counts and is closer to the end.
      expect(normalise("/x/src/a/code/b")).toBe("a/code/b");
    });

    it("uses a marker's last occurrence, not its first", () => {
      expect(normalise("/code/x/code/y")).toBe("y");
    });

    it("does not count a marker when it is the final segment", () => {
      expect(normalise("/a/b/code")).toBe("b/code");
    });

    it("falls back to the last two path segments when no marker counts", () => {
      expect(normalise("/a/b/c")).toBe("b/c");
    });

    it("falls back to the identifier itself when a path has no segments", () => {
      expect(normalise("/")).toBe("/");
      expect(normalise("///")).toBe("///");
    });

    it("falls back to the single segment for a one-segment path", () => {
      expect(normalise("/foo")).toBe("foo");
    });

    it("keeps a dash identifier as-is when splitting on - leaves no pieces", () => {
      expect(normalise("-")).toBe("-");
      expect(normalise("--")).toBe("--");
    });

    it("collapses exactly two identical dash pieces to the single piece when no marker counts", () => {
      expect(normalise("-app-app")).toBe("app");
    });

    it("joins all dash pieces with - when no marker counts and they aren't an identical pair", () => {
      expect(normalise("-foo-bar")).toBe("foo-bar");
      expect(normalise("-a-b-c")).toBe("a-b-c");
    });
  });
});
