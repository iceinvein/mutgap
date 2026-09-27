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

// Allowed moves, written out from spec.md rather than derived from the implementation.
const allowed: [JobStatus, JobStatus][] = [
  // Normal path, one step at a time.
  ["queued", "loading_model"],
  ["loading_model", "planning"],
  ["planning", "generating"],
  ["generating", "encoding"],
  ["encoding", "cataloguing"],
  ["cataloguing", "completed"],
  // Any unfinished status may fail.
  ["queued", "failed"],
  ["loading_model", "failed"],
  ["planning", "failed"],
  ["generating", "failed"],
  ["encoding", "failed"],
  ["cataloguing", "failed"],
  // Cancellation only before encoding.
  ["queued", "cancelled"],
  ["loading_model", "cancelled"],
  ["planning", "cancelled"],
  ["generating", "cancelled"],
];

const isAllowed = (current: JobStatus, next: JobStatus) =>
  allowed.some(([c, n]) => c === current && n === next);

const rejected = statuses.flatMap((current) =>
  statuses
    .filter((next) => !isAllowed(current, next))
    .map((next) => [current, next] as [JobStatus, JobStatus]),
);

function expectRejected(current: JobStatus, next: JobStatus) {
  let thrown: unknown;
  try {
    transitionJob(current, next);
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(Error);
  expect(thrown).toMatchObject({
    code: "INVALID_JOB_TRANSITION",
    message: `INVALID_JOB_TRANSITION: Cannot move a job from ${current} to ${next}.`,
  });
  expect((thrown as { details: unknown }).details).toEqual({ current, next });
}

describe("transitionJob", () => {
  describe("allowed moves return next", () => {
    it.each(allowed)("%s -> %s", (current, next) => {
      expect(transitionJob(current, next)).toBe(next);
    });
  });

  describe("every other move throws INVALID_JOB_TRANSITION", () => {
    it.each(rejected)("%s -> %s", (current, next) => {
      expectRejected(current, next);
    });
  });

  it("covers all 81 status pairs", () => {
    expect(allowed.length + rejected.length).toBe(81);
  });

  describe("specific rules from the spec", () => {
    it("rejects skipping a step", () => {
      expectRejected("queued", "planning");
      expectRejected("generating", "cataloguing");
      expectRejected("queued", "completed");
    });

    it("rejects moving backwards", () => {
      expectRejected("planning", "loading_model");
      expectRejected("cataloguing", "queued");
    });

    it.each(statuses)("rejects %s -> itself", (status) => {
      expectRejected(status, status);
    });

    it("rejects cancelling from encoding", () => {
      expectRejected("encoding", "cancelled");
    });

    it("rejects cancelling from cataloguing", () => {
      expectRejected("cataloguing", "cancelled");
    });

    it.each(["completed", "failed", "cancelled"] as JobStatus[])(
      "treats %s as terminal",
      (terminal) => {
        for (const next of statuses) expectRejected(terminal, next);
      },
    );
  });
});
