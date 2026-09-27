import { describe, it, expect } from 'vitest'
import { parseEnv } from './parseEnv'

describe('parseEnv', () => {
  it('returns an empty object for empty input', () => {
    expect(parseEnv('')).toEqual({})
  })

  it('parses simple key/value pairs on separate lines', () => {
    expect(parseEnv('A=1\nB=two')).toEqual({ A: '1', B: 'two' })
  })

  it('trims whitespace around lines, keys and values', () => {
    expect(parseEnv('   FOO  =  bar   \n\tBAZ=\tqux\t')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips blank and whitespace-only lines', () => {
    expect(parseEnv('\n   \nA=1\n\t\n')).toEqual({ A: '1' })
  })

  it('skips comment lines, including indented ones', () => {
    expect(parseEnv('# comment\n   # indented\nA=1\n#B=2')).toEqual({ A: '1' })
  })

  it('does not treat # later in a line as a comment', () => {
    expect(parseEnv('A=value # not a comment')).toEqual({ A: 'value # not a comment' })
  })

  it('strips a leading "export " prefix', () => {
    expect(parseEnv('export FOO=bar\n  export BAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
  })

  it('skips lines with no "="', () => {
    expect(parseEnv('JUSTAKEY\nA=1\nexport NOPE')).toEqual({ A: '1' })
  })

  it('splits on the first "=" so values may contain "="', () => {
    expect(parseEnv('URL=postgres://h/db?a=1&b=2')).toEqual({ URL: 'postgres://h/db?a=1&b=2' })
    expect(parseEnv('A==b')).toEqual({ A: '=b' })
    expect(parseEnv('A=b=')).toEqual({ A: 'b=' })
  })

  it('allows empty values', () => {
    expect(parseEnv('EMPTY=\nSPACES=   ')).toEqual({ EMPTY: '', SPACES: '' })
  })

  it('removes one outer pair of double quotes', () => {
    expect(parseEnv('A="hello world"')).toEqual({ A: 'hello world' })
  })

  it('removes one outer pair of single quotes', () => {
    expect(parseEnv("A='hello world'")).toEqual({ A: 'hello world' })
  })

  it('yields "" for an empty quoted value', () => {
    expect(parseEnv('A=""\nB=\'\'')).toEqual({ A: '', B: '' })
  })

  it('removes only the outermost pair of quotes', () => {
    expect(parseEnv('A=""x""\nB=\'"x"\'')).toEqual({ A: '"x"', B: '"x"' })
  })

  it('does not unquote a lone quote character', () => {
    expect(parseEnv('A="\nB=\'')).toEqual({ A: '"', B: "'" })
  })

  it('does not unquote mismatched or unbalanced quotes', () => {
    expect(parseEnv('A="x\'\nB=\'x"\nC="x\nD=x"')).toEqual({
      A: '"x\'',
      B: '\'x"',
      C: '"x',
      D: 'x"',
    })
  })

  it('preserves whitespace inside quotes', () => {
    expect(parseEnv('A="  padded  "')).toEqual({ A: '  padded  ' })
  })

  it('does not process escape sequences', () => {
    expect(parseEnv('A="line\\nbreak"')).toEqual({ A: 'line\\nbreak' })
  })

  it('keeps "=" inside quoted values', () => {
    expect(parseEnv('A="x=y"')).toEqual({ A: 'x=y' })
  })

  it('uses the last occurrence of a duplicated key', () => {
    expect(parseEnv('A=1\nA=2\nB=x\nA=3')).toEqual({ A: '3', B: 'x' })
  })

  it('handles CRLF line endings via trimming', () => {
    expect(parseEnv('A=1\r\nB="two"\r\n')).toEqual({ A: '1', B: 'two' })
  })
})
