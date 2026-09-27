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

function usage(overrides: Partial<Usage> = {}): Usage {
  return { ...ZERO_USAGE, ...overrides };
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

const EMPTY = new Map<string, ModelPricing>();
const ONE_INPUT = usage({ inputTokens: 1 });
const MILLION = 1_000_000;

describe("estimateCostUsd", () => {
  describe("cost calculation", () => {
    it("charges each usage count at its matching per-unit price", () => {
      const table = new Map([["m", pricing()]]);
      expect(estimateCostUsd("m", usage({ inputTokens: 1 }), table)).toBe(1);
      expect(estimateCostUsd("m", usage({ outputTokens: 1 }), table)).toBe(10);
      expect(estimateCostUsd("m", usage({ cacheWriteTokens: 1 }), table)).toBe(100);
      expect(estimateCostUsd("m", usage({ cacheReadTokens: 1 }), table)).toBe(1000);
      expect(estimateCostUsd("m", usage({ webSearchRequests: 1 }), table)).toBe(10000);
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

    it("returns 0 for zero usage on a known model", () => {
      const table = new Map([["m", pricing()]]);
      expect(estimateCostUsd("m", usage(), table)).toBe(0);
    });
  });

  describe("speed", () => {
    const table = new Map([["m", pricing({ fastMultiplier: 6 })]]);
    const u = { inputTokens: 1, outputTokens: 2 };

    it("uses the sum as is for standard speed", () => {
      expect(estimateCostUsd("m", usage({ ...u, speed: "standard" }), table)).toBe(21);
    });

    it("multiplies the sum by fastMultiplier for fast speed", () => {
      expect(estimateCostUsd("m", usage({ ...u, speed: "fast" }), table)).toBe(126);
    });

    it("applies the multiplier to web search costs too", () => {
      expect(
        estimateCostUsd("m", usage({ webSearchRequests: 1, speed: "fast" }), table),
      ).toBe(60000);
    });

    it("leaves fallback-priced fast calls unchanged (multiplier 1)", () => {
      const standard = estimateCostUsd("gpt-4o", usage({ inputTokens: MILLION }), EMPTY);
      const fast = estimateCostUsd(
        "gpt-4o",
        usage({ inputTokens: MILLION, speed: "fast" }),
        EMPTY,
      );
      expect(fast).toBeCloseTo(standard, 10);
    });
  });

  describe("lookup order", () => {
    it("prefers the exact name in pricingTable over the canonical name", () => {
      const table = new Map([
        ["claude-3-5-haiku-20241022", pricing({ inputCostPerToken: 7 })],
        ["claude-3-5-haiku", pricing({ inputCostPerToken: 3 })],
      ]);
      expect(estimateCostUsd("claude-3-5-haiku-20241022", ONE_INPUT, table)).toBe(7);
    });

    it("uses the canonical name in pricingTable when there is no exact match", () => {
      const table = new Map([["my-model", pricing({ inputCostPerToken: 3 })]]);
      expect(estimateCostUsd("my-model-20250101", ONE_INPUT, table)).toBe(3);
    });

    it("prefers the canonical name in pricingTable over an exact fallback match", () => {
      // "gpt-4o" is in the fallback table, but pricingTable's canonical hit wins.
      const table = new Map([["gpt-4o", pricing({ inputCostPerToken: 3 })]]);
      expect(estimateCostUsd("gpt-4o-2024-08-06", ONE_INPUT, table)).toBe(3);
    });

    it("lets pricingTable override a fallback entry by exact name", () => {
      const table = new Map([["claude-sonnet-4-5", pricing({ inputCostPerToken: 5 })]]);
      expect(estimateCostUsd("claude-sonnet-4-5", ONE_INPUT, table)).toBe(5);
    });

    it("falls back to built-in prices by exact name", () => {
      expect(estimateCostUsd("gpt-4o-mini", usage({ inputTokens: MILLION }), EMPTY))
        .toBeCloseTo(0.15, 10);
    });

    it("falls back to built-in prices by canonical name", () => {
      expect(
        estimateCostUsd("claude-3-5-haiku-20241022", usage({ inputTokens: MILLION }), EMPTY),
      ).toBeCloseTo(0.8, 10);
    });

    it("ignores unrelated pricingTable entries when using fallback prices", () => {
      const table = new Map([["other", pricing()]]);
      expect(estimateCostUsd("gpt-4o", usage({ inputTokens: MILLION }), table))
        .toBeCloseTo(2.5, 10);
    });
  });

  describe("canonical name", () => {
    const table = new Map([["base", pricing({ inputCostPerToken: 3 })]]);

    it("strips a -YYYYMMDD suffix", () => {
      expect(estimateCostUsd("base-20241022", ONE_INPUT, table)).toBe(3);
    });

    it("strips a -YYYY-MM-DD suffix", () => {
      expect(estimateCostUsd("base-2024-10-22", ONE_INPUT, table)).toBe(3);
    });

    it("strips everything from the first @", () => {
      expect(estimateCostUsd("base@v2", ONE_INPUT, table)).toBe(3);
      expect(estimateCostUsd("base@v2@extra", ONE_INPUT, table)).toBe(3);
    });

    it("strips the @ part first, then a date suffix", () => {
      expect(estimateCostUsd("base-20241022@001", ONE_INPUT, table)).toBe(3);
      expect(estimateCostUsd("base-2024-10-22@001", ONE_INPUT, table)).toBe(3);
    });

    it("works with Vertex-style names against the fallback prices", () => {
      expect(
        estimateCostUsd("claude-opus-4-1@20250805", usage({ inputTokens: MILLION }), EMPTY),
      ).toBeCloseTo(15, 10);
    });

    it("does not strip a date that is not a trailing suffix", () => {
      expect(estimateCostUsd("base-20241022-extra", ONE_INPUT, table)).toBe(0);
    });

    it("does not strip malformed date suffixes", () => {
      expect(estimateCostUsd("base-2024102", ONE_INPUT, table)).toBe(0);
      expect(estimateCostUsd("base-202410221", ONE_INPUT, table)).toBe(0);
      expect(estimateCostUsd("base-2024-1022", ONE_INPUT, table)).toBe(0);
      expect(estimateCostUsd("base20241022", ONE_INPUT, table)).toBe(0);
    });

    it("strips only one date suffix", () => {
      expect(estimateCostUsd("base-20240101-20241022", ONE_INPUT, table)).toBe(0);
    });
  });

  describe("no match", () => {
    it("returns 0 for an unknown model", () => {
      expect(estimateCostUsd("unknown-model", usage({ inputTokens: MILLION }), EMPTY)).toBe(0);
    });

    it("returns 0 for an unknown model at fast speed", () => {
      const table = new Map([["m", pricing({ fastMultiplier: 6 })]]);
      expect(
        estimateCostUsd("unknown", usage({ inputTokens: 1, speed: "fast" }), table),
      ).toBe(0);
    });

    it("does not prefix-match longer names", () => {
      expect(estimateCostUsd("claude-sonnet-4-5-latest", ONE_INPUT, EMPTY)).toBe(0);
      expect(estimateCostUsd("gpt-4o-audio", ONE_INPUT, EMPTY)).toBe(0);
    });

    it("does not prefix-match shorter names", () => {
      expect(estimateCostUsd("claude-sonnet-4", ONE_INPUT, EMPTY)).toBe(0);
      expect(estimateCostUsd("gpt-4", ONE_INPUT, EMPTY)).toBe(0);
    });

    it("is case-sensitive", () => {
      expect(estimateCostUsd("GPT-4o", ONE_INPUT, EMPTY)).toBe(0);
    });
  });

  describe("fallback prices", () => {
    // [model, input, output, cacheWrite, cacheRead] in $ per million tokens
    const cases: [string, number, number, number, number][] = [
      ["claude-opus-4-1", 15, 75, 18.75, 1.5],
      ["claude-sonnet-4-5", 3, 15, 3.75, 0.3],
      ["claude-3-5-haiku", 0.8, 4, 1, 0.08],
      ["gpt-4o", 2.5, 10, 2.5, 1.25],
      ["gpt-4o-mini", 0.15, 0.6, 0.15, 0.075],
    ];

    it.each(cases)("%s has the documented prices", (model, input, output, write, read) => {
      const cost = (u: Partial<Usage>) => estimateCostUsd(model, usage(u), EMPTY);
      expect(cost({ inputTokens: MILLION })).toBeCloseTo(input, 10);
      expect(cost({ outputTokens: MILLION })).toBeCloseTo(output, 10);
      expect(cost({ cacheWriteTokens: MILLION })).toBeCloseTo(write, 10);
      expect(cost({ cacheReadTokens: MILLION })).toBeCloseTo(read, 10);
      expect(cost({ webSearchRequests: 1 })).toBeCloseTo(0.01, 10);
      expect(cost({ webSearchRequests: 1, speed: "fast" })).toBeCloseTo(0.01, 10);
    });
  });
});
