import { describe, expect, it } from 'vitest'
import { toCsv } from './toCsv'

describe('toCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes a header line and one line per row, with a trailing newline', () => {
    const csv = toCsv([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ])
    expect(csv).toBe('name,age\nAlice,30\nBob,25\n')
  })

  it('uses the keys of the first row as headers, in order', () => {
    const csv = toCsv([
      { b: 1, a: 2 },
      { a: 3, b: 4, c: 5 },
    ])
    expect(csv).toBe('b,a\n1,2\n4,3\n')
  })

  it('writes an empty cell for missing values', () => {
    const csv = toCsv([{ a: 1, b: 2 }, { a: 3 } as Record<string, number>])
    expect(csv).toBe('a,b\n1,2\n3,\n')
  })

  it('keeps zero and empty-string values', () => {
    expect(toCsv([{ a: 0, b: '' }])).toBe('a,b\n0,\n')
  })

  it('quotes values containing commas', () => {
    expect(toCsv([{ city: 'Perth, WA' }])).toBe('city\n"Perth, WA"\n')
  })

  it('quotes values containing newlines', () => {
    expect(toCsv([{ note: 'line1\nline2' }])).toBe('note\n"line1\nline2"\n')
  })

  it('quotes values containing double quotes and escapes them by doubling', () => {
    expect(toCsv([{ quote: 'say "hi"' }])).toBe('quote\n"say ""hi"""\n')
  })
})
