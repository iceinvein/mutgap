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

const NORMAL_PATH: JobStatus[] = [
  "queued",
  "loading_model",
  "planning",
  "generating",
  "encoding",
  "cataloguing",
  "completed",
];

const TERMINAL_STATUSES: JobStatus[] = ["completed", "failed", "cancelled"];

const CANCELLABLE_FROM: JobStatus[] = [
  "queued",
  "loading_model",
  "planning",
  "generating",
];

const NOT_FINISHED: JobStatus[] = [
  "queued",
  "loading_model",
  "planning",
  "generating",
  "encoding",
  "cataloguing",
];

function allowedNextStatuses(current: JobStatus): JobStatus[] {
  const allowed = new Set<JobStatus>();

  const stepIndex = NORMAL_PATH.indexOf(current);
  if (stepIndex >= 0 && stepIndex < NORMAL_PATH.length - 1) {
    allowed.add(NORMAL_PATH[stepIndex + 1]);
  }

  if (NOT_FINISHED.includes(current)) {
    allowed.add("failed");
  }

  if (CANCELLABLE_FROM.includes(current)) {
    allowed.add("cancelled");
  }

  return [...allowed];
}

describe("transitionJob", () => {
  describe("the normal path", () => {
    for (let i = 0; i < NORMAL_PATH.length - 1; i++) {
      const current = NORMAL_PATH[i];
      const next = NORMAL_PATH[i + 1];

      it(`allows ${current} -> ${next}`, () => {
        expect(transitionJob(current, next)).toBe(next);
      });
    }
  });

  describe("moving to failed", () => {
    for (const status of NOT_FINISHED) {
      it(`allows ${status} -> failed`, () => {
        expect(transitionJob(status, "failed")).toBe("failed");
      });
    }

    for (const status of TERMINAL_STATUSES) {
      it(`rejects ${status} -> failed`, () => {
        expect(() => transitionJob(status, "failed")).toThrow();
      });
    }
  });

  describe("moving to cancelled", () => {
    for (const status of CANCELLABLE_FROM) {
      it(`allows ${status} -> cancelled`, () => {
        expect(transitionJob(status, "cancelled")).toBe("cancelled");
      });
    }

    for (const status of ALL_STATUSES) {
      if (CANCELLABLE_FROM.includes(status)) continue;

      it(`rejects ${status} -> cancelled`, () => {
        expect(() => transitionJob(status, "cancelled")).toThrow();
      });
    }
  });

  describe("terminal statuses", () => {
    for (const terminal of TERMINAL_STATUSES) {
      for (const next of ALL_STATUSES) {
        it(`rejects ${terminal} -> ${next}`, () => {
          expect(() => transitionJob(terminal, next)).toThrow();
        });
      }
    }
  });

  describe("every other move is rejected", () => {
    for (const current of ALL_STATUSES) {
      const allowed = new Set(allowedNextStatuses(current));

      for (const next of ALL_STATUSES) {
        if (allowed.has(next)) continue;

        it(`rejects ${current} -> ${next}`, () => {
          expect(() => transitionJob(current, next)).toThrow();
        });
      }
    }
  });

  describe("self-transitions", () => {
    for (const status of ALL_STATUSES) {
      it(`rejects ${status} -> ${status}`, () => {
        expect(() => transitionJob(status, status)).toThrow();
      });
    }
  });

  describe("error shape", () => {
    it("throws an Error with code, message and details", () => {
      try {
        transitionJob("queued", "planning");
        expect.unreachable("expected transitionJob to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          "INVALID_JOB_TRANSITION: Cannot move a job from queued to planning.",
        );
        expect((error as { code: unknown }).code).toBe(
          "INVALID_JOB_TRANSITION",
        );
        expect((error as { details: unknown }).details).toEqual({
          current: "queued",
          next: "planning",
        });
      }
    });
  });
});
