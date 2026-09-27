import { describe, expect, it } from "vitest";
import { estimateCostUsd, type ModelPricing } from "./estimateCostUsd";

type Usage = Parameters<typeof estimateCostUsd>[1];

const noUsage: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheWriteTokens: 0,
  cacheReadTokens: 0,
  webSearchRequests: 0,
  speed: "standard",
};

function usage(overrides: Partial<Usage>): Usage {
  return { ...noUsage, ...overrides };
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

const oneOfEach = usage({
  inputTokens: 1,
  outputTokens: 1,
  cacheWriteTokens: 1,
  cacheReadTokens: 1,
  webSearchRequests: 1,
});

const empty = new Map<string, ModelPricing>();

describe("estimateCostUsd", () => {
  describe("cost calculation", () => {
    it("multiplies each usage count by its matching price", () => {
      const table = new Map([["m", pricing()]]);
      expect(estimateCostUsd("m", usage({ inputTokens: 3 }), table)).toBe(3);
      expect(estimateCostUsd("m", usage({ outputTokens: 3 }), table)).toBe(30);
      expect(estimateCostUsd("m", usage({ cacheWriteTokens: 3 }), table)).toBe(300);
      expect(estimateCostUsd("m", usage({ cacheReadTokens: 3 }), table)).toBe(3000);
      expect(estimateCostUsd("m", usage({ webSearchRequests: 3 }), table)).toBe(30000);
    });

    it("sums all five components", () => {
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

    it("returns 0 for zero usage", () => {
      const table = new Map([["m", pricing()]]);
      expect(estimateCostUsd("m", noUsage, table)).toBe(0);
    });
  });

  describe("speed", () => {
    const table = new Map([["m", pricing({ fastMultiplier: 6 })]]);

    it("uses the sum as is for standard speed", () => {
      expect(estimateCostUsd("m", { ...oneOfEach, speed: "standard" }, table)).toBe(11111);
    });

    it("multiplies the whole sum by fastMultiplier for fast speed", () => {
      expect(estimateCostUsd("m", { ...oneOfEach, speed: "fast" }, table)).toBe(11111 * 6);
    });
  });

  describe("price lookup", () => {
    it("uses the exact model name from the pricing table", () => {
      const table = new Map([["my-model", pricing({ inputCostPerToken: 2 })]]);
      expect(estimateCostUsd("my-model", usage({ inputTokens: 1 }), table)).toBe(2);
    });

    it("prefers an exact match over the canonical name in the pricing table", () => {
      const table = new Map([
        ["claude-x-20250101", pricing({ inputCostPerToken: 2 })],
        ["claude-x", pricing({ inputCostPerToken: 5 })],
      ]);
      expect(estimateCostUsd("claude-x-20250101", usage({ inputTokens: 1 }), table)).toBe(2);
    });

    it("falls back to the canonical name in the pricing table", () => {
      const table = new Map([["claude-x", pricing({ inputCostPerToken: 5 })]]);
      expect(estimateCostUsd("claude-x-20250101", usage({ inputTokens: 1 }), table)).toBe(5);
    });

    it("prefers the pricing table's canonical name over the fallback prices", () => {
      const table = new Map([["claude-3-5-haiku", pricing({ inputCostPerToken: 7 })]]);
      expect(estimateCostUsd("claude-3-5-haiku-20241022", usage({ inputTokens: 1 }), table)).toBe(7);
    });

    it("prefers the pricing table over the fallback prices for the same name", () => {
      const table = new Map([["gpt-4o", pricing({ inputCostPerToken: 9 })]]);
      expect(estimateCostUsd("gpt-4o", usage({ inputTokens: 1 }), table)).toBe(9);
    });

    it("uses the fallback prices when the pricing table has no match", () => {
      expect(estimateCostUsd("gpt-4o", usage({ inputTokens: 1_000_000 }), empty)).toBeCloseTo(2.5);
    });

    it("uses the fallback canonical name when nothing else matches", () => {
      expect(
        estimateCostUsd("claude-3-5-haiku-20241022", usage({ inputTokens: 1_000_000 }), empty),
      ).toBeCloseTo(0.8);
    });

    it("returns 0 when no price matches", () => {
      expect(estimateCostUsd("unknown-model", oneOfEach, empty)).toBe(0);
    });

    it("returns 0 for names that are Object.prototype properties", () => {
      for (const name of ["toString", "constructor", "__proto__", "hasOwnProperty"]) {
        expect(estimateCostUsd(name, oneOfEach, empty)).toBe(0);
      }
    });
  });

  describe("canonical name", () => {
    const table = new Map([["claude-x", pricing({ inputCostPerToken: 5 })]]);
    const cost = (model: string) => estimateCostUsd(model, usage({ inputTokens: 1 }), table);

    it("strips a -YYYYMMDD date suffix", () => {
      expect(cost("claude-x-20250101")).toBe(5);
    });

    it("strips a -YYYY-MM-DD date suffix", () => {
      expect(cost("claude-x-2025-01-01")).toBe(5);
    });

    it("strips everything from the first @", () => {
      expect(cost("claude-x@v2")).toBe(5);
      expect(cost("claude-x@v2@v3")).toBe(5);
    });

    it("strips @ first and then the date suffix", () => {
      expect(cost("claude-x-20250101@v2")).toBe(5);
      expect(cost("claude-x-2025-01-01@abc-20250101")).toBe(5);
    });

    it("strips only one trailing date suffix", () => {
      expect(cost("claude-x-20250101-20250101")).toBe(0);
    });

    it("does not strip dates that are not at the end", () => {
      expect(cost("claude-x-20250101-beta")).toBe(0);
    });

    it("does not strip malformed date suffixes", () => {
      expect(cost("claude-x-2025010")).toBe(0);
      expect(cost("claude-x-202501011")).toBe(0);
      expect(cost("claude-x-2025-1-01")).toBe(0);
      expect(cost("claude-x20250101")).toBe(0);
    });

    it("does no prefix or fuzzy matching", () => {
      expect(cost("claude-x-latest")).toBe(0);
      expect(cost("claude-x2")).toBe(0);
      expect(cost("claude")).toBe(0);
      expect(cost("Claude-X")).toBe(0);
      expect(estimateCostUsd("gpt-4o-2", usage({ inputTokens: 1 }), empty)).toBe(0);
      expect(estimateCostUsd("claude-sonnet-4", usage({ inputTokens: 1 }), empty)).toBe(0);
    });
  });

  describe("fallback prices", () => {
    const perMillion = {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      webSearchRequests: 0,
    };

    it.each([
      ["claude-opus-4-1", 15, 75, 18.75, 1.5],
      ["claude-sonnet-4-5", 3, 15, 3.75, 0.3],
      ["claude-3-5-haiku", 0.8, 4, 1, 0.08],
      ["gpt-4o", 2.5, 10, 2.5, 1.25],
      ["gpt-4o-mini", 0.15, 0.6, 0.15, 0.075],
    ])("%s charges its input, output, cache write and cache read prices per million tokens", (model, input, output, write, read) => {
      const m = 1_000_000;
      const zero = { ...perMillion, inputTokens: 0 };
      const c = (u: Partial<Usage>) => estimateCostUsd(model, usage({ ...zero, ...u }), empty);
      expect(c({ inputTokens: m })).toBeCloseTo(input, 10);
      expect(c({ outputTokens: m })).toBeCloseTo(output, 10);
      expect(c({ cacheWriteTokens: m })).toBeCloseTo(write, 10);
      expect(c({ cacheReadTokens: m })).toBeCloseTo(read, 10);
    });

    it.each(["claude-opus-4-1", "claude-sonnet-4-5", "claude-3-5-haiku", "gpt-4o", "gpt-4o-mini"])(
      "%s charges $0.01 per web search and has a fast multiplier of 1",
      (model) => {
        expect(estimateCostUsd(model, usage({ webSearchRequests: 3 }), empty)).toBeCloseTo(0.03, 10);
        const standard = estimateCostUsd(model, { ...oneOfEach, speed: "standard" }, empty);
        const fast = estimateCostUsd(model, { ...oneOfEach, speed: "fast" }, empty);
        expect(fast).toBeCloseTo(standard, 12);
      },
    );
  });
});
