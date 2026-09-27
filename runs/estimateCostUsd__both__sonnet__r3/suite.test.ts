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

function pricing(overrides: Partial<ModelPricing> = {}): ModelPricing {
  return {
    inputCostPerToken: 0,
    outputCostPerToken: 0,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
    webSearchCostPerRequest: 0,
    fastMultiplier: 1,
    ...overrides,
  };
}

describe("estimateCostUsd", () => {
  describe("lookup precedence", () => {
    it("uses the exact model name in the pricing table over everything else", () => {
      const table = new Map<string, ModelPricing>([
        ["claude-sonnet-4-5-20250101", pricing({ inputCostPerToken: 1 })],
        ["claude-sonnet-4-5", pricing({ inputCostPerToken: 2 })],
      ]);

      const cost = estimateCostUsd(
        "claude-sonnet-4-5-20250101",
        usage({ inputTokens: 10 }),
        table,
      );

      expect(cost).toBe(10);
    });

    it("falls back to the canonical name in the pricing table when the exact name is absent", () => {
      const table = new Map<string, ModelPricing>([
        ["claude-sonnet-4-5", pricing({ inputCostPerToken: 2 })],
      ]);

      const cost = estimateCostUsd(
        "claude-sonnet-4-5-20250101",
        usage({ inputTokens: 10 }),
        table,
      );

      expect(cost).toBe(20);
    });

    it("falls back to the exact model name in the built-in fallback prices", () => {
      const cost = estimateCostUsd(
        "claude-3-5-haiku",
        usage({ inputTokens: 1_000_000 }),
        new Map(),
      );

      expect(cost).toBeCloseTo(0.8, 10);
    });

    it("falls back to the canonical name in the built-in fallback prices", () => {
      const cost = estimateCostUsd(
        "claude-3-5-haiku-20241022",
        usage({ inputTokens: 1_000_000 }),
        new Map(),
      );

      expect(cost).toBeCloseTo(0.8, 10);
    });

    it("prefers an exact match in the pricing table over the exact fallback entry", () => {
      const table = new Map<string, ModelPricing>([
        ["claude-3-5-haiku", pricing({ inputCostPerToken: 5 })],
      ]);

      const cost = estimateCostUsd(
        "claude-3-5-haiku",
        usage({ inputTokens: 10 }),
        table,
      );

      expect(cost).toBe(50);
    });

    it("prefers the canonical name in the pricing table over the exact fallback entry", () => {
      const table = new Map<string, ModelPricing>([
        ["claude-3-5-haiku", pricing({ inputCostPerToken: 5 })],
      ]);

      const cost = estimateCostUsd(
        "claude-3-5-haiku-20241022",
        usage({ inputTokens: 10 }),
        table,
      );

      expect(cost).toBe(50);
    });

    it("returns 0 when no exact, canonical, or fallback entry matches", () => {
      const cost = estimateCostUsd(
        "some-unknown-model",
        usage({ inputTokens: 1_000_000 }),
        new Map(),
      );

      expect(cost).toBe(0);
    });

    it("does not do prefix matching", () => {
      const table = new Map<string, ModelPricing>([
        ["claude-sonnet-4-5", pricing({ inputCostPerToken: 5 })],
      ]);

      const cost = estimateCostUsd(
        "claude-sonnet-4-5-extra-suffix",
        usage({ inputTokens: 1_000_000 }),
        table,
      );

      expect(cost).toBe(0);
    });

    it("does not do fuzzy matching", () => {
      const table = new Map<string, ModelPricing>([
        ["claude-sonnet-4-5", pricing({ inputCostPerToken: 5 })],
      ]);

      const cost = estimateCostUsd(
        "claude-sonet-4-5",
        usage({ inputTokens: 1_000_000 }),
        table,
      );

      expect(cost).toBe(0);
    });
  });

  describe("canonicalization", () => {
    it("strips everything from the first @ onward", () => {
      const table = new Map<string, ModelPricing>([
        ["claude-sonnet-4-5", pricing({ inputCostPerToken: 2 })],
      ]);

      const cost = estimateCostUsd(
        "claude-sonnet-4-5@20250101",
        usage({ inputTokens: 10 }),
        table,
      );

      expect(cost).toBe(20);
    });

    it("strips a trailing -YYYYMMDD date suffix", () => {
      const table = new Map<string, ModelPricing>([
        ["claude-sonnet-4-5", pricing({ inputCostPerToken: 2 })],
      ]);

      const cost = estimateCostUsd(
        "claude-sonnet-4-5-20250101",
        usage({ inputTokens: 10 }),
        table,
      );

      expect(cost).toBe(20);
    });

    it("strips a trailing -YYYY-MM-DD date suffix", () => {
      const table = new Map<string, ModelPricing>([
        ["claude-sonnet-4-5", pricing({ inputCostPerToken: 2 })],
      ]);

      const cost = estimateCostUsd(
        "claude-sonnet-4-5-2025-01-01",
        usage({ inputTokens: 10 }),
        table,
      );

      expect(cost).toBe(20);
    });

    it("applies @ stripping before date-suffix stripping", () => {
      const table = new Map<string, ModelPricing>([
        ["claude-sonnet-4-5", pricing({ inputCostPerToken: 2 })],
      ]);

      const cost = estimateCostUsd(
        "claude-sonnet-4-5-20250101@some-snapshot-tag",
        usage({ inputTokens: 10 }),
        table,
      );

      expect(cost).toBe(20);
    });

    it("leaves the name untouched when there is no date suffix or @", () => {
      const cost = estimateCostUsd(
        "claude-sonnet-4-5",
        usage({ inputTokens: 1_000_000 }),
        new Map(),
      );

      expect(cost).toBe(3);
    });
  });

  describe("built-in fallback prices", () => {
    it.each([
      ["claude-opus-4-1", 15, 75, 18.75, 1.5],
      ["claude-sonnet-4-5", 3, 15, 3.75, 0.3],
      ["claude-3-5-haiku", 0.8, 4, 1, 0.08],
      ["gpt-4o", 2.5, 10, 2.5, 1.25],
      ["gpt-4o-mini", 0.15, 0.6, 0.15, 0.075],
    ])(
      "has the documented per-million-token prices for %s",
      (model, input, output, cacheWrite, cacheRead) => {
        expect(
          estimateCostUsd(model, usage({ inputTokens: 1_000_000 }), new Map()),
        ).toBeCloseTo(input, 10);
        expect(
          estimateCostUsd(model, usage({ outputTokens: 1_000_000 }), new Map()),
        ).toBeCloseTo(output, 10);
        expect(
          estimateCostUsd(
            model,
            usage({ cacheWriteTokens: 1_000_000 }),
            new Map(),
          ),
        ).toBeCloseTo(cacheWrite, 10);
        expect(
          estimateCostUsd(
            model,
            usage({ cacheReadTokens: 1_000_000 }),
            new Map(),
          ),
        ).toBeCloseTo(cacheRead, 10);
      },
    );

    it.each([
      "claude-opus-4-1",
      "claude-sonnet-4-5",
      "claude-3-5-haiku",
      "gpt-4o",
      "gpt-4o-mini",
    ])("charges $0.01 per web search request and has fastMultiplier 1 for %s", (model) => {
      expect(
        estimateCostUsd(model, usage({ webSearchRequests: 1 }), new Map()),
      ).toBeCloseTo(0.01, 10);

      const standard = estimateCostUsd(
        model,
        usage({ inputTokens: 1_000_000, speed: "standard" }),
        new Map(),
      );
      const fast = estimateCostUsd(
        model,
        usage({ inputTokens: 1_000_000, speed: "fast" }),
        new Map(),
      );
      expect(fast).toBeCloseTo(standard, 10);
    });
  });

  describe("cost computation", () => {
    it("sums each usage count times its matching per-unit price", () => {
      const table = new Map<string, ModelPricing>([
        [
          "test-model",
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
        "test-model",
        usage({
          inputTokens: 10,
          outputTokens: 20,
          cacheWriteTokens: 30,
          cacheReadTokens: 40,
          webSearchRequests: 2,
        }),
        table,
      );

      // 10*1 + 20*2 + 30*3 + 40*4 + 2*5 = 10 + 40 + 90 + 160 + 10
      expect(cost).toBe(310);
    });

    it("returns 0 when all usage counts are 0", () => {
      const table = new Map<string, ModelPricing>([
        [
          "test-model",
          pricing({
            inputCostPerToken: 1,
            outputCostPerToken: 2,
            cacheWriteCostPerToken: 3,
            cacheReadCostPerToken: 4,
            webSearchCostPerRequest: 5,
          }),
        ],
      ]);

      const cost = estimateCostUsd("test-model", usage(), table);

      expect(cost).toBe(0);
    });

    it("multiplies the summed cost by fastMultiplier when speed is 'fast'", () => {
      const table = new Map<string, ModelPricing>([
        [
          "test-model",
          pricing({ inputCostPerToken: 1, fastMultiplier: 2.5 }),
        ],
      ]);

      const cost = estimateCostUsd(
        "test-model",
        usage({ inputTokens: 100, speed: "fast" }),
        table,
      );

      expect(cost).toBe(250);
    });

    it("does not apply fastMultiplier when speed is 'standard'", () => {
      const table = new Map<string, ModelPricing>([
        [
          "test-model",
          pricing({ inputCostPerToken: 1, fastMultiplier: 2.5 }),
        ],
      ]);

      const cost = estimateCostUsd(
        "test-model",
        usage({ inputTokens: 100, speed: "standard" }),
        table,
      );

      expect(cost).toBe(100);
    });
  });
});
