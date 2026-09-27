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
  statuses.map((next) => ({ current, next })),
);
const allowedPairs = allPairs.filter(({ current, next }) =>
  allowed[current].includes(next),
);
const rejectedPairs = allPairs.filter(
  ({ current, next }) => !allowed[current].includes(next),
);

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
    it.each(allowedPairs)("allows $current -> $next", ({ current, next }) => {
      expect(transitionJob(current, next)).toBe(next);
    });

    it("follows the normal path one step at a time", () => {
      const path: JobStatus[] = [
        "queued",
        "loading_model",
        "planning",
        "generating",
        "encoding",
        "cataloguing",
        "completed",
      ];
      let status = path[0];
      for (const next of path.slice(1)) {
        status = transitionJob(status, next);
      }
      expect(status).toBe("completed");
    });
  });

  describe("rejected moves", () => {
    it.each(rejectedPairs)("rejects $current -> $next", ({ current, next }) => {
      expect(() => transitionJob(current, next)).toThrow(Error);
    });

    it.each(["encoding", "cataloguing"] as const)(
      "does not allow cancelling from %s",
      (current) => {
        expect(() => transitionJob(current, "cancelled")).toThrow();
      },
    );

    it.each(["completed", "failed", "cancelled"] as const)(
      "treats %s as terminal",
      (current) => {
        for (const next of statuses) {
          expect(() => transitionJob(current, next)).toThrow();
        }
      },
    );

    it.each(statuses)("rejects %s -> itself", (status) => {
      expect(() => transitionJob(status, status)).toThrow();
    });

    it("rejects skipping a step", () => {
      expect(() => transitionJob("queued", "planning")).toThrow();
      expect(() => transitionJob("generating", "completed")).toThrow();
    });

    it("rejects moving backwards", () => {
      expect(() => transitionJob("planning", "loading_model")).toThrow();
      expect(() => transitionJob("cataloguing", "queued")).toThrow();
    });
  });

  describe("error shape", () => {
    it("throws an Error with code, message and details", () => {
      const error = catchError(() => transitionJob("queued", "planning"));

      expect(error).toBeInstanceOf(Error);
      expect(error).toMatchObject({
        code: "INVALID_JOB_TRANSITION",
        message:
          "INVALID_JOB_TRANSITION: Cannot move a job from queued to planning.",
      });
      expect((error as { details: unknown }).details).toEqual({
        current: "queued",
        next: "planning",
      });
    });

    it.each(rejectedPairs)(
      "reports $current and $next in the error for $current -> $next",
      ({ current, next }) => {
        const error = catchError(() => transitionJob(current, next)) as Error & {
          code: string;
          details: unknown;
        };

        expect(error.code).toBe("INVALID_JOB_TRANSITION");
        expect(error.message).toBe(
          `INVALID_JOB_TRANSITION: Cannot move a job from ${current} to ${next}.`,
        );
        expect(error.details).toEqual({ current, next });
      },
    );
  });
});
