import { describe, expect, it } from 'vitest'
import { toCsv } from './toCsv'

describe('toCsv', () => {
  it('returns the empty string for an empty array', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes the header from the first row\'s keys in order', () => {
    expect(toCsv([{ b: 1, a: 2 }])).toBe('b,a\n1,2\n')
  })

  it('writes multiple rows in order, one per line', () => {
    const csv = toCsv([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ])
    expect(csv).toBe('name,age\nAlice,30\nBob,25\n')
  })

  it('produces an empty field for a key missing from a row', () => {
    const csv = toCsv([
      { a: 1, b: 2 },
      { a: 3 },
    ])
    expect(csv).toBe('a,b\n1,2\n3,\n')
  })

  it('ignores keys a later row has that the first row lacks', () => {
    const csv = toCsv([
      { a: 1 },
      { a: 2, b: 99 },
    ])
    expect(csv).toBe('a\n1\n2\n')
  })

  it('writes numbers using String()', () => {
    expect(toCsv([{ n: 1.5 }])).toBe('n\n1.5\n')
  })

  it('wraps a field containing a comma in double quotes', () => {
    expect(toCsv([{ a: 'x,y' }])).toBe('a\n"x,y"\n')
  })

  it('wraps a field containing a newline in double quotes', () => {
    expect(toCsv([{ a: 'x\ny' }])).toBe('a\n"x\ny"\n')
  })

  it('wraps a field containing a double quote and doubles the quote', () => {
    expect(toCsv([{ a: 'say "hi"' }])).toBe('a\n"say ""hi"""\n')
  })

  it('leaves header names unquoted even if they contain commas', () => {
    expect(toCsv([{ 'a,b': 1 }])).toBe('a,b\n1\n')
  })

  it('leaves fields without special characters unquoted', () => {
    expect(toCsv([{ a: 'plain text' }])).toBe('a\nplain text\n')
  })

  it('ends the output with a trailing newline', () => {
    expect(toCsv([{ a: 1 }]).endsWith('\n')).toBe(true)
  })
})
