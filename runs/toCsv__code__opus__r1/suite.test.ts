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

  it('stringifies numbers, including zero and negatives', () => {
    expect(toCsv([{ a: 0, b: -1.5 }])).toBe('a,b\n0,-1.5\n')
  })

  it('uses the keys of the first row as headers and column order', () => {
    const csv = toCsv([
      { a: 1, b: 2 },
      { b: 4, a: 3 },
    ])
    expect(csv).toBe('a,b\n1,2\n3,4\n')
  })

  it('writes an empty cell when a later row is missing a column', () => {
    const csv = toCsv([{ a: 1, b: 2 }, { a: 3 } as Record<string, number>])
    expect(csv).toBe('a,b\n1,2\n3,\n')
  })

  it('ignores keys not present in the first row', () => {
    const csv = toCsv([{ a: 1 }, { a: 2, extra: 'x' }])
    expect(csv).toBe('a\n1\n2\n')
  })

  it('keeps empty strings as empty cells', () => {
    expect(toCsv([{ a: '', b: 'x' }])).toBe('a,b\n,x\n')
  })

  it('quotes values containing a comma', () => {
    expect(toCsv([{ city: 'Perth, WA' }])).toBe('city\n"Perth, WA"\n')
  })

  it('quotes values containing a newline', () => {
    expect(toCsv([{ note: 'line1\nline2' }])).toBe('note\n"line1\nline2"\n')
  })

  it('quotes and doubles embedded double quotes (RFC 4180)', () => {
    expect(toCsv([{ quote: 'say "hi"' }])).toBe('quote\n"say ""hi"""\n')
  })

  it('quotes values containing a carriage return (RFC 4180)', () => {
    expect(toCsv([{ note: 'line1\r\nline2' }])).toBe('note\n"line1\r\nline2"\n')
  })

  it('does not quote plain values', () => {
    expect(toCsv([{ a: 'hello world' }])).toBe('a\nhello world\n')
  })
})
