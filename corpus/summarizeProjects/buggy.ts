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

function normalizeProjectName(project: string): string {
  if (project.startsWith("/")) {
    const parts = project.split("/").filter(Boolean);
    const markers = ["workspace", "src", "projects", "repos", "code"];

    for (const marker of markers) {
      const index = parts.lastIndexOf(marker);
      if (index >= 0 && index < parts.length - 1) {
        const tail = parts.slice(index + 1);
        if (tail.length >= 2 && tail.at(-1) === tail.at(-2)) {
          return tail.at(-1)!;
        }
        return tail.join("/");
      }
    }

    return parts.slice(-2).join("/") || project;
  }

  if (!project.startsWith("-")) {
    return project;
  }

  const parts = project.split("-").filter(Boolean);
  if (parts.length === 0) {
    return project;
  }

  const markers = ["workspace", "src", "projects", "repos", "code"];
  for (const marker of markers) {
    const index = parts.lastIndexOf(marker);
    if (index >= 0 && index < parts.length - 1) {
      const tail = parts.slice(index + 1);
      if (tail.length === 2 && tail[0] === tail[1]) {
        return tail[0];
      }
      return tail.join("-");
    }
  }

  if (parts.length === 2 && parts[0] === parts[1]) {
    return parts[0];
  }

  return parts.join("-");
}

export function summarizeProjects(events: UsageEvent[]): ProjectSummary[] {
  const byProject = new Map<
    string,
    {
      events: number;
      estimatedCostUsd: number;
      totalInputTokens: number;
      totalOutputTokens: number;
    }
  >();

  for (const event of events) {
    const project = byProject.get(event.project) ?? {
      events: 0,
      estimatedCostUsd: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };

    project.events += 1;
    project.estimatedCostUsd += event.estimatedCostUsd;
    project.totalInputTokens += event.inputTokens;
    project.totalOutputTokens += event.outputTokens;
    byProject.set(event.project, project);
  }

  const grouped = new Map<
    string,
    {
      rawProjects: string[];
      events: number;
      estimatedCostUsd: number;
      totalInputTokens: number;
      totalOutputTokens: number;
    }
  >();

  for (const [project, summary] of byProject.entries()) {
    const displayProject = normalizeProjectName(project);
    const group = grouped.get(displayProject) ?? {
      rawProjects: [],
      events: 0,
      estimatedCostUsd: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };

    group.rawProjects.push(project);
    group.events += summary.events;
    group.estimatedCostUsd += summary.estimatedCostUsd;
    group.totalInputTokens += summary.totalInputTokens;
    group.totalOutputTokens += summary.totalOutputTokens;
    grouped.set(displayProject, group);
  }

  return [...grouped.entries()]
    .map(([displayProject, summary]) => ({
      project: summary.rawProjects[0] ?? displayProject,
      displayProject,
      rawProjects: summary.rawProjects.sort(),
      events: summary.events,
      estimatedCostUsd: summary.estimatedCostUsd,
      totalInputTokens: summary.totalInputTokens,
      totalOutputTokens: summary.totalOutputTokens,
    }))
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd || b.events - a.events || b.displayProject.localeCompare(a.displayProject));
}
