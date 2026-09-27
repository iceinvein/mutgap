import { describe, expect, it } from 'vitest'
import { toCsv } from './toCsv'

describe('toCsv', () => {
  it('returns the empty string for an empty array', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes the header from the first row keys, in order', () => {
    expect(toCsv([{ b: 1, a: 2 }])).toBe('b,a\n1,2\n')
  })

  it('writes one line per row with a trailing newline', () => {
    const csv = toCsv([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ])
    expect(csv).toBe('name,age\nAlice,30\nBob,25\n')
  })

  it('stringifies numbers with String()', () => {
    expect(toCsv([{ value: 1.5 }])).toBe('value\n1.5\n')
  })

  it('produces an empty field for keys missing from a row', () => {
    expect(toCsv([{ a: 1, b: 2 }, { a: 3 }])).toBe('a,b\n1,2\n3,\n')
  })

  it('ignores keys a later row has that the first row lacks', () => {
    expect(toCsv([{ a: 1 }, { a: 2, b: 3 }])).toBe('a\n1\n2\n')
  })

  it('does not quote header names', () => {
    expect(toCsv([{ 'a,b': 1 }])).toBe('a,b\n1\n')
  })

  it('quotes a field containing a comma', () => {
    expect(toCsv([{ a: 'x,y' }])).toBe('a\n"x,y"\n')
  })

  it('quotes a field containing a double quote and doubles it', () => {
    expect(toCsv([{ a: 'say "hi"' }])).toBe('a\n"say ""hi"""\n')
  })

  it('quotes a field containing a newline', () => {
    expect(toCsv([{ a: 'line1\nline2' }])).toBe('a\n"line1\nline2"\n')
  })

  it('leaves other fields unchanged', () => {
    expect(toCsv([{ a: 'plain text' }])).toBe('a\nplain text\n')
  })
})
