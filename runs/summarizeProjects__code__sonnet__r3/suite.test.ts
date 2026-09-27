import { describe, expect, it } from "vitest";
import { summarizeProjects, type UsageEvent } from "./summarizeProjects";

function makeEvent(overrides: Partial<UsageEvent> = {}): UsageEvent {
  return {
    source: "claude-code",
    project: "my-project",
    sessionId: "session-1",
    filePath: "/tmp/session-1.jsonl",
    eventKey: "event-1",
    timestamp: "2024-01-01T00:00:00.000Z",
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

  it("aggregates multiple events for the same project", () => {
    const events = [
      makeEvent({ project: "foo", estimatedCostUsd: 1, inputTokens: 10, outputTokens: 5 }),
      makeEvent({ project: "foo", estimatedCostUsd: 2, inputTokens: 20, outputTokens: 15 }),
    ];

    const result = summarizeProjects(events);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      project: "foo",
      displayProject: "foo",
      rawProjects: ["foo"],
      events: 2,
      estimatedCostUsd: 3,
      totalInputTokens: 30,
      totalOutputTokens: 20,
    });
  });

  it("keeps separate projects distinct", () => {
    const events = [makeEvent({ project: "foo" }), makeEvent({ project: "bar" })];

    const result = summarizeProjects(events);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.project).sort()).toEqual(["bar", "foo"]);
  });

  it("sorts results by estimatedCostUsd descending", () => {
    const events = [
      makeEvent({ project: "cheap", estimatedCostUsd: 1 }),
      makeEvent({ project: "expensive", estimatedCostUsd: 10 }),
      makeEvent({ project: "medium", estimatedCostUsd: 5 }),
    ];

    const result = summarizeProjects(events);

    expect(result.map((r) => r.project)).toEqual(["expensive", "medium", "cheap"]);
  });

  it("breaks cost ties by event count descending", () => {
    const events = [
      makeEvent({ project: "fewer-events", estimatedCostUsd: 5 }),
      makeEvent({ project: "more-events", estimatedCostUsd: 5 }),
      makeEvent({ project: "more-events", estimatedCostUsd: 0 }),
    ];

    const result = summarizeProjects(events);

    expect(result.map((r) => r.project)).toEqual(["more-events", "fewer-events"]);
  });

  it("breaks cost and event ties by displayProject descending", () => {
    const events = [makeEvent({ project: "aaa" }), makeEvent({ project: "zzz" })];

    const result = summarizeProjects(events);

    expect(result.map((r) => r.project)).toEqual(["zzz", "aaa"]);
  });

  it("normalizes absolute paths using known markers, collapsing a doubled tail", () => {
    const events = [makeEvent({ project: "/Users/dev/workspace/my-app/my-app" })];

    const result = summarizeProjects(events);

    expect(result[0].displayProject).toBe("my-app");
    expect(result[0].rawProjects).toEqual(["/Users/dev/workspace/my-app/my-app"]);
  });

  it("normalizes absolute paths using known markers, joining a distinct tail", () => {
    const events = [makeEvent({ project: "/Users/dev/workspace/team/my-app" })];

    const result = summarizeProjects(events);

    expect(result[0].displayProject).toBe("team/my-app");
  });

  it("falls back to the last two path segments when no marker is present", () => {
    const events = [makeEvent({ project: "/Users/dev/somewhere/deep/my-app" })];

    const result = summarizeProjects(events);

    expect(result[0].displayProject).toBe("deep/my-app");
  });

  it("normalizes dash-separated names using known markers with a doubled tail", () => {
    const events = [makeEvent({ project: "-Users-dev-workspace-myapp-myapp" })];

    const result = summarizeProjects(events);

    expect(result[0].displayProject).toBe("myapp");
  });

  it("normalizes dash-separated names using known markers with a distinct tail", () => {
    const events = [makeEvent({ project: "-Users-dev-workspace-team-my-app" })];

    const result = summarizeProjects(events);

    expect(result[0].displayProject).toBe("team-my-app");
  });

  it("collapses a two-part dash-separated name with matching halves", () => {
    const events = [makeEvent({ project: "-myapp-myapp" })];

    const result = summarizeProjects(events);

    expect(result[0].displayProject).toBe("myapp");
  });

  it("leaves a plain project name untouched", () => {
    const events = [makeEvent({ project: "simple-project" })];

    const result = summarizeProjects(events);

    expect(result[0].displayProject).toBe("simple-project");
  });

  it("groups raw projects that normalize to the same display name", () => {
    const events = [
      makeEvent({
        project: "/Users/dev/workspace/myapp/myapp",
        estimatedCostUsd: 1,
        inputTokens: 10,
        outputTokens: 5,
      }),
      makeEvent({
        project: "-Users-dev-workspace-myapp-myapp",
        estimatedCostUsd: 2,
        inputTokens: 20,
        outputTokens: 10,
      }),
    ];

    const result = summarizeProjects(events);

    expect(result).toHaveLength(1);
    expect(result[0].displayProject).toBe("myapp");
    expect(result[0].events).toBe(2);
    expect(result[0].estimatedCostUsd).toBe(3);
    expect(result[0].totalInputTokens).toBe(30);
    expect(result[0].totalOutputTokens).toBe(15);
    expect(result[0].rawProjects).toEqual(
      ["-Users-dev-workspace-myapp-myapp", "/Users/dev/workspace/myapp/myapp"].sort(),
    );
  });

  it("uses the first-encountered raw project as the representative project field", () => {
    const events = [
      makeEvent({ project: "/Users/dev/workspace/myapp/myapp" }),
      makeEvent({ project: "-Users-dev-workspace-myapp-myapp" }),
    ];

    const result = summarizeProjects(events);

    // "project" reflects insertion order of distinct raw projects, not the
    // alphabetically sorted "rawProjects" array.
    expect(result[0].project).toBe("/Users/dev/workspace/myapp/myapp");
    expect(result[0].rawProjects[0]).toBe("-Users-dev-workspace-myapp-myapp");
  });
});
