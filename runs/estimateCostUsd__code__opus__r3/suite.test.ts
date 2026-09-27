import { describe, expect, it } from "vitest";
import { estimateCostUsd, type ModelPricing } from "./estimateCostUsd";

type Usage = Parameters<typeof estimateCostUsd>[1];

function usage(overrides: Partial<Usage> = {}): Usage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    webSearchRequests: 0,
    speed: "standard",
    ...overrides,
  };
}

function pricing(overrides: Partial<ModelPricing> = {}): ModelPricing {
  return {
    inputCostPerToken: 1,
    outputCostPerToken: 10,
    cacheWriteCostPerToken: 100,
    cacheReadCostPerToken: 1000,
    webSearchCostPerRequest: 10000,
    fastMultiplier: 1,
    ...overrides,
  };
}

const empty = new Map<string, ModelPricing>();

describe("estimateCostUsd", () => {
  describe("cost calculation", () => {
    it("sums every usage component at its per-unit price", () => {
      const table = new Map([["m", pricing()]]);
      const cost = estimateCostUsd(
        "m",
        usage({
          inputTokens: 1,
          outputTokens: 2,
          cacheWriteTokens: 3,
          cacheReadTokens: 4,
          webSearchRequests: 5,
        }),
        table,
      );
      expect(cost).toBe(1 * 1 + 2 * 10 + 3 * 100 + 4 * 1000 + 5 * 10000);
    });

    it("returns 0 for zero usage", () => {
      const table = new Map([["m", pricing()]]);
      expect(estimateCostUsd("m", usage(), table)).toBe(0);
    });

    it("computes realistic fallback pricing for a known model", () => {
      const cost = estimateCostUsd(
        "claude-sonnet-4-5",
        usage({
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
          cacheWriteTokens: 1_000_000,
          cacheReadTokens: 1_000_000,
          webSearchRequests: 10,
        }),
        empty,
      );
      expect(cost).toBeCloseTo(3 + 15 + 3.75 + 0.3 + 0.1, 10);
    });
  });

  describe("speed multiplier", () => {
    const table = new Map([["m", pricing({ fastMultiplier: 6 })]]);

    it("applies fastMultiplier for fast requests", () => {
      expect(estimateCostUsd("m", usage({ inputTokens: 1, speed: "fast" }), table)).toBe(6);
    });

    it("does not apply fastMultiplier for standard requests", () => {
      expect(estimateCostUsd("m", usage({ inputTokens: 1, speed: "standard" }), table)).toBe(1);
    });

    it("applies the multiplier to every component", () => {
      const cost = estimateCostUsd(
        "m",
        usage({ outputTokens: 1, webSearchRequests: 1, speed: "fast" }),
        table,
      );
      expect(cost).toBe(6 * (10 + 10000));
    });
  });

  describe("pricing resolution", () => {
    it("returns 0 for an unknown model", () => {
      expect(estimateCostUsd("unknown-model", usage({ inputTokens: 1000 }), empty)).toBe(0);
    });

    it("prefers the pricing table over fallback pricing", () => {
      const table = new Map([["claude-sonnet-4-5", pricing({ inputCostPerToken: 42 })]]);
      expect(estimateCostUsd("claude-sonnet-4-5", usage({ inputTokens: 1 }), table)).toBe(42);
    });

    it("prefers an exact snapshot entry over the canonical entry", () => {
      const table = new Map([
        ["m", pricing({ inputCostPerToken: 1 })],
        ["m-20250101", pricing({ inputCostPerToken: 2 })],
      ]);
      expect(estimateCostUsd("m-20250101", usage({ inputTokens: 1 }), table)).toBe(2);
    });

    it("prefers a canonicalized table entry over an exact fallback entry", () => {
      const table = new Map([["claude-sonnet-4-5", pricing({ inputCostPerToken: 7 })]]);
      expect(
        estimateCostUsd("claude-sonnet-4-5-20250929", usage({ inputTokens: 1 }), table),
      ).toBe(7);
    });

    it("falls back to built-in pricing when the table has no match", () => {
      const table = new Map([["other", pricing()]]);
      expect(estimateCostUsd("gpt-4o", usage({ inputTokens: 1_000_000 }), table)).toBeCloseTo(2.5, 10);
    });

    it.each([
      ["compact date suffix", "claude-3-5-haiku-20241022"],
      ["ISO date suffix", "claude-3-5-haiku-2024-10-22"],
      ["@ version suffix", "claude-3-5-haiku@20241022"],
    ])("strips a %s", (_label, model) => {
      expect(estimateCostUsd(model, usage({ inputTokens: 1_000_000 }), empty)).toBeCloseTo(0.8, 10);
    });

    it("strips suffixes when looking up the pricing table", () => {
      const table = new Map([["m", pricing({ inputCostPerToken: 5 })]]);
      expect(estimateCostUsd("m@v2", usage({ inputTokens: 1 }), table)).toBe(5);
      expect(estimateCostUsd("m-2025-01-01", usage({ inputTokens: 1 }), table)).toBe(5);
    });

    it("does not prefix-match different model variants", () => {
      expect(estimateCostUsd("gpt-4o-mini", usage({ inputTokens: 1_000_000 }), empty)).toBeCloseTo(0.15, 10);
      expect(estimateCostUsd("gpt-4o-audio", usage({ inputTokens: 1_000_000 }), empty)).toBe(0);
    });

    it("does not strip non-date numeric suffixes", () => {
      const table = new Map([["m", pricing()]]);
      expect(estimateCostUsd("m-123", usage({ inputTokens: 1 }), table)).toBe(0);
    });
  });
});
