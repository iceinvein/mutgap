import { expect, test } from 'vitest'
import { summarizeProjects } from './summarizeProjects'

const ev = (project: string, estimatedCostUsd: number, inputTokens = 0, outputTokens = 0) => ({
  source: 'claude-code' as const,
  project,
  sessionId: 's',
  filePath: 'f',
  eventKey: 'k',
  timestamp: '2026-01-01T00:00:00Z',
  model: 'm',
  inputTokens,
  outputTokens,
  cacheWriteTokens: 0,
  cacheReadTokens: 0,
  webSearchRequests: 0,
  totalTokens: inputTokens + outputTokens,
  tokenBreakdownKnown: true,
  speed: 'standard' as const,
  estimatedCostUsd,
})

test('projects tied on cost and events are ordered by display name ascending', () => {
  const out = summarizeProjects([ev('zeta', 1), ev('alpha', 1), ev('mid', 1)])
  expect(out.map((s) => s.displayProject)).toEqual(['alpha', 'mid', 'zeta'])
})

test('higher cost comes first, then more events', () => {
  const out = summarizeProjects([ev('a', 1), ev('b', 0.5), ev('b', 0.5), ev('c', 3)])
  expect(out.map((s) => s.displayProject)).toEqual(['c', 'b', 'a'])
})

test('raw identifiers with the same display name are merged and summed', () => {
  const out = summarizeProjects([
    ev('/work/projects/app', 1, 10, 2),
    ev('-work-projects-app', 2, 5, 1),
    ev('/work/projects/app', 0.5, 1, 1),
  ])
  expect(out).toEqual([
    {
      project: '/work/projects/app',
      displayProject: 'app',
      rawProjects: ['-work-projects-app', '/work/projects/app'],
      events: 3,
      estimatedCostUsd: 3.5,
      totalInputTokens: 16,
      totalOutputTokens: 4,
    },
  ])
})

test('empty input gives no summaries', () => {
  expect(summarizeProjects([])).toEqual([])
})
