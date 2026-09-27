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

// One input token priced at the entry's inputCostPerToken identifies which entry was used.
const oneInput = usage({ inputTokens: 1 });

describe("estimateCostUsd", () => {
  describe("cost calculation", () => {
    it("multiplies each usage count by its matching per-unit price and sums them", () => {
      const table = new Map([["m", pricing()]]);
      const u = usage({
        inputTokens: 1,
        outputTokens: 2,
        cacheWriteTokens: 3,
        cacheReadTokens: 4,
        webSearchRequests: 5,
      });
      expect(estimateCostUsd("m", u, table)).toBe(1 + 20 + 300 + 4000 + 50000);
    });

    it.each([
      ["inputTokens", 1],
      ["outputTokens", 10],
      ["cacheWriteTokens", 100],
      ["cacheReadTokens", 1000],
      ["webSearchRequests", 10000],
    ] as const)("charges %s at its own price", (field, price) => {
      const table = new Map([["m", pricing()]]);
      expect(estimateCostUsd("m", usage({ [field]: 7 }), table)).toBe(7 * price);
    });

    it("returns 0 when all usage counts are zero", () => {
      const table = new Map([["m", pricing()]]);
      expect(estimateCostUsd("m", usage(), table)).toBe(0);
    });

    it("uses the sum as is for standard speed", () => {
      const table = new Map([["m", pricing({ fastMultiplier: 3 })]]);
      expect(estimateCostUsd("m", usage({ inputTokens: 5, speed: "standard" }), table)).toBe(5);
    });

    it("multiplies the sum by fastMultiplier for fast speed", () => {
      const table = new Map([["m", pricing({ fastMultiplier: 3 })]]);
      const u = usage({ inputTokens: 5, outputTokens: 1, speed: "fast" });
      expect(estimateCostUsd("m", u, table)).toBe(3 * (5 + 10));
    });
  });

  describe("price lookup", () => {
    it("returns 0 when no price matches", () => {
      expect(estimateCostUsd("unknown-model", oneInput, empty)).toBe(0);
    });

    it("returns 0 for an unknown model even with nonzero usage of every kind", () => {
      const u = usage({
        inputTokens: 1,
        outputTokens: 1,
        cacheWriteTokens: 1,
        cacheReadTokens: 1,
        webSearchRequests: 1,
        speed: "fast",
      });
      expect(estimateCostUsd("nope", u, new Map([["other", pricing()]]))).toBe(0);
    });

    it("prefers an exact match in pricingTable over its canonical name", () => {
      const table = new Map([
        ["my-model-20240101", pricing({ inputCostPerToken: 1 })],
        ["my-model", pricing({ inputCostPerToken: 2 })],
      ]);
      expect(estimateCostUsd("my-model-20240101", oneInput, table)).toBe(1);
    });

    it("falls back to the canonical name in pricingTable", () => {
      const table = new Map([["my-model", pricing({ inputCostPerToken: 2 })]]);
      expect(estimateCostUsd("my-model-20240101", oneInput, table)).toBe(2);
    });

    it("prefers the canonical name in pricingTable over the built-in fallback", () => {
      const table = new Map([["claude-3-5-haiku", pricing({ inputCostPerToken: 7 })]]);
      expect(estimateCostUsd("claude-3-5-haiku@v1", oneInput, table)).toBe(7);
    });

    it("prefers an exact pricingTable match over the built-in fallback", () => {
      const table = new Map([["gpt-4o", pricing({ inputCostPerToken: 42 })]]);
      expect(estimateCostUsd("gpt-4o", oneInput, table)).toBe(42);
    });

    it("uses the built-in fallback exact name when pricingTable has no match", () => {
      expect(estimateCostUsd("gpt-4o-mini", usage({ inputTokens: 1_000_000 }), empty)).toBeCloseTo(0.15);
    });

    it("uses the built-in fallback exact name before its canonical name", () => {
      // "gpt-4o-mini" is an exact fallback key; it must not resolve to "gpt-4o".
      expect(estimateCostUsd("gpt-4o-mini", usage({ outputTokens: 1_000_000 }), empty)).toBeCloseTo(0.6);
    });

    it("uses the built-in fallback canonical name last", () => {
      expect(
        estimateCostUsd("claude-3-5-haiku-20241022", usage({ inputTokens: 1_000_000 }), empty),
      ).toBeCloseTo(0.8);
    });

    it("does not do prefix matching", () => {
      const table = new Map([["my-model", pricing()]]);
      expect(estimateCostUsd("my-model-v2", oneInput, table)).toBe(0);
      expect(estimateCostUsd("my", oneInput, table)).toBe(0);
      expect(estimateCostUsd("claude-sonnet-4-5-extended", oneInput, empty)).toBe(0);
      expect(estimateCostUsd("claude-sonnet-4", oneInput, empty)).toBe(0);
    });

    it("does not do case-insensitive or fuzzy matching", () => {
      expect(estimateCostUsd("GPT-4o", oneInput, empty)).toBe(0);
      expect(estimateCostUsd("gpt4o", oneInput, empty)).toBe(0);
    });
  });

  describe("canonical name", () => {
    const table = new Map([["model-x", pricing({ inputCostPerToken: 5 })]]);

    it("strips a -YYYYMMDD date suffix", () => {
      expect(estimateCostUsd("model-x-20241022", oneInput, table)).toBe(5);
    });

    it("strips a -YYYY-MM-DD date suffix", () => {
      expect(estimateCostUsd("model-x-2024-10-22", oneInput, table)).toBe(5);
    });

    it("strips everything from the first @", () => {
      expect(estimateCostUsd("model-x@vertex", oneInput, table)).toBe(5);
      expect(estimateCostUsd("model-x@a@b", oneInput, table)).toBe(5);
    });

    it("strips @ suffix and then a date suffix", () => {
      expect(estimateCostUsd("model-x-20241022@001", oneInput, table)).toBe(5);
      expect(estimateCostUsd("model-x-2024-10-22@latest", oneInput, table)).toBe(5);
    });

    it("strips a date that appears after the @ along with the @ part", () => {
      expect(estimateCostUsd("model-x@20241022", oneInput, table)).toBe(5);
    });

    it("does not strip a date suffix that is not at the end", () => {
      expect(estimateCostUsd("model-x-20241022-beta", oneInput, table)).toBe(0);
    });

    it("does not strip dates of the wrong length or format", () => {
      expect(estimateCostUsd("model-x-2024102", oneInput, table)).toBe(0);
      expect(estimateCostUsd("model-x-202410221", oneInput, table)).toBe(0);
      expect(estimateCostUsd("model-x-2024-1022", oneInput, table)).toBe(0);
      expect(estimateCostUsd("model-x-24-10-22", oneInput, table)).toBe(0);
    });

    it("requires a hyphen before the date", () => {
      expect(estimateCostUsd("model-x20241022", oneInput, table)).toBe(0);
      expect(estimateCostUsd("model-x_20241022", oneInput, table)).toBe(0);
    });

    it("strips only one trailing date suffix", () => {
      expect(estimateCostUsd("model-x-20240101-20241022", oneInput, table)).toBe(0);
    });
  });

  describe("built-in fallback prices", () => {
    const M = 1_000_000;

    it.each([
      ["claude-opus-4-1", 15, 75, 18.75, 1.5],
      ["claude-sonnet-4-5", 3, 15, 3.75, 0.3],
      ["claude-3-5-haiku", 0.8, 4, 1, 0.08],
      ["gpt-4o", 2.5, 10, 2.5, 1.25],
      ["gpt-4o-mini", 0.15, 0.6, 0.15, 0.075],
    ])("%s charges %s/%s/%s/%s per million tokens", (model, input, output, write, read) => {
      expect(estimateCostUsd(model, usage({ inputTokens: M }), empty)).toBeCloseTo(input, 10);
      expect(estimateCostUsd(model, usage({ outputTokens: M }), empty)).toBeCloseTo(output, 10);
      expect(estimateCostUsd(model, usage({ cacheWriteTokens: M }), empty)).toBeCloseTo(write, 10);
      expect(estimateCostUsd(model, usage({ cacheReadTokens: M }), empty)).toBeCloseTo(read, 10);
    });

    it.each(["claude-opus-4-1", "claude-sonnet-4-5", "claude-3-5-haiku", "gpt-4o", "gpt-4o-mini"])(
      "%s charges $0.01 per web search request",
      (model) => {
        expect(estimateCostUsd(model, usage({ webSearchRequests: 3 }), empty)).toBeCloseTo(0.03, 10);
      },
    );

    it.each(["claude-opus-4-1", "claude-sonnet-4-5", "claude-3-5-haiku", "gpt-4o", "gpt-4o-mini"])(
      "%s has a fast multiplier of 1",
      (model) => {
        const standard = estimateCostUsd(model, usage({ inputTokens: M, outputTokens: M }), empty);
        const fast = estimateCostUsd(model, usage({ inputTokens: M, outputTokens: M, speed: "fast" }), empty);
        expect(fast).toBeCloseTo(standard, 10);
      },
    );

    it("computes a combined cost for a dated fallback model", () => {
      const u = usage({
        inputTokens: 1000,
        outputTokens: 500,
        cacheWriteTokens: 200,
        cacheReadTokens: 10000,
        webSearchRequests: 2,
      });
      // sonnet-4-5: 1000*3 + 500*15 + 200*3.75 + 10000*0.3 per M, plus 2 * 0.01
      const expected = (3000 + 7500 + 750 + 3000) / M + 0.02;
      expect(estimateCostUsd("claude-sonnet-4-5-20250929", u, empty)).toBeCloseTo(expected, 12);
    });
  });
});
