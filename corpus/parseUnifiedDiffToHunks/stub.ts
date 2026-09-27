export type DiffLine = {
  type: 'context' | 'added' | 'removed'
  content: string
  oldLineNo: number | null
  newLineNo: number | null
}

export type DiffHunk = {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  header: string
  lines: DiffLine[]
}

export function parseUnifiedDiffToHunks(diff: string): DiffHunk[] {
  throw new Error('not implemented')
}
