import { describe, expect, it } from "vitest";
import { estimateCostUsd, type ModelPricing } from "./estimateCostUsd";

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

function usage(overrides: Partial<Parameters<typeof estimateCostUsd>[1]> = {}) {
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

describe("estimateCostUsd", () => {
  describe("cost calculation", () => {
    it("sums each usage count times its matching per-unit price", () => {
      const table = new Map([["my-model", pricing()]]);
      const cost = estimateCostUsd(
        "my-model",
        usage({
          inputTokens: 10,
          outputTokens: 20,
          cacheWriteTokens: 30,
          cacheReadTokens: 40,
          webSearchRequests: 50,
        }),
        table,
      );
      // 10*1 + 20*2 + 30*3 + 40*4 + 50*5 = 10+40+90+160+250 = 550
      expect(cost).toBeCloseTo(550);
    });

    it("uses the sum as-is for standard speed, regardless of fastMultiplier", () => {
      const table = new Map([
        ["my-model", pricing({ inputCostPerToken: 10, fastMultiplier: 100 })],
      ]);
      const cost = estimateCostUsd(
        "my-model",
        usage({ inputTokens: 2, speed: "standard" }),
        table,
      );
      expect(cost).toBeCloseTo(20);
    });

    it("multiplies the sum by fastMultiplier for fast speed", () => {
      const table = new Map([
        ["my-model", pricing({ inputCostPerToken: 10, fastMultiplier: 3 })],
      ]);
      const cost = estimateCostUsd(
        "my-model",
        usage({ inputTokens: 2, speed: "fast" }),
        table,
      );
      expect(cost).toBeCloseTo(60);
    });

    it("returns 0 when there is no usage", () => {
      const table = new Map([["my-model", pricing()]]);
      expect(estimateCostUsd("my-model", usage(), table)).toBe(0);
    });
  });

  describe("price resolution order", () => {
    it("prefers the exact model name in pricingTable over everything else", () => {
      const table = new Map([
        ["claude-sonnet-4-5-20250101", pricing({ inputCostPerToken: 1 })],
        ["claude-sonnet-4-5", pricing({ inputCostPerToken: 2 })],
      ]);
      const cost = estimateCostUsd(
        "claude-sonnet-4-5-20250101",
        usage({ inputTokens: 1 }),
        table,
      );
      expect(cost).toBeCloseTo(1);
    });

    it("falls back to the canonical name in pricingTable when the exact name is absent", () => {
      const table = new Map([
        ["claude-sonnet-4-5", pricing({ inputCostPerToken: 2 })],
      ]);
      const cost = estimateCostUsd(
        "claude-sonnet-4-5-20250101",
        usage({ inputTokens: 1 }),
        table,
      );
      expect(cost).toBeCloseTo(2);
    });

    it("falls back to the exact model name in built-in fallback prices", () => {
      const cost = estimateCostUsd(
        "gpt-4o",
        usage({ inputTokens: 1_000_000 }),
        new Map(),
      );
      expect(cost).toBeCloseTo(2.5);
    });

    it("falls back to the canonical name in built-in fallback prices", () => {
      const cost = estimateCostUsd(
        "claude-3-5-haiku-20241022",
        usage({ inputTokens: 1_000_000 }),
        new Map(),
      );
      expect(cost).toBeCloseTo(0.8);
    });

    it("prefers an exact pricingTable entry over a fallback exact entry", () => {
      const table = new Map([["gpt-4o", pricing({ inputCostPerToken: 9 })]]);
      const cost = estimateCostUsd("gpt-4o", usage({ inputTokens: 1 }), table);
      expect(cost).toBeCloseTo(9);
    });

    it("prefers a canonical pricingTable entry over a fallback exact entry", () => {
      // "gpt-4o" is a fallback exact key itself, but the canonical pricingTable
      // entry for a snapshotted name should still win over the fallback exact hit.
      const table = new Map([["gpt-4o", pricing({ inputCostPerToken: 9 })]]);
      const cost = estimateCostUsd(
        "gpt-4o-20240101",
        usage({ inputTokens: 1 }),
        table,
      );
      expect(cost).toBeCloseTo(9);
    });

    it("returns 0 when nothing matches", () => {
      const cost = estimateCostUsd(
        "totally-unknown-model",
        usage({ inputTokens: 100 }),
        new Map(),
      );
      expect(cost).toBe(0);
    });

    it("does not do prefix or fuzzy matching", () => {
      const cost = estimateCostUsd(
        "claude-opus-4-1-turbo",
        usage({ inputTokens: 100 }),
        new Map(),
      );
      expect(cost).toBe(0);
    });
  });

  describe("canonicalization", () => {
    it("removes everything from the first @ onward", () => {
      const table = new Map([
        ["claude-sonnet-4-5", pricing({ inputCostPerToken: 7 })],
      ]);
      const cost = estimateCostUsd(
        "claude-sonnet-4-5@20250101",
        usage({ inputTokens: 1 }),
        table,
      );
      expect(cost).toBeCloseTo(7);
    });

    it("strips a trailing -YYYYMMDD date suffix", () => {
      const table = new Map([
        ["claude-sonnet-4-5", pricing({ inputCostPerToken: 7 })],
      ]);
      const cost = estimateCostUsd(
        "claude-sonnet-4-5-20250101",
        usage({ inputTokens: 1 }),
        table,
      );
      expect(cost).toBeCloseTo(7);
    });

    it("strips a trailing -YYYY-MM-DD date suffix", () => {
      const table = new Map([
        ["claude-sonnet-4-5", pricing({ inputCostPerToken: 7 })],
      ]);
      const cost = estimateCostUsd(
        "claude-sonnet-4-5-2025-01-01",
        usage({ inputTokens: 1 }),
        table,
      );
      expect(cost).toBeCloseTo(7);
    });

    it("does not strip a date-like suffix that isn't at the end", () => {
      const cost = estimateCostUsd(
        "claude-sonnet-4-5-20250101-preview",
        usage({ inputTokens: 100 }),
        new Map(),
      );
      expect(cost).toBe(0);
    });
  });

  describe("built-in fallback prices", () => {
    const cases: Array<{
      model: string;
      input: number;
      output: number;
      cacheWrite: number;
      cacheRead: number;
    }> = [
      { model: "claude-opus-4-1", input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
      { model: "claude-sonnet-4-5", input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
      { model: "claude-3-5-haiku", input: 0.8, output: 4, cacheWrite: 1, cacheRead: 0.08 },
      { model: "gpt-4o", input: 2.5, output: 10, cacheWrite: 2.5, cacheRead: 1.25 },
      { model: "gpt-4o-mini", input: 0.15, output: 0.6, cacheWrite: 0.15, cacheRead: 0.075 },
    ];

    it.each(cases)(
      "$model charges the documented per-million-token prices",
      ({ model, input, output, cacheWrite, cacheRead }) => {
        const million = 1_000_000;
        expect(
          estimateCostUsd(model, usage({ inputTokens: million }), new Map()),
        ).toBeCloseTo(input);
        expect(
          estimateCostUsd(model, usage({ outputTokens: million }), new Map()),
        ).toBeCloseTo(output);
        expect(
          estimateCostUsd(model, usage({ cacheWriteTokens: million }), new Map()),
        ).toBeCloseTo(cacheWrite);
        expect(
          estimateCostUsd(model, usage({ cacheReadTokens: million }), new Map()),
        ).toBeCloseTo(cacheRead);
      },
    );

    it.each(cases)(
      "$model charges $0.01 per web search request",
      ({ model }) => {
        expect(
          estimateCostUsd(model, usage({ webSearchRequests: 1 }), new Map()),
        ).toBeCloseTo(0.01);
      },
    );

    it.each(cases)("$model has a fast multiplier of 1", ({ model }) => {
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
      expect(fast).toBeCloseTo(standard);
    });
  });
});
