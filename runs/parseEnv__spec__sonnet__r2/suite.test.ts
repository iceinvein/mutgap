import { describe, expect, it } from 'vitest'
import { parseEnv } from './parseEnv'

describe('parseEnv', () => {
  it('parses a simple key=value pair', () => {
    expect(parseEnv('KEY=value')).toEqual({ KEY: 'value' })
  })

  it('parses multiple lines', () => {
    expect(parseEnv('A=1\nB=2\nC=3')).toEqual({ A: '1', B: '2', C: '3' })
  })

  it('trims surrounding whitespace on each line', () => {
    expect(parseEnv('   KEY=value   ')).toEqual({ KEY: 'value' })
  })

  it('trims whitespace around the key and value', () => {
    expect(parseEnv('KEY   =   value')).toEqual({ KEY: 'value' })
  })

  it('skips blank lines', () => {
    expect(parseEnv('A=1\n\n\nB=2')).toEqual({ A: '1', B: '2' })
  })

  it('skips lines that are blank after trimming', () => {
    expect(parseEnv('A=1\n   \nB=2')).toEqual({ A: '1', B: '2' })
  })

  it('skips comment lines starting with #', () => {
    expect(parseEnv('# a comment\nA=1')).toEqual({ A: '1' })
  })

  it('skips comment lines whose # appears only after trimming leading whitespace', () => {
    expect(parseEnv('   # indented comment\nA=1')).toEqual({ A: '1' })
  })

  it('removes a leading "export " prefix', () => {
    expect(parseEnv('export KEY=value')).toEqual({ KEY: 'value' })
  })

  it('skips lines with no = sign', () => {
    expect(parseEnv('A=1\nnotAnAssignment\nB=2')).toEqual({ A: '1', B: '2' })
  })

  it('splits on the first = only, keeping later = in the value', () => {
    expect(parseEnv('KEY=a=b=c')).toEqual({ KEY: 'a=b=c' })
  })

  it('allows an empty value', () => {
    expect(parseEnv('KEY=')).toEqual({ KEY: '' })
  })

  it('allows an empty value with trailing whitespace', () => {
    expect(parseEnv('KEY=   ')).toEqual({ KEY: '' })
  })

  it('strips matching double quotes from the value', () => {
    expect(parseEnv('KEY="value"')).toEqual({ KEY: 'value' })
  })

  it('strips matching single quotes from the value', () => {
    expect(parseEnv("KEY='value'")).toEqual({ KEY: 'value' })
  })

  it('does not strip mismatched quotes', () => {
    expect(parseEnv(`KEY="value'`)).toEqual({ KEY: `"value'` })
  })

  it('does not strip a single quote character on only one side', () => {
    expect(parseEnv('KEY="value')).toEqual({ KEY: '"value' })
  })

  it('leaves a lone quote character value untouched', () => {
    expect(parseEnv('KEY="')).toEqual({ KEY: '"' })
  })

  it('does not process escape sequences inside quoted values', () => {
    expect(parseEnv('KEY="line1\\nline2"')).toEqual({ KEY: 'line1\\nline2' })
  })

  it('does not strip inline comments from values', () => {
    expect(parseEnv('KEY=value # not a comment')).toEqual({ KEY: 'value # not a comment' })
  })

  it('keeps quotes around an empty-looking two character value that is just quotes', () => {
    expect(parseEnv('KEY=""')).toEqual({ KEY: '' })
  })

  it('uses the last occurrence when a key appears more than once', () => {
    expect(parseEnv('KEY=first\nKEY=second')).toEqual({ KEY: 'second' })
  })

  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('returns an empty object when input is only comments and blank lines', () => {
    expect(parseEnv('# nothing here\n\n   \n# still nothing')).toEqual({})
  })

  it('handles a realistic multi-line .env file', () => {
    const text = [
      '# database config',
      'export DB_HOST=localhost',
      'DB_PORT=5432',
      '',
      'DB_PASSWORD="p@ss=word"',
      "GREETING='hello world'",
      'EMPTY=',
    ].join('\n')

    expect(parseEnv(text)).toEqual({
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_PASSWORD: 'p@ss=word',
      GREETING: 'hello world',
      EMPTY: '',
    })
  })
})
