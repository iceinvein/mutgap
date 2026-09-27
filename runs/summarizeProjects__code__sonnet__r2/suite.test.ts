import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

function makeEvent(overrides: Partial<UsageEvent> = {}): UsageEvent {
  return {
    source: "claude-code",
    project: "my-project",
    sessionId: "session-1",
    filePath: "/tmp/file.jsonl",
    eventKey: "key-1",
    timestamp: "2024-01-01T00:00:00.000Z",
    model: "claude-sonnet-5",
    inputTokens: 10,
    outputTokens: 20,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    webSearchRequests: 0,
    totalTokens: 30,
    tokenBreakdownKnown: true,
    speed: "standard",
    estimatedCostUsd: 1,
    ...overrides,
  };
}

describe("summarizeProjects", () => {
  it("returns an empty array for no events", () => {
    expect(summarizeProjects([])).toEqual([]);
  });

  it("aggregates events for a single project", () => {
    const events = [
      makeEvent({ project: "foo", estimatedCostUsd: 1, inputTokens: 10, outputTokens: 20 }),
      makeEvent({ project: "foo", estimatedCostUsd: 2, inputTokens: 5, outputTokens: 15 }),
    ];

    const [summary] = summarizeProjects(events);

    expect(summary).toMatchObject({
      project: "foo",
      displayProject: "foo",
      rawProjects: ["foo"],
      events: 2,
      estimatedCostUsd: 3,
      totalInputTokens: 15,
      totalOutputTokens: 35,
    });
  });

  it("keeps distinct projects separate", () => {
    const events = [makeEvent({ project: "foo" }), makeEvent({ project: "bar" })];

    const result = summarizeProjects(events);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.project).sort()).toEqual(["bar", "foo"]);
  });

  it("normalizes absolute paths using known markers and merges matching raw projects", () => {
    const events = [
      makeEvent({ project: "/Users/dev/workspace/acme/acme", estimatedCostUsd: 1 }),
      makeEvent({ project: "/Users/dev/workspace/acme", estimatedCostUsd: 2 }),
    ];

    const result = summarizeProjects(events);

    expect(result).toHaveLength(1);
    expect(result[0].displayProject).toBe("acme");
    expect(result[0].rawProjects).toEqual(["/Users/dev/workspace/acme", "/Users/dev/workspace/acme/acme"]);
    expect(result[0].events).toBe(2);
    expect(result[0].estimatedCostUsd).toBe(3);
  });

  it("normalizes absolute paths without a duplicated tail by joining the remainder", () => {
    const events = [makeEvent({ project: "/Users/dev/src/apps/api" })];

    const [summary] = summarizeProjects(events);

    expect(summary.displayProject).toBe("apps/api");
  });

  it("falls back to the last two path segments when no marker is present", () => {
    const events = [makeEvent({ project: "/some/random/deep/path" })];

    const [summary] = summarizeProjects(events);

    expect(summary.displayProject).toBe("deep/path");
  });

  it("leaves plain project names untouched", () => {
    const events = [makeEvent({ project: "simple-project" })];

    const [summary] = summarizeProjects(events);

    expect(summary.displayProject).toBe("simple-project");
  });

  it("normalizes dash-encoded paths using known markers", () => {
    const events = [makeEvent({ project: "-Users-dev-workspace-acme-acme" })];

    const [summary] = summarizeProjects(events);

    expect(summary.displayProject).toBe("acme");
  });

  it("normalizes dash-encoded paths without a duplicated tail by joining the remainder", () => {
    const events = [makeEvent({ project: "-Users-dev-src-apps-api" })];

    const [summary] = summarizeProjects(events);

    expect(summary.displayProject).toBe("apps-api");
  });

  it("collapses a dash-encoded pair of identical segments with no marker", () => {
    const events = [makeEvent({ project: "-acme-acme" })];

    const [summary] = summarizeProjects(events);

    expect(summary.displayProject).toBe("acme");
  });

  it("joins dash-encoded segments with no marker and no duplication", () => {
    const events = [makeEvent({ project: "-foo-bar-baz" })];

    const [summary] = summarizeProjects(events);

    expect(summary.displayProject).toBe("foo-bar-baz");
  });

  it("sorts rawProjects merged under one displayProject alphabetically", () => {
    const events = [
      makeEvent({ project: "/Users/zeta/workspace/acme/acme" }),
      makeEvent({ project: "/Users/alpha/workspace/acme/acme" }),
    ];

    const result = summarizeProjects(events);

    expect(result[0].displayProject).toBe("acme");
    expect(result[0].rawProjects).toEqual(["/Users/alpha/workspace/acme/acme", "/Users/zeta/workspace/acme/acme"]);
  });

  it("sorts results by estimated cost descending", () => {
    const events = [
      makeEvent({ project: "cheap", estimatedCostUsd: 1 }),
      makeEvent({ project: "expensive", estimatedCostUsd: 100 }),
    ];

    const result = summarizeProjects(events);

    expect(result.map((r) => r.project)).toEqual(["expensive", "cheap"]);
  });

  it("breaks cost ties by event count descending", () => {
    const events = [
      makeEvent({ project: "few-events", estimatedCostUsd: 5 }),
      makeEvent({ project: "many-events", estimatedCostUsd: 5 }),
      makeEvent({ project: "many-events", estimatedCostUsd: 0 }),
    ];

    const result = summarizeProjects(events);

    expect(result.map((r) => r.project)).toEqual(["many-events", "few-events"]);
  });

  it("breaks cost and event ties by displayProject descending", () => {
    const events = [makeEvent({ project: "alpha" }), makeEvent({ project: "beta" })];

    const result = summarizeProjects(events);

    expect(result.map((r) => r.project)).toEqual(["beta", "alpha"]);
  });
});
