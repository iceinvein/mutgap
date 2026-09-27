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

const empty = () => new Map<string, ModelPricing>();

// One million input tokens: cost equals the per-million input price.
const oneMillionInput = usage({ inputTokens: M });

describe("estimateCostUsd: cost calculation", () => {
  const entry = pricing({
    inputCostPerToken: 1,
    outputCostPerToken: 10,
    cacheWriteCostPerToken: 100,
    cacheReadCostPerToken: 1000,
    webSearchCostPerRequest: 10000,
    fastMultiplier: 3,
  });
  const table = new Map([["m", entry]]);

  it("charges each usage count at its own per-unit price", () => {
    expect(estimateCostUsd("m", usage({ inputTokens: 2 }), table)).toBeCloseTo(2);
    expect(estimateCostUsd("m", usage({ outputTokens: 2 }), table)).toBeCloseTo(20);
    expect(estimateCostUsd("m", usage({ cacheWriteTokens: 2 }), table)).toBeCloseTo(200);
    expect(estimateCostUsd("m", usage({ cacheReadTokens: 2 }), table)).toBeCloseTo(2000);
    expect(estimateCostUsd("m", usage({ webSearchRequests: 2 }), table)).toBeCloseTo(20000);
  });

  it("sums all five components", () => {
    const u = usage({
      inputTokens: 1,
      outputTokens: 2,
      cacheWriteTokens: 3,
      cacheReadTokens: 4,
      webSearchRequests: 5,
    });
    expect(estimateCostUsd("m", u, table)).toBeCloseTo(1 + 20 + 300 + 4000 + 50000);
  });

  it("ignores fastMultiplier for standard speed", () => {
    expect(estimateCostUsd("m", usage({ inputTokens: 7 }), table)).toBeCloseTo(7);
  });

  it("multiplies the whole sum, including web search, by fastMultiplier for fast speed", () => {
    const u = usage({
      inputTokens: 1,
      outputTokens: 2,
      cacheWriteTokens: 3,
      cacheReadTokens: 4,
      webSearchRequests: 5,
      speed: "fast",
    });
    expect(estimateCostUsd("m", u, table)).toBeCloseTo(3 * (1 + 20 + 300 + 4000 + 50000));
  });

  it("returns 0 for zero usage", () => {
    expect(estimateCostUsd("m", usage(), table)).toBe(0);
    expect(estimateCostUsd("m", usage({ speed: "fast" }), table)).toBe(0);
  });

  it("uses realistic per-token prices correctly", () => {
    const t = new Map([
      ["x", pricing({ inputCostPerToken: 3 / M, outputCostPerToken: 15 / M })],
    ]);
    expect(
      estimateCostUsd("x", usage({ inputTokens: 1000, outputTokens: 500 }), t),
    ).toBeCloseTo(0.003 + 0.0075, 10);
  });
});

describe("estimateCostUsd: built-in fallback prices", () => {
  const cases: Array<[string, number, number, number, number]> = [
    ["claude-opus-4-1", 15, 75, 18.75, 1.5],
    ["claude-sonnet-4-5", 3, 15, 3.75, 0.3],
    ["claude-3-5-haiku", 0.8, 4, 1, 0.08],
    ["gpt-4o", 2.5, 10, 2.5, 1.25],
    ["gpt-4o-mini", 0.15, 0.6, 0.15, 0.075],
  ];

  it.each(cases)("%s has the documented per-million prices", (model, inp, out, cw, cr) => {
    expect(estimateCostUsd(model, usage({ inputTokens: M }), empty())).toBeCloseTo(inp, 10);
    expect(estimateCostUsd(model, usage({ outputTokens: M }), empty())).toBeCloseTo(out, 10);
    expect(estimateCostUsd(model, usage({ cacheWriteTokens: M }), empty())).toBeCloseTo(cw, 10);
    expect(estimateCostUsd(model, usage({ cacheReadTokens: M }), empty())).toBeCloseTo(cr, 10);
  });

  it.each(cases.map((c) => c[0]))("%s charges $0.01 per web search request", (model) => {
    expect(estimateCostUsd(model, usage({ webSearchRequests: 3 }), empty())).toBeCloseTo(0.03, 10);
  });

  it.each(cases.map((c) => c[0]))("%s has a fast multiplier of 1", (model) => {
    const u = { inputTokens: 1000, outputTokens: 2000, webSearchRequests: 1 };
    const standard = estimateCostUsd(model, usage(u), empty());
    const fast = estimateCostUsd(model, usage({ ...u, speed: "fast" }), empty());
    expect(standard).toBeGreaterThan(0);
    expect(fast).toBeCloseTo(standard, 12);
  });
});

describe("estimateCostUsd: canonical name", () => {
  it("strips a trailing -YYYYMMDD date", () => {
    expect(estimateCostUsd("claude-3-5-haiku-20241022", oneMillionInput, empty())).toBeCloseTo(0.8);
  });

  it("strips a trailing -YYYY-MM-DD date", () => {
    expect(estimateCostUsd("gpt-4o-2024-08-06", oneMillionInput, empty())).toBeCloseTo(2.5);
    expect(estimateCostUsd("gpt-4o-mini-2024-07-18", oneMillionInput, empty())).toBeCloseTo(0.15);
  });

  it("strips everything from the first @", () => {
    expect(estimateCostUsd("claude-sonnet-4-5@vertex", oneMillionInput, empty())).toBeCloseTo(3);
    expect(estimateCostUsd("claude-sonnet-4-5@a@b", oneMillionInput, empty())).toBeCloseTo(3);
    expect(estimateCostUsd("claude-sonnet-4-5@", oneMillionInput, empty())).toBeCloseTo(3);
  });

  it("strips @ first, then the date suffix", () => {
    expect(estimateCostUsd("claude-3-5-haiku-20241022@v1", oneMillionInput, empty())).toBeCloseTo(0.8);
    expect(estimateCostUsd("claude-opus-4-1@20250805", oneMillionInput, empty())).toBeCloseTo(15);
    expect(estimateCostUsd("gpt-4o-2024-08-06@x", oneMillionInput, empty())).toBeCloseTo(2.5);
  });

  it("does not strip a date that is not at the end", () => {
    expect(estimateCostUsd("claude-3-5-haiku-20241022-v2", oneMillionInput, empty())).toBe(0);
  });

  it("does not strip malformed date suffixes", () => {
    expect(estimateCostUsd("claude-3-5-haiku-2024102", oneMillionInput, empty())).toBe(0);
    expect(estimateCostUsd("claude-3-5-haiku-202410221", oneMillionInput, empty())).toBe(0);
    expect(estimateCostUsd("claude-3-5-haiku20241022", oneMillionInput, empty())).toBe(0);
    expect(estimateCostUsd("gpt-4o-2024-8-6", oneMillionInput, empty())).toBe(0);
    expect(estimateCostUsd("gpt-4o-20240806x", oneMillionInput, empty())).toBe(0);
  });

  it("canonicalises names for pricing table lookups too", () => {
    const t = new Map([["my-model", pricing({ inputCostPerToken: 2 })]]);
    expect(estimateCostUsd("my-model-20250101", usage({ inputTokens: 1 }), t)).toBeCloseTo(2);
    expect(estimateCostUsd("my-model-2025-01-01", usage({ inputTokens: 1 }), t)).toBeCloseTo(2);
    expect(estimateCostUsd("my-model@region", usage({ inputTokens: 1 }), t)).toBeCloseTo(2);
    expect(estimateCostUsd("my-model-20250101@region", usage({ inputTokens: 1 }), t)).toBeCloseTo(2);
  });
});

describe("estimateCostUsd: lookup order", () => {
  it("prefers an exact pricing table match over the canonical table match", () => {
    const t = new Map([
      ["my-model-20250101", pricing({ inputCostPerToken: 5 })],
      ["my-model", pricing({ inputCostPerToken: 2 })],
    ]);
    expect(estimateCostUsd("my-model-20250101", usage({ inputTokens: 1 }), t)).toBeCloseTo(5);
  });

  it("matches a pricing table key containing @ exactly before canonicalising", () => {
    const t = new Map([
      ["my-model@eu", pricing({ inputCostPerToken: 7 })],
      ["my-model", pricing({ inputCostPerToken: 2 })],
    ]);
    expect(estimateCostUsd("my-model@eu", usage({ inputTokens: 1 }), t)).toBeCloseTo(7);
    expect(estimateCostUsd("my-model@us", usage({ inputTokens: 1 }), t)).toBeCloseTo(2);
  });

  it("prefers the pricing table over the fallback prices", () => {
    const t = new Map([["claude-sonnet-4-5", pricing({ inputCostPerToken: 1 })]]);
    expect(estimateCostUsd("claude-sonnet-4-5", usage({ inputTokens: 10 }), t)).toBeCloseTo(10);
  });

  it("prefers a canonical pricing table match over the fallback prices", () => {
    const t = new Map([["claude-3-5-haiku", pricing({ inputCostPerToken: 1 })]]);
    expect(estimateCostUsd("claude-3-5-haiku-20241022", usage({ inputTokens: 10 }), t)).toBeCloseTo(10);
  });

  it("uses a pricing table entry even if it is all zeros", () => {
    const t = new Map([["gpt-4o", pricing()]]);
    expect(estimateCostUsd("gpt-4o", oneMillionInput, t)).toBe(0);
  });

  it("uses the pricing table entry's fastMultiplier, not the fallback's", () => {
    const t = new Map([["gpt-4o", pricing({ inputCostPerToken: 1, fastMultiplier: 6 })]]);
    expect(estimateCostUsd("gpt-4o", usage({ inputTokens: 1, speed: "fast" }), t)).toBeCloseTo(6);
  });

  it("falls back to built-in prices when the table has unrelated entries", () => {
    const t = new Map([["other", pricing({ inputCostPerToken: 1 })]]);
    expect(estimateCostUsd("gpt-4o-mini", oneMillionInput, t)).toBeCloseTo(0.15);
  });
});

describe("estimateCostUsd: no match", () => {
  it("returns 0 for an unknown model", () => {
    expect(estimateCostUsd("unknown-model", oneMillionInput, empty())).toBe(0);
    expect(
      estimateCostUsd("unknown-model", usage({ inputTokens: M, speed: "fast", webSearchRequests: 5 }), empty()),
    ).toBe(0);
  });

  it("returns 0 for an empty model name", () => {
    expect(estimateCostUsd("", oneMillionInput, empty())).toBe(0);
  });

  it("does not do prefix matching", () => {
    expect(estimateCostUsd("claude-sonnet-4", oneMillionInput, empty())).toBe(0);
    expect(estimateCostUsd("claude-sonnet-4-5-extra", oneMillionInput, empty())).toBe(0);
    expect(estimateCostUsd("gpt-4o-mini-turbo", oneMillionInput, empty())).toBe(0);
    expect(estimateCostUsd("gpt", oneMillionInput, empty())).toBe(0);
    const t = new Map([["my-model", pricing({ inputCostPerToken: 1 })]]);
    expect(estimateCostUsd("my-model-v2", oneMillionInput, t)).toBe(0);
    expect(estimateCostUsd("my", oneMillionInput, t)).toBe(0);
  });

  it("does not do fuzzy or case-insensitive matching", () => {
    expect(estimateCostUsd("Claude-Sonnet-4-5", oneMillionInput, empty())).toBe(0);
    expect(estimateCostUsd("claude-sonnet-4.5", oneMillionInput, empty())).toBe(0);
    expect(estimateCostUsd(" gpt-4o", oneMillionInput, empty())).toBe(0);
    expect(estimateCostUsd("anthropic/claude-sonnet-4-5", oneMillionInput, empty())).toBe(0);
  });
});
