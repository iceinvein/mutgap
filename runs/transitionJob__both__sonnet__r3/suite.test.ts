import { describe, expect, it } from "vitest";
import { transitionJob, type JobStatus } from "./transitionJob";

const ALL_STATUSES: JobStatus[] = [
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

const TERMINAL_STATUSES: JobStatus[] = ["completed", "failed", "cancelled"];

function expectInvalidTransition(current: JobStatus, next: JobStatus) {
  try {
    transitionJob(current, next);
    throw new Error("expected transitionJob to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    const err = error as Error & { code?: string; details?: unknown };
    expect(err.code).toBe("INVALID_JOB_TRANSITION");
    expect(err.message).toBe(
      `INVALID_JOB_TRANSITION: Cannot move a job from ${current} to ${next}.`,
    );
    expect(err.details).toEqual({ current, next });
  }
}

describe("transitionJob", () => {
  describe("normal path", () => {
    const steps: [JobStatus, JobStatus][] = [
      ["queued", "loading_model"],
      ["loading_model", "planning"],
      ["planning", "generating"],
      ["generating", "encoding"],
      ["encoding", "cataloguing"],
      ["cataloguing", "completed"],
    ];

    it.each(steps)("allows %s to move to %s", (current, next) => {
      expect(transitionJob(current, next)).toBe(next);
    });
  });

  describe("moving to failed", () => {
    const nonTerminal: JobStatus[] = [
      "queued",
      "loading_model",
      "planning",
      "generating",
      "encoding",
      "cataloguing",
    ];

    it.each(nonTerminal)("allows %s to move to failed", (current) => {
      expect(transitionJob(current, "failed")).toBe("failed");
    });
  });

  describe("moving to cancelled", () => {
    const cancellable: JobStatus[] = [
      "queued",
      "loading_model",
      "planning",
      "generating",
    ];

    it.each(cancellable)("allows %s to move to cancelled", (current) => {
      expect(transitionJob(current, "cancelled")).toBe("cancelled");
    });

    it("rejects encoding to cancelled", () => {
      expectInvalidTransition("encoding", "cancelled");
    });

    it("rejects cataloguing to cancelled", () => {
      expectInvalidTransition("cataloguing", "cancelled");
    });
  });

  describe("terminal statuses", () => {
    it.each(TERMINAL_STATUSES)("allows no moves from %s", (current) => {
      for (const next of ALL_STATUSES) {
        expectInvalidTransition(current, next);
      }
    });
  });

  describe("rejected moves", () => {
    it("rejects skipping a step", () => {
      expectInvalidTransition("queued", "planning");
    });

    it("rejects skipping multiple steps", () => {
      expectInvalidTransition("queued", "encoding");
    });

    it("rejects moving backwards", () => {
      expectInvalidTransition("generating", "planning");
    });

    it("rejects moving from a status to itself", () => {
      for (const status of ALL_STATUSES) {
        expectInvalidTransition(status, status);
      }
    });
  });

  describe("thrown error shape", () => {
    it("throws an Error with code, message and details", () => {
      expectInvalidTransition("queued", "completed");
    });
  });
});
