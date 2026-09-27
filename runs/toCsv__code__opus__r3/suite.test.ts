import { describe, expect, it } from 'vitest'
import { toCsv } from './toCsv'

describe('toCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes a header line from the first row keys followed by data lines', () => {
    const csv = toCsv([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ])
    expect(csv).toBe('name,age\nAlice,30\nBob,25\n')
  })

  it('ends with a trailing newline', () => {
    expect(toCsv([{ a: 1 }]).endsWith('\n')).toBe(true)
  })

  it('stringifies numbers, including zero, negatives and decimals', () => {
    expect(toCsv([{ a: 0, b: -1, c: 1.5 }])).toBe('a,b,c\n0,-1,1.5\n')
  })

  it('orders columns by the first row even when later rows use a different key order', () => {
    const csv = toCsv([
      { a: 1, b: 2 },
      { b: 4, a: 3 },
    ])
    expect(csv).toBe('a,b\n1,2\n3,4\n')
  })

  it('writes an empty cell for keys missing from later rows', () => {
    const csv = toCsv([{ a: 1, b: 2 }, { a: 3 } as Record<string, number>])
    expect(csv).toBe('a,b\n1,2\n3,\n')
  })

  it('ignores keys not present in the first row', () => {
    const csv = toCsv([{ a: 1 }, { a: 2, extra: 'x' }])
    expect(csv).toBe('a\n1\n2\n')
  })

  it('keeps empty string values as empty cells', () => {
    expect(toCsv([{ a: '', b: 'x' }])).toBe('a,b\n,x\n')
  })

  it('quotes values containing a comma', () => {
    expect(toCsv([{ city: 'Perth, WA' }])).toBe('city\n"Perth, WA"\n')
  })

  it('quotes values containing a newline', () => {
    expect(toCsv([{ note: 'line1\nline2' }])).toBe('note\n"line1\nline2"\n')
  })

  it('quotes values containing a double quote and escapes it by doubling', () => {
    expect(toCsv([{ quote: 'say "hi"' }])).toBe('quote\n"say ""hi"""\n')
  })

  it('does not quote plain values', () => {
    expect(toCsv([{ a: 'hello world' }])).toBe('a\nhello world\n')
  })
})
