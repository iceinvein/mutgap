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

const terminalStatuses: JobStatus[] = ["completed", "failed", "cancelled"];

const nonTerminalStatuses: JobStatus[] = [
  "queued",
  "loading_model",
  "planning",
  "generating",
  "encoding",
  "cataloguing",
];

const cancellableStatuses: JobStatus[] = [
  "queued",
  "loading_model",
  "planning",
  "generating",
];

const notCancellableNonTerminal: JobStatus[] = ["encoding", "cataloguing"];

function expectInvalidTransition(current: JobStatus, next: JobStatus) {
  try {
    transitionJob(current, next);
    throw new Error("expected transitionJob to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    const err = error as Error & {
      code?: string;
      details?: unknown;
    };
    expect(err.code).toBe("INVALID_JOB_TRANSITION");
    expect(err.message).toBe(
      `INVALID_JOB_TRANSITION: Cannot move a job from ${current} to ${next}.`,
    );
    expect(err.details).toEqual({ current, next });
  }
}

describe("transitionJob", () => {
  describe("the normal path", () => {
    const steps: [JobStatus, JobStatus][] = [
      ["queued", "loading_model"],
      ["loading_model", "planning"],
      ["planning", "generating"],
      ["generating", "encoding"],
      ["encoding", "cataloguing"],
      ["cataloguing", "completed"],
    ];

    it.each(steps)("allows %s -> %s", (current, next) => {
      expect(transitionJob(current, next)).toBe(next);
    });
  });

  describe("moving to failed", () => {
    it.each(nonTerminalStatuses)(
      "is allowed from %s",
      (current) => {
        expect(transitionJob(current, "failed")).toBe("failed");
      },
    );
  });

  describe("moving to cancelled", () => {
    it.each(cancellableStatuses)("is allowed from %s", (current) => {
      expect(transitionJob(current, "cancelled")).toBe("cancelled");
    });

    it.each(notCancellableNonTerminal)("is rejected from %s", (current) => {
      expectInvalidTransition(current, "cancelled");
    });
  });

  describe("terminal statuses", () => {
    it.each(terminalStatuses)(
      "allows no moves out of %s",
      (current) => {
        for (const next of allStatuses) {
          expectInvalidTransition(current, next);
        }
      },
    );
  });

  it("rejects skipping a step", () => {
    expectInvalidTransition("queued", "planning");
  });

  it("rejects moving backwards", () => {
    expectInvalidTransition("planning", "loading_model");
  });

  it.each(allStatuses)("rejects moving from %s to itself", (status) => {
    expectInvalidTransition(status, status);
  });

  it("throws an error with code, message and details", () => {
    expectInvalidTransition("queued", "encoding");
  });
});
