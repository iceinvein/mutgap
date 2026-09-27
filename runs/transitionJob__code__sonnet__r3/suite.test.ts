import { describe, expect, it } from "vitest";
import { transitionJob, type JobStatus } from "./transitionJob";

const allowedTransitions: Record<JobStatus, readonly JobStatus[]> = {
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

const allStatuses = Object.keys(allowedTransitions) as JobStatus[];

describe("transitionJob", () => {
  for (const current of allStatuses) {
    for (const next of allStatuses) {
      const isAllowed = allowedTransitions[current].includes(next);

      if (isAllowed) {
        it(`allows ${current} -> ${next}`, () => {
          expect(transitionJob(current, next)).toBe(next);
        });
      } else {
        it(`rejects ${current} -> ${next}`, () => {
          expect(() => transitionJob(current, next)).toThrow(
            `INVALID_JOB_TRANSITION: Cannot move a job from ${current} to ${next}.`,
          );
        });
      }
    }
  }

  it("throws an error with code and details for an invalid transition", () => {
    try {
      transitionJob("completed", "queued");
      expect.unreachable("expected transitionJob to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const domainError = error as Error & {
        code: string;
        details: Record<string, unknown>;
      };
      expect(domainError.name).toBe("DomainError");
      expect(domainError.code).toBe("INVALID_JOB_TRANSITION");
      expect(domainError.details).toEqual({
        current: "completed",
        next: "queued",
      });
    }
  });

  it("rejects a terminal status transitioning to itself", () => {
    expect(() => transitionJob("failed", "failed")).toThrow(
      "INVALID_JOB_TRANSITION",
    );
  });
});
