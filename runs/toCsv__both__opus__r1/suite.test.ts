import { describe, expect, it } from 'vitest'
import { toCsv } from './toCsv'

describe('toCsv', () => {
  it('returns the empty string for an empty array', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes a header line from the first row keys followed by one line per row', () => {
    const rows = [
      { name: 'Alice', city: 'Perth' },
      { name: 'Bob', city: 'Sydney' },
    ]
    expect(toCsv(rows)).toBe('name,city\nAlice,Perth\nBob,Sydney\n')
  })

  it('uses the first row key order for the header and every row', () => {
    const rows = [
      { b: '1', a: '2' },
      { a: '3', b: '4' },
    ]
    expect(toCsv(rows)).toBe('b,a\n1,2\n4,3\n')
  })

  it('writes an empty field for a key missing from a row', () => {
    const rows = [{ a: '1', b: '2', c: '3' }, { a: '4', c: '6' }]
    expect(toCsv(rows)).toBe('a,b,c\n1,2,3\n4,,6\n')
  })

  it('ignores keys that later rows have but the first row lacks', () => {
    const rows = [{ a: '1' }, { a: '2', extra: 'x' }]
    expect(toCsv(rows)).toBe('a\n1\n2\n')
  })

  it('writes numbers with String()', () => {
    const rows = [{ int: 42, float: 3.5, zero: 0, neg: -7 }]
    expect(toCsv(rows)).toBe('int,float,zero,neg\n42,3.5,0,-7\n')
  })

  it('writes empty strings as empty fields', () => {
    expect(toCsv([{ a: '', b: 'x' }])).toBe('a,b\n,x\n')
  })

  it('quotes a field containing a comma', () => {
    expect(toCsv([{ a: 'x,y' }])).toBe('a\n"x,y"\n')
  })

  it('quotes a field containing a newline', () => {
    expect(toCsv([{ a: 'line1\nline2' }])).toBe('a\n"line1\nline2"\n')
  })

  it('quotes a field containing a double quote and doubles the quotes', () => {
    expect(toCsv([{ a: 'say "hi"' }])).toBe('a\n"say ""hi"""\n')
  })

  it('escapes a field that is only a double quote', () => {
    expect(toCsv([{ a: '"' }])).toBe('a\n""""\n')
  })

  it('escapes quotes in a field that also contains commas and newlines', () => {
    expect(toCsv([{ a: 'a "b",\nc' }])).toBe('a\n"a ""b"",\nc"\n')
  })

  it('leaves other fields unchanged, including spaces and single quotes', () => {
    expect(toCsv([{ a: " it's fine ", b: 'semi;colon' }])).toBe("a,b\n it's fine ,semi;colon\n")
  })

  it('writes header names as they are, without quoting', () => {
    expect(toCsv([{ 'x,y': '1' }])).toBe('x,y\n1\n')
  })

  it('ends the output with a trailing newline', () => {
    const out = toCsv([{ a: '1' }])
    expect(out.endsWith('\n')).toBe(true)
    expect(out.endsWith('\n\n')).toBe(false)
  })
})
