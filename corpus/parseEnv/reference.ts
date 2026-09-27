export function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const withoutExport = line.startsWith('export ') ? line.slice(7) : line
    const at = withoutExport.indexOf('=')
    if (at === -1) continue
    const key = withoutExport.slice(0, at).trim()
    let value = withoutExport.slice(at + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}
