import { describe, expect, it } from 'vitest'
import { toCsv } from './toCsv'

describe('toCsv', () => {
  it('returns the empty string for an empty array', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes a header line and one line per row, with a trailing newline', () => {
    expect(
      toCsv([
        { name: 'Ada', role: 'eng' },
        { name: 'Bob', role: 'ops' },
      ]),
    ).toBe('name,role\nAda,eng\nBob,ops\n')
  })

  it('writes just the header and one line for a single row', () => {
    expect(toCsv([{ a: 'x' }])).toBe('a\nx\n')
  })

  it("uses the first row's key order for the header", () => {
    expect(toCsv([{ b: '1', a: '2' }])).toBe('b,a\n1,2\n')
  })

  it("writes later rows' values in header order, not their own key order", () => {
    expect(
      toCsv([
        { a: '1', b: '2' },
        { b: '4', a: '3' },
      ]),
    ).toBe('a,b\n1,2\n3,4\n')
  })

  it('writes an empty field for a key missing from a row', () => {
    expect(
      toCsv([
        { a: '1', b: '2', c: '3' },
        { a: '4', c: '6' },
      ]),
    ).toBe('a,b,c\n1,2,3\n4,,6\n')
  })

  it('writes empty fields for every header key when a row is empty', () => {
    expect(toCsv([{ a: '1', b: '2' }, {}])).toBe('a,b\n1,2\n,\n')
  })

  it('ignores keys that later rows have but the first row lacks', () => {
    expect(
      toCsv([
        { a: '1' },
        { a: '2', extra: 'nope' },
      ]),
    ).toBe('a\n1\n2\n')
  })

  it('writes numbers with String()', () => {
    expect(toCsv([{ i: 42, f: 3.5, neg: -1, zero: 0, big: 1e21 }])).toBe(
      `i,f,neg,zero,big\n42,3.5,-1,0,${String(1e21)}\n`,
    )
  })

  it('writes an empty string value as an empty field', () => {
    expect(toCsv([{ a: '', b: 'x' }])).toBe('a,b\n,x\n')
  })

  describe('quoting', () => {
    it('quotes a field containing a comma', () => {
      expect(toCsv([{ a: 'x,y' }])).toBe('a\n"x,y"\n')
    })

    it('quotes a field containing a double quote and doubles the quotes', () => {
      expect(toCsv([{ a: 'say "hi"' }])).toBe('a\n"say ""hi"""\n')
    })

    it('quotes a field consisting only of a double quote', () => {
      expect(toCsv([{ a: '"' }])).toBe('a\n""""\n')
    })

    it('quotes a field containing a newline', () => {
      expect(toCsv([{ a: 'line1\nline2' }])).toBe('a\n"line1\nline2"\n')
    })

    it('handles a field with a comma, quotes and a newline together', () => {
      expect(toCsv([{ a: 'a, "b"\nc' }])).toBe('a\n"a, ""b""\nc"\n')
    })

    it('leaves other fields unchanged, including spaces and other punctuation', () => {
      expect(toCsv([{ a: ' padded ', b: "it's; fine|ok\t" }])).toBe(
        "a,b\n padded ,it's; fine|ok\t\n",
      )
    })

    it('only quotes the fields that need it', () => {
      expect(toCsv([{ a: 'plain', b: 'x,y', c: 'z' }])).toBe(
        'a,b,c\nplain,"x,y",z\n',
      )
    })

    it('writes header names as they are, without quoting', () => {
      expect(toCsv([{ 'last, first': 'x', 'say "hi"': 'y' }])).toBe(
        'last, first,say "hi"\nx,y\n',
      )
    })
  })
})
