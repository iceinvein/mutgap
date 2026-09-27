import { describe, expect, it } from 'vitest'
import { parseEnv } from './parseEnv'

describe('parseEnv', () => {
  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('parses simple KEY=value pairs', () => {
    expect(parseEnv('FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips blank lines and comments', () => {
    const text = '# a comment\n\nFOO=bar\n   \n  # indented comment\nBAZ=qux\n'
    expect(parseEnv(text)).toEqual({ FOO: 'bar', BAZ: 'qux' })
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

  it('does not strip export when it is part of the key', () => {
    expect(parseEnv('exported=1')).toEqual({ exported: '1' })
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

  it('treats an empty quoted string as an empty value', () => {
    expect(parseEnv('A=""\nB=\'\'')).toEqual({ A: '', B: '' })
  })

  it('leaves mismatched quotes intact', () => {
    expect(parseEnv(`FOO="bar'`)).toEqual({ FOO: `"bar'` })
  })

  it('leaves a lone quote character intact', () => {
    expect(parseEnv('FOO="')).toEqual({ FOO: '"' })
  })

  it('preserves # inside values', () => {
    expect(parseEnv('COLOR=#fff')).toEqual({ COLOR: '#fff' })
  })

  it('lets later duplicates override earlier ones', () => {
    expect(parseEnv('FOO=first\nFOO=second')).toEqual({ FOO: 'second' })
  })

  it('splits on the first equals sign so values may contain =', () => {
    expect(parseEnv('TOKEN=abc==')).toEqual({ TOKEN: 'abc==' })
  })

  it('keeps = inside quoted values', () => {
    expect(parseEnv('URL="https://x.io/?a=1&b=2"')).toEqual({
      URL: 'https://x.io/?a=1&b=2',
    })
  })
})
