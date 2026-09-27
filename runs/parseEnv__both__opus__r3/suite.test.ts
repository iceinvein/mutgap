import { describe, it, expect } from 'vitest'
import { parseEnv } from './parseEnv'

describe('parseEnv', () => {
  it('parses simple key/value pairs', () => {
    expect(parseEnv('A=1\nB=two')).toEqual({ A: '1', B: 'two' })
  })

  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('trims whitespace around lines, keys and values', () => {
    expect(parseEnv('   KEY   =   value   \n\tOTHER=x\t')).toEqual({ KEY: 'value', OTHER: 'x' })
  })

  it('skips blank and whitespace-only lines', () => {
    expect(parseEnv('\n\nA=1\n   \n\t\nB=2\n')).toEqual({ A: '1', B: '2' })
  })

  it('skips comment lines, including indented ones', () => {
    expect(parseEnv('# comment\n   # indented=comment\nA=1')).toEqual({ A: '1' })
  })

  it('does not treat # later in a line as a comment', () => {
    expect(parseEnv('A=foo # not a comment')).toEqual({ A: 'foo # not a comment' })
    expect(parseEnv('A=#hash')).toEqual({ A: '#hash' })
  })

  it('removes a leading "export " prefix', () => {
    expect(parseEnv('export A=1\n  export B = 2')).toEqual({ A: '1', B: '2' })
  })

  it('only removes "export " when followed by a space', () => {
    expect(parseEnv('exportA=1')).toEqual({ exportA: '1' })
  })

  it('skips lines without "="', () => {
    expect(parseEnv('JUSTAKEY\nA=1\nexport NOPE')).toEqual({ A: '1' })
  })

  it('splits on the first "=" so values may contain "="', () => {
    expect(parseEnv('A=b=c')).toEqual({ A: 'b=c' })
    expect(parseEnv('URL=https://x.test/?q=1&r=2')).toEqual({ URL: 'https://x.test/?q=1&r=2' })
    expect(parseEnv('A==')).toEqual({ A: '=' })
  })

  it('allows empty values', () => {
    expect(parseEnv('A=\nB=   ')).toEqual({ A: '', B: '' })
  })

  it('allows an empty key when the line starts with "="', () => {
    expect(parseEnv('=value')).toEqual({ '': 'value' })
  })

  it('strips one outer pair of double quotes', () => {
    expect(parseEnv('A="hello world"')).toEqual({ A: 'hello world' })
    expect(parseEnv('A=""')).toEqual({ A: '' })
    expect(parseEnv('A=""x""')).toEqual({ A: '"x"' })
  })

  it('strips one outer pair of single quotes', () => {
    expect(parseEnv("A='hello world'")).toEqual({ A: 'hello world' })
    expect(parseEnv("A=''")).toEqual({ A: '' })
    expect(parseEnv("A=''x''")).toEqual({ A: "'x'" })
  })

  it('strips quotes after trimming the value', () => {
    expect(parseEnv('A =   "  padded  "   ')).toEqual({ A: '  padded  ' })
  })

  it('keeps "=" inside quoted values', () => {
    expect(parseEnv('A="b=c"')).toEqual({ A: 'b=c' })
  })

  it('does not strip a lone quote character', () => {
    expect(parseEnv('A="')).toEqual({ A: '"' })
    expect(parseEnv("A='")).toEqual({ A: "'" })
  })

  it('does not strip mismatched or one-sided quotes', () => {
    expect(parseEnv(`A="x'`)).toEqual({ A: `"x'` })
    expect(parseEnv(`A='x"`)).toEqual({ A: `'x"` })
    expect(parseEnv('A="x')).toEqual({ A: '"x' })
    expect(parseEnv('A=x"')).toEqual({ A: 'x"' })
  })

  it('does no escape processing', () => {
    expect(parseEnv('A="line\\nbreak"')).toEqual({ A: 'line\\nbreak' })
  })

  it('lets the last occurrence of a key win', () => {
    expect(parseEnv('A=1\nA=2\nB=x\nA=3')).toEqual({ A: '3', B: 'x' })
  })

  it('handles CRLF line endings via trimming', () => {
    expect(parseEnv('A=1\r\nB="2"\r\n')).toEqual({ A: '1', B: '2' })
  })
})
