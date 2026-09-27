import { describe, expect, it } from "vitest";
import { transitionJob, type JobStatus } from "./transitionJob";

const allStatuses: readonly JobStatus[] = [
  "queued",
  "loading_model",
  "planning",
  "generating",
  "encoding",
  "cataloguing",
  "completed",
  "failed",
  "cancelled",
];

const expectedAllowed: Record<JobStatus, readonly JobStatus[]> = {
  queued: ["loading_model", "cancelled", "failed"],
  loading_model: ["planning", "cancelled", "failed"],
  planning: ["generating", "cancelled", "failed"],
  generating: ["encoding", "cancelled", "failed"],
  encoding: ["cataloguing", "cancelled", "failed"],
  cataloguing: ["completed", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};

const allPairs = allStatuses.flatMap((current) =>
  allStatuses.map((next) => [current, next] as const),
);
const validPairs = allPairs.filter(([c, n]) => expectedAllowed[c].includes(n));
const invalidPairs = allPairs.filter(([c, n]) => !expectedAllowed[c].includes(n));

function captureError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("Expected function to throw");
}

describe("transitionJob", () => {
  it.each(validPairs)("allows %s -> %s and returns the next status", (current, next) => {
    expect(transitionJob(current, next)).toBe(next);
  });

  it.each(invalidPairs)("rejects %s -> %s", (current, next) => {
    expect(() => transitionJob(current, next)).toThrow(
      `INVALID_JOB_TRANSITION: Cannot move a job from ${current} to ${next}.`,
    );
  });

  it("walks the full happy path from queued to completed", () => {
    const path: JobStatus[] = [
      "loading_model",
      "planning",
      "generating",
      "encoding",
      "cataloguing",
      "completed",
    ];
    let status: JobStatus = "queued";
    for (const next of path) {
      status = transitionJob(status, next);
    }
    expect(status).toBe("completed");
  });

  it("does not allow skipping pipeline stages", () => {
    expect(() => transitionJob("queued", "planning")).toThrow();
    expect(() => transitionJob("planning", "encoding")).toThrow();
    expect(() => transitionJob("queued", "completed")).toThrow();
  });

  it("does not allow moving backwards", () => {
    expect(() => transitionJob("generating", "planning")).toThrow();
    expect(() => transitionJob("cataloguing", "queued")).toThrow();
  });

  it("does not allow self-transitions", () => {
    for (const status of allStatuses) {
      expect(() => transitionJob(status, status)).toThrow();
    }
  });

  it("does not allow cancelling once cataloguing has started", () => {
    expect(() => transitionJob("cataloguing", "cancelled")).toThrow();
  });

  it.each(["completed", "failed", "cancelled"] as const)(
    "treats %s as terminal",
    (terminal) => {
      for (const next of allStatuses) {
        expect(() => transitionJob(terminal, next)).toThrow();
      }
    },
  );

  it("throws a DomainError with code and details", () => {
    const error = captureError(() => transitionJob("completed", "queued"));

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: "DomainError",
      code: "INVALID_JOB_TRANSITION",
      message: "INVALID_JOB_TRANSITION: Cannot move a job from completed to queued.",
      details: { current: "completed", next: "queued" },
    });
  });
});
