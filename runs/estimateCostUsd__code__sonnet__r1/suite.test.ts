import { describe, expect, it } from "vitest";
import { estimateCostUsd, type ModelPricing } from "./estimateCostUsd";

const baseUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheWriteTokens: 0,
  cacheReadTokens: 0,
  webSearchRequests: 0,
  speed: "standard" as const,
};

const customPricing: ModelPricing = {
  inputCostPerToken: 1e-6,
  outputCostPerToken: 2e-6,
  cacheWriteCostPerToken: 3e-6,
  cacheReadCostPerToken: 4e-6,
  webSearchCostPerRequest: 5e-3,
  fastMultiplier: 1,
};

describe("estimateCostUsd", () => {
  it("returns 0 for an unknown model with no matching entry", () => {
    const cost = estimateCostUsd(
      "totally-unknown-model",
      { ...baseUsage, inputTokens: 1000 },
      new Map(),
    );
    expect(cost).toBe(0);
  });

  it("uses an exact match from the provided pricing table", () => {
    const pricingTable = new Map([["my-model", customPricing]]);
    const cost = estimateCostUsd(
      "my-model",
      { ...baseUsage, inputTokens: 1000, outputTokens: 500 },
      pricingTable,
    );
    expect(cost).toBeCloseTo(1000 * 1e-6 + 500 * 2e-6, 10);
  });

  it("falls back to a built-in model when not in the pricing table", () => {
    const cost = estimateCostUsd(
      "claude-sonnet-4-5",
      { ...baseUsage, inputTokens: 1_000_000, outputTokens: 1_000_000 },
      new Map(),
    );
    expect(cost).toBeCloseTo(3 + 15, 10);
  });

  it("strips an ISO date suffix to resolve a snapshot model name", () => {
    const cost = estimateCostUsd(
      "claude-sonnet-4-5-2025-01-15",
      { ...baseUsage, inputTokens: 1_000_000 },
      new Map(),
    );
    expect(cost).toBeCloseTo(3, 10);
  });

  it("strips an 8-digit date suffix to resolve a snapshot model name", () => {
    const cost = estimateCostUsd(
      "claude-sonnet-4-5-20250115",
      { ...baseUsage, inputTokens: 1_000_000 },
      new Map(),
    );
    expect(cost).toBeCloseTo(3, 10);
  });

  it("strips an @ region/provider suffix to resolve a model name", () => {
    const cost = estimateCostUsd(
      "claude-sonnet-4-5@20250115",
      { ...baseUsage, inputTokens: 1_000_000 },
      new Map(),
    );
    expect(cost).toBeCloseTo(3, 10);
  });

  it("prefers an exact snapshot match in the pricing table over canonicalization", () => {
    const snapshotPricing: ModelPricing = {
      ...customPricing,
      inputCostPerToken: 9e-6,
    };
    const pricingTable = new Map([
      ["my-model-2025-01-15", snapshotPricing],
      ["my-model", customPricing],
    ]);
    const cost = estimateCostUsd(
      "my-model-2025-01-15",
      { ...baseUsage, inputTokens: 1000 },
      pricingTable,
    );
    expect(cost).toBeCloseTo(1000 * 9e-6, 10);
  });

  it("falls back to the canonicalized name in the pricing table when no exact match exists", () => {
    const pricingTable = new Map([["my-model", customPricing]]);
    const cost = estimateCostUsd(
      "my-model-2025-01-15",
      { ...baseUsage, inputTokens: 1000 },
      pricingTable,
    );
    expect(cost).toBeCloseTo(1000 * 1e-6, 10);
  });

  it("accounts for cache write, cache read, and web search costs", () => {
    const pricingTable = new Map([["my-model", customPricing]]);
    const cost = estimateCostUsd(
      "my-model",
      {
        ...baseUsage,
        cacheWriteTokens: 100,
        cacheReadTokens: 200,
        webSearchRequests: 3,
      },
      pricingTable,
    );
    expect(cost).toBeCloseTo(100 * 3e-6 + 200 * 4e-6 + 3 * 5e-3, 10);
  });

  it("applies the fastMultiplier when speed is standard", () => {
    const pricingTable = new Map([
      ["my-model", { ...customPricing, fastMultiplier: 2 }],
    ]);
    const cost = estimateCostUsd(
      "my-model",
      { ...baseUsage, inputTokens: 1000, speed: "standard" },
      pricingTable,
    );
    expect(cost).toBeCloseTo(2 * 1000 * 1e-6, 10);
  });

  it("does not apply the fastMultiplier when speed is fast", () => {
    const pricingTable = new Map([
      ["my-model", { ...customPricing, fastMultiplier: 2 }],
    ]);
    const cost = estimateCostUsd(
      "my-model",
      { ...baseUsage, inputTokens: 1000, speed: "fast" },
      pricingTable,
    );
    expect(cost).toBeCloseTo(1000 * 1e-6, 10);
  });

  it("returns 0 when all usage values are zero", () => {
    const pricingTable = new Map([["my-model", customPricing]]);
    const cost = estimateCostUsd("my-model", baseUsage, pricingTable);
    expect(cost).toBe(0);
  });
});
