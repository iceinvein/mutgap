import { describe, expect, it } from 'vitest'
import { parseEnv } from './parseEnv'

describe('parseEnv', () => {
  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('parses simple key=value pairs', () => {
    expect(parseEnv('FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips blank lines and comments', () => {
    const text = '\n# a comment\n   \nFOO=bar\n  # indented comment\n'
    expect(parseEnv(text)).toEqual({ FOO: 'bar' })
  })

  it('skips lines without an equals sign', () => {
    expect(parseEnv('NOT_A_PAIR\nFOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('trims whitespace around keys and values', () => {
    expect(parseEnv('  FOO  =  bar  ')).toEqual({ FOO: 'bar' })
  })

  it('handles CRLF line endings', () => {
    expect(parseEnv('FOO=bar\r\nBAZ=qux\r\n')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('strips a leading export keyword', () => {
    expect(parseEnv('export FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('allows empty values', () => {
    expect(parseEnv('FOO=')).toEqual({ FOO: '' })
  })

  it('strips matching double quotes', () => {
    expect(parseEnv('FOO="hello world"')).toEqual({ FOO: 'hello world' })
  })

  it('strips matching single quotes', () => {
    expect(parseEnv("FOO='hello world'")).toEqual({ FOO: 'hello world' })
  })

  it('yields an empty string for empty quotes', () => {
    expect(parseEnv('A=""\nB=\'\'')).toEqual({ A: '', B: '' })
  })

  it('leaves mismatched or unterminated quotes intact', () => {
    expect(parseEnv('A="oops\'\nB="unterminated\nC="')).toEqual({
      A: '"oops\'',
      B: '"unterminated',
      C: '"',
    })
  })

  it('lets later duplicate keys override earlier ones', () => {
    expect(parseEnv('FOO=first\nFOO=second')).toEqual({ FOO: 'second' })
  })

  it('keeps everything after the first equals sign as the value', () => {
    expect(parseEnv('URL=postgres://h/db?opt=1')).toEqual({ URL: 'postgres://h/db?opt=1' })
    expect(parseEnv('TOKEN="abc=="')).toEqual({ TOKEN: 'abc==' })
  })
})
