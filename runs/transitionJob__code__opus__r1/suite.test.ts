import { describe, expect, it } from "vitest";
import { transitionJob, type JobStatus } from "./transitionJob";

const allStatuses: JobStatus[] = [
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

const expectedAllowed: Record<JobStatus, JobStatus[]> = {
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

function catchError(fn: () => unknown): any {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error("Expected function to throw");
}

describe("transitionJob", () => {
  describe("valid transitions", () => {
    it.each(validPairs)("allows %s -> %s and returns the next status", (current, next) => {
      expect(transitionJob(current, next)).toBe(next);
    });

    it("walks the full happy path from queued to completed", () => {
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

  describe("invalid transitions", () => {
    it.each(invalidPairs)("rejects %s -> %s", (current, next) => {
      expect(() => transitionJob(current, next)).toThrow(
        `INVALID_JOB_TRANSITION: Cannot move a job from ${current} to ${next}.`,
      );
    });

    it.each(["completed", "failed", "cancelled"] as const)(
      "treats %s as terminal",
      (terminal) => {
        for (const next of allStatuses) {
          expect(() => transitionJob(terminal, next)).toThrow();
        }
      },
    );

    it.each(allStatuses)("rejects self-transition for %s", (status) => {
      expect(() => transitionJob(status, status)).toThrow();
    });

    it("does not allow cancelling once cataloguing", () => {
      expect(() => transitionJob("cataloguing", "cancelled")).toThrow();
    });

    it("does not allow skipping stages", () => {
      expect(() => transitionJob("queued", "planning")).toThrow();
      expect(() => transitionJob("queued", "completed")).toThrow();
    });

    it("does not allow moving backwards", () => {
      expect(() => transitionJob("generating", "planning")).toThrow();
    });
  });

  describe("error shape", () => {
    it("throws a DomainError with code, message and details", () => {
      const err = catchError(() => transitionJob("completed", "queued"));

      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe("DomainError");
      expect(err.code).toBe("INVALID_JOB_TRANSITION");
      expect(err.message).toBe(
        "INVALID_JOB_TRANSITION: Cannot move a job from completed to queued.",
      );
      expect(err.details).toEqual({ current: "completed", next: "queued" });
    });
  });
});
