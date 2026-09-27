import { describe, expect, it } from "vitest";
import { estimateCostUsd, type ModelPricing } from "./estimateCostUsd";

type Usage = Parameters<typeof estimateCostUsd>[1];

const zeroUsage: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheWriteTokens: 0,
  cacheReadTokens: 0,
  webSearchRequests: 0,
  speed: "standard",
};

function usage(overrides: Partial<Usage>): Usage {
  return { ...zeroUsage, ...overrides };
}

const customPricing: ModelPricing = {
  inputCostPerToken: 1,
  outputCostPerToken: 10,
  cacheWriteCostPerToken: 100,
  cacheReadCostPerToken: 1000,
  webSearchCostPerRequest: 10000,
  fastMultiplier: 1,
};

const emptyTable = new Map<string, ModelPricing>();

describe("estimateCostUsd", () => {
  describe("cost components", () => {
    const table = new Map([["custom-model", customPricing]]);

    it("returns 0 for zero usage", () => {
      expect(estimateCostUsd("custom-model", zeroUsage, table)).toBe(0);
    });

    it.each([
      ["inputTokens", 1],
      ["outputTokens", 10],
      ["cacheWriteTokens", 100],
      ["cacheReadTokens", 1000],
      ["webSearchRequests", 10000],
    ] as const)("charges %s at its per-unit rate", (field, rate) => {
      expect(estimateCostUsd("custom-model", usage({ [field]: 3 }), table)).toBe(3 * rate);
    });

    it("sums all components", () => {
      const result = estimateCostUsd(
        "custom-model",
        usage({
          inputTokens: 1,
          outputTokens: 2,
          cacheWriteTokens: 3,
          cacheReadTokens: 4,
          webSearchRequests: 5,
        }),
        table,
      );
      expect(result).toBe(1 + 20 + 300 + 4000 + 50000);
    });
  });

  describe("speed multiplier", () => {
    const table = new Map([["custom-model", { ...customPricing, fastMultiplier: 2 }]]);
    const u = { inputTokens: 5, outputTokens: 1 };

    it("does not apply the fast multiplier at standard speed", () => {
      expect(estimateCostUsd("custom-model", usage({ ...u, speed: "standard" }), table)).toBe(15);
    });

    it("applies the fast multiplier at fast speed", () => {
      expect(estimateCostUsd("custom-model", usage({ ...u, speed: "fast" }), table)).toBe(30);
    });
  });

  describe("fallback pricing", () => {
    it("uses built-in pricing when the table has no entry", () => {
      // claude-sonnet-4-5: $3/M input, $15/M output
      const result = estimateCostUsd(
        "claude-sonnet-4-5",
        usage({ inputTokens: 1_000_000, outputTokens: 1_000_000 }),
        emptyTable,
      );
      expect(result).toBeCloseTo(18, 10);
    });

    it("prices cache and web search usage from built-in pricing", () => {
      // gpt-4o: $2.5/M cache write, $1.25/M cache read, $0.01 per search
      const result = estimateCostUsd(
        "gpt-4o",
        usage({ cacheWriteTokens: 1_000_000, cacheReadTokens: 1_000_000, webSearchRequests: 10 }),
        emptyTable,
      );
      expect(result).toBeCloseTo(2.5 + 1.25 + 0.1, 10);
    });

    it("prefers the pricing table over built-in pricing", () => {
      const table = new Map([["claude-sonnet-4-5", customPricing]]);
      expect(estimateCostUsd("claude-sonnet-4-5", usage({ inputTokens: 7 }), table)).toBe(7);
    });

    it("returns 0 for an unknown model", () => {
      expect(
        estimateCostUsd("unknown-model", usage({ inputTokens: 1000, outputTokens: 1000 }), emptyTable),
      ).toBe(0);
    });
  });

  describe("model name canonicalization", () => {
    const table = new Map([["custom-model", customPricing]]);

    it.each([
      ["compact date suffix", "custom-model-20250101"],
      ["ISO date suffix", "custom-model-2025-01-01"],
      ["@version suffix", "custom-model@20250101"],
      ["@ and date suffix", "custom-model-20250101@v2"],
    ])("strips a %s", (_label, model) => {
      expect(estimateCostUsd(model, usage({ inputTokens: 4 }), table)).toBe(4);
    });

    it("canonicalizes names against built-in pricing", () => {
      const result = estimateCostUsd(
        "claude-3-5-haiku-20241022",
        usage({ inputTokens: 1_000_000 }),
        emptyTable,
      );
      expect(result).toBeCloseTo(0.8, 10);
    });

    it("prefers an exact snapshot entry over the canonical entry", () => {
      const snapshotPricing = { ...customPricing, inputCostPerToken: 5 };
      const table = new Map([
        ["custom-model", customPricing],
        ["custom-model-20250101", snapshotPricing],
      ]);
      expect(estimateCostUsd("custom-model-20250101", usage({ inputTokens: 1 }), table)).toBe(5);
    });

    it("prefers a canonicalized table entry over an exact built-in entry", () => {
      // Table lookups (exact and canonical) are tried before any fallback lookup.
      const table = new Map([["gpt-4o", customPricing]]);
      expect(estimateCostUsd("gpt-4o-2024-08-06", usage({ inputTokens: 2 }), table)).toBe(2);
    });

    it("does not prefix-match different model variants", () => {
      const table = new Map([["custom-model", customPricing]]);
      expect(estimateCostUsd("custom-model-mini", usage({ inputTokens: 1 }), table)).toBe(0);
    });

    it("does not strip non-date numeric suffixes", () => {
      expect(estimateCostUsd("custom-model-123", usage({ inputTokens: 1 }), table)).toBe(0);
    });
  });
});
