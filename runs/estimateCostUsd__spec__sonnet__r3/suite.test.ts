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

describe("estimateCostUsd - per-usage pricing math", () => {
  it("charges inputTokens at inputCostPerToken", () => {
    const table = new Map([["m", pricing({ inputCostPerToken: 0.5 })]]);
    expect(estimateCostUsd("m", usage({ inputTokens: 10 }), table)).toBeCloseTo(5);
  });

  it("charges outputTokens at outputCostPerToken", () => {
    const table = new Map([["m", pricing({ outputCostPerToken: 2 })]]);
    expect(estimateCostUsd("m", usage({ outputTokens: 3 }), table)).toBeCloseTo(6);
  });

  it("charges cacheWriteTokens at cacheWriteCostPerToken", () => {
    const table = new Map([["m", pricing({ cacheWriteCostPerToken: 1.5 })]]);
    expect(estimateCostUsd("m", usage({ cacheWriteTokens: 4 }), table)).toBeCloseTo(6);
  });

  it("charges cacheReadTokens at cacheReadCostPerToken", () => {
    const table = new Map([["m", pricing({ cacheReadCostPerToken: 0.25 })]]);
    expect(estimateCostUsd("m", usage({ cacheReadTokens: 8 }), table)).toBeCloseTo(2);
  });

  it("charges webSearchRequests at webSearchCostPerRequest", () => {
    const table = new Map([["m", pricing({ webSearchCostPerRequest: 0.01 })]]);
    expect(estimateCostUsd("m", usage({ webSearchRequests: 7 }), table)).toBeCloseTo(0.07);
  });

  it("sums all five components", () => {
    const table = new Map([
      [
        "m",
        pricing({
          inputCostPerToken: 1,
          outputCostPerToken: 2,
          cacheWriteCostPerToken: 3,
          cacheReadCostPerToken: 4,
          webSearchCostPerRequest: 5,
        }),
      ],
    ]);
    const result = estimateCostUsd(
      "m",
      usage({
        inputTokens: 1,
        outputTokens: 1,
        cacheWriteTokens: 1,
        cacheReadTokens: 1,
        webSearchRequests: 1,
      }),
      table,
    );
    expect(result).toBeCloseTo(1 + 2 + 3 + 4 + 5);
  });

  it("returns 0 when all usage counts are 0", () => {
    const table = new Map([["m", pricing({ inputCostPerToken: 99, outputCostPerToken: 99 })]]);
    expect(estimateCostUsd("m", usage(), table)).toBe(0);
  });
});

describe("estimateCostUsd - speed multiplier", () => {
  it("does not scale the total when speed is standard", () => {
    const table = new Map([
      ["m", pricing({ inputCostPerToken: 1, fastMultiplier: 10 })],
    ]);
    expect(
      estimateCostUsd("m", usage({ inputTokens: 5, speed: "standard" }), table),
    ).toBeCloseTo(5);
  });

  it("scales the summed total by fastMultiplier when speed is fast", () => {
    const table = new Map([
      [
        "m",
        pricing({ inputCostPerToken: 1, outputCostPerToken: 1, fastMultiplier: 2 }),
      ],
    ]);
    expect(
      estimateCostUsd(
        "m",
        usage({ inputTokens: 5, outputTokens: 5, speed: "fast" }),
        table,
      ),
    ).toBeCloseTo((5 + 5) * 2);
  });
});

describe("estimateCostUsd - lookup precedence", () => {
  it("prefers an exact model name match in pricingTable over everything else", () => {
    const table = new Map([
      ["claude-3-5-haiku-20241022", pricing({ inputCostPerToken: 1 })],
      ["claude-3-5-haiku", pricing({ inputCostPerToken: 2 })],
    ]);
    expect(
      estimateCostUsd("claude-3-5-haiku-20241022", usage({ inputTokens: 1 }), table),
    ).toBeCloseTo(1);
  });

  it("falls back to the canonical name match in pricingTable when no exact match", () => {
    const table = new Map([["claude-3-5-haiku", pricing({ inputCostPerToken: 2 })]]);
    expect(
      estimateCostUsd("claude-3-5-haiku-20241022", usage({ inputTokens: 1 }), table),
    ).toBeCloseTo(2);
  });

  it("falls back to an exact match in the built-in fallback prices when pricingTable has no match", () => {
    const table = new Map<string, ModelPricing>();
    // claude-sonnet-4-5 fallback: input $3 / million tokens
    const result = estimateCostUsd(
      "claude-sonnet-4-5",
      usage({ inputTokens: 1_000_000 }),
      table,
    );
    expect(result).toBeCloseTo(3);
  });

  it("falls back to the canonical name match in the built-in fallback prices as a last resort", () => {
    const table = new Map<string, ModelPricing>();
    // claude-3-5-haiku-20241022 -> canonical claude-3-5-haiku, input $0.8 / million tokens
    const result = estimateCostUsd(
      "claude-3-5-haiku-20241022",
      usage({ inputTokens: 1_000_000 }),
      table,
    );
    expect(result).toBeCloseTo(0.8);
  });

  it("returns 0 when nothing matches in pricingTable or fallback prices", () => {
    const table = new Map([["some-other-model", pricing({ inputCostPerToken: 5 })]]);
    expect(
      estimateCostUsd("totally-unknown-model", usage({ inputTokens: 100 }), table),
    ).toBe(0);
  });

  it("does not do prefix or fuzzy matching", () => {
    const table = new Map<string, ModelPricing>();
    // "claude-3-5-haiku-fine-tuned" has no exact or canonical fallback entry
    expect(
      estimateCostUsd(
        "claude-3-5-haiku-fine-tuned",
        usage({ inputTokens: 1_000_000 }),
        table,
      ),
    ).toBe(0);
  });
});

describe("estimateCostUsd - canonical name derivation", () => {
  it("strips everything from the first '@'", () => {
    const table = new Map([["claude-3-5-haiku", pricing({ inputCostPerToken: 2 })]]);
    expect(
      estimateCostUsd("claude-3-5-haiku@some-region", usage({ inputTokens: 1 }), table),
    ).toBeCloseTo(2);
  });

  it("strips a trailing -YYYYMMDD date suffix", () => {
    const table = new Map([["my-model", pricing({ inputCostPerToken: 2 })]]);
    expect(
      estimateCostUsd("my-model-20240115", usage({ inputTokens: 1 }), table),
    ).toBeCloseTo(2);
  });

  it("strips a trailing -YYYY-MM-DD date suffix", () => {
    const table = new Map([["my-model", pricing({ inputCostPerToken: 2 })]]);
    expect(
      estimateCostUsd("my-model-2024-01-15", usage({ inputTokens: 1 }), table),
    ).toBeCloseTo(2);
  });

  it("strips the '@' segment before stripping the trailing date suffix", () => {
    const table = new Map([["my-model", pricing({ inputCostPerToken: 2 })]]);
    expect(
      estimateCostUsd(
        "my-model-20240115@some-region",
        usage({ inputTokens: 1 }),
        table,
      ),
    ).toBeCloseTo(2);
  });

  it("does not strip a numeric suffix that isn't a valid date shape", () => {
    const table = new Map<string, ModelPricing>();
    // "-123" is neither 8 contiguous digits nor YYYY-MM-DD, so it must stay part of the
    // canonical name and therefore fail to match "my-model".
    const withCanonicalOnly = new Map([["my-model", pricing({ inputCostPerToken: 2 })]]);
    expect(
      estimateCostUsd("my-model-123", usage({ inputTokens: 1 }), withCanonicalOnly),
    ).toBe(0);
    expect(estimateCostUsd("my-model-123", usage({ inputTokens: 1 }), table)).toBe(0);
  });
});

describe("estimateCostUsd - built-in fallback price table", () => {
  const perMillion = (usd: number) => usd / 1_000_000;

  it.each([
    ["claude-opus-4-1", 15, 75, 18.75, 1.5],
    ["claude-sonnet-4-5", 3, 15, 3.75, 0.3],
    ["claude-3-5-haiku", 0.8, 4, 1, 0.08],
    ["gpt-4o", 2.5, 10, 2.5, 1.25],
    ["gpt-4o-mini", 0.15, 0.6, 0.15, 0.075],
  ])(
    "prices %s at $%s/$%s/$%s/$%s per million input/output/cache-write/cache-read tokens",
    (model, input, output, cacheWrite, cacheRead) => {
      const table = new Map<string, ModelPricing>();
      const result = estimateCostUsd(
        model,
        usage({
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
          cacheWriteTokens: 1_000_000,
          cacheReadTokens: 1_000_000,
        }),
        table,
      );
      expect(result).toBeCloseTo(input + output + cacheWrite + cacheRead);
      expect(perMillion(input * 1_000_000)).toBeCloseTo(input);
    },
  );

  it("charges $0.01 per web search request for every fallback entry", () => {
    const table = new Map<string, ModelPricing>();
    for (const model of [
      "claude-opus-4-1",
      "claude-sonnet-4-5",
      "claude-3-5-haiku",
      "gpt-4o",
      "gpt-4o-mini",
    ]) {
      expect(
        estimateCostUsd(model, usage({ webSearchRequests: 100 }), table),
      ).toBeCloseTo(1);
    }
  });

  it("uses a fast multiplier of 1 for fallback entries (fast equals standard)", () => {
    const table = new Map<string, ModelPricing>();
    const standard = estimateCostUsd(
      "claude-sonnet-4-5",
      usage({ inputTokens: 1_000_000, speed: "standard" }),
      table,
    );
    const fast = estimateCostUsd(
      "claude-sonnet-4-5",
      usage({ inputTokens: 1_000_000, speed: "fast" }),
      table,
    );
    expect(fast).toBeCloseTo(standard);
  });
});
