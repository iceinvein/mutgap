export type UsageEvent = {
  source: "claude-code" | "codex-cli" | "cursor";
  project: string;
  sessionId: string;
  filePath: string;
  eventKey: string;
  timestamp: string;
  messageId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  webSearchRequests: number;
  totalTokens: number;
  tokenBreakdownKnown: boolean;
  speed: "standard" | "fast";
  estimatedCostUsd: number;
};

export type ProjectSummary = {
  project: string;
  displayProject: string;
  rawProjects: string[];
  events: number;
  estimatedCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
};

export function summarizeProjects(events: UsageEvent[]): ProjectSummary[] {
  throw new Error('not implemented')
}
