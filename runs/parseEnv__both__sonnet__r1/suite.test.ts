import { describe, expect, it } from 'vitest'
import { parseEnv } from './parseEnv'

describe('parseEnv', () => {
  it('parses simple key=value pairs', () => {
    expect(parseEnv('FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('parses multiple lines', () => {
    expect(parseEnv('FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('trims surrounding whitespace on each line', () => {
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
    expect(parseEnv('   # a comment\nFOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('removes a leading "export " prefix', () => {
    expect(parseEnv('export FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('skips lines with no = sign', () => {
    expect(parseEnv('FOO=bar\nnotanassignment\nBAZ=qux')).toEqual({
      FOO: 'bar',
      BAZ: 'qux',
    })
  })

  it('trims the key', () => {
    expect(parseEnv('  FOO  =bar')).toEqual({ FOO: 'bar' })
  })

  it('trims the value', () => {
    expect(parseEnv('FOO=  bar  ')).toEqual({ FOO: 'bar' })
  })

  it('allows = characters in the value, splitting on the first one', () => {
    expect(parseEnv('FOO=bar=baz=qux')).toEqual({ FOO: 'bar=baz=qux' })
  })

  it('allows an empty value', () => {
    expect(parseEnv('FOO=')).toEqual({ FOO: '' })
  })

  it('strips a matching pair of outer double quotes', () => {
    expect(parseEnv('FOO="bar"')).toEqual({ FOO: 'bar' })
  })

  it('strips a matching pair of outer single quotes', () => {
    expect(parseEnv("FOO='bar'")).toEqual({ FOO: 'bar' })
  })

  it('does not strip mismatched quote pairs', () => {
    expect(parseEnv('FOO="bar\'')).toEqual({ FOO: '"bar\'' })
  })

  it('does not strip quotes that only appear on one side', () => {
    expect(parseEnv('FOO="bar')).toEqual({ FOO: '"bar' })
    expect(parseEnv('FOO=bar"')).toEqual({ FOO: 'bar"' })
  })

  it('does not process escapes or inline comments inside quoted values', () => {
    expect(parseEnv('FOO="bar # not a comment \\n baz"')).toEqual({
      FOO: 'bar # not a comment \\n baz',
    })
  })

  it('treats a lone quote character as too short to strip', () => {
    expect(parseEnv('FOO="')).toEqual({ FOO: '"' })
  })

  it('handles an empty quoted value', () => {
    expect(parseEnv('FOO=""')).toEqual({ FOO: '' })
  })

  it('uses the last occurrence when a key appears more than once', () => {
    expect(parseEnv('FOO=bar\nFOO=baz')).toEqual({ FOO: 'baz' })
  })

  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('returns an empty object when all lines are blank or comments', () => {
    expect(parseEnv('# just a comment\n\n   \n')).toEqual({})
  })
})
