import { describe, expect, it } from 'vitest'
import { parseEnv } from './parseEnv'

describe('parseEnv', () => {
  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('parses simple KEY=value pairs', () => {
    expect(parseEnv('FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips blank lines and comment lines', () => {
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

  it('allows empty values', () => {
    expect(parseEnv('FOO=')).toEqual({ FOO: '' })
  })

  it('strips a leading "export " prefix', () => {
    expect(parseEnv('export FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('does not strip "export" when it is part of the key', () => {
    expect(parseEnv('exporter=bar')).toEqual({ exporter: 'bar' })
  })

  it('strips matching double quotes', () => {
    expect(parseEnv('FOO="hello world"')).toEqual({ FOO: 'hello world' })
  })

  it('strips matching single quotes', () => {
    expect(parseEnv("FOO='hello world'")).toEqual({ FOO: 'hello world' })
  })

  it('preserves whitespace inside quotes', () => {
    expect(parseEnv('FOO="  padded  "')).toEqual({ FOO: '  padded  ' })
  })

  it('turns an empty quoted string into an empty value', () => {
    expect(parseEnv('A=""\nB=\'\'')).toEqual({ A: '', B: '' })
  })

  it('leaves mismatched or unterminated quotes alone', () => {
    expect(parseEnv('A="foo\'\nB="foo\nC="')).toEqual({ A: '"foo\'', B: '"foo', C: '"' })
  })

  it('keeps "#" inside a value', () => {
    expect(parseEnv('FOO=bar#baz')).toEqual({ FOO: 'bar#baz' })
  })

  it('lets later definitions override earlier ones', () => {
    expect(parseEnv('FOO=1\nFOO=2')).toEqual({ FOO: '2' })
  })

  it('splits on the first "=" so values may contain "="', () => {
    expect(parseEnv('URL=postgres://h/db?a=1')).toEqual({ URL: 'postgres://h/db?a=1' })
    expect(parseEnv('TOKEN="abc=="')).toEqual({ TOKEN: 'abc==' })
  })
})
