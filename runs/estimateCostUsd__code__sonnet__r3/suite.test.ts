import { describe, expect, it } from "vitest";
import { estimateCostUsd, type ModelPricing } from "./estimateCostUsd";

function usage(overrides: Partial<{
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  webSearchRequests: number;
  speed: "standard" | "fast";
}> = {}) {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    webSearchRequests: 0,
    speed: "standard" as const,
    ...overrides,
  };
}

const customPricing: ModelPricing = {
  inputCostPerToken: 1e-6,
  outputCostPerToken: 2e-6,
  cacheWriteCostPerToken: 3e-6,
  cacheReadCostPerToken: 4e-6,
  webSearchCostPerRequest: 0.02,
  fastMultiplier: 1,
};

describe("estimateCostUsd", () => {
  it("returns 0 when the model is unknown and not in the fallback table", () => {
    const cost = estimateCostUsd("totally-unknown-model", usage({ inputTokens: 1000 }), new Map());
    expect(cost).toBe(0);
  });

  it("computes cost from an exact match in the provided pricing table", () => {
    const table = new Map([["my-model", customPricing]]);
    const cost = estimateCostUsd("my-model", usage({ inputTokens: 1000, outputTokens: 500 }), table);
    expect(cost).toBeCloseTo(1000 * 1e-6 + 500 * 2e-6);
  });

  it("falls back to the built-in FALLBACK_PRICING table when not in the pricing table", () => {
    const cost = estimateCostUsd("claude-sonnet-4-5", usage({ inputTokens: 1_000_000 }), new Map());
    expect(cost).toBeCloseTo(3);
  });

  it("prefers an exact snapshot match in the pricing table over the canonicalized name", () => {
    const exact: ModelPricing = { ...customPricing, inputCostPerToken: 10e-6 };
    const canonical: ModelPricing = { ...customPricing, inputCostPerToken: 20e-6 };
    const table = new Map([
      ["claude-opus-4-1-20250101", exact],
      ["claude-opus-4-1", canonical],
    ]);
    const cost = estimateCostUsd("claude-opus-4-1-20250101", usage({ inputTokens: 1000 }), table);
    expect(cost).toBeCloseTo(1000 * 10e-6);
  });

  it("canonicalizes a date-suffixed model name to match the pricing table", () => {
    const table = new Map([["claude-sonnet-4-5", customPricing]]);
    const cost = estimateCostUsd("claude-sonnet-4-5-20250101", usage({ inputTokens: 1000 }), table);
    expect(cost).toBeCloseTo(1000 * 1e-6);
  });

  it("canonicalizes an @-suffixed model name to match the pricing table", () => {
    const table = new Map([["claude-sonnet-4-5", customPricing]]);
    const cost = estimateCostUsd("claude-sonnet-4-5@20250101", usage({ inputTokens: 1000 }), table);
    expect(cost).toBeCloseTo(1000 * 1e-6);
  });

  it("canonicalizes a date-suffixed model name to match the fallback table", () => {
    const cost = estimateCostUsd(
      "claude-3-5-haiku-20241022",
      usage({ inputTokens: 1_000_000 }),
      new Map(),
    );
    expect(cost).toBeCloseTo(0.8);
  });

  it("sums input, output, cache write, cache read, and web search costs", () => {
    const table = new Map([["my-model", customPricing]]);
    const cost = estimateCostUsd(
      "my-model",
      usage({
        inputTokens: 100,
        outputTokens: 200,
        cacheWriteTokens: 300,
        cacheReadTokens: 400,
        webSearchRequests: 5,
      }),
      table,
    );
    expect(cost).toBeCloseTo(
      100 * 1e-6 + 200 * 2e-6 + 300 * 3e-6 + 400 * 4e-6 + 5 * 0.02,
    );
  });

  it("applies the fastMultiplier when speed is not 'fast'", () => {
    const table = new Map([["my-model", { ...customPricing, fastMultiplier: 2 }]]);
    const cost = estimateCostUsd(
      "my-model",
      usage({ inputTokens: 1000, speed: "standard" }),
      table,
    );
    expect(cost).toBeCloseTo(2 * 1000 * 1e-6);
  });

  it("does not apply the fastMultiplier when speed is 'fast'", () => {
    const table = new Map([["my-model", { ...customPricing, fastMultiplier: 2 }]]);
    const cost = estimateCostUsd(
      "my-model",
      usage({ inputTokens: 1000, speed: "fast" }),
      table,
    );
    expect(cost).toBeCloseTo(1000 * 1e-6);
  });

  it("returns 0 for all-zero usage against a known model", () => {
    const cost = estimateCostUsd("claude-sonnet-4-5", usage(), new Map());
    expect(cost).toBe(0);
  });
});
