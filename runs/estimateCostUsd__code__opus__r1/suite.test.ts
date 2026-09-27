import { describe, expect, it } from "vitest";
import { estimateCostUsd, type ModelPricing } from "./estimateCostUsd";

type Usage = Parameters<typeof estimateCostUsd>[1];

const ZERO_USAGE: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheWriteTokens: 0,
  cacheReadTokens: 0,
  webSearchRequests: 0,
  speed: "standard",
};

function usage(overrides: Partial<Usage>): Usage {
  return { ...ZERO_USAGE, ...overrides };
}

const CUSTOM_PRICING: ModelPricing = {
  inputCostPerToken: 1,
  outputCostPerToken: 10,
  cacheWriteCostPerToken: 100,
  cacheReadCostPerToken: 1000,
  webSearchCostPerRequest: 10000,
  fastMultiplier: 1,
};

const EMPTY_TABLE = new Map<string, ModelPricing>();

describe("estimateCostUsd", () => {
  describe("cost calculation", () => {
    it("returns 0 for zero usage", () => {
      expect(estimateCostUsd("claude-sonnet-4-5", ZERO_USAGE, EMPTY_TABLE)).toBe(0);
    });

    it("charges each usage component at its own rate", () => {
      const table = new Map([["custom", CUSTOM_PRICING]]);
      expect(estimateCostUsd("custom", usage({ inputTokens: 1 }), table)).toBe(1);
      expect(estimateCostUsd("custom", usage({ outputTokens: 1 }), table)).toBe(10);
      expect(estimateCostUsd("custom", usage({ cacheWriteTokens: 1 }), table)).toBe(100);
      expect(estimateCostUsd("custom", usage({ cacheReadTokens: 1 }), table)).toBe(1000);
      expect(estimateCostUsd("custom", usage({ webSearchRequests: 1 }), table)).toBe(10000);
    });

    it("sums all components", () => {
      const table = new Map([["custom", CUSTOM_PRICING]]);
      const cost = estimateCostUsd(
        "custom",
        usage({
          inputTokens: 1,
          outputTokens: 2,
          cacheWriteTokens: 3,
          cacheReadTokens: 4,
          webSearchRequests: 5,
        }),
        table,
      );
      expect(cost).toBe(1 + 20 + 300 + 4000 + 50000);
    });

    it("uses fallback pricing for a known model", () => {
      const cost = estimateCostUsd(
        "claude-sonnet-4-5",
        usage({
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
          cacheWriteTokens: 1_000_000,
          cacheReadTokens: 1_000_000,
          webSearchRequests: 10,
        }),
        EMPTY_TABLE,
      );
      // $3 + $15 + $3.75 + $0.30 + 10 * $0.01
      expect(cost).toBeCloseTo(22.15, 10);
    });
  });

  describe("speed multiplier", () => {
    const table = new Map([["custom", { ...CUSTOM_PRICING, fastMultiplier: 2 }]]);

    it("does not apply the fast multiplier at standard speed", () => {
      expect(
        estimateCostUsd("custom", usage({ inputTokens: 3, speed: "standard" }), table),
      ).toBe(3);
    });

    it("applies the fast multiplier at fast speed", () => {
      expect(
        estimateCostUsd("custom", usage({ inputTokens: 3, speed: "fast" }), table),
      ).toBe(6);
    });

    it("applies the fast multiplier to every component", () => {
      const cost = estimateCostUsd(
        "custom",
        usage({
          inputTokens: 1,
          outputTokens: 1,
          cacheWriteTokens: 1,
          cacheReadTokens: 1,
          webSearchRequests: 1,
          speed: "fast",
        }),
        table,
      );
      expect(cost).toBe(2 * 11111);
    });
  });

  describe("pricing resolution", () => {
    it("returns 0 for an unknown model", () => {
      expect(
        estimateCostUsd("unknown-model", usage({ inputTokens: 1000 }), EMPTY_TABLE),
      ).toBe(0);
    });

    it("prefers the pricing table over fallback pricing", () => {
      const table = new Map([["gpt-4o", CUSTOM_PRICING]]);
      expect(estimateCostUsd("gpt-4o", usage({ inputTokens: 1 }), table)).toBe(1);
    });

    it("prefers an exact snapshot entry over the canonical entry", () => {
      const table = new Map<string, ModelPricing>([
        ["custom", CUSTOM_PRICING],
        ["custom-20250101", { ...CUSTOM_PRICING, inputCostPerToken: 7 }],
      ]);
      expect(estimateCostUsd("custom-20250101", usage({ inputTokens: 1 }), table)).toBe(7);
    });

    it("prefers a canonical table entry over an exact fallback entry", () => {
      const table = new Map([["claude-opus-4-1", CUSTOM_PRICING]]);
      expect(
        estimateCostUsd("claude-opus-4-1-20250805", usage({ inputTokens: 1 }), table),
      ).toBe(1);
    });

    it.each([
      ["compact date suffix", "claude-3-5-haiku-20241022"],
      ["ISO date suffix", "claude-3-5-haiku-2024-10-22"],
      ["@version suffix", "claude-3-5-haiku@20241022"],
    ])("strips a %s to find fallback pricing", (_label, model) => {
      expect(
        estimateCostUsd(model, usage({ inputTokens: 1_000_000 }), EMPTY_TABLE),
      ).toBeCloseTo(0.8, 10);
    });

    it("strips suffixes to find pricing-table entries", () => {
      const table = new Map([["custom", CUSTOM_PRICING]]);
      expect(estimateCostUsd("custom@v2", usage({ inputTokens: 1 }), table)).toBe(1);
      expect(estimateCostUsd("custom-20250101", usage({ inputTokens: 1 }), table)).toBe(1);
    });

    it("does not prefix-match different model variants", () => {
      // "gpt-4o-mini-foo" must not resolve to gpt-4o-mini or gpt-4o.
      expect(
        estimateCostUsd("gpt-4o-mini-foo", usage({ inputTokens: 1000 }), EMPTY_TABLE),
      ).toBe(0);
    });

    it("does not strip non-date numeric suffixes", () => {
      // "-1234" is not an 8-digit or YYYY-MM-DD date, so no match.
      expect(
        estimateCostUsd("claude-sonnet-4-5-1234", usage({ inputTokens: 1000 }), EMPTY_TABLE),
      ).toBe(0);
    });
  });
});
