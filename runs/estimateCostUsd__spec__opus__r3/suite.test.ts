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

// Distinct price used to tell which table entry was picked.
function flat(inputCostPerToken: number): ModelPricing {
  return pricing({ inputCostPerToken });
}

const oneInput = usage({ inputTokens: 1 });
const empty = new Map<string, ModelPricing>();

describe("cost calculation", () => {
  it("multiplies each count by its matching per-unit price and sums them", () => {
    const table = new Map([
      [
        "m",
        pricing({
          inputCostPerToken: 1,
          outputCostPerToken: 10,
          cacheWriteCostPerToken: 100,
          cacheReadCostPerToken: 1000,
          webSearchCostPerRequest: 10000,
        }),
      ],
    ]);
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
    ["inputTokens", "inputCostPerToken"],
    ["outputTokens", "outputCostPerToken"],
    ["cacheWriteTokens", "cacheWriteCostPerToken"],
    ["cacheReadTokens", "cacheReadCostPerToken"],
    ["webSearchRequests", "webSearchCostPerRequest"],
  ] as const)("charges %s at %s only", (count, price) => {
    const table = new Map([["m", pricing({ [price]: 3 })]]);
    expect(estimateCostUsd("m", usage({ [count]: 7 }), table)).toBe(21);
  });

  it("returns 0 for zero usage", () => {
    const table = new Map([["m", pricing({ inputCostPerToken: 5, webSearchCostPerRequest: 5 })]]);
    expect(estimateCostUsd("m", usage(), table)).toBe(0);
  });

  it("applies fastMultiplier to the whole sum when speed is fast", () => {
    const table = new Map([
      [
        "m",
        pricing({
          inputCostPerToken: 1,
          outputCostPerToken: 2,
          cacheWriteCostPerToken: 3,
          cacheReadCostPerToken: 4,
          webSearchCostPerRequest: 5,
          fastMultiplier: 6,
        }),
      ],
    ]);
    const counts = {
      inputTokens: 1,
      outputTokens: 1,
      cacheWriteTokens: 1,
      cacheReadTokens: 1,
      webSearchRequests: 1,
    };
    expect(estimateCostUsd("m", usage({ ...counts, speed: "fast" }), table)).toBe(15 * 6);
  });

  it("ignores fastMultiplier when speed is standard", () => {
    const table = new Map([["m", pricing({ inputCostPerToken: 2, fastMultiplier: 6 })]]);
    expect(estimateCostUsd("m", usage({ inputTokens: 5 }), table)).toBe(10);
  });
});

describe("built-in fallback prices", () => {
  const all = usage({
    inputTokens: M,
    outputTokens: 2 * M,
    cacheWriteTokens: 3 * M,
    cacheReadTokens: 4 * M,
    webSearchRequests: 5,
  });

  it.each([
    ["claude-opus-4-1", 15, 75, 18.75, 1.5],
    ["claude-sonnet-4-5", 3, 15, 3.75, 0.3],
    ["claude-3-5-haiku", 0.8, 4, 1, 0.08],
    ["gpt-4o", 2.5, 10, 2.5, 1.25],
    ["gpt-4o-mini", 0.15, 0.6, 0.15, 0.075],
  ])("prices %s per million tokens", (model, input, output, write, read) => {
    const expected = input + 2 * output + 3 * write + 4 * read + 5 * 0.01;
    expect(estimateCostUsd(model, all, empty)).toBeCloseTo(expected, 9);
  });

  it("charges $0.01 per web search request", () => {
    expect(estimateCostUsd("gpt-4o", usage({ webSearchRequests: 3 }), empty)).toBeCloseTo(0.03, 12);
  });

  it("uses a fast multiplier of 1", () => {
    const u = usage({ inputTokens: M, webSearchRequests: 1 });
    const standard = estimateCostUsd("claude-opus-4-1", u, empty);
    const fast = estimateCostUsd("claude-opus-4-1", { ...u, speed: "fast" }, empty);
    expect(standard).toBeCloseTo(15.01, 9);
    expect(fast).toBeCloseTo(standard, 12);
  });
});

describe("lookup order", () => {
  it("prefers the exact name in pricingTable over its canonical name in pricingTable", () => {
    const table = new Map([
      ["claude-3-5-haiku", flat(1)],
      ["claude-3-5-haiku-20241022", flat(2)],
    ]);
    expect(estimateCostUsd("claude-3-5-haiku-20241022", oneInput, table)).toBe(2);
  });

  it("uses the canonical name in pricingTable when the exact name is absent", () => {
    const table = new Map([["claude-3-5-haiku", flat(1)]]);
    expect(estimateCostUsd("claude-3-5-haiku-20241022", oneInput, table)).toBe(1);
  });

  it("prefers pricingTable over the fallback for the same name", () => {
    const table = new Map([["claude-sonnet-4-5", flat(7)]]);
    expect(estimateCostUsd("claude-sonnet-4-5", oneInput, table)).toBe(7);
  });

  it("prefers the canonical name in pricingTable over the fallback", () => {
    const table = new Map([["claude-sonnet-4-5", flat(7)]]);
    expect(estimateCostUsd("claude-sonnet-4-5-20250929", oneInput, table)).toBe(7);
  });

  it("uses the fallback when pricingTable has no match", () => {
    const table = new Map([["something-else", flat(7)]]);
    expect(estimateCostUsd("claude-sonnet-4-5", usage({ inputTokens: M }), table)).toBeCloseTo(3, 9);
  });

  it("uses the canonical name in the fallback prices", () => {
    expect(
      estimateCostUsd("claude-3-5-haiku-20241022", usage({ inputTokens: M }), empty),
    ).toBeCloseTo(0.8, 9);
  });

  it("uses the pricingTable entry's fastMultiplier, not the fallback's", () => {
    const table = new Map([["gpt-4o", pricing({ inputCostPerToken: 1, fastMultiplier: 3 })]]);
    expect(estimateCostUsd("gpt-4o", usage({ inputTokens: 2, speed: "fast" }), table)).toBe(6);
  });
});

describe("canonical name", () => {
  const table = new Map([["base", flat(1)]]);

  it.each([
    ["base-20240101", "YYYYMMDD date suffix"],
    ["base-2024-01-01", "YYYY-MM-DD date suffix"],
    ["base@vertex", "@ suffix"],
    ["base@", "bare @"],
    ["base@a@b", "everything from the first @"],
    ["base@2024-01-01", "@ followed by a date"],
    ["base-20240101@vertex", "@ suffix then date suffix"],
    ["base-2024-01-01@x@y", "@ suffixes then dashed date suffix"],
  ])("strips %s (%s)", (model) => {
    expect(estimateCostUsd(model, oneInput, table)).toBe(1);
  });

  it("strips the @ suffix before the date suffix, exposing a date to strip", () => {
    expect(
      estimateCostUsd("claude-3-5-haiku-20241022@001", usage({ inputTokens: M }), empty),
    ).toBeCloseTo(0.8, 9);
  });

  it.each([
    ["base-20240101-extra", "date not trailing"],
    ["base20240101", "date without leading hyphen"],
    ["base-2024010", "seven digits"],
    ["base-202401011", "nine digits"],
    ["base-240101", "two-digit year"],
    ["base-2024-0101", "partially dashed date"],
    ["base-2024/01/01", "slash-separated date"],
    ["base-latest", "non-date suffix"],
    ["base-v2", "version suffix"],
  ])("does not treat %s as base (%s)", (model) => {
    expect(estimateCostUsd(model, oneInput, table)).toBe(0);
  });

  it("canonicalises a name starting with @ to the empty string", () => {
    const t = new Map([["", flat(1)]]);
    // "@foo" canonicalises to "", which is in the table.
    expect(estimateCostUsd("@foo", oneInput, t)).toBe(1);
  });
});

describe("no match", () => {
  it("returns 0 for an unknown model", () => {
    expect(estimateCostUsd("unknown-model", usage({ inputTokens: M, webSearchRequests: 3 }), empty)).toBe(0);
  });

  it("returns 0 for an unknown model at fast speed", () => {
    expect(
      estimateCostUsd("unknown-model", usage({ inputTokens: M, speed: "fast" }), empty),
    ).toBe(0);
  });

  it.each([
    ["claude-opus-4", "prefix of a fallback name"],
    ["claude-opus-4-1-extended", "fallback name as prefix"],
    ["my-gpt-4o", "fallback name as suffix"],
    ["Claude-Opus-4-1", "different case"],
    [" gpt-4o", "leading whitespace"],
    ["gpt-4o ", "trailing whitespace"],
    ["gpt4o", "missing hyphen"],
  ])("does no prefix or fuzzy matching: %s (%s)", (model) => {
    expect(estimateCostUsd(model, usage({ inputTokens: M }), empty)).toBe(0);
  });

  it("does no prefix matching against pricingTable", () => {
    const table = new Map([["custom", flat(1)]]);
    expect(estimateCostUsd("custom-model", oneInput, table)).toBe(0);
    expect(estimateCostUsd("cust", oneInput, table)).toBe(0);
  });

  it("resolves gpt-4o-mini to itself, not gpt-4o", () => {
    expect(
      estimateCostUsd("gpt-4o-mini-2024-07-18", usage({ inputTokens: M }), empty),
    ).toBeCloseTo(0.15, 9);
  });
});
