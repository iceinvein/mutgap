import { describe, expect, it } from 'vitest'
import { toCsv } from './toCsv'

describe('toCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes a header row from the keys of the first row', () => {
    expect(toCsv([{ name: 'Alice', age: 30 }])).toBe('name,age\nAlice,30\n')
  })

  it('writes multiple data rows in order', () => {
    const rows = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]
    expect(toCsv(rows)).toBe('name,age\nAlice,30\nBob,25\n')
  })

  it('quotes values containing commas', () => {
    expect(toCsv([{ name: 'Doe, John' }])).toBe('name\n"Doe, John"\n')
  })

  it('quotes values containing double quotes', () => {
    expect(toCsv([{ note: 'say "hi"' }])).toBe('note\n"say "hi""\n')
  })

  it('quotes values containing newlines', () => {
    expect(toCsv([{ note: 'line1\nline2' }])).toBe('note\n"line1\nline2"\n')
  })

  it('leaves plain values unquoted', () => {
    expect(toCsv([{ value: 'plain' }])).toBe('value\nplain\n')
  })

  it('fills missing keys with an empty string', () => {
    const rows = [{ a: '1', b: '2' }, { a: '3' }] as Array<Record<string, string | number>>
    expect(toCsv(rows)).toBe('a,b\n1,2\n3,\n')
  })

  it('stringifies numeric values', () => {
    expect(toCsv([{ count: 42 }])).toBe('count\n42\n')
  })
})
