import { describe, expect, it } from "vitest";
import { estimateCostUsd, type ModelPricing } from "./estimateCostUsd";

type Usage = Parameters<typeof estimateCostUsd>[1];

const M = 1_000_000;

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

// Distinct per-unit prices so each count's contribution is identifiable.
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

const empty = () => new Map<string, ModelPricing>();

// One million of each token type plus one web search, so the result is
// input + output + cacheWrite + cacheRead (per million) + 0.01.
const oneMillionEach = usage({
  inputTokens: M,
  outputTokens: M,
  cacheWriteTokens: M,
  cacheReadTokens: M,
  webSearchRequests: 1,
});

describe("estimateCostUsd", () => {
  describe("cost calculation", () => {
    it("multiplies each usage count by its matching per-unit price", () => {
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
      expect(estimateCostUsd("m", usage(), table)).toBe(0);
    });

    it("uses the sum as is for standard speed", () => {
      const table = new Map([["m", pricing({ fastMultiplier: 6 })]]);
      const u = usage({ inputTokens: 2, webSearchRequests: 1, speed: "standard" });
      expect(estimateCostUsd("m", u, table)).toBe(10002);
    });

    it("multiplies the whole sum, including web searches, by fastMultiplier for fast speed", () => {
      const table = new Map([["m", pricing({ fastMultiplier: 6 })]]);
      const u = usage({
        inputTokens: 1,
        outputTokens: 1,
        cacheWriteTokens: 1,
        cacheReadTokens: 1,
        webSearchRequests: 1,
        speed: "fast",
      });
      expect(estimateCostUsd("m", u, table)).toBe(11111 * 6);
    });

    it("supports fractional fast multipliers", () => {
      const table = new Map([["m", pricing({ fastMultiplier: 0.5 })]]);
      const u = usage({ outputTokens: 4, speed: "fast" });
      expect(estimateCostUsd("m", u, table)).toBe(20);
    });
  });

  describe("built-in fallback prices", () => {
    it.each([
      ["claude-opus-4-1", 15, 75, 18.75, 1.5],
      ["claude-sonnet-4-5", 3, 15, 3.75, 0.3],
      ["claude-3-5-haiku", 0.8, 4, 1, 0.08],
      ["gpt-4o", 2.5, 10, 2.5, 1.25],
      ["gpt-4o-mini", 0.15, 0.6, 0.15, 0.075],
    ])("prices %s at %s/%s/%s/%s per million tokens", (model, input, output, write, read) => {
      const cost = (u: Partial<Usage>) => estimateCostUsd(model, usage(u), empty());
      expect(cost({ inputTokens: M })).toBeCloseTo(input, 10);
      expect(cost({ outputTokens: M })).toBeCloseTo(output, 10);
      expect(cost({ cacheWriteTokens: M })).toBeCloseTo(write, 10);
      expect(cost({ cacheReadTokens: M })).toBeCloseTo(read, 10);
      expect(cost({ webSearchRequests: 1 })).toBeCloseTo(0.01, 10);
      expect(estimateCostUsd(model, oneMillionEach, empty())).toBeCloseTo(
        input + output + write + read + 0.01,
        10,
      );
    });

    it("charges $0.01 per web search request", () => {
      expect(
        estimateCostUsd("gpt-4o", usage({ webSearchRequests: 7 }), empty()),
      ).toBeCloseTo(0.07, 10);
    });

    it("has a fast multiplier of 1", () => {
      const standard = estimateCostUsd("claude-opus-4-1", oneMillionEach, empty());
      const fast = estimateCostUsd(
        "claude-opus-4-1",
        { ...oneMillionEach, speed: "fast" },
        empty(),
      );
      expect(fast).toBeCloseTo(standard, 10);
      expect(fast).toBeCloseTo(15 + 75 + 18.75 + 1.5 + 0.01, 10);
    });
  });

  describe("canonical name", () => {
    const sonnetInput = (model: string) =>
      estimateCostUsd(model, usage({ inputTokens: M }), empty());

    it("strips a -YYYYMMDD date suffix", () => {
      expect(
        estimateCostUsd("claude-3-5-haiku-20241022", usage({ inputTokens: M }), empty()),
      ).toBeCloseTo(0.8, 10);
    });

    it("strips a -YYYY-MM-DD date suffix", () => {
      expect(
        estimateCostUsd("gpt-4o-2024-08-06", usage({ inputTokens: M }), empty()),
      ).toBeCloseTo(2.5, 10);
    });

    it("strips only the date, not further segments (gpt-4o-mini stays gpt-4o-mini)", () => {
      expect(
        estimateCostUsd("gpt-4o-mini-2024-07-18", usage({ inputTokens: M }), empty()),
      ).toBeCloseTo(0.15, 10);
    });

    it("strips everything from the first @", () => {
      expect(sonnetInput("claude-sonnet-4-5@vertex")).toBeCloseTo(3, 10);
      expect(sonnetInput("claude-sonnet-4-5@a@b")).toBeCloseTo(3, 10);
      expect(sonnetInput("claude-sonnet-4-5@")).toBeCloseTo(3, 10);
    });

    it("strips @ first and then the date suffix", () => {
      expect(sonnetInput("claude-sonnet-4-5-20250929@vertex")).toBeCloseTo(3, 10);
    });

    it("treats a date following @ as part of the removed part", () => {
      expect(sonnetInput("claude-sonnet-4-5@20250929")).toBeCloseTo(3, 10);
    });

    it("does not strip a date that is not at the end", () => {
      expect(sonnetInput("claude-sonnet-4-5-20250929-extra")).toBe(0);
    });

    it("does not strip malformed date suffixes", () => {
      expect(sonnetInput("claude-sonnet-4-5-2025092")).toBe(0); // 7 digits
      expect(sonnetInput("claude-sonnet-4-5-202509291")).toBe(0); // 9 digits
      expect(sonnetInput("claude-sonnet-4-520250929")).toBe(0); // no hyphen
      expect(sonnetInput("claude-sonnet-4-5-2025-0929")).toBe(0);
      expect(sonnetInput("claude-sonnet-4-5-2025-09-2")).toBe(0);
    });

    it("applies canonicalisation to pricingTable lookups too", () => {
      const table = new Map([["my-model", pricing()]]);
      expect(estimateCostUsd("my-model-20250101", usage({ inputTokens: 2 }), table)).toBe(2);
      expect(estimateCostUsd("my-model-2025-01-01", usage({ inputTokens: 2 }), table)).toBe(2);
      expect(estimateCostUsd("my-model@region", usage({ inputTokens: 2 }), table)).toBe(2);
      expect(
        estimateCostUsd("my-model-2025-01-01@region", usage({ inputTokens: 2 }), table),
      ).toBe(2);
    });
  });

  describe("lookup order", () => {
    it("prefers the exact name in pricingTable over the canonical name in pricingTable", () => {
      const table = new Map([
        ["m-20250101", pricing({ inputCostPerToken: 7 })],
        ["m", pricing({ inputCostPerToken: 3 })],
      ]);
      expect(estimateCostUsd("m-20250101", usage({ inputTokens: 1 }), table)).toBe(7);
    });

    it("matches an exact pricingTable key containing @ before canonicalising", () => {
      const table = new Map([
        ["m@special", pricing({ inputCostPerToken: 7 })],
        ["m", pricing({ inputCostPerToken: 3 })],
      ]);
      expect(estimateCostUsd("m@special", usage({ inputTokens: 1 }), table)).toBe(7);
      expect(estimateCostUsd("m@other", usage({ inputTokens: 1 }), table)).toBe(3);
    });

    it("prefers the exact name in pricingTable over the fallback prices", () => {
      const table = new Map([["gpt-4o", pricing({ inputCostPerToken: 7 })]]);
      expect(estimateCostUsd("gpt-4o", usage({ inputTokens: 1 }), table)).toBe(7);
    });

    it("prefers the canonical name in pricingTable over the fallback prices", () => {
      const table = new Map([["claude-3-5-haiku", pricing({ inputCostPerToken: 7 })]]);
      expect(
        estimateCostUsd("claude-3-5-haiku-20241022", usage({ inputTokens: 1 }), table),
      ).toBe(7);
    });

    it("prefers the exact name in pricingTable over the canonical name in the fallback prices", () => {
      const table = new Map([
        ["claude-3-5-haiku-20241022", pricing({ inputCostPerToken: 7 })],
      ]);
      expect(
        estimateCostUsd("claude-3-5-haiku-20241022", usage({ inputTokens: 1 }), table),
      ).toBe(7);
    });

    it("uses the whole pricingTable entry rather than merging with fallback prices", () => {
      const table = new Map([
        [
          "gpt-4o",
          pricing({
            inputCostPerToken: 0,
            outputCostPerToken: 0,
            cacheWriteCostPerToken: 0,
            cacheReadCostPerToken: 0,
            webSearchCostPerRequest: 0,
            fastMultiplier: 5,
          }),
        ],
      ]);
      expect(estimateCostUsd("gpt-4o", oneMillionEach, table)).toBe(0);
    });

    it("uses the pricingTable entry's fastMultiplier for a model that is also a fallback", () => {
      const table = new Map([["gpt-4o", pricing({ fastMultiplier: 2 })]]);
      expect(
        estimateCostUsd("gpt-4o", usage({ inputTokens: 1, speed: "fast" }), table),
      ).toBe(2);
    });

    it("falls back to built-in prices when pricingTable has other models", () => {
      const table = new Map([["something-else", pricing()]]);
      expect(
        estimateCostUsd("gpt-4o", usage({ inputTokens: M }), table),
      ).toBeCloseTo(2.5, 10);
    });
  });

  describe("no match", () => {
    it("returns 0 for an unknown model", () => {
      expect(estimateCostUsd("unknown-model", oneMillionEach, empty())).toBe(0);
      expect(
        estimateCostUsd("unknown-model", { ...oneMillionEach, speed: "fast" }, empty()),
      ).toBe(0);
    });

    it("returns 0 for an empty model name", () => {
      expect(estimateCostUsd("", oneMillionEach, empty())).toBe(0);
    });

    it("does no prefix matching", () => {
      expect(estimateCostUsd("claude-sonnet-4", oneMillionEach, empty())).toBe(0);
      expect(estimateCostUsd("gpt-4", oneMillionEach, empty())).toBe(0);
      expect(estimateCostUsd("claude-sonnet-4-5-latest", oneMillionEach, empty())).toBe(0);
      expect(estimateCostUsd("gpt-4o-audio", oneMillionEach, empty())).toBe(0);
      const table = new Map([["m", pricing()]]);
      expect(estimateCostUsd("m-large", oneMillionEach, table)).toBe(0);
      expect(estimateCostUsd("xm", oneMillionEach, table)).toBe(0);
    });

    it("does no fuzzy or provider-prefix matching", () => {
      expect(estimateCostUsd("anthropic/claude-sonnet-4-5", oneMillionEach, empty())).toBe(0);
      expect(estimateCostUsd("openai.gpt-4o", oneMillionEach, empty())).toBe(0);
      expect(estimateCostUsd(" gpt-4o", oneMillionEach, empty())).toBe(0);
      expect(estimateCostUsd("gpt4o", oneMillionEach, empty())).toBe(0);
    });

    it("does not treat a table key as a prefix to match a longer model name", () => {
      const table = new Map([["gpt-4o", pricing()]]);
      // gpt-4o-mini should resolve to its own fallback entry, not the table's gpt-4o.
      expect(
        estimateCostUsd("gpt-4o-mini", usage({ inputTokens: M }), table),
      ).toBeCloseTo(0.15, 10);
    });
  });
});
