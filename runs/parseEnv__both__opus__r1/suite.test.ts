import { describe, expect, it } from 'vitest'
import { parseEnv } from './parseEnv'

describe('parseEnv', () => {
  it('parses simple key/value pairs', () => {
    expect(parseEnv('A=1\nB=two')).toEqual({ A: '1', B: 'two' })
  })

  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('trims whitespace around lines, keys and values', () => {
    expect(parseEnv('   KEY   =   value   \n\tOTHER\t=\tx\t')).toEqual({
      KEY: 'value',
      OTHER: 'x',
    })
  })

  it('skips blank and whitespace-only lines', () => {
    expect(parseEnv('\n\nA=1\n   \n\t\nB=2\n')).toEqual({ A: '1', B: '2' })
  })

  it('skips comment lines, including indented ones', () => {
    expect(parseEnv('# comment\n   # indented\nA=1\n#B=2')).toEqual({ A: '1' })
  })

  it('does not treat a # that is not the first character as a comment', () => {
    expect(parseEnv('A=1 # not stripped')).toEqual({ A: '1 # not stripped' })
  })

  it('removes a leading export prefix', () => {
    expect(parseEnv('export A=1\n  export B = 2')).toEqual({ A: '1', B: '2' })
  })

  it('does not strip "export" when it is not followed by a space', () => {
    expect(parseEnv('exportA=1')).toEqual({ exportA: '1' })
  })

  it('skips lines with no =', () => {
    expect(parseEnv('JUSTAKEY\nA=1\nexport ALSO_NO_EQUALS')).toEqual({ A: '1' })
  })

  it('splits on the first =, so values may contain =', () => {
    expect(parseEnv('A=b=c')).toEqual({ A: 'b=c' })
    expect(parseEnv('URL=postgres://h/db?x=1&y=2')).toEqual({
      URL: 'postgres://h/db?x=1&y=2',
    })
    expect(parseEnv('A==')).toEqual({ A: '=' })
  })

  it('allows empty values', () => {
    expect(parseEnv('A=\nB=   ')).toEqual({ A: '', B: '' })
  })

  it('removes one outer pair of double quotes', () => {
    expect(parseEnv('A="hello world"')).toEqual({ A: 'hello world' })
  })

  it('removes one outer pair of single quotes', () => {
    expect(parseEnv("A='hello world'")).toEqual({ A: 'hello world' })
  })

  it('unquotes after trimming the value', () => {
    expect(parseEnv('A =  " padded "  ')).toEqual({ A: ' padded ' })
  })

  it('treats an empty quoted value as empty', () => {
    expect(parseEnv('A=""\nB=\'\'')).toEqual({ A: '', B: '' })
  })

  it('removes only the outermost pair of quotes', () => {
    expect(parseEnv('A=""x""')).toEqual({ A: '"x"' })
    expect(parseEnv(`A="'x'"`)).toEqual({ A: "'x'" })
  })

  it('leaves a lone quote character alone', () => {
    expect(parseEnv('A="\nB=\'')).toEqual({ A: '"', B: "'" })
  })

  it('does not unquote mismatched or one-sided quotes', () => {
    expect(parseEnv(`A="x'\nB='x"\nC="x\nD=x"`)).toEqual({
      A: `"x'`,
      B: `'x"`,
      C: '"x',
      D: 'x"',
    })
  })

  it('does not process escapes or strip inline comments inside quotes', () => {
    expect(parseEnv('A="line\\nbreak"\nB="x" # c')).toEqual({
      A: 'line\\nbreak',
      B: '"x" # c',
    })
  })

  it('keeps = inside quoted values', () => {
    expect(parseEnv('A="b=c"')).toEqual({ A: 'b=c' })
  })

  it('lets the last occurrence of a key win', () => {
    expect(parseEnv('A=1\nB=2\nA=3')).toEqual({ A: '3', B: '2' })
  })

  it('handles CRLF line endings via trimming', () => {
    expect(parseEnv('A=1\r\nB="2"\r\n')).toEqual({ A: '1', B: '2' })
  })
})
