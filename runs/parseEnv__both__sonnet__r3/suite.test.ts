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
    expect(parseEnv('  FOO=bar  \n\tBAZ=qux\t')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips blank lines', () => {
    expect(parseEnv('FOO=bar\n\n\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips lines that are only whitespace', () => {
    expect(parseEnv('FOO=bar\n   \nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips comment lines starting with #', () => {
    expect(parseEnv('# a comment\nFOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('skips comment lines with leading whitespace before the #', () => {
    expect(parseEnv('   # a comment\nFOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('removes a leading "export " prefix', () => {
    expect(parseEnv('export FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('does not treat "export" without trailing space as a prefix', () => {
    expect(parseEnv('exported=bar')).toEqual({ exported: 'bar' })
  })

  it('skips lines with no = character', () => {
    expect(parseEnv('FOO=bar\nNOEQUALSHERE\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('splits on the first = and keeps later = signs in the value', () => {
    expect(parseEnv('FOO=bar=baz=qux')).toEqual({ FOO: 'bar=baz=qux' })
  })

  it('trims whitespace around key and value', () => {
    expect(parseEnv('FOO  =   bar')).toEqual({ FOO: 'bar' })
  })

  it('allows an empty value', () => {
    expect(parseEnv('FOO=')).toEqual({ FOO: '' })
  })

  it('allows an empty value that is only whitespace', () => {
    expect(parseEnv('FOO=   ')).toEqual({ FOO: '' })
  })

  it('strips a single matching pair of double quotes', () => {
    expect(parseEnv('FOO="bar"')).toEqual({ FOO: 'bar' })
  })

  it('strips a single matching pair of single quotes', () => {
    expect(parseEnv("FOO='bar'")).toEqual({ FOO: 'bar' })
  })

  it('only strips the outer pair of quotes, not nested quotes', () => {
    expect(parseEnv('FOO=""bar""')).toEqual({ FOO: '"bar"' })
  })

  it('does not strip mismatched quote pairs', () => {
    expect(parseEnv('FOO="bar\'')).toEqual({ FOO: '"bar\'' })
  })

  it('does not strip a lone double quote character', () => {
    expect(parseEnv('FOO="')).toEqual({ FOO: '"' })
  })

  it('does not strip a lone single quote character', () => {
    expect(parseEnv("FOO='")).toEqual({ FOO: "'" })
  })

  it('treats a two-character all-quote value as quoted, yielding empty string', () => {
    expect(parseEnv('FOO=""')).toEqual({ FOO: '' })
  })

  it('does not strip quotes that only appear on one side', () => {
    expect(parseEnv('FOO="bar')).toEqual({ FOO: '"bar' })
    expect(parseEnv('FOO=bar"')).toEqual({ FOO: 'bar"' })
  })

  it('does not perform escape processing inside quoted values', () => {
    expect(parseEnv('FOO="bar\\nbaz"')).toEqual({ FOO: 'bar\\nbaz' })
  })

  it('does not strip inline comments', () => {
    expect(parseEnv('FOO=bar # not a comment')).toEqual({ FOO: 'bar # not a comment' })
  })

  it('lets the last occurrence of a repeated key win', () => {
    expect(parseEnv('FOO=first\nFOO=second')).toEqual({ FOO: 'second' })
  })

  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('returns an empty object when all lines are blank or comments', () => {
    expect(parseEnv('\n# just a comment\n   \n')).toEqual({})
  })

  it('handles a realistic multi-line .env file', () => {
    const text = [
      '# database config',
      'export DB_HOST=localhost',
      'DB_PORT=5432',
      '',
      'DB_NAME="my_app"',
      "DB_PASS='p@ss=word'",
      '# duplicate below overrides',
      'DB_NAME=overridden',
    ].join('\n')

    expect(parseEnv(text)).toEqual({
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'overridden',
      DB_PASS: 'p@ss=word',
    })
  })
})
