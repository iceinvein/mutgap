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

  it('uses the key order of the first row for the header and every row', () => {
    expect(
      toCsv([
        { b: '1', a: '2' },
        { a: '3', b: '4' },
      ]),
    ).toBe('b,a\n1,2\n4,3\n')
  })

  it('writes an empty field for a key missing from a row', () => {
    expect(toCsv([{ a: '1', b: '2', c: '3' }, { a: '4', c: '6' } as never])).toBe(
      'a,b,c\n1,2,3\n4,,6\n',
    )
  })

  it('ignores keys that later rows have but the first row lacks', () => {
    expect(toCsv([{ a: '1' }, { a: '2', extra: 'x' }])).toBe('a\n1\n2\n')
  })

  it('writes numbers with String()', () => {
    expect(toCsv([{ n: 0, f: 1.5, neg: -3, big: 1e21 }])).toBe(
      `n,f,neg,big\n0,1.5,-3,${String(1e21)}\n`,
    )
  })

  it('writes an empty string value as an empty field', () => {
    expect(toCsv([{ a: '', b: 'x' }])).toBe('a,b\n,x\n')
  })

  it('quotes a field containing a comma', () => {
    expect(toCsv([{ a: 'x,y' }])).toBe('a\n"x,y"\n')
  })

  it('quotes a field containing a newline', () => {
    expect(toCsv([{ a: 'line1\nline2' }])).toBe('a\n"line1\nline2"\n')
  })

  it('quotes a field containing a double quote and doubles the quotes inside it', () => {
    expect(toCsv([{ a: 'say "hi"' }])).toBe('a\n"say ""hi"""\n')
  })

  it('doubles a lone double quote', () => {
    expect(toCsv([{ a: '"' }])).toBe('a\n""""\n')
  })

  it('escapes quotes in a field that also contains a comma', () => {
    expect(toCsv([{ a: 'a "b", c' }])).toBe('a\n"a ""b"", c"\n')
  })

  it('leaves other fields unchanged, including spaces and single quotes', () => {
    expect(toCsv([{ a: " it's fine ", b: 'semi;colon' }])).toBe("a,b\n it's fine ,semi;colon\n")
  })

  it('writes header names as they are, without quoting', () => {
    expect(toCsv([{ 'a,b': '1', 'say "x"': '2' }])).toBe('a,b,say "x"\n1,2\n')
  })
})
