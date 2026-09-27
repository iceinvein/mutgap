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

  it('writes just the header and one line for a single row', () => {
    expect(toCsv([{ a: 'x' }])).toBe('a\nx\n')
  })

  it('uses the key order of the first row for the header', () => {
    expect(toCsv([{ b: '1', a: '2', c: '3' }])).toBe('b,a,c\n1,2,3\n')
  })

  it('writes later rows in header order regardless of their own key order', () => {
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
        { b: '8' },
      ]),
    ).toBe('a,b,c\n1,2,3\n4,,6\n,8,\n')
  })

  it('ignores keys that the first row lacks', () => {
    expect(
      toCsv([
        { a: '1' },
        { a: '2', extra: 'ignored' },
      ]),
    ).toBe('a\n1\n2\n')
  })

  it('writes numbers with String()', () => {
    expect(
      toCsv([{ int: 42, neg: -7, float: 3.14, zero: 0, big: 1e21, nan: NaN }]),
    ).toBe(
      `int,neg,float,zero,big,nan\n42,-7,3.14,0,${String(1e21)},NaN\n`,
    )
  })

  it('writes empty strings as empty fields', () => {
    expect(toCsv([{ a: '', b: 'x' }])).toBe('a,b\n,x\n')
  })

  it('quotes a field containing a comma', () => {
    expect(toCsv([{ city: 'Perth, WA' }])).toBe('city\n"Perth, WA"\n')
  })

  it('quotes a field containing a newline', () => {
    expect(toCsv([{ note: 'line1\nline2' }])).toBe('note\n"line1\nline2"\n')
  })

  it('quotes a field containing a double quote and doubles the quotes', () => {
    expect(toCsv([{ msg: 'say "hi"' }])).toBe('msg\n"say ""hi"""\n')
  })

  it('handles a field that is only a double quote', () => {
    expect(toCsv([{ q: '"' }])).toBe('q\n""""\n')
  })

  it('quotes and escapes a field with a comma, quote and newline together', () => {
    expect(toCsv([{ x: 'a,"b"\nc' }])).toBe('x\n"a,""b""\nc"\n')
  })

  it('leaves other fields unchanged, including spaces and other punctuation', () => {
    expect(toCsv([{ a: ' padded ', b: "it's; fine", c: 'tab\there' }])).toBe(
      "a,b,c\n padded ,it's; fine,tab\there\n",
    )
  })

  it('quotes only the fields that need it', () => {
    expect(toCsv([{ a: 'plain', b: 'x,y', c: 5 }])).toBe(
      'a,b,c\nplain,"x,y",5\n',
    )
  })

  it('writes header names as they are, without quoting', () => {
    expect(toCsv([{ 'a,b': '1', 'say "hi"': '2' }])).toBe(
      'a,b,say "hi"\n1,2\n',
    )
  })
})
