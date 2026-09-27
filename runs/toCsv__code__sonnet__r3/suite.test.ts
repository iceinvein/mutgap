import { describe, expect, it } from 'vitest'
import { toCsv } from './toCsv'

describe('toCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes a header row from the keys of the first row', () => {
    expect(toCsv([{ a: 1, b: 2 }])).toBe('a,b\n1,2\n')
  })

  it('writes multiple rows in order', () => {
    const rows = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]
    expect(toCsv(rows)).toBe('name,age\nAlice,30\nBob,25\n')
  })

  it('quotes values containing commas', () => {
    expect(toCsv([{ a: 'x,y' }])).toBe('a\n"x,y"\n')
  })

  it('quotes values containing double quotes', () => {
    expect(toCsv([{ a: 'say "hi"' }])).toBe('a\n"say "hi""\n')
  })

  it('quotes values containing newlines', () => {
    expect(toCsv([{ a: 'line1\nline2' }])).toBe('a\n"line1\nline2"\n')
  })

  it('does not quote plain values', () => {
    expect(toCsv([{ a: 'plain' }])).toBe('a\nplain\n')
  })

  it('fills missing keys with an empty string', () => {
    const rows = [{ a: 1, b: 2 }, { a: 3 }] as unknown as Array<Record<string, string | number>>
    expect(toCsv(rows)).toBe('a,b\n1,2\n3,\n')
  })

  it('uses the keys of only the first row as headers, ignoring extra keys on later rows', () => {
    const rows = [{ a: 1 }, { a: 2, b: 3 }] as unknown as Array<Record<string, string | number>>
    expect(toCsv(rows)).toBe('a\n1\n2\n')
  })
})
