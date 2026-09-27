import { describe, expect, it } from 'vitest'
import { parseEnv } from './parseEnv'

describe('parseEnv', () => {
  it('parses simple key=value pairs', () => {
    expect(parseEnv('FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('ignores blank lines', () => {
    expect(parseEnv('FOO=bar\n\n\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('ignores comment lines', () => {
    expect(parseEnv('# a comment\nFOO=bar\n# another comment')).toEqual({ FOO: 'bar' })
  })

  it('ignores lines with no "="', () => {
    expect(parseEnv('FOO=bar\nNOTANASSIGNMENT')).toEqual({ FOO: 'bar' })
  })

  it('strips a leading "export " keyword', () => {
    expect(parseEnv('export FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('trims whitespace around keys and values', () => {
    expect(parseEnv('  FOO  =  bar  ')).toEqual({ FOO: 'bar' })
  })

  it('strips matching double quotes from the value', () => {
    expect(parseEnv('FOO="bar"')).toEqual({ FOO: 'bar' })
  })

  it('strips matching single quotes from the value', () => {
    expect(parseEnv("FOO='bar'")).toEqual({ FOO: 'bar' })
  })

  it('does not strip mismatched quotes', () => {
    expect(parseEnv('FOO="bar\'')).toEqual({ FOO: '"bar\'' })
  })

  it('keeps an unterminated quote character as-is', () => {
    expect(parseEnv('FOO="bar')).toEqual({ FOO: '"bar' })
  })

  it('splits on the last "=", keeping earlier "=" characters in the key', () => {
    expect(parseEnv('FOO=bar=baz')).toEqual({ 'FOO=bar': 'baz' })
  })

  it('supports an empty value', () => {
    expect(parseEnv('FOO=')).toEqual({ FOO: '' })
  })

  it('last assignment wins for duplicate keys', () => {
    expect(parseEnv('FOO=bar\nFOO=baz')).toEqual({ FOO: 'baz' })
  })

  it('handles a mix of comments, blank lines, exports, and quoting together', () => {
    const input = [
      '# top comment',
      '',
      'export FOO="hello world"',
      "BAR='single quoted'",
      'BAZ=unquoted',
      '  # indented comment',
      'QUX=',
    ].join('\n')

    expect(parseEnv(input)).toEqual({
      FOO: 'hello world',
      BAR: 'single quoted',
      BAZ: 'unquoted',
      QUX: '',
    })
  })
})
