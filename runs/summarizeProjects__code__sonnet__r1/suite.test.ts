import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

function makeEvent(overrides: Partial<UsageEvent> = {}): UsageEvent {
  return {
    source: "claude-code",
    project: "my-project",
    sessionId: "session-1",
    filePath: "/tmp/session-1.jsonl",
    eventKey: "event-1",
    timestamp: "2026-01-01T00:00:00.000Z",
    model: "claude-sonnet-5",
    inputTokens: 100,
    outputTokens: 50,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    webSearchRequests: 0,
    totalTokens: 150,
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
      makeEvent({ project: "my-project", estimatedCostUsd: 1, inputTokens: 100, outputTokens: 50 }),
      makeEvent({ project: "my-project", estimatedCostUsd: 2, inputTokens: 200, outputTokens: 75 }),
    ];

    const result = summarizeProjects(events);

    expect(result).toEqual([
      {
        project: "my-project",
        displayProject: "my-project",
        rawProjects: ["my-project"],
        events: 2,
        estimatedCostUsd: 3,
        totalInputTokens: 300,
        totalOutputTokens: 125,
      },
    ]);
  });

  it("leaves plain project names (no leading / or -) unchanged", () => {
    const result = summarizeProjects([makeEvent({ project: "cursor" })]);
    expect(result[0].displayProject).toBe("cursor");
  });

  it("normalizes an absolute path using the first matching marker", () => {
    const result = summarizeProjects([
      makeEvent({ project: "/Users/dev/workspace/src/my-app" }),
    ]);
    expect(result[0].displayProject).toBe("src/my-app");
  });

  it("collapses a duplicated tail segment for absolute paths", () => {
    const result = summarizeProjects([
      makeEvent({ project: "/Users/dev/projects/my-app/my-app" }),
    ]);
    expect(result[0].displayProject).toBe("my-app");
  });

  it("falls back to the last two segments when no marker is present in an absolute path", () => {
    const result = summarizeProjects([
      makeEvent({ project: "/Users/dev/somewhere/nested/my-app" }),
    ]);
    expect(result[0].displayProject).toBe("nested/my-app");
  });

  it("normalizes a dash-encoded path using the first matching marker", () => {
    const result = summarizeProjects([
      makeEvent({ project: "-Users-dev-projects-my-app" }),
    ]);
    expect(result[0].displayProject).toBe("my-app");
  });

  it("collapses a duplicated tail segment for dash-encoded paths", () => {
    const result = summarizeProjects([
      makeEvent({ project: "-workspace-foo-foo" }),
    ]);
    expect(result[0].displayProject).toBe("foo");
  });

  it("collapses a dash-encoded path with no marker when both segments match", () => {
    const result = summarizeProjects([makeEvent({ project: "-foo-foo" })]);
    expect(result[0].displayProject).toBe("foo");
  });

  it("joins a dash-encoded path with no marker when segments don't match", () => {
    const result = summarizeProjects([makeEvent({ project: "-Users-dev-my-app" })]);
    expect(result[0].displayProject).toBe("Users-dev-my-app");
  });

  it("merges raw projects that normalize to the same display name", () => {
    const events = [
      makeEvent({
        project: "-workspace-myapp-myapp",
        estimatedCostUsd: 1,
        inputTokens: 10,
        outputTokens: 5,
      }),
      makeEvent({
        project: "-projects-myapp",
        estimatedCostUsd: 2,
        inputTokens: 20,
        outputTokens: 6,
      }),
    ];

    const result = summarizeProjects(events);

    expect(result).toHaveLength(1);
    expect(result[0].displayProject).toBe("myapp");
    expect(result[0].events).toBe(2);
    expect(result[0].estimatedCostUsd).toBe(3);
    expect(result[0].totalInputTokens).toBe(30);
    expect(result[0].totalOutputTokens).toBe(11);
    // rawProjects is sorted alphabetically...
    expect(result[0].rawProjects).toEqual(["-projects-myapp", "-workspace-myapp-myapp"]);
    // ...but `project` retains the first-encountered raw project, computed before sorting.
    expect(result[0].project).toBe("-workspace-myapp-myapp");
  });

  it("sorts groups by estimated cost descending", () => {
    const events = [
      makeEvent({ project: "cheap", estimatedCostUsd: 1 }),
      makeEvent({ project: "expensive", estimatedCostUsd: 10 }),
      makeEvent({ project: "medium", estimatedCostUsd: 5 }),
    ];

    const result = summarizeProjects(events);

    expect(result.map((r) => r.displayProject)).toEqual(["expensive", "medium", "cheap"]);
  });

  it("breaks cost ties by event count descending", () => {
    const events = [
      makeEvent({ project: "fewer-events", estimatedCostUsd: 5 }),
      makeEvent({ project: "more-events", estimatedCostUsd: 5 }),
      makeEvent({ project: "more-events", estimatedCostUsd: 5 }),
    ];

    const result = summarizeProjects(events);

    expect(result.map((r) => r.displayProject)).toEqual(["more-events", "fewer-events"]);
  });

  it("breaks cost and event ties by display name descending", () => {
    const events = [
      makeEvent({ project: "alpha", estimatedCostUsd: 5 }),
      makeEvent({ project: "beta", estimatedCostUsd: 5 }),
      makeEvent({ project: "gamma", estimatedCostUsd: 5 }),
    ];

    const result = summarizeProjects(events);

    expect(result.map((r) => r.displayProject)).toEqual(["gamma", "beta", "alpha"]);
  });
});
