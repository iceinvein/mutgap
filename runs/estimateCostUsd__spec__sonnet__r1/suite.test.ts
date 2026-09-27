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

const CUSTOM_PRICING: ModelPricing = {
  inputCostPerToken: 0.001,
  outputCostPerToken: 0.002,
  cacheWriteCostPerToken: 0.003,
  cacheReadCostPerToken: 0.004,
  webSearchCostPerRequest: 0.005,
  fastMultiplier: 2,
};

const FULL_USAGE = usage({
  inputTokens: 100,
  outputTokens: 50,
  cacheWriteTokens: 20,
  cacheReadTokens: 10,
  webSearchRequests: 3,
});

describe("estimateCostUsd - cost computation", () => {
  it("sums each usage count times its per-unit price at standard speed", () => {
    const pricingTable = new Map([["custom-model", CUSTOM_PRICING]]);
    const cost = estimateCostUsd("custom-model", FULL_USAGE, pricingTable);
    // 100*0.001 + 50*0.002 + 20*0.003 + 10*0.004 + 3*0.005
    expect(cost).toBeCloseTo(0.315, 9);
  });

  it("multiplies the summed cost by fastMultiplier when speed is fast", () => {
    const pricingTable = new Map([["custom-model", CUSTOM_PRICING]]);
    const cost = estimateCostUsd(
      "custom-model",
      { ...FULL_USAGE, speed: "fast" },
      pricingTable,
    );
    expect(cost).toBeCloseTo(0.315 * 2, 9);
  });

  it("returns 0 when all usage counts are 0, even for a matched model", () => {
    const pricingTable = new Map([["custom-model", CUSTOM_PRICING]]);
    const cost = estimateCostUsd("custom-model", usage(), pricingTable);
    expect(cost).toBe(0);
  });

  it("returns 0 when the model matches nothing in pricingTable or fallback", () => {
    const cost = estimateCostUsd(
      "totally-unknown-model",
      FULL_USAGE,
      new Map(),
    );
    expect(cost).toBe(0);
  });
});

describe("estimateCostUsd - lookup precedence", () => {
  it("uses the exact model name in pricingTable when present", () => {
    const exactPricing: ModelPricing = { ...CUSTOM_PRICING, inputCostPerToken: 0.1 };
    const canonicalPricing: ModelPricing = { ...CUSTOM_PRICING, inputCostPerToken: 0.2 };
    const pricingTable = new Map([
      ["custom-model-20240101", exactPricing],
      ["custom-model", canonicalPricing],
    ]);
    const cost = estimateCostUsd(
      "custom-model-20240101",
      usage({ inputTokens: 10 }),
      pricingTable,
    );
    expect(cost).toBeCloseTo(1, 9); // 10 * 0.1 from the exact entry
  });

  it("falls back to the canonical model name in pricingTable when no exact match", () => {
    const canonicalPricing: ModelPricing = { ...CUSTOM_PRICING, inputCostPerToken: 0.2 };
    const pricingTable = new Map([["custom-model", canonicalPricing]]);
    const cost = estimateCostUsd(
      "custom-model-20240101",
      usage({ inputTokens: 10 }),
      pricingTable,
    );
    expect(cost).toBeCloseTo(2, 9); // 10 * 0.2 from the canonical entry
  });

  it("prefers a canonical pricingTable match over the built-in fallback", () => {
    // claude-opus-4-1's fallback input price is 15 / 1e6 per token; use a
    // custom price that would give a very different result if it were used.
    const pricingTable = new Map([
      ["claude-opus-4-1", { ...CUSTOM_PRICING, inputCostPerToken: 1 }],
    ]);
    const cost = estimateCostUsd(
      "claude-opus-4-1-20250514",
      usage({ inputTokens: 2 }),
      pricingTable,
    );
    expect(cost).toBeCloseTo(2, 9); // 2 * 1, not the fallback price
  });

  it("uses the exact model name in the built-in fallback prices", () => {
    const cost = estimateCostUsd(
      "gpt-4o",
      usage({ inputTokens: 1_000_000 }),
      new Map(),
    );
    expect(cost).toBeCloseTo(2.5, 9);
  });

  it("uses the canonical model name in the built-in fallback prices", () => {
    const cost = estimateCostUsd(
      "gpt-4o-2024-08-06",
      usage({ inputTokens: 1_000_000, outputTokens: 1_000_000 }),
      new Map(),
    );
    expect(cost).toBeCloseTo(2.5 + 10, 9);
  });

  it("ignores unrelated pricingTable entries and falls through to fallback prices", () => {
    const pricingTable = new Map([
      ["some-other-model", CUSTOM_PRICING],
    ]);
    const cost = estimateCostUsd(
      "gpt-4o-mini",
      usage({ inputTokens: 1_000_000 }),
      pricingTable,
    );
    expect(cost).toBeCloseTo(0.15, 9);
  });
});

describe("estimateCostUsd - canonical name derivation", () => {
  it("strips a trailing -YYYYMMDD date suffix", () => {
    const pricingTable = new Map([["claude-3-5-haiku", CUSTOM_PRICING]]);
    const cost = estimateCostUsd(
      "claude-3-5-haiku-20241022",
      usage({ inputTokens: 10 }),
      pricingTable,
    );
    expect(cost).toBeCloseTo(0.01, 9);
  });

  it("strips a trailing -YYYY-MM-DD date suffix", () => {
    const pricingTable = new Map([["claude-3-5-haiku", CUSTOM_PRICING]]);
    const cost = estimateCostUsd(
      "claude-3-5-haiku-2024-10-22",
      usage({ inputTokens: 10 }),
      pricingTable,
    );
    expect(cost).toBeCloseTo(0.01, 9);
  });

  it("strips everything from the first @ onward", () => {
    const pricingTable = new Map([["claude-3-5-haiku", CUSTOM_PRICING]]);
    const cost = estimateCostUsd(
      "claude-3-5-haiku@20241022",
      usage({ inputTokens: 10 }),
      pricingTable,
    );
    expect(cost).toBeCloseTo(0.01, 9);
  });

  it("strips from the first @ before stripping a trailing date suffix", () => {
    const pricingTable = new Map([["custom-model", CUSTOM_PRICING]]);
    const cost = estimateCostUsd(
      "custom-model-20240101@some-alias-tag",
      usage({ inputTokens: 10 }),
      pricingTable,
    );
    expect(cost).toBeCloseTo(0.01, 9);
  });

  it("does not fuzzy- or prefix-match: an unrelated model with a shared prefix does not match", () => {
    const pricingTable = new Map([["claude-3-5-haiku", CUSTOM_PRICING]]);
    const cost = estimateCostUsd(
      "claude-3-5-haiku-pro-20241022",
      usage({ inputTokens: 10 }),
      pricingTable,
    );
    expect(cost).toBe(0);
  });
});

describe("estimateCostUsd - built-in fallback price table", () => {
  const cases: Array<[string, { input: number; output: number; cacheWrite: number; cacheRead: number }]> = [
    ["claude-opus-4-1", { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 }],
    ["claude-sonnet-4-5", { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 }],
    ["claude-3-5-haiku", { input: 0.8, output: 4, cacheWrite: 1, cacheRead: 0.08 }],
    ["gpt-4o", { input: 2.5, output: 10, cacheWrite: 2.5, cacheRead: 1.25 }],
    ["gpt-4o-mini", { input: 0.15, output: 0.6, cacheWrite: 0.15, cacheRead: 0.075 }],
  ];

  it.each(cases)("prices %s per the documented fallback table", (model, price) => {
    const cost = estimateCostUsd(
      model,
      usage({
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cacheWriteTokens: 1_000_000,
        cacheReadTokens: 1_000_000,
        webSearchRequests: 1,
      }),
      new Map(),
    );
    expect(cost).toBeCloseTo(
      price.input + price.output + price.cacheWrite + price.cacheRead + 0.01,
      9,
    );
  });

  it("applies a fast multiplier of 1 to every fallback entry", () => {
    const standard = estimateCostUsd(
      "claude-sonnet-4-5",
      usage({ inputTokens: 1_000_000 }),
      new Map(),
    );
    const fast = estimateCostUsd(
      "claude-sonnet-4-5",
      usage({ inputTokens: 1_000_000, speed: "fast" }),
      new Map(),
    );
    expect(fast).toBeCloseTo(standard, 9);
  });
});
