export type PrFileEntry = {
  path: string
  additions: number
  deletions: number
}

export function computeEffortScore(files: PrFileEntry[]): number {
  if (files.length === 0) return 1
  const lines = files.reduce((acc, f) => acc + f.additions + f.deletions, 0)
  if (files.length <= 2 && lines <= 50) return 1
  if (files.length <= 5 && lines <= 200) return 2
  if (files.length <= 10 && lines <= 500) return 3
  if (files.length <= 20 && lines <= 1000) return 4
  return 5
}
