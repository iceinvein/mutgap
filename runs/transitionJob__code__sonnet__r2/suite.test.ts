import { describe, expect, it } from "vitest";
import { transitionJob, type JobStatus } from "./transitionJob";

describe("transitionJob", () => {
  const validTransitions: Array<[JobStatus, JobStatus]> = [
    ["queued", "loading_model"],
    ["queued", "cancelled"],
    ["queued", "failed"],
    ["loading_model", "planning"],
    ["loading_model", "cancelled"],
    ["loading_model", "failed"],
    ["planning", "generating"],
    ["planning", "cancelled"],
    ["planning", "failed"],
    ["generating", "encoding"],
    ["generating", "cancelled"],
    ["generating", "failed"],
    ["encoding", "cataloguing"],
    ["encoding", "cancelled"],
    ["encoding", "failed"],
    ["cataloguing", "completed"],
    ["cataloguing", "failed"],
  ];

  it.each(validTransitions)("allows %s -> %s", (current, next) => {
    expect(transitionJob(current, next)).toBe(next);
  });

  const terminalStates: JobStatus[] = ["completed", "failed", "cancelled"];

  it.each(terminalStates)("rejects any transition out of terminal state %s", (current) => {
    expect(() => transitionJob(current, "queued")).toThrow(
      /Cannot move a job from/,
    );
  });

  it("rejects skipping ahead in the pipeline", () => {
    expect(() => transitionJob("queued", "generating")).toThrow(
      /Cannot move a job from queued to generating/,
    );
  });

  it("rejects moving backwards in the pipeline", () => {
    expect(() => transitionJob("generating", "planning")).toThrow(
      /Cannot move a job from generating to planning/,
    );
  });

  it("rejects cancelling from cataloguing (not an allowed transition)", () => {
    expect(() => transitionJob("cataloguing", "cancelled")).toThrow(
      /Cannot move a job from cataloguing to cancelled/,
    );
  });

  it("throws a DomainError-shaped error with code and details", () => {
    try {
      transitionJob("queued", "completed");
      throw new Error("expected transitionJob to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const err = error as Error & { code?: string; details?: unknown };
      expect(err.name).toBe("DomainError");
      expect(err.code).toBe("INVALID_JOB_TRANSITION");
      expect(err.details).toEqual({ current: "queued", next: "completed" });
      expect(err.message).toBe(
        "INVALID_JOB_TRANSITION: Cannot move a job from queued to completed.",
      );
    }
  });
});
