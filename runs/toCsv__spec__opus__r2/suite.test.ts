import { describe, expect, it } from 'vitest'
import { toCsv } from './toCsv'

describe('toCsv', () => {
  it('returns the empty string for an empty array', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes a header line and one line per row, with a trailing newline', () => {
    expect(
      toCsv([
        { name: 'Ada', role: 'engineer' },
        { name: 'Grace', role: 'admiral' },
      ]),
    ).toBe('name,role\nAda,engineer\nGrace,admiral\n')
  })

  it('handles a single row', () => {
    expect(toCsv([{ a: 'x' }])).toBe('a\nx\n')
  })

  it("uses the first row's key order for the header and every row", () => {
    expect(
      toCsv([
        { b: '1', a: '2', c: '3' },
        { c: '6', a: '5', b: '4' },
      ]),
    ).toBe('b,a,c\n1,2,3\n4,5,6\n')
  })

  it('writes an empty field for a key missing from a later row', () => {
    expect(
      toCsv([
        { a: '1', b: '2', c: '3' },
        { a: '4', c: '6' },
        { b: '8' },
      ]),
    ).toBe('a,b,c\n1,2,3\n4,,6\n,8,\n')
  })

  it('ignores keys that the first row lacks', () => {
    expect(
      toCsv([
        { a: '1', b: '2' },
        { a: '3', extra: 'nope', b: '4' },
      ]),
    ).toBe('a,b\n1,2\n3,4\n')
  })

  it('writes numbers with String()', () => {
    expect(
      toCsv([{ int: 42, zero: 0, neg: -7, float: 1.5, big: 1e21, nan: NaN }]),
    ).toBe('int,zero,neg,float,big,nan\n42,0,-7,1.5,1e+21,NaN\n')
  })

  it('does not treat 0 or the empty string as a missing value', () => {
    expect(
      toCsv([
        { a: 0, b: '' },
        { a: '', b: 0 },
      ]),
    ).toBe('a,b\n0,\n,0\n')
  })

  describe('quoting', () => {
    it('wraps a field containing a comma in double quotes', () => {
      expect(toCsv([{ a: 'x,y', b: 'z' }])).toBe('a,b\n"x,y",z\n')
    })

    it('wraps a field containing a newline in double quotes', () => {
      expect(toCsv([{ a: 'line1\nline2' }])).toBe('a\n"line1\nline2"\n')
    })

    it('wraps a field containing a double quote and doubles the quote', () => {
      expect(toCsv([{ a: 'say "hi"' }])).toBe('a\n"say ""hi"""\n')
    })

    it('doubles every double quote, including adjacent ones', () => {
      expect(toCsv([{ a: '"' }, { a: '""' }])).toBe('a\n""""\n""""""\n')
    })

    it('handles a field containing a comma, a quote and a newline together', () => {
      expect(toCsv([{ a: 'a,"b"\nc' }])).toBe('a\n"a,""b""\nc"\n')
    })

    it('leaves other fields unchanged, including spaces and other punctuation', () => {
      expect(toCsv([{ a: '  padded  ', b: "it's; fine\t|", c: '' }])).toBe(
        "a,b,c\n  padded  ,it's; fine\t|,\n",
      )
    })

    it('quotes only the fields that need it', () => {
      expect(toCsv([{ a: 'plain', b: 'with,comma', c: 3 }])).toBe(
        'a,b,c\nplain,"with,comma",3\n',
      )
    })

    it('writes header names as they are, without quoting', () => {
      expect(toCsv([{ 'x,y': '1', 'say "hi"': '2' }])).toBe(
        'x,y,say "hi"\n1,2\n',
      )
    })
  })
})
