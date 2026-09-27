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

const TERMINAL: JobStatus[] = ["completed", "failed", "cancelled"];

function expectRejected(current: JobStatus, next: JobStatus) {
  expect(() => transitionJob(current, next)).toThrowError();
  try {
    transitionJob(current, next);
    throw new Error("expected transitionJob to throw");
  } catch (error) {
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
    for (let i = 0; i < NORMAL_PATH.length - 1; i++) {
      const current = NORMAL_PATH[i];
      const next = NORMAL_PATH[i + 1];
      it(`allows ${current} -> ${next}`, () => {
        expect(transitionJob(current, next)).toBe(next);
      });
    }
  });

  describe("moving to failed", () => {
    for (const current of NON_TERMINAL) {
      it(`allows ${current} -> failed`, () => {
        expect(transitionJob(current, "failed")).toBe("failed");
      });
    }
  });

  describe("moving to cancelled", () => {
    for (const current of CANCELLABLE_FROM) {
      it(`allows ${current} -> cancelled`, () => {
        expect(transitionJob(current, "cancelled")).toBe("cancelled");
      });
    }

    for (const current of ["encoding", "cataloguing"] as JobStatus[]) {
      it(`rejects ${current} -> cancelled`, () => {
        expectRejected(current, "cancelled");
      });
    }
  });

  describe("terminal statuses", () => {
    for (const current of TERMINAL) {
      for (const next of ALL_STATUSES) {
        it(`rejects ${current} -> ${next}`, () => {
          expectRejected(current, next);
        });
      }
    }
  });

  describe("skipping steps", () => {
    it("rejects queued -> planning", () => {
      expectRejected("queued", "planning");
    });

    it("rejects queued -> generating", () => {
      expectRejected("queued", "generating");
    });

    it("rejects loading_model -> encoding", () => {
      expectRejected("loading_model", "encoding");
    });

    it("rejects generating -> cataloguing", () => {
      expectRejected("generating", "cataloguing");
    });

    it("rejects cataloguing -> completed skipping nothing but from queued directly", () => {
      expectRejected("queued", "cataloguing");
    });

    it("rejects queued -> completed", () => {
      expectRejected("queued", "completed");
    });
  });

  describe("moving backwards", () => {
    it("rejects planning -> queued", () => {
      expectRejected("planning", "queued");
    });

    it("rejects generating -> planning", () => {
      expectRejected("generating", "planning");
    });

    it("rejects cataloguing -> encoding", () => {
      expectRejected("cataloguing", "encoding");
    });

    it("rejects encoding -> loading_model", () => {
      expectRejected("encoding", "loading_model");
    });
  });

  describe("self transitions", () => {
    for (const status of ALL_STATUSES) {
      it(`rejects ${status} -> ${status}`, () => {
        expectRejected(status, status);
      });
    }
  });
});
