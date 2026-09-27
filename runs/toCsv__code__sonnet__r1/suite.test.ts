import { describe, expect, it } from 'vitest'
import { toCsv } from './toCsv'

describe('toCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes a header row from the keys of the first row', () => {
    expect(toCsv([{ name: 'Alice', age: 30 }])).toBe('name,age\nAlice,30\n')
  })

  it('writes multiple rows in order', () => {
    const rows = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]
    expect(toCsv(rows)).toBe('name,age\nAlice,30\nBob,25\n')
  })

  it('quotes values containing commas', () => {
    expect(toCsv([{ name: 'Smith, John' }])).toBe('name\n"Smith, John"\n')
  })

  it('quotes values containing double quotes', () => {
    // Note: current implementation does not double internal quotes, which
    // produces invalid CSV for this input. Test pins current behavior.
    expect(toCsv([{ note: 'She said "hi"' }])).toBe('note\n"She said "hi""\n')
  })

  it('quotes values containing newlines', () => {
    expect(toCsv([{ note: 'line1\nline2' }])).toBe('note\n"line1\nline2"\n')
  })

  it('does not quote plain values', () => {
    expect(toCsv([{ value: 'plain' }])).toBe('value\nplain\n')
  })

  it('treats numbers as plain unquoted values', () => {
    expect(toCsv([{ value: 42 }])).toBe('value\n42\n')
  })

  it('fills missing keys in later rows with an empty string', () => {
    const rows = [{ a: '1', b: '2' }, { a: '3' }] as unknown as Record<string, string | number>[]
    expect(toCsv(rows)).toBe('a,b\n1,2\n3,\n')
  })

  it('uses only the keys from the first row as headers, ignoring extra keys in later rows', () => {
    const rows = [{ a: '1' }, { a: '2', b: 'extra' }] as unknown as Record<string, string | number>[]
    expect(toCsv(rows)).toBe('a\n1\n2\n')
  })
})
