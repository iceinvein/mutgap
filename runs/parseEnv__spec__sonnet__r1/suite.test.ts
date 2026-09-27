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

  it('skips lines that are blank after trimming', () => {
    expect(parseEnv('FOO=bar\n   \nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips comment lines starting with #', () => {
    expect(parseEnv('# a comment\nFOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('skips comment lines whose # appears only after trimming leading whitespace', () => {
    expect(parseEnv('   # a comment\nFOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('removes a leading "export " prefix', () => {
    expect(parseEnv('export FOO=bar')).toEqual({ FOO: 'bar' })
  })

  it('skips lines with no = in them', () => {
    expect(parseEnv('FOO=bar\nnotanassignment\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('trims whitespace around the key', () => {
    expect(parseEnv('  FOO  =bar')).toEqual({ FOO: 'bar' })
  })

  it('trims whitespace around the value', () => {
    expect(parseEnv('FOO=  bar  ')).toEqual({ FOO: 'bar' })
  })

  it('allows the value to contain additional = characters', () => {
    expect(parseEnv('FOO=bar=baz=qux')).toEqual({ FOO: 'bar=baz=qux' })
  })

  it('allows an empty value', () => {
    expect(parseEnv('FOO=')).toEqual({ FOO: '' })
  })

  it('allows an empty value after trimming whitespace', () => {
    expect(parseEnv('FOO=   ')).toEqual({ FOO: '' })
  })

  it('strips a single outer pair of double quotes', () => {
    expect(parseEnv('FOO="bar"')).toEqual({ FOO: 'bar' })
  })

  it('strips a single outer pair of single quotes', () => {
    expect(parseEnv("FOO='bar'")).toEqual({ FOO: 'bar' })
  })

  it('does not strip mismatched quote pairs', () => {
    expect(parseEnv(`FOO="bar'`)).toEqual({ FOO: `"bar'` })
  })

  it('does not strip a single quote character as a value', () => {
    expect(parseEnv('FOO="')).toEqual({ FOO: '"' })
  })

  it('does not unescape characters inside quotes', () => {
    expect(parseEnv('FOO="line1\\nline2"')).toEqual({ FOO: 'line1\\nline2' })
  })

  it('does not strip inline comments', () => {
    expect(parseEnv('FOO=bar # not a comment')).toEqual({ FOO: 'bar # not a comment' })
  })

  it('preserves inner quotes that are not the outermost pair', () => {
    expect(parseEnv('FOO=""bar""')).toEqual({ FOO: '"bar"' })
  })

  it('uses the last occurrence when a key appears more than once', () => {
    expect(parseEnv('FOO=bar\nFOO=baz')).toEqual({ FOO: 'baz' })
  })

  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('returns an empty object for input with only blank lines and comments', () => {
    expect(parseEnv('\n# comment\n   \n')).toEqual({})
  })

  it('handles a realistic multi-line .env file', () => {
    const text = [
      '# database config',
      'export DB_HOST=localhost',
      'DB_PORT=5432',
      '',
      'DB_PASSWORD="s3cr\'et"',
      "API_KEY='abc123'",
      'EMPTY_VALUE=',
      'invalidline',
      'DB_HOST=overridden',
    ].join('\n')

    expect(parseEnv(text)).toEqual({
      DB_HOST: 'overridden',
      DB_PORT: '5432',
      DB_PASSWORD: "s3cr'et",
      API_KEY: 'abc123',
      EMPTY_VALUE: '',
    })
  })
})
