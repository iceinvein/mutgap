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

describe("estimateCostUsd", () => {
  it("returns 0 when the model is unknown and not in the pricing table", () => {
    const cost = estimateCostUsd(
      "unknown-model",
      { ...baseUsage, inputTokens: 1000 },
      new Map(),
    );
    expect(cost).toBe(0);
  });

  it("computes cost from fallback pricing when the model is not in the pricing table", () => {
    const cost = estimateCostUsd(
      "claude-sonnet-4-5",
      { ...baseUsage, inputTokens: 1_000_000, outputTokens: 1_000_000 },
      new Map(),
    );
    expect(cost).toBeCloseTo(3 + 15, 10);
  });

  it("prefers an exact match in the pricing table over fallback pricing", () => {
    const pricing: ModelPricing = {
      inputCostPerToken: 1,
      outputCostPerToken: 2,
      cacheWriteCostPerToken: 3,
      cacheReadCostPerToken: 4,
      webSearchCostPerRequest: 5,
      fastMultiplier: 1,
    };
    const pricingTable = new Map([["claude-sonnet-4-5", pricing]]);

    const cost = estimateCostUsd(
      "claude-sonnet-4-5",
      { ...baseUsage, inputTokens: 10 },
      pricingTable,
    );
    expect(cost).toBe(10);
  });

  it("strips an explicit YYYYMMDD date suffix before matching the pricing table", () => {
    const pricing: ModelPricing = {
      inputCostPerToken: 1,
      outputCostPerToken: 0,
      cacheWriteCostPerToken: 0,
      cacheReadCostPerToken: 0,
      webSearchCostPerRequest: 0,
      fastMultiplier: 1,
    };
    const pricingTable = new Map([["claude-sonnet-4-5", pricing]]);

    const cost = estimateCostUsd(
      "claude-sonnet-4-5-20250101",
      { ...baseUsage, inputTokens: 7 },
      pricingTable,
    );
    expect(cost).toBe(7);
  });

  it("strips an explicit YYYY-MM-DD date suffix before matching the pricing table", () => {
    const pricing: ModelPricing = {
      inputCostPerToken: 1,
      outputCostPerToken: 0,
      cacheWriteCostPerToken: 0,
      cacheReadCostPerToken: 0,
      webSearchCostPerRequest: 0,
      fastMultiplier: 1,
    };
    const pricingTable = new Map([["claude-sonnet-4-5", pricing]]);

    const cost = estimateCostUsd(
      "claude-sonnet-4-5-2025-01-01",
      { ...baseUsage, inputTokens: 7 },
      pricingTable,
    );
    expect(cost).toBe(7);
  });

  it("strips an @suffix (e.g. a region qualifier) before matching the pricing table", () => {
    const pricing: ModelPricing = {
      inputCostPerToken: 2,
      outputCostPerToken: 0,
      cacheWriteCostPerToken: 0,
      cacheReadCostPerToken: 0,
      webSearchCostPerRequest: 0,
      fastMultiplier: 1,
    };
    const pricingTable = new Map([["claude-sonnet-4-5", pricing]]);

    const cost = estimateCostUsd(
      "claude-sonnet-4-5@20250101",
      { ...baseUsage, inputTokens: 5 },
      pricingTable,
    );
    expect(cost).toBe(10);
  });

  it("falls back to canonicalized fallback pricing when only the versioned name is unknown", () => {
    const cost = estimateCostUsd(
      "claude-opus-4-1-20250815",
      { ...baseUsage, inputTokens: 1_000_000 },
      new Map(),
    );
    expect(cost).toBeCloseTo(15, 10);
  });

  it("sums input, output, cache write, cache read, and web search costs", () => {
    const pricing: ModelPricing = {
      inputCostPerToken: 1,
      outputCostPerToken: 2,
      cacheWriteCostPerToken: 3,
      cacheReadCostPerToken: 4,
      webSearchCostPerRequest: 5,
      fastMultiplier: 1,
    };
    const pricingTable = new Map([["model-x", pricing]]);

    const cost = estimateCostUsd(
      "model-x",
      {
        inputTokens: 10,
        outputTokens: 10,
        cacheWriteTokens: 10,
        cacheReadTokens: 10,
        webSearchRequests: 2,
        speed: "standard",
      },
      pricingTable,
    );
    // 10*1 + 10*2 + 10*3 + 10*4 + 2*5 = 110
    expect(cost).toBe(110);
  });

  it("applies fastMultiplier when speed is standard", () => {
    const pricing: ModelPricing = {
      inputCostPerToken: 1,
      outputCostPerToken: 0,
      cacheWriteCostPerToken: 0,
      cacheReadCostPerToken: 0,
      webSearchCostPerRequest: 0,
      fastMultiplier: 2.5,
    };
    const pricingTable = new Map([["model-x", pricing]]);

    const cost = estimateCostUsd(
      "model-x",
      { ...baseUsage, inputTokens: 10, speed: "standard" },
      pricingTable,
    );
    expect(cost).toBe(25);
  });

  it("does not apply fastMultiplier when speed is fast", () => {
    const pricing: ModelPricing = {
      inputCostPerToken: 1,
      outputCostPerToken: 0,
      cacheWriteCostPerToken: 0,
      cacheReadCostPerToken: 0,
      webSearchCostPerRequest: 0,
      fastMultiplier: 2.5,
    };
    const pricingTable = new Map([["model-x", pricing]]);

    const cost = estimateCostUsd(
      "model-x",
      { ...baseUsage, inputTokens: 10, speed: "fast" },
      pricingTable,
    );
    expect(cost).toBe(10);
  });

  it("returns 0 for all-zero usage even with valid pricing", () => {
    const pricing: ModelPricing = {
      inputCostPerToken: 1,
      outputCostPerToken: 1,
      cacheWriteCostPerToken: 1,
      cacheReadCostPerToken: 1,
      webSearchCostPerRequest: 1,
      fastMultiplier: 1,
    };
    const pricingTable = new Map([["model-x", pricing]]);

    const cost = estimateCostUsd("model-x", baseUsage, pricingTable);
    expect(cost).toBe(0);
  });
});
