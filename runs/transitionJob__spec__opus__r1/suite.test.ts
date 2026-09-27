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

const ALLOWED: Array<[JobStatus, JobStatus]> = [
  // Normal path, one step at a time
  ["queued", "loading_model"],
  ["loading_model", "planning"],
  ["planning", "generating"],
  ["generating", "encoding"],
  ["encoding", "cataloguing"],
  ["cataloguing", "completed"],
  // Any unfinished status may fail
  ["queued", "failed"],
  ["loading_model", "failed"],
  ["planning", "failed"],
  ["generating", "failed"],
  ["encoding", "failed"],
  ["cataloguing", "failed"],
  // Cancellation only before encoding
  ["queued", "cancelled"],
  ["loading_model", "cancelled"],
  ["planning", "cancelled"],
  ["generating", "cancelled"],
];

const isAllowed = (current: JobStatus, next: JobStatus) =>
  ALLOWED.some(([c, n]) => c === current && n === next);

const REJECTED: Array<[JobStatus, JobStatus]> = ALL_STATUSES.flatMap((current) =>
  ALL_STATUSES.filter((next) => !isAllowed(current, next)).map(
    (next) => [current, next] as [JobStatus, JobStatus],
  ),
);

function captureError(fn: () => unknown): any {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error("expected function to throw");
}

function expectInvalidTransition(current: JobStatus, next: JobStatus) {
  const err = captureError(() => transitionJob(current, next));
  expect(err).toBeInstanceOf(Error);
  expect(err.code).toBe("INVALID_JOB_TRANSITION");
  expect(err.message).toBe(
    `INVALID_JOB_TRANSITION: Cannot move a job from ${current} to ${next}.`,
  );
  expect(err.details).toEqual({ current, next });
}

describe("transitionJob", () => {
  describe("allowed transitions", () => {
    it.each(ALLOWED)("allows %s -> %s and returns next", (current, next) => {
      expect(transitionJob(current, next)).toBe(next);
    });
  });

  describe("normal path", () => {
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
      let status: JobStatus = path[0];
      for (const next of path.slice(1)) {
        status = transitionJob(status, next);
      }
      expect(status).toBe("completed");
    });
  });

  describe("skipping steps", () => {
    it.each<[JobStatus, JobStatus]>([
      ["queued", "planning"],
      ["queued", "generating"],
      ["queued", "completed"],
      ["loading_model", "generating"],
      ["planning", "encoding"],
      ["generating", "cataloguing"],
      ["generating", "completed"],
      ["encoding", "completed"],
    ])("rejects %s -> %s", expectInvalidTransition);
  });

  describe("moving backwards", () => {
    it.each<[JobStatus, JobStatus]>([
      ["loading_model", "queued"],
      ["planning", "loading_model"],
      ["generating", "planning"],
      ["encoding", "generating"],
      ["cataloguing", "encoding"],
      ["cataloguing", "queued"],
    ])("rejects %s -> %s", expectInvalidTransition);
  });

  describe("self transitions", () => {
    it.each(ALL_STATUSES.map((s) => [s, s] as [JobStatus, JobStatus]))(
      "rejects %s -> %s",
      expectInvalidTransition,
    );
  });

  describe("cancellation", () => {
    it.each<[JobStatus, JobStatus]>([
      ["encoding", "cancelled"],
      ["cataloguing", "cancelled"],
    ])("rejects %s -> %s", expectInvalidTransition);
  });

  describe("terminal statuses", () => {
    const terminal: JobStatus[] = ["completed", "failed", "cancelled"];
    for (const current of terminal) {
      it.each(ALL_STATUSES.map((next) => [current, next] as [JobStatus, JobStatus]))(
        "rejects %s -> %s",
        expectInvalidTransition,
      );
    }
  });

  describe("full transition matrix", () => {
    it("covers every pair of statuses", () => {
      expect(ALLOWED.length + REJECTED.length).toBe(ALL_STATUSES.length ** 2);
    });

    it.each(REJECTED)("rejects %s -> %s", expectInvalidTransition);
  });

  describe("error shape", () => {
    it("throws an Error with code, message and details", () => {
      const err = captureError(() => transitionJob("queued", "planning"));
      expect(err).toBeInstanceOf(Error);
      expect(err).toMatchObject({
        code: "INVALID_JOB_TRANSITION",
        message: "INVALID_JOB_TRANSITION: Cannot move a job from queued to planning.",
        details: { current: "queued", next: "planning" },
      });
    });

    it("reports details as exactly { current, next }", () => {
      const err = captureError(() => transitionJob("completed", "queued"));
      expect(err.details).toStrictEqual({ current: "completed", next: "queued" });
    });
  });
});
