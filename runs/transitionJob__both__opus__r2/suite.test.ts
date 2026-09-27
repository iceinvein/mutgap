import { describe, expect, it } from "vitest";
import { transitionJob, type JobStatus } from "./transitionJob";

const statuses: JobStatus[] = [
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

// Allowed moves as described in spec.md.
const allowed: Record<JobStatus, JobStatus[]> = {
  queued: ["loading_model", "failed", "cancelled"],
  loading_model: ["planning", "failed", "cancelled"],
  planning: ["generating", "failed", "cancelled"],
  generating: ["encoding", "failed", "cancelled"],
  encoding: ["cataloguing", "failed"],
  cataloguing: ["completed", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};

const allPairs = statuses.flatMap((current) =>
  statuses.map((next) => [current, next] as const),
);
const validPairs = allPairs.filter(([c, n]) => allowed[c].includes(n));
const invalidPairs = allPairs.filter(([c, n]) => !allowed[c].includes(n));

function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("Expected function to throw");
}

describe("transitionJob", () => {
  describe("allowed moves", () => {
    it.each(validPairs)("allows %s -> %s and returns next", (current, next) => {
      expect(transitionJob(current, next)).toBe(next);
    });
  });

  describe("rejected moves", () => {
    it.each(invalidPairs)("rejects %s -> %s", (current, next) => {
      const error = catchError(() => transitionJob(current, next));
      expect(error).toBeInstanceOf(Error);
      expect(error).toMatchObject({
        code: "INVALID_JOB_TRANSITION",
        message: `INVALID_JOB_TRANSITION: Cannot move a job from ${current} to ${next}.`,
      });
      expect((error as { details: unknown }).details).toEqual({ current, next });
    });
  });

  it("walks the normal path one step at a time", () => {
    const path: JobStatus[] = [
      "queued",
      "loading_model",
      "planning",
      "generating",
      "encoding",
      "cataloguing",
      "completed",
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(transitionJob(path[i], path[i + 1])).toBe(path[i + 1]);
    }
  });

  it("rejects skipping a step", () => {
    expect(() => transitionJob("queued", "planning")).toThrow(
      "INVALID_JOB_TRANSITION: Cannot move a job from queued to planning.",
    );
  });

  it("rejects moving backwards", () => {
    expect(() => transitionJob("generating", "planning")).toThrow(
      "INVALID_JOB_TRANSITION: Cannot move a job from generating to planning.",
    );
  });

  it.each(statuses)("rejects moving %s to itself", (status) => {
    expect(() => transitionJob(status, status)).toThrow(/INVALID_JOB_TRANSITION/);
  });

  it.each(["queued", "loading_model", "planning", "generating", "encoding", "cataloguing"] as const)(
    "allows %s -> failed",
    (status) => {
      expect(transitionJob(status, "failed")).toBe("failed");
    },
  );

  it.each(["encoding", "cataloguing"] as const)("rejects %s -> cancelled", (status) => {
    expect(() => transitionJob(status, "cancelled")).toThrow(
      `INVALID_JOB_TRANSITION: Cannot move a job from ${status} to cancelled.`,
    );
  });

  it.each(["completed", "failed", "cancelled"] as const)(
    "%s is terminal and allows no moves",
    (terminal) => {
      for (const next of statuses) {
        expect(() => transitionJob(terminal, next)).toThrow(/INVALID_JOB_TRANSITION/);
      }
    },
  );
});
