import { expect, test } from "vitest";
import { transitionJob } from "./transitionJob";

test("an encoding job cannot be cancelled", () => {
  expect(() => transitionJob("encoding", "cancelled")).toThrow(
    "INVALID_JOB_TRANSITION: Cannot move a job from encoding to cancelled.",
  );
});

test("a generating job can be cancelled", () => {
  expect(transitionJob("generating", "cancelled")).toBe("cancelled");
});

test("each step of the normal path returns the next status", () => {
  expect(transitionJob("queued", "loading_model")).toBe("loading_model");
  expect(transitionJob("encoding", "cataloguing")).toBe("cataloguing");
  expect(transitionJob("cataloguing", "completed")).toBe("completed");
});

test("skipping a step throws with code and details", () => {
  let thrown: unknown;
  try {
    transitionJob("queued", "planning");
  } catch (e) {
    thrown = e;
  }
  expect(thrown).toBeInstanceOf(Error);
  expect(thrown).toMatchObject({ code: "INVALID_JOB_TRANSITION", details: { current: "queued", next: "planning" } });
});

test("terminal statuses allow no moves", () => {
  expect(() => transitionJob("completed", "failed")).toThrow("Cannot move a job from completed to failed.");
  expect(() => transitionJob("cancelled", "queued")).toThrow("Cannot move a job from cancelled to queued.");
});
