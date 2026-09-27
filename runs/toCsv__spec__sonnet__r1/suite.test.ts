import { describe, expect, it } from 'vitest'
import { toCsv } from './toCsv'

describe('toCsv', () => {
  it('returns the empty string for an empty array', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes a header from the first row\'s keys in order', () => {
    expect(toCsv([{ b: 1, a: 2 }])).toBe('b,a\n1,2\n')
  })

  it('writes one line per row in header order', () => {
    const rows = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]
    expect(toCsv(rows)).toBe('name,age\nAlice,30\nBob,25\n')
  })

  it('fills missing keys with an empty field', () => {
    const rows = [
      { a: 1, b: 2 },
      { a: 3 },
    ]
    expect(toCsv(rows)).toBe('a,b\n1,2\n3,\n')
  })

  it('ignores keys later rows have that the first row lacks', () => {
    const rows = [
      { a: 1 },
      { a: 2, b: 3 },
    ]
    expect(toCsv(rows)).toBe('a\n1\n2\n')
  })

  it('writes numbers with String()', () => {
    expect(toCsv([{ n: 1.5 }])).toBe('n\n1.5\n')
  })

  it('quotes fields containing a comma', () => {
    expect(toCsv([{ a: 'x,y' }])).toBe('a\n"x,y"\n')
  })

  it('quotes fields containing a newline', () => {
    expect(toCsv([{ a: 'x\ny' }])).toBe('a\n"x\ny"\n')
  })

  it('quotes fields containing a double quote and doubles it', () => {
    expect(toCsv([{ a: 'say "hi"' }])).toBe('a\n"say ""hi"""\n')
  })

  it('leaves other fields unquoted', () => {
    expect(toCsv([{ a: 'plain text' }])).toBe('a\nplain text\n')
  })

  it('does not quote header names even if they contain commas', () => {
    expect(toCsv([{ 'a,b': 1 }])).toBe('a,b\n1\n')
  })
})
