export type ExportRow = Record<string, string | number>

export function toCsv(rows: ExportRow[]): string {
  throw new Error('not implemented')
}
