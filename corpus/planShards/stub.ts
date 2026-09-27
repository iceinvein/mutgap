export type FileChunk = { path: string; text: string; lines: number }

export function planShards(chunks: FileChunk[], budget: number, maxFiles: number): FileChunk[][] {
  throw new Error('not implemented')
}
