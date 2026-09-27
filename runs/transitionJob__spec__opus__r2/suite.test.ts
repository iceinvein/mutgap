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

// The complete set of allowed moves, as described in spec.md.
const ALLOWED: Record<JobStatus, JobStatus[]> = {
  queued: ["loading_model", "failed", "cancelled"],
  loading_model: ["planning", "failed", "cancelled"],
  planning: ["generating", "failed", "cancelled"],
  generating: ["encoding", "failed", "cancelled"],
  encoding: ["cataloguing", "failed"],
  cataloguing: ["completed", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};

const allPairs = ALL_STATUSES.flatMap((current) =>
  ALL_STATUSES.map((next) => [current, next] as const),
);
const allowedPairs = allPairs.filter(([c, n]) => ALLOWED[c].includes(n));
const rejectedPairs = allPairs.filter(([c, n]) => !ALLOWED[c].includes(n));

function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error("expected function to throw");
}

function expectInvalidTransition(current: JobStatus, next: JobStatus) {
  const err = catchError(() => transitionJob(current, next)) as Error & {
    code?: unknown;
    details?: unknown;
  };
  expect(err).toBeInstanceOf(Error);
  expect(err.code).toBe("INVALID_JOB_TRANSITION");
  expect(err.message).toBe(
    `INVALID_JOB_TRANSITION: Cannot move a job from ${current} to ${next}.`,
  );
  expect(err.details).toEqual({ current, next });
}

describe("transitionJob", () => {
  describe("normal path", () => {
    it("walks queued through to completed one step at a time", () => {
      const path: JobStatus[] = [
        "queued",
        "loading_model",
        "planning",
        "generating",
        "encoding",
        "cataloguing",
        "completed",
      ];
      let status = path[0];
      for (const next of path.slice(1)) {
        status = transitionJob(status, next);
        expect(status).toBe(next);
      }
    });
  });

  describe("failing", () => {
    it.each([
      "queued",
      "loading_model",
      "planning",
      "generating",
      "encoding",
      "cataloguing",
    ] as JobStatus[])("allows %s -> failed", (current) => {
      expect(transitionJob(current, "failed")).toBe("failed");
    });
  });

  describe("cancelling", () => {
    it.each(["queued", "loading_model", "planning", "generating"] as JobStatus[])(
      "allows %s -> cancelled",
      (current) => {
        expect(transitionJob(current, "cancelled")).toBe("cancelled");
      },
    );

    it.each(["encoding", "cataloguing"] as JobStatus[])(
      "rejects %s -> cancelled",
      (current) => {
        expectInvalidTransition(current, "cancelled");
      },
    );
  });

  describe("terminal statuses", () => {
    const terminal: JobStatus[] = ["completed", "failed", "cancelled"];
    const cases = terminal.flatMap((current) =>
      ALL_STATUSES.map((next) => [current, next] as const),
    );

    it.each(cases)("rejects %s -> %s", (current, next) => {
      expectInvalidTransition(current, next);
    });
  });

  describe("specific rejections", () => {
    it("rejects skipping a step", () => {
      expectInvalidTransition("queued", "planning");
      expectInvalidTransition("loading_model", "generating");
      expectInvalidTransition("generating", "cataloguing");
      expectInvalidTransition("encoding", "completed");
      expectInvalidTransition("queued", "completed");
    });

    it("rejects moving backwards", () => {
      expectInvalidTransition("loading_model", "queued");
      expectInvalidTransition("generating", "planning");
      expectInvalidTransition("cataloguing", "encoding");
      expectInvalidTransition("cataloguing", "queued");
    });

    it.each(ALL_STATUSES)("rejects %s -> itself", (status) => {
      expectInvalidTransition(status, status);
    });
  });

  describe("full transition matrix", () => {
    it.each(allowedPairs)("allows %s -> %s and returns next", (current, next) => {
      expect(transitionJob(current, next)).toBe(next);
    });

    it.each(rejectedPairs)("rejects %s -> %s", (current, next) => {
      expectInvalidTransition(current, next);
    });

    it("has exactly 16 allowed moves out of 81", () => {
      expect(allowedPairs).toHaveLength(16);
      expect(rejectedPairs).toHaveLength(65);
    });
  });

  describe("error shape", () => {
    it("throws an Error with code, message and details", () => {
      const err = catchError(() => transitionJob("queued", "planning"));
      expect(err).toBeInstanceOf(Error);
      expect(err).toMatchObject({
        code: "INVALID_JOB_TRANSITION",
        message:
          "INVALID_JOB_TRANSITION: Cannot move a job from queued to planning.",
        details: { current: "queued", next: "planning" },
      });
    });

    it("details contains exactly current and next", () => {
      const err = catchError(() => transitionJob("completed", "queued")) as {
        details: unknown;
      };
      expect(err.details).toStrictEqual({ current: "completed", next: "queued" });
    });
  });
});
