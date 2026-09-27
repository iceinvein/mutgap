export type ModelPricing = {
  inputCostPerToken: number;
  outputCostPerToken: number;
  cacheWriteCostPerToken: number;
  cacheReadCostPerToken: number;
  webSearchCostPerRequest: number;
  fastMultiplier: number;
};

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
  throw new Error('not implemented')
}
