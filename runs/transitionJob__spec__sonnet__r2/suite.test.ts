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

function expectInvalid(current: JobStatus, next: JobStatus) {
  try {
    transitionJob(current, next);
    throw new Error(
      `expected transitionJob(${current}, ${next}) to throw, but it did not`,
    );
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
    const error = err as Error & { code?: unknown; details?: unknown };
    expect(error.code).toBe("INVALID_JOB_TRANSITION");
    expect(error.message).toBe(
      `INVALID_JOB_TRANSITION: Cannot move a job from ${current} to ${next}.`,
    );
    expect(error.details).toEqual({ current, next });
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

  describe("moves to failed", () => {
    const nonTerminalNonFailed = ALL_STATUSES.filter(
      (s) => !TERMINAL_STATUSES.includes(s),
    );

    for (const current of nonTerminalNonFailed) {
      it(`allows ${current} -> failed`, () => {
        expect(transitionJob(current, "failed")).toBe("failed");
      });
    }
  });

  describe("moves to cancelled", () => {
    const allowedFromCancelled: JobStatus[] = [
      "queued",
      "loading_model",
      "planning",
      "generating",
    ];

    for (const current of allowedFromCancelled) {
      it(`allows ${current} -> cancelled`, () => {
        expect(transitionJob(current, "cancelled")).toBe("cancelled");
      });
    }

    it("rejects encoding -> cancelled", () => {
      expectInvalid("encoding", "cancelled");
    });

    it("rejects cataloguing -> cancelled", () => {
      expectInvalid("cataloguing", "cancelled");
    });
  });

  describe("terminal statuses", () => {
    for (const current of TERMINAL_STATUSES) {
      for (const next of ALL_STATUSES) {
        it(`rejects ${current} -> ${next}`, () => {
          expectInvalid(current, next);
        });
      }
    }
  });

  describe("rejects skipping a step", () => {
    it("rejects queued -> planning", () => {
      expectInvalid("queued", "planning");
    });

    it("rejects loading_model -> generating", () => {
      expectInvalid("loading_model", "generating");
    });

    it("rejects queued -> completed", () => {
      expectInvalid("queued", "completed");
    });
  });

  describe("rejects moving backwards", () => {
    it("rejects planning -> loading_model", () => {
      expectInvalid("planning", "loading_model");
    });

    it("rejects encoding -> generating", () => {
      expectInvalid("encoding", "generating");
    });

    it("rejects completed -> cataloguing", () => {
      expectInvalid("completed", "cataloguing");
    });
  });

  describe("rejects moving to the same status", () => {
    for (const status of ALL_STATUSES) {
      it(`rejects ${status} -> ${status}`, () => {
        expectInvalid(status, status);
      });
    }
  });
});
