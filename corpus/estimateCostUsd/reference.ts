export type ModelPricing = {
  inputCostPerToken: number;
  outputCostPerToken: number;
  cacheWriteCostPerToken: number;
  cacheReadCostPerToken: number;
  webSearchCostPerRequest: number;
  fastMultiplier: number;
};

const WEB_SEARCH_COST = 0.01;

const FALLBACK_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-1": {
    inputCostPerToken: 15e-6,
    outputCostPerToken: 75e-6,
    cacheWriteCostPerToken: 18.75e-6,
    cacheReadCostPerToken: 1.5e-6,
    webSearchCostPerRequest: WEB_SEARCH_COST,
    fastMultiplier: 1,
  },
  "claude-sonnet-4-5": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 0.3e-6,
    webSearchCostPerRequest: WEB_SEARCH_COST,
    fastMultiplier: 1,
  },
  "claude-3-5-haiku": {
    inputCostPerToken: 0.8e-6,
    outputCostPerToken: 4e-6,
    cacheWriteCostPerToken: 1e-6,
    cacheReadCostPerToken: 0.08e-6,
    webSearchCostPerRequest: WEB_SEARCH_COST,
    fastMultiplier: 1,
  },
  "gpt-4o": {
    inputCostPerToken: 2.5e-6,
    outputCostPerToken: 10e-6,
    cacheWriteCostPerToken: 2.5e-6,
    cacheReadCostPerToken: 1.25e-6,
    webSearchCostPerRequest: WEB_SEARCH_COST,
    fastMultiplier: 1,
  },
  "gpt-4o-mini": {
    inputCostPerToken: 0.15e-6,
    outputCostPerToken: 0.6e-6,
    cacheWriteCostPerToken: 0.15e-6,
    cacheReadCostPerToken: 0.075e-6,
    webSearchCostPerRequest: WEB_SEARCH_COST,
    fastMultiplier: 1,
  },
};

function canonicalizeModelName(model: string): string {
  return model.replace(/@.*$/, "").replace(/-(?:\d{8}|\d{4}-\d{2}-\d{2})$/, "");
}

function resolvePricing(
  model: string,
  pricingTable: Map<string, ModelPricing>,
): ModelPricing | null {
  // Exact snapshot prices take precedence. Only strip explicit date/version
  // suffixes; prefix matching can confuse entirely different model variants.
  return pricingTable.get(model)
    ?? pricingTable.get(canonicalizeModelName(model))
    ?? FALLBACK_PRICING[model]
    ?? FALLBACK_PRICING[canonicalizeModelName(model)]
    ?? null;
}

export function estimateCostUsd(
  model: string,
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheWriteTokens: number;
    cacheReadTokens: number;
    webSearchRequests: number;
    speed: "standard" | "fast";
  },
  pricingTable: Map<string, ModelPricing>,
): number {
  const pricing = resolvePricing(model, pricingTable);
  if (!pricing) {
    return 0;
  }

  const multiplier = usage.speed === "fast" ? pricing.fastMultiplier : 1;

  return (
    multiplier *
    (usage.inputTokens * pricing.inputCostPerToken +
      usage.outputTokens * pricing.outputCostPerToken +
      usage.cacheWriteTokens * pricing.cacheWriteCostPerToken +
      usage.cacheReadTokens * pricing.cacheReadCostPerToken +
      usage.webSearchRequests * pricing.webSearchCostPerRequest)
  );
}
