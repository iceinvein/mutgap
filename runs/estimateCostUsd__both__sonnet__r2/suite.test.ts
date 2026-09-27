import { describe, expect, it } from "vitest";
import { estimateCostUsd, type ModelPricing } from "./estimateCostUsd";

const zeroUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheWriteTokens: 0,
  cacheReadTokens: 0,
  webSearchRequests: 0,
  speed: "standard" as const,
};

function pricing(overrides: Partial<ModelPricing> = {}): ModelPricing {
  return {
    inputCostPerToken: 1,
    outputCostPerToken: 2,
    cacheWriteCostPerToken: 3,
    cacheReadCostPerToken: 4,
    webSearchCostPerRequest: 5,
    fastMultiplier: 1,
    ...overrides,
  };
}

describe("estimateCostUsd", () => {
  it("returns 0 when no pricing entry matches", () => {
    const cost = estimateCostUsd("totally-unknown-model", zeroUsage, new Map());
    expect(cost).toBe(0);
  });

  it("sums each usage count times its per-unit price", () => {
    const table = new Map([["my-model", pricing()]]);
    const usage = {
      inputTokens: 10,
      outputTokens: 20,
      cacheWriteTokens: 30,
      cacheReadTokens: 40,
      webSearchRequests: 50,
      speed: "standard" as const,
    };
    // 10*1 + 20*2 + 30*3 + 40*4 + 50*5 = 10+40+90+160+250 = 550
    expect(estimateCostUsd("my-model", usage, table)).toBe(550);
  });

  it("uses the pricing table exact model name match first", () => {
    const table = new Map([["my-model", pricing({ inputCostPerToken: 100 })]]);
    const usage = { ...zeroUsage, inputTokens: 2 };
    expect(estimateCostUsd("my-model", usage, table)).toBe(200);
  });

  it("falls back to the canonical name in the pricing table", () => {
    const table = new Map([["my-model", pricing({ inputCostPerToken: 100 })]]);
    const usage = { ...zeroUsage, inputTokens: 2 };
    expect(estimateCostUsd("my-model-20240101", usage, table)).toBe(200);
  });

  it("prefers an exact pricing-table match over the canonical pricing-table match", () => {
    const table = new Map([
      ["my-model", pricing({ inputCostPerToken: 100 })],
      ["my-model-20240101", pricing({ inputCostPerToken: 1 })],
    ]);
    const usage = { ...zeroUsage, inputTokens: 2 };
    expect(estimateCostUsd("my-model-20240101", usage, table)).toBe(2);
  });

  it("falls back to the built-in exact name when the pricing table has no entry", () => {
    const usage = { ...zeroUsage, inputTokens: 1_000_000 };
    expect(estimateCostUsd("claude-sonnet-4-5", usage, new Map())).toBe(3);
  });

  it("falls back to the built-in canonical name when the pricing table has no entry", () => {
    const usage = { ...zeroUsage, inputTokens: 1_000_000 };
    expect(estimateCostUsd("claude-3-5-haiku-20241022", usage, new Map())).toBeCloseTo(0.8);
  });

  it("prefers a pricing-table canonical match over a built-in exact match", () => {
    const table = new Map([
      ["claude-sonnet-4-5", pricing({ inputCostPerToken: 0.000123 })],
    ]);
    const usage = { ...zeroUsage, inputTokens: 1 };
    expect(estimateCostUsd("claude-sonnet-4-5-20250101", usage, table)).toBeCloseTo(0.000123);
  });

  it("strips everything from the first @ before checking the canonical fallback", () => {
    const usage = { ...zeroUsage, inputTokens: 1_000_000 };
    expect(estimateCostUsd("claude-sonnet-4-5@20250101", usage, new Map())).toBe(3);
  });

  it("strips an @ suffix combined with a dated suffix", () => {
    const usage = { ...zeroUsage, inputTokens: 1_000_000 };
    expect(estimateCostUsd("claude-3-5-haiku-20241022@snapshot", usage, new Map())).toBeCloseTo(0.8);
  });

  it("strips a YYYY-MM-DD dated suffix as well as YYYYMMDD", () => {
    const usage = { ...zeroUsage, inputTokens: 1_000_000 };
    expect(estimateCostUsd("claude-sonnet-4-5-2025-01-01", usage, new Map())).toBe(3);
  });

  it("does not do prefix or fuzzy matching", () => {
    const usage = { ...zeroUsage, inputTokens: 1_000_000 };
    expect(estimateCostUsd("claude-sonnet-4-5-turbo", usage, new Map())).toBe(0);
  });

  it("does not strip a non-date trailing suffix", () => {
    const usage = { ...zeroUsage, inputTokens: 1_000_000 };
    expect(estimateCostUsd("claude-sonnet-4-5-preview", usage, new Map())).toBe(0);
  });

  for (const [model, input, output, cacheWrite, cacheRead] of [
    ["claude-opus-4-1", 15, 75, 18.75, 1.5],
    ["claude-sonnet-4-5", 3, 15, 3.75, 0.3],
    ["claude-3-5-haiku", 0.8, 4, 1, 0.08],
    ["gpt-4o", 2.5, 10, 2.5, 1.25],
    ["gpt-4o-mini", 0.15, 0.6, 0.15, 0.075],
  ] as const) {
    it(`has the documented fallback prices for ${model}`, () => {
      const usage = {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cacheWriteTokens: 1_000_000,
        cacheReadTokens: 1_000_000,
        webSearchRequests: 1,
        speed: "standard" as const,
      };
      const expected = input + output + cacheWrite + cacheRead + 0.01;
      expect(estimateCostUsd(model, usage, new Map())).toBeCloseTo(expected);
    });
  }

  it("uses standard pricing as-is when speed is 'standard'", () => {
    const table = new Map([
      ["my-model", pricing({ inputCostPerToken: 10, fastMultiplier: 4 })],
    ]);
    const usage = { ...zeroUsage, inputTokens: 1, speed: "standard" as const };
    expect(estimateCostUsd("my-model", usage, table)).toBe(10);
  });

  it("multiplies by fastMultiplier when speed is 'fast'", () => {
    const table = new Map([
      ["my-model", pricing({ inputCostPerToken: 10, fastMultiplier: 4 })],
    ]);
    const usage = { ...zeroUsage, inputTokens: 1, speed: "fast" as const };
    expect(estimateCostUsd("my-model", usage, table)).toBe(40);
  });

  it("built-in fallback entries have a fast multiplier of 1", () => {
    const usage = { ...zeroUsage, inputTokens: 1_000_000, speed: "fast" as const };
    expect(estimateCostUsd("claude-sonnet-4-5", usage, new Map())).toBe(3);
  });
});
