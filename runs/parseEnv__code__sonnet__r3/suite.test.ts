import { describe, expect, it } from 'vitest'
import { parseEnv } from './parseEnv'

describe('parseEnv', () => {
  it('parses simple key=value pairs', () => {
    expect(parseEnv('FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('parses multiple lines', () => {
    expect(parseEnv('FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('trims whitespace around key and value', () => {
    expect(parseEnv('  FOO  =  bar  ')).toEqual({ FOO: 'bar' })
  })

  it('skips empty lines', () => {
    expect(parseEnv('FOO=bar\n\n\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips comment lines', () => {
    expect(parseEnv('# a comment\nFOO=bar\n# another comment')).toEqual({ FOO: 'bar' })
  })

  it('skips lines without an equals sign', () => {
    expect(parseEnv('FOO=bar\nnotanenvline\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('strips the export keyword', () => {
    expect(parseEnv('export FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('strips double-quoted values', () => {
    expect(parseEnv('FOO="bar"')).toEqual({ FOO: 'bar' })
  })

  it('strips single-quoted values', () => {
    expect(parseEnv("FOO='bar'")).toEqual({ FOO: 'bar' })
  })

  it('leaves mismatched quotes intact', () => {
    expect(parseEnv('FOO="bar\'')).toEqual({ FOO: '"bar\'' })
  })

  it('leaves unclosed quotes intact', () => {
    expect(parseEnv('FOO="bar')).toEqual({ FOO: '"bar' })
  })

  it('handles an empty quoted value', () => {
    expect(parseEnv('FOO=""')).toEqual({ FOO: '' })
  })

  it('handles a single quote character as the whole value', () => {
    expect(parseEnv('FOO="')).toEqual({ FOO: '"' })
  })

  it('splits on the last equals sign, folding earlier ones into the key', () => {
    expect(parseEnv('FOO=bar=baz')).toEqual({ 'FOO=bar': 'baz' })
  })

  it('handles an empty unquoted value', () => {
    expect(parseEnv('FOO=')).toEqual({ FOO: '' })
  })

  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('returns an empty object for input with only comments and blank lines', () => {
    expect(parseEnv('# comment\n\n  \n# another')).toEqual({})
  })

  it('later duplicate keys override earlier ones', () => {
    expect(parseEnv('FOO=bar\nFOO=baz')).toEqual({ FOO: 'baz' })
  })
})
