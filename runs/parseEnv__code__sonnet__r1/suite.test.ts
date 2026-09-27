import { describe, expect, it } from 'vitest'
import { parseEnv } from './parseEnv'

describe('parseEnv', () => {
  it('parses simple key=value pairs', () => {
    expect(parseEnv('FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('parses multiple lines', () => {
    expect(parseEnv('FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('trims whitespace around lines, keys, and values', () => {
    expect(parseEnv('  FOO  =  bar  ')).toEqual({ FOO: 'bar' })
  })

  it('skips blank lines', () => {
    expect(parseEnv('FOO=bar\n\n\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips lines that are entirely whitespace', () => {
    expect(parseEnv('FOO=bar\n   \nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips comment lines', () => {
    expect(parseEnv('# a comment\nFOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('skips comment lines with leading whitespace', () => {
    expect(parseEnv('   # a comment\nFOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('skips lines without an "="', () => {
    expect(parseEnv('NOEQUALS\nFOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('strips a leading "export " prefix', () => {
    expect(parseEnv('export FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('does not strip "export" when not followed by a space', () => {
    expect(parseEnv('exportFOO=bar')).toEqual({ exportFOO: 'bar' })
  })

  it('unwraps double-quoted values', () => {
    expect(parseEnv('FOO="bar"')).toEqual({ FOO: 'bar' })
  })

  it('unwraps single-quoted values', () => {
    expect(parseEnv("FOO='bar'")).toEqual({ FOO: 'bar' })
  })

  it('leaves mismatched quotes untouched', () => {
    expect(parseEnv(`FOO="bar'`)).toEqual({ FOO: `"bar'` })
  })

  it('leaves an unquoted value with only a leading quote untouched', () => {
    expect(parseEnv('FOO="bar')).toEqual({ FOO: '"bar' })
  })

  it('treats a lone quote character as an empty unquoted value', () => {
    expect(parseEnv('FOO="')).toEqual({ FOO: '"' })
  })

  it('splits on the last "=", keeping earlier "=" characters in the key', () => {
    expect(parseEnv('FOO=bar=baz')).toEqual({ 'FOO=bar': 'baz' })
  })

  it('handles an empty value', () => {
    expect(parseEnv('FOO=')).toEqual({ FOO: '' })
  })

  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('later duplicate keys overwrite earlier ones', () => {
    expect(parseEnv('FOO=bar\nFOO=baz')).toEqual({ FOO: 'baz' })
  })
})
