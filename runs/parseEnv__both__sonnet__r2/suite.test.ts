import { describe, expect, it } from 'vitest'
import { parseEnv } from './parseEnv'

describe('parseEnv', () => {
  it('parses a simple key=value line', () => {
    expect(parseEnv('FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('parses multiple lines', () => {
    expect(parseEnv('FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('trims surrounding whitespace from each line', () => {
    expect(parseEnv('  FOO=bar  ')).toEqual({ FOO: 'bar' })
  })

  it('skips blank lines', () => {
    expect(parseEnv('FOO=bar\n\n\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips lines that are blank after trimming', () => {
    expect(parseEnv('FOO=bar\n   \nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips comment lines starting with #', () => {
    expect(parseEnv('# a comment\nFOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('skips comment lines that start with # only after trimming', () => {
    expect(parseEnv('   # indented comment\nFOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('removes a leading "export " prefix', () => {
    expect(parseEnv('export FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('does not strip "export" without the trailing space/prefix form', () => {
    expect(parseEnv('exportFOO=bar')).toEqual({ exportFOO: 'bar' })
  })

  it('skips lines with no = sign', () => {
    expect(parseEnv('FOO\nBAZ=qux')).toEqual({ BAZ: 'qux' })
  })

  it('trims whitespace around key and value', () => {
    expect(parseEnv('FOO  =  bar')).toEqual({ FOO: 'bar' })
  })

  it('splits on the first = so values may contain =', () => {
    expect(parseEnv('FOO=bar=baz')).toEqual({ FOO: 'bar=baz' })
  })

  it('allows an empty value', () => {
    expect(parseEnv('FOO=')).toEqual({ FOO: '' })
  })

  it('strips a single pair of surrounding double quotes', () => {
    expect(parseEnv('FOO="bar"')).toEqual({ FOO: 'bar' })
  })

  it('strips a single pair of surrounding single quotes', () => {
    expect(parseEnv("FOO='bar'")).toEqual({ FOO: 'bar' })
  })

  it('does not strip mismatched quote pairs', () => {
    expect(parseEnv(`FOO="bar'`)).toEqual({ FOO: '"bar\'' })
  })

  it('does not strip quotes that only appear on one side', () => {
    expect(parseEnv('FOO="bar')).toEqual({ FOO: '"bar' })
  })

  it('does not unquote a value consisting of a single quote character', () => {
    expect(parseEnv('FOO="')).toEqual({ FOO: '"' })
  })

  it('treats a two-character quote-only value as an empty quoted value', () => {
    expect(parseEnv('FOO=""')).toEqual({ FOO: '' })
  })

  it('does not process escape sequences inside quotes', () => {
    expect(parseEnv('FOO="bar\\nbaz"')).toEqual({ FOO: 'bar\\nbaz' })
  })

  it('does not strip inline comments', () => {
    expect(parseEnv('FOO=bar # not a comment')).toEqual({ FOO: 'bar # not a comment' })
  })

  it('leaves inner quotes untouched when not at both ends', () => {
    expect(parseEnv('FOO=bar"baz"qux')).toEqual({ FOO: 'bar"baz"qux' })
  })

  it('lets the last occurrence of a repeated key win', () => {
    expect(parseEnv('FOO=bar\nFOO=baz')).toEqual({ FOO: 'baz' })
  })

  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('returns an empty object when only comments and blank lines are present', () => {
    expect(parseEnv('# just a comment\n\n   \n')).toEqual({})
  })
})
