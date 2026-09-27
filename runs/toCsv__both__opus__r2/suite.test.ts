import { describe, expect, it } from 'vitest'
import { toCsv } from './toCsv'

describe('toCsv', () => {
  it('returns the empty string for an empty array', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes a header line from the first row keys, then one line per row', () => {
    expect(
      toCsv([
        { name: 'Ada', age: 36 },
        { name: 'Alan', age: 41 },
      ]),
    ).toBe('name,age\nAda,36\nAlan,41\n')
  })

  it('ends the output with a trailing newline for a single row', () => {
    expect(toCsv([{ a: 'x' }])).toBe('a\nx\n')
  })

  it('uses the first row key order for the header and every line', () => {
    expect(
      toCsv([
        { b: 1, a: 2 },
        { a: 3, b: 4 },
      ]),
    ).toBe('b,a\n1,2\n4,3\n')
  })

  it('writes header names unquoted even if they contain special characters', () => {
    expect(toCsv([{ 'a,b': 1 }])).toBe('a,b\n1\n')
  })

  it('writes an empty field for a key missing from a later row', () => {
    const rows = [{ a: 1, b: 2, c: 3 }, { a: 4, c: 6 }] as Record<string, string | number>[]
    expect(toCsv(rows)).toBe('a,b,c\n1,2,3\n4,,6\n')
  })

  it('ignores keys that later rows have but the first row lacks', () => {
    const rows = [{ a: 1 }, { a: 2, extra: 'x' }] as Record<string, string | number>[]
    expect(toCsv(rows)).toBe('a\n1\n2\n')
  })

  it('writes numbers with String()', () => {
    expect(toCsv([{ n: 0, f: 1.5, neg: -2, big: 1e21 }])).toBe(
      `n,f,neg,big\n0,1.5,-2,${String(1e21)}\n`,
    )
  })

  it('keeps a numeric zero rather than treating it as missing', () => {
    expect(toCsv([{ a: 0, b: '' }])).toBe('a,b\n0,\n')
  })

  it('wraps a field containing a comma in double quotes', () => {
    expect(toCsv([{ a: 'x,y' }])).toBe('a\n"x,y"\n')
  })

  it('wraps a field containing a newline in double quotes', () => {
    expect(toCsv([{ a: 'line1\nline2' }])).toBe('a\n"line1\nline2"\n')
  })

  it('wraps a field containing a double quote and doubles the inner quotes', () => {
    expect(toCsv([{ a: 'say "hi"' }])).toBe('a\n"say ""hi"""\n')
  })

  it('escapes a field that is just a double quote', () => {
    expect(toCsv([{ a: '"' }])).toBe('a\n""""\n')
  })

  it('escapes quotes in a field that also contains a comma', () => {
    expect(toCsv([{ a: 'a "b", c' }])).toBe('a\n"a ""b"", c"\n')
  })

  it('writes other fields unchanged, including spaces and semicolons', () => {
    expect(toCsv([{ a: ' padded ', b: 'x;y', c: "it's" }])).toBe("a,b,c\n padded ,x;y,it's\n")
  })
})
