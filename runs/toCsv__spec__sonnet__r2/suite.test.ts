import { describe, expect, it } from 'vitest'
import { toCsv } from './toCsv'

describe('toCsv', () => {
  it('returns the empty string for an empty array', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes a header from the first row keys and one data line', () => {
    expect(toCsv([{ a: 1, b: 2 }])).toBe('a,b\n1,2\n')
  })

  it('joins multiple rows with newlines and ends with a trailing newline', () => {
    expect(
      toCsv([
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ]),
    ).toBe('a,b\n1,2\n3,4\n')
  })

  it('preserves the first row key order in the header', () => {
    expect(toCsv([{ b: 1, a: 2 }])).toBe('b,a\n1,2\n')
  })

  it('does not quote header names', () => {
    expect(toCsv([{ 'a,b': 1 }])).toBe('a,b\n1\n')
  })

  it('writes numbers using String()', () => {
    expect(toCsv([{ a: 1.5 }])).toBe('a\n1.5\n')
  })

  it('produces an empty field for a key missing from a later row', () => {
    expect(toCsv([{ a: 1, b: 2 }, { a: 3 }])).toBe('a,b\n1,2\n3,\n')
  })

  it('ignores keys a later row has that the first row lacks', () => {
    expect(toCsv([{ a: 1 }, { a: 2, b: 3 } as any])).toBe('a\n1\n2\n')
  })

  it('quotes a field containing a comma', () => {
    expect(toCsv([{ a: 'x,y' }])).toBe('a\n"x,y"\n')
  })

  it('quotes a field containing a double quote and doubles the quote', () => {
    expect(toCsv([{ a: 'say "hi"' }])).toBe('a\n"say ""hi"""\n')
  })

  it('quotes a field containing a newline', () => {
    expect(toCsv([{ a: 'line1\nline2' }])).toBe('a\n"line1\nline2"\n')
  })

  it('leaves other fields unquoted and unchanged', () => {
    expect(toCsv([{ a: 'plain text' }])).toBe('a\nplain text\n')
  })

  it('writes an empty string field as an empty field', () => {
    expect(toCsv([{ a: '' }])).toBe('a\n\n')
  })
})
