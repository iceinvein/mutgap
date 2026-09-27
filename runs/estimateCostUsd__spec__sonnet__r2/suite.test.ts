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
    outputCostPerToken: 1,
    cacheWriteCostPerToken: 1,
    cacheReadCostPerToken: 1,
    webSearchCostPerRequest: 1,
    fastMultiplier: 1,
    ...overrides,
  };
}

describe("estimateCostUsd", () => {
  it("returns 0 when no pricing entry matches anywhere", () => {
    const cost = estimateCostUsd(
      "totally-unknown-model",
      { ...zeroUsage, inputTokens: 1000 },
      new Map(),
    );
    expect(cost).toBe(0);
  });

  it("sums each usage count times its per-unit price", () => {
    const table = new Map([
      [
        "my-model",
        pricing({
          inputCostPerToken: 1,
          outputCostPerToken: 2,
          cacheWriteCostPerToken: 3,
          cacheReadCostPerToken: 4,
          webSearchCostPerRequest: 5,
        }),
      ],
    ]);
    const cost = estimateCostUsd(
      "my-model",
      {
        inputTokens: 10,
        outputTokens: 20,
        cacheWriteTokens: 30,
        cacheReadTokens: 40,
        webSearchRequests: 50,
        speed: "standard",
      },
      table,
    );
    // 10*1 + 20*2 + 30*3 + 40*4 + 50*5 = 10+40+90+160+250 = 550
    expect(cost).toBe(550);
  });

  it("multiplies the total by fastMultiplier when speed is fast", () => {
    const table = new Map([
      ["my-model", pricing({ inputCostPerToken: 2, fastMultiplier: 3 })],
    ]);
    const cost = estimateCostUsd(
      "my-model",
      { ...zeroUsage, inputTokens: 10, speed: "fast" },
      table,
    );
    expect(cost).toBe(60);
  });

  it("does not apply fastMultiplier when speed is standard", () => {
    const table = new Map([
      ["my-model", pricing({ inputCostPerToken: 2, fastMultiplier: 3 })],
    ]);
    const cost = estimateCostUsd(
      "my-model",
      { ...zeroUsage, inputTokens: 10, speed: "standard" },
      table,
    );
    expect(cost).toBe(20);
  });

  it("prefers the exact model name in pricingTable over everything else", () => {
    const table = new Map([
      ["claude-sonnet-4-5@20250101", pricing({ inputCostPerToken: 7 })],
      ["claude-sonnet-4-5", pricing({ inputCostPerToken: 100 })],
    ]);
    const cost = estimateCostUsd(
      "claude-sonnet-4-5@20250101",
      { ...zeroUsage, inputTokens: 1 },
      table,
    );
    expect(cost).toBe(7);
  });

  it("falls back to the canonical name in pricingTable when exact name is absent", () => {
    const table = new Map([
      ["claude-sonnet-4-5", pricing({ inputCostPerToken: 9 })],
    ]);
    const cost = estimateCostUsd(
      "claude-sonnet-4-5@20250101",
      { ...zeroUsage, inputTokens: 1 },
      table,
    );
    expect(cost).toBe(9);
  });

  it("falls back to the exact model name in built-in fallback prices", () => {
    // claude-3-5-haiku-20241022 is itself an exact fallback key candidate only
    // via canonicalization, so use a model whose raw name IS a fallback key.
    const cost = estimateCostUsd(
      "gpt-4o-mini",
      { ...zeroUsage, inputTokens: 1_000_000 },
      new Map(),
    );
    expect(cost).toBe(0.15);
  });

  it("falls back to the canonical name in built-in fallback prices", () => {
    const cost = estimateCostUsd(
      "claude-3-5-haiku-20241022",
      { ...zeroUsage, inputTokens: 1_000_000 },
      new Map(),
    );
    expect(cost).toBe(0.8);
  });

  it("prefers pricingTable exact match over fallback exact match", () => {
    const table = new Map([["gpt-4o-mini", pricing({ inputCostPerToken: 42 })]]);
    const cost = estimateCostUsd(
      "gpt-4o-mini",
      { ...zeroUsage, inputTokens: 1 },
      table,
    );
    expect(cost).toBe(42);
  });

  it("prefers pricingTable canonical match over fallback exact/canonical matches", () => {
    // "claude-3-5-haiku" is not itself a fallback key nor equal to the raw
    // model name, but is present in pricingTable directly.
    const table = new Map([
      ["claude-3-5-haiku", pricing({ inputCostPerToken: 55 })],
    ]);
    const cost = estimateCostUsd(
      "claude-3-5-haiku-20241022",
      { ...zeroUsage, inputTokens: 1 },
      table,
    );
    expect(cost).toBe(55);
  });

  it("strips everything from the first @ when computing the canonical name", () => {
    const cost = estimateCostUsd(
      "claude-opus-4-1@something-weird-20240101",
      { ...zeroUsage, inputTokens: 1_000_000 },
      new Map(),
    );
    expect(cost).toBe(15);
  });

  it("strips a trailing -YYYYMMDD date suffix when computing the canonical name", () => {
    const cost = estimateCostUsd(
      "claude-sonnet-4-5-20250101",
      { ...zeroUsage, inputTokens: 1_000_000 },
      new Map(),
    );
    expect(cost).toBe(3);
  });

  it("strips a trailing -YYYY-MM-DD date suffix when computing the canonical name", () => {
    const cost = estimateCostUsd(
      "claude-sonnet-4-5-2025-01-01",
      { ...zeroUsage, inputTokens: 1_000_000 },
      new Map(),
    );
    expect(cost).toBe(3);
  });

  it("does no prefix or fuzzy matching", () => {
    const cost = estimateCostUsd(
      "claude-sonnet-4-5-turbo",
      { ...zeroUsage, inputTokens: 1_000_000 },
      new Map(),
    );
    expect(cost).toBe(0);
  });

  it("computes fallback prices for every documented fallback model", () => {
    const cases: Array<[string, number, number, number, number]> = [
      ["claude-opus-4-1", 15, 75, 18.75, 1.5],
      ["claude-sonnet-4-5", 3, 15, 3.75, 0.3],
      ["claude-3-5-haiku", 0.8, 4, 1, 0.08],
      ["gpt-4o", 2.5, 10, 2.5, 1.25],
      ["gpt-4o-mini", 0.15, 0.6, 0.15, 0.075],
    ];
    for (const [model, input, output, cacheWrite, cacheRead] of cases) {
      expect(
        estimateCostUsd(
          model,
          { ...zeroUsage, inputTokens: 1_000_000 },
          new Map(),
        ),
      ).toBeCloseTo(input);
      expect(
        estimateCostUsd(
          model,
          { ...zeroUsage, outputTokens: 1_000_000 },
          new Map(),
        ),
      ).toBeCloseTo(output);
      expect(
        estimateCostUsd(
          model,
          { ...zeroUsage, cacheWriteTokens: 1_000_000 },
          new Map(),
        ),
      ).toBeCloseTo(cacheWrite);
      expect(
        estimateCostUsd(
          model,
          { ...zeroUsage, cacheReadTokens: 1_000_000 },
          new Map(),
        ),
      ).toBeCloseTo(cacheRead);
    }
  });

  it("charges $0.01 per web search request and uses fastMultiplier 1 for fallback entries", () => {
    const standardCost = estimateCostUsd(
      "gpt-4o",
      { ...zeroUsage, webSearchRequests: 100, speed: "standard" },
      new Map(),
    );
    expect(standardCost).toBeCloseTo(1);

    const fastCost = estimateCostUsd(
      "gpt-4o",
      { ...zeroUsage, webSearchRequests: 100, speed: "fast" },
      new Map(),
    );
    expect(fastCost).toBeCloseTo(1);
  });

  it("returns 0 for all-zero usage against a matching entry", () => {
    const table = new Map([["my-model", pricing()]]);
    expect(estimateCostUsd("my-model", zeroUsage, table)).toBe(0);
  });
});
