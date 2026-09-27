import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

function makeEvent(overrides: Partial<UsageEvent> & { project: string }): UsageEvent {
  return {
    source: "claude-code",
    sessionId: "session-1",
    filePath: "/tmp/session.jsonl",
    eventKey: "event-1",
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

  it("sums cost and tokens and counts events for a single project", () => {
    const events = [
      makeEvent({ project: "myproj", estimatedCostUsd: 1.5, inputTokens: 10, outputTokens: 20 }),
      makeEvent({ project: "myproj", estimatedCostUsd: 2.5, inputTokens: 30, outputTokens: 40 }),
    ];

    const result = summarizeProjects(events);

    expect(result).toEqual([
      {
        project: "myproj",
        displayProject: "myproj",
        rawProjects: ["myproj"],
        events: 2,
        estimatedCostUsd: 4,
        totalInputTokens: 40,
        totalOutputTokens: 60,
      },
    ]);
  });

  it("keeps an identifier that does not start with / or - unchanged", () => {
    const result = summarizeProjects([makeEvent({ project: "plainname" })]);
    expect(result[0].displayProject).toBe("plainname");
  });

  it("orders summaries by cost descending", () => {
    const events = [
      makeEvent({ project: "cheap", estimatedCostUsd: 1 }),
      makeEvent({ project: "expensive", estimatedCostUsd: 10 }),
    ];

    const result = summarizeProjects(events);

    expect(result.map((s) => s.displayProject)).toEqual(["expensive", "cheap"]);
  });

  it("breaks cost ties by event count descending", () => {
    const events = [
      makeEvent({ project: "fewer", estimatedCostUsd: 5 }),
      makeEvent({ project: "more", estimatedCostUsd: 5 }),
      makeEvent({ project: "more", estimatedCostUsd: 0 }),
    ];

    const result = summarizeProjects(events);

    expect(result.map((s) => s.displayProject)).toEqual(["more", "fewer"]);
  });

  it("breaks remaining ties by displayProject ascending localeCompare", () => {
    const events = [
      makeEvent({ project: "zeta", estimatedCostUsd: 1 }),
      makeEvent({ project: "alpha", estimatedCostUsd: 1 }),
    ];

    const result = summarizeProjects(events);

    expect(result.map((s) => s.displayProject)).toEqual(["alpha", "zeta"]);
  });

  it("merges raw identifiers that normalise to the same display name", () => {
    const events = [
      makeEvent({ project: "/h/code/acme/web", estimatedCostUsd: 1, inputTokens: 1, outputTokens: 1 }),
      makeEvent({ project: "/other/code/acme/web", estimatedCostUsd: 2, inputTokens: 2, outputTokens: 2 }),
    ];

    const result = summarizeProjects(events);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      displayProject: "acme/web",
      rawProjects: ["/h/code/acme/web", "/other/code/acme/web"],
      events: 2,
      estimatedCostUsd: 3,
      totalInputTokens: 3,
      totalOutputTokens: 3,
    });
  });

  it("sorts rawProjects ascending but sets project to the raw id that appeared first in the input", () => {
    const events = [
      makeEvent({ project: "/z/code/app", estimatedCostUsd: 1 }),
      makeEvent({ project: "/a/code/app", estimatedCostUsd: 1 }),
    ];

    const result = summarizeProjects(events);

    expect(result[0].rawProjects).toEqual(["/a/code/app", "/z/code/app"]);
    expect(result[0].project).toBe("/z/code/app");
  });

  describe("path identifiers (starting with /)", () => {
    it("drops empty segments before matching markers", () => {
      expect(summarizeProjects([makeEvent({ project: "//h//code//acme//web/" })])[0].displayProject).toBe("acme/web");
    });

    it("uses the marker segments joined with / when there is no repeated final pair", () => {
      expect(summarizeProjects([makeEvent({ project: "/h/code/acme/web" })])[0].displayProject).toBe("acme/web");
    });

    it("collapses a repeated final pair to one segment for any tail length", () => {
      expect(summarizeProjects([makeEvent({ project: "/h/code/api/api" })])[0].displayProject).toBe("api");
    });

    it("tries markers in order: workspace before src before projects before repos before code", () => {
      expect(summarizeProjects([makeEvent({ project: "/h/workspace/src/acme/web" })])[0].displayProject).toBe(
        "src/acme/web",
      );
    });

    it("uses the last occurrence of a marker", () => {
      expect(summarizeProjects([makeEvent({ project: "/code/h/code/acme/web" })])[0].displayProject).toBe(
        "acme/web",
      );
    });

    it("does not count a marker that is the final segment", () => {
      expect(summarizeProjects([makeEvent({ project: "/h/acme/code" })])[0].displayProject).toBe("acme/code");
    });

    it("falls back to the last two segments joined with / when no marker counts", () => {
      expect(summarizeProjects([makeEvent({ project: "/a/b/c" })])[0].displayProject).toBe("b/c");
    });

    it("falls back to the identifier itself when the last-two-segment join is empty", () => {
      expect(summarizeProjects([makeEvent({ project: "/" })])[0].displayProject).toBe("/");
    });

    it("returns the single segment when there is only one", () => {
      expect(summarizeProjects([makeEvent({ project: "/single" })])[0].displayProject).toBe("single");
    });
  });

  describe("dash identifiers (starting with -)", () => {
    it("drops empty pieces and joins the marker tail with -", () => {
      expect(summarizeProjects([makeEvent({ project: "-h-projects-my-app" })])[0].displayProject).toBe("my-app");
    });

    it("collapses a repeated final pair to one segment only when exactly two pieces remain", () => {
      expect(summarizeProjects([makeEvent({ project: "-h-code-api-api" })])[0].displayProject).toBe("api");
    });

    it("does not collapse a repeated-looking tail longer than two pieces", () => {
      expect(summarizeProjects([makeEvent({ project: "-h-code-api-api-api" })])[0].displayProject).toBe(
        "api-api-api",
      );
    });

    it("does not count a marker that is the final piece", () => {
      expect(summarizeProjects([makeEvent({ project: "-h-app-code" })])[0].displayProject).toBe("h-app-code");
    });

    it("joins all pieces with - when no marker counts and pieces are not an identical pair", () => {
      expect(summarizeProjects([makeEvent({ project: "-foo-bar" })])[0].displayProject).toBe("foo-bar");
    });

    it("collapses to the single piece when exactly two identical pieces remain with no marker", () => {
      expect(summarizeProjects([makeEvent({ project: "-app-app" })])[0].displayProject).toBe("app");
    });

    it("keeps the identifier as-is when no pieces are left after splitting", () => {
      expect(summarizeProjects([makeEvent({ project: "--" })])[0].displayProject).toBe("--");
    });
  });
});
