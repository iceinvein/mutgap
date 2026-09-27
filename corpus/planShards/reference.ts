export type FileChunk = { path: string; text: string; lines: number }

function groupKey(path: string): string {
  const parts = path.split('/')
  if (parts.length <= 1) return '.'
  return parts.slice(0, Math.min(2, parts.length - 1)).join('/')
}

export function planShards(chunks: FileChunk[], budget: number, maxFiles: number): FileChunk[][] {
  const groups = new Map<string, FileChunk[]>()
  for (const c of chunks) {
    const key = groupKey(c.path)
    const existing = groups.get(key)
    if (existing) existing.push(c)
    else groups.set(key, [c])
  }

  const shards: FileChunk[][] = []
  let current: FileChunk[] = []
  let currentLines = 0
  const flush = () => {
    if (current.length > 0) {
      shards.push(current)
      current = []
      currentLines = 0
    }
  }

  for (const members of groups.values()) {
    const groupLines = members.reduce((n, c) => n + c.lines, 0)
    if (
      current.length > 0 &&
      (currentLines + groupLines > budget || current.length + members.length > maxFiles)
    ) {
      flush()
    }
    for (const c of members) {
      if (
        current.length > 0 &&
        (currentLines + c.lines > budget || current.length + 1 > maxFiles)
      ) {
        flush()
      }
      current.push(c)
      currentLines += c.lines
    }
  }
  flush()
  return shards
}
