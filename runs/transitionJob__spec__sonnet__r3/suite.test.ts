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

const SEQUENCE: JobStatus[] = [
  "queued",
  "loading_model",
  "planning",
  "generating",
  "encoding",
  "cataloguing",
  "completed",
];

const TERMINAL: JobStatus[] = ["completed", "failed", "cancelled"];

const NON_TERMINAL: JobStatus[] = [
  "queued",
  "loading_model",
  "planning",
  "generating",
  "encoding",
  "cataloguing",
];

const CANCELLABLE_FROM: JobStatus[] = [
  "queued",
  "loading_model",
  "planning",
  "generating",
];

function expectInvalid(current: JobStatus, next: JobStatus) {
  expect(() => transitionJob(current, next)).toThrow();
  try {
    transitionJob(current, next);
    expect.unreachable("transitionJob should have thrown");
  } catch (err) {
    const error = err as Error & { code?: unknown; details?: unknown };
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("INVALID_JOB_TRANSITION");
    expect(error.message).toBe(
      `INVALID_JOB_TRANSITION: Cannot move a job from ${current} to ${next}.`,
    );
    expect(error.details).toEqual({ current, next });
  }
}

describe("transitionJob", () => {
  describe("normal forward path", () => {
    for (let i = 0; i < SEQUENCE.length - 1; i++) {
      const current = SEQUENCE[i];
      const next = SEQUENCE[i + 1];
      it(`allows ${current} -> ${next}`, () => {
        expect(transitionJob(current, next)).toBe(next);
      });
    }
  });

  describe("failed", () => {
    for (const current of NON_TERMINAL) {
      it(`allows ${current} -> failed`, () => {
        expect(transitionJob(current, "failed")).toBe("failed");
      });
    }
  });

  describe("cancelled", () => {
    for (const current of CANCELLABLE_FROM) {
      it(`allows ${current} -> cancelled`, () => {
        expect(transitionJob(current, "cancelled")).toBe("cancelled");
      });
    }

    for (const current of ["encoding", "cataloguing"] as JobStatus[]) {
      it(`rejects ${current} -> cancelled`, () => {
        expectInvalid(current, "cancelled");
      });
    }
  });

  describe("terminal statuses allow no moves", () => {
    for (const current of TERMINAL) {
      for (const next of ALL_STATUSES) {
        it(`rejects ${current} -> ${next}`, () => {
          expectInvalid(current, next);
        });
      }
    }
  });

  describe("skipping steps", () => {
    it("rejects queued -> planning", () => {
      expectInvalid("queued", "planning");
    });

    it("rejects queued -> generating", () => {
      expectInvalid("queued", "generating");
    });

    it("rejects loading_model -> encoding", () => {
      expectInvalid("loading_model", "encoding");
    });

    it("rejects planning -> completed", () => {
      expectInvalid("planning", "completed");
    });
  });

  describe("moving backwards", () => {
    for (let i = 1; i < SEQUENCE.length; i++) {
      const current = SEQUENCE[i];
      const next = SEQUENCE[i - 1];
      it(`rejects ${current} -> ${next}`, () => {
        expectInvalid(current, next);
      });
    }
  });

  describe("self-transitions", () => {
    for (const status of ALL_STATUSES) {
      it(`rejects ${status} -> ${status}`, () => {
        expectInvalid(status, status);
      });
    }
  });
});
