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

const HAPPY_PATH: JobStatus[] = [
  "queued",
  "loading_model",
  "planning",
  "generating",
  "encoding",
  "cataloguing",
  "completed",
];

const TERMINAL: JobStatus[] = ["completed", "failed", "cancelled"];
const NON_TERMINAL = ALL_STATUSES.filter((s) => !TERMINAL.includes(s));
const CANCELLABLE: JobStatus[] = ["queued", "loading_model", "planning", "generating"];

const ALLOWED = new Set<string>([
  ...HAPPY_PATH.slice(0, -1).map((s, i) => `${s}->${HAPPY_PATH[i + 1]}`),
  ...NON_TERMINAL.map((s) => `${s}->failed`),
  ...CANCELLABLE.map((s) => `${s}->cancelled`),
]);

const ALL_PAIRS = ALL_STATUSES.flatMap((current) =>
  ALL_STATUSES.map((next) => [current, next] as [JobStatus, JobStatus]),
);
const ALLOWED_PAIRS = ALL_PAIRS.filter(([c, n]) => ALLOWED.has(`${c}->${n}`));
const REJECTED_PAIRS = ALL_PAIRS.filter(([c, n]) => !ALLOWED.has(`${c}->${n}`));

function captureError(fn: () => unknown): any {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error("expected function to throw");
}

function expectInvalid(current: JobStatus, next: JobStatus) {
  const err = captureError(() => transitionJob(current, next));
  expect(err).toBeInstanceOf(Error);
  expect(err.code).toBe("INVALID_JOB_TRANSITION");
  expect(err.message).toBe(
    `INVALID_JOB_TRANSITION: Cannot move a job from ${current} to ${next}.`,
  );
  expect(err.details).toEqual({ current, next });
}

describe("transitionJob", () => {
  it("has exactly 16 allowed transitions", () => {
    // 6 happy-path steps + 6 moves to failed + 4 moves to cancelled
    expect(ALLOWED_PAIRS).toHaveLength(16);
  });

  describe("happy path", () => {
    it.each(HAPPY_PATH.slice(0, -1).map((s, i) => [s, HAPPY_PATH[i + 1]]))(
      "allows %s -> %s and returns next",
      (current, next) => {
        expect(transitionJob(current as JobStatus, next as JobStatus)).toBe(next);
      },
    );

    it("can walk the full path from queued to completed", () => {
      let status: JobStatus = "queued";
      for (const next of HAPPY_PATH.slice(1)) {
        status = transitionJob(status, next);
      }
      expect(status).toBe("completed");
    });
  });

  describe("failure", () => {
    it.each(NON_TERMINAL)("allows %s -> failed", (current) => {
      expect(transitionJob(current, "failed")).toBe("failed");
    });

    it.each(TERMINAL)("rejects %s -> failed", (current) => {
      expectInvalid(current, "failed");
    });
  });

  describe("cancellation", () => {
    it.each(CANCELLABLE)("allows %s -> cancelled", (current) => {
      expect(transitionJob(current, "cancelled")).toBe("cancelled");
    });

    it.each(["encoding", "cataloguing"] as JobStatus[])(
      "rejects %s -> cancelled",
      (current) => {
        expectInvalid(current, "cancelled");
      },
    );
  });

  describe("terminal statuses", () => {
    it.each(TERMINAL.flatMap((c) => ALL_STATUSES.map((n) => [c, n])))(
      "rejects %s -> %s",
      (current, next) => {
        expectInvalid(current as JobStatus, next as JobStatus);
      },
    );
  });

  describe("specific rejections", () => {
    it("rejects skipping a step (queued -> planning)", () => {
      expectInvalid("queued", "planning");
    });

    it("rejects jumping straight to completed", () => {
      expectInvalid("queued", "completed");
      expectInvalid("encoding", "completed");
    });

    it("rejects moving backwards", () => {
      expectInvalid("loading_model", "queued");
      expectInvalid("cataloguing", "encoding");
      expectInvalid("generating", "planning");
    });

    it.each(ALL_STATUSES)("rejects self-transition %s -> %s", (status) => {
      expectInvalid(status, status);
    });
  });

  describe("full transition matrix", () => {
    it.each(ALLOWED_PAIRS)("allows %s -> %s", (current, next) => {
      expect(transitionJob(current, next)).toBe(next);
    });

    it.each(REJECTED_PAIRS)("rejects %s -> %s", (current, next) => {
      expectInvalid(current, next);
    });
  });
});
