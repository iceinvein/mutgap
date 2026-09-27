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

  it.each(validTransitions)(
    "allows %s -> %s",
    (current, next) => {
      expect(transitionJob(current, next)).toBe(next);
    },
  );

  const terminalStates: JobStatus[] = ["completed", "failed", "cancelled"];

  it.each(terminalStates)(
    "throws for any transition out of terminal state %s",
    (current) => {
      expect(() => transitionJob(current, "queued")).toThrow(
        /INVALID_JOB_TRANSITION/,
      );
    },
  );

  it("rejects skipping states, e.g. queued -> planning", () => {
    expect(() => transitionJob("queued", "planning")).toThrow(
      "Cannot move a job from queued to planning.",
    );
  });

  it("rejects cataloguing -> cancelled, which is not allowed", () => {
    expect(() => transitionJob("cataloguing", "cancelled")).toThrow(
      /INVALID_JOB_TRANSITION/,
    );
  });

  it("rejects moving backwards, e.g. generating -> planning", () => {
    expect(() => transitionJob("generating", "planning")).toThrow(
      /INVALID_JOB_TRANSITION/,
    );
  });

  it("rejects a no-op transition to the same state", () => {
    expect(() => transitionJob("generating", "generating")).toThrow(
      /INVALID_JOB_TRANSITION/,
    );
  });

  it("includes current and next state details on the thrown error", () => {
    try {
      transitionJob("completed", "queued");
      expect.unreachable("transitionJob should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const err = error as Error & {
        code?: string;
        details?: Record<string, unknown>;
      };
      expect(err.message).toBe(
        "INVALID_JOB_TRANSITION: Cannot move a job from completed to queued.",
      );
      expect(err.code).toBe("INVALID_JOB_TRANSITION");
      expect(err.details).toEqual({ current: "completed", next: "queued" });
    }
  });
});
