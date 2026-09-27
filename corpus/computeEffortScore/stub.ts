export type PrFileEntry = {
  path: string
  additions: number
  deletions: number
}

export function computeEffortScore(files: PrFileEntry[]): number {
  throw new Error('not implemented')
}
