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
    expect(parseEnv('  FOO=bar  \n  BAZ=qux  ')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips blank lines', () => {
    expect(parseEnv('FOO=bar\n\n\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips lines that are blank after trimming (whitespace-only)', () => {
    expect(parseEnv('FOO=bar\n   \nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips comment lines starting with #', () => {
    expect(parseEnv('# comment\nFOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('skips comment lines with leading whitespace before #', () => {
    expect(parseEnv('   # comment\nFOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('does not treat a # not at the start of the trimmed line as a comment', () => {
    expect(parseEnv('FOO=bar#not-a-comment')).toEqual({ FOO: 'bar#not-a-comment' })
  })

  it('removes a leading "export " prefix', () => {
    expect(parseEnv('export FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('removes leading "export " prefix after trimming outer whitespace', () => {
    expect(parseEnv('  export FOO=bar  ')).toEqual({ FOO: 'bar' })
  })

  it('does not strip "export" without the trailing space', () => {
    expect(parseEnv('exportFOO=bar')).toEqual({ exportFOO: 'bar' })
  })

  it('skips lines with no = character', () => {
    expect(parseEnv('FOO=bar\nNOEQUALSIGN\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('splits on the first = only, allowing = in the value', () => {
    expect(parseEnv('FOO=bar=baz=qux')).toEqual({ FOO: 'bar=baz=qux' })
  })

  it('trims whitespace around the key and value', () => {
    expect(parseEnv('FOO = bar')).toEqual({ FOO: 'bar' })
  })

  it('allows an empty value', () => {
    expect(parseEnv('FOO=')).toEqual({ FOO: '' })
  })

  it('allows an empty value that is only whitespace, trimmed to empty', () => {
    expect(parseEnv('FOO=   ')).toEqual({ FOO: '' })
  })

  it('strips one outer pair of double quotes', () => {
    expect(parseEnv('FOO="bar"')).toEqual({ FOO: 'bar' })
  })

  it('strips one outer pair of single quotes', () => {
    expect(parseEnv("FOO='bar'")).toEqual({ FOO: 'bar' })
  })

  it('strips quotes around an otherwise-empty value', () => {
    expect(parseEnv('FOO=""')).toEqual({ FOO: '' })
    expect(parseEnv("FOO=''")).toEqual({ FOO: '' })
  })

  it('does not strip mismatched quote pairs', () => {
    expect(parseEnv('FOO="bar\'')).toEqual({ FOO: '"bar\'' })
  })

  it('does not strip a single leading or trailing quote character alone', () => {
    expect(parseEnv('FOO="bar')).toEqual({ FOO: '"bar' })
    expect(parseEnv('FOO=bar"')).toEqual({ FOO: 'bar"' })
  })

  it('treats a lone quote character value as too short to strip', () => {
    expect(parseEnv('FOO="')).toEqual({ FOO: '"' })
  })

  it('does not process escape sequences inside quoted values', () => {
    expect(parseEnv('FOO="bar\\nbaz"')).toEqual({ FOO: 'bar\\nbaz' })
  })

  it('does not strip inline comments after the value', () => {
    expect(parseEnv('FOO=bar # not stripped')).toEqual({ FOO: 'bar # not stripped' })
  })

  it('preserves inner quotes that are not the outer pair', () => {
    expect(parseEnv('FOO=bar"baz"qux')).toEqual({ FOO: 'bar"baz"qux' })
  })

  it('last occurrence of a duplicate key wins', () => {
    expect(parseEnv('FOO=bar\nFOO=baz')).toEqual({ FOO: 'baz' })
  })

  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('returns an empty object for input that is all comments and blank lines', () => {
    expect(parseEnv('# just a comment\n\n   \n# another')).toEqual({})
  })

  it('handles a realistic multi-line .env file', () => {
    const text = [
      '# database config',
      'export DB_HOST=localhost',
      'DB_PORT=5432',
      '',
      "DB_NAME='my_app'",
      'DB_PASSWORD="p@ss=word"',
      '  # trailing comment line  ',
      'MALFORMED_LINE',
      'DB_NAME=overridden',
    ].join('\n')

    expect(parseEnv(text)).toEqual({
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'overridden',
      DB_PASSWORD: 'p@ss=word',
    })
  })
})
