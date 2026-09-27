import { describe, expect, it } from 'vitest'
import { parseEnv } from './parseEnv'

describe('parseEnv', () => {
  describe('basic parsing', () => {
    it('returns an empty object for empty input', () => {
      expect(parseEnv('')).toEqual({})
    })

    it('parses a single key/value pair', () => {
      expect(parseEnv('FOO=bar')).toEqual({ FOO: 'bar' })
    })

    it('parses multiple lines', () => {
      expect(parseEnv('A=1\nB=2\nC=3')).toEqual({ A: '1', B: '2', C: '3' })
    })

    it('returns values as strings without type coercion', () => {
      const result = parseEnv('NUM=42\nBOOL=true\nNULL=null')
      expect(result).toEqual({ NUM: '42', BOOL: 'true', NULL: 'null' })
      expect(typeof result.NUM).toBe('string')
    })

    it('handles a trailing newline', () => {
      expect(parseEnv('A=1\nB=2\n')).toEqual({ A: '1', B: '2' })
    })

    it('handles CRLF line endings because each line is trimmed', () => {
      expect(parseEnv('A=1\r\nB=2\r\n')).toEqual({ A: '1', B: '2' })
    })
  })

  describe('whitespace', () => {
    it('trims surrounding whitespace from each line', () => {
      expect(parseEnv('   FOO=bar   ')).toEqual({ FOO: 'bar' })
    })

    it('trims whitespace around the key', () => {
      expect(parseEnv('  FOO   =bar')).toEqual({ FOO: 'bar' })
    })

    it('trims whitespace around the value', () => {
      expect(parseEnv('FOO=   bar   ')).toEqual({ FOO: 'bar' })
    })

    it('trims tabs as whitespace', () => {
      expect(parseEnv('\tFOO\t=\tbar\t')).toEqual({ FOO: 'bar' })
    })

    it('preserves whitespace inside the value', () => {
      expect(parseEnv('FOO=hello   world')).toEqual({ FOO: 'hello   world' })
    })
  })

  describe('skipped lines', () => {
    it('skips blank lines', () => {
      expect(parseEnv('A=1\n\nB=2')).toEqual({ A: '1', B: '2' })
    })

    it('skips whitespace-only lines', () => {
      expect(parseEnv('A=1\n   \t  \nB=2')).toEqual({ A: '1', B: '2' })
    })

    it('skips comment lines', () => {
      expect(parseEnv('# comment\nA=1')).toEqual({ A: '1' })
    })

    it('skips comment lines that contain =', () => {
      expect(parseEnv('#A=1\nB=2')).toEqual({ B: '2' })
    })

    it('skips indented comment lines', () => {
      expect(parseEnv('   # A=1\nB=2')).toEqual({ B: '2' })
    })

    it('skips a line consisting only of #', () => {
      expect(parseEnv('#\nA=1')).toEqual({ A: '1' })
    })

    it('skips lines with no =', () => {
      expect(parseEnv('JUSTAKEY\nA=1')).toEqual({ A: '1' })
    })

    it('skips an export line with no =', () => {
      expect(parseEnv('export FOO\nA=1')).toEqual({ A: '1' })
    })

    it('returns an empty object when every line is skipped', () => {
      expect(parseEnv('# c\n\n  \nnoequals')).toEqual({})
    })
  })

  describe('export prefix', () => {
    it('removes a leading "export " prefix', () => {
      expect(parseEnv('export FOO=bar')).toEqual({ FOO: 'bar' })
    })

    it('removes the prefix on indented lines', () => {
      expect(parseEnv('   export FOO=bar')).toEqual({ FOO: 'bar' })
    })

    it('trims extra whitespace between export and the key', () => {
      expect(parseEnv('export    FOO=bar')).toEqual({ FOO: 'bar' })
    })

    it('does not treat "export" without a following space as a prefix', () => {
      expect(parseEnv('exportFOO=bar')).toEqual({ exportFOO: 'bar' })
    })

    it('allows a key named "export"', () => {
      expect(parseEnv('export=bar')).toEqual({ export: 'bar' })
    })

    it('does not remove "export " from the middle of a line', () => {
      expect(parseEnv('FOO=export bar')).toEqual({ FOO: 'export bar' })
    })

    it('mixes exported and non-exported lines', () => {
      expect(parseEnv('export A=1\nB=2')).toEqual({ A: '1', B: '2' })
    })
  })

  describe('keys and values', () => {
    it('splits on the first = only, so values may contain =', () => {
      expect(parseEnv('URL=a=b=c')).toEqual({ URL: 'a=b=c' })
    })

    it('allows a value that is just =', () => {
      expect(parseEnv('A==')).toEqual({ A: '=' })
    })

    it('allows an empty value', () => {
      expect(parseEnv('EMPTY=')).toEqual({ EMPTY: '' })
    })

    it('yields an empty value when only whitespace follows =', () => {
      expect(parseEnv('EMPTY=   ')).toEqual({ EMPTY: '' })
    })

    it('includes keys with empty values in the result', () => {
      const result = parseEnv('EMPTY=')
      expect(Object.keys(result)).toEqual(['EMPTY'])
    })

    it('uses everything before the first = as the key, even if empty', () => {
      expect(parseEnv('=value')).toEqual({ '': 'value' })
    })

    it('does not strip inline comments', () => {
      expect(parseEnv('FOO=bar # comment')).toEqual({ FOO: 'bar # comment' })
    })

    it('keeps a value that starts with #', () => {
      expect(parseEnv('FOO=#bar')).toEqual({ FOO: '#bar' })
    })

    it('does not process escape sequences', () => {
      expect(parseEnv('FOO=a\\nb')).toEqual({ FOO: 'a\\nb' })
    })
  })

  describe('quotes', () => {
    it('removes surrounding double quotes', () => {
      expect(parseEnv('FOO="bar"')).toEqual({ FOO: 'bar' })
    })

    it('removes surrounding single quotes', () => {
      expect(parseEnv("FOO='bar'")).toEqual({ FOO: 'bar' })
    })

    it('yields an empty string for "" and \'\'', () => {
      expect(parseEnv('A=""\nB=\'\'')).toEqual({ A: '', B: '' })
    })

    it('preserves whitespace inside quotes', () => {
      expect(parseEnv('FOO="  bar  "')).toEqual({ FOO: '  bar  ' })
    })

    it('trims the value before checking for quotes', () => {
      expect(parseEnv('FOO =   " bar "   ')).toEqual({ FOO: ' bar ' })
    })

    it('removes only one outer pair of quotes', () => {
      expect(parseEnv('A=""bar""\nB=\'\'bar\'\'')).toEqual({
        A: '"bar"',
        B: "'bar'",
      })
    })

    it('keeps inner quotes', () => {
      expect(parseEnv('FOO="a"b"')).toEqual({ FOO: 'a"b' })
    })

    it('keeps the other quote type inside', () => {
      expect(parseEnv('A="it\'s"\nB=\'say "hi"\'')).toEqual({
        A: "it's",
        B: 'say "hi"',
      })
    })

    it('does not unquote a single double-quote character', () => {
      expect(parseEnv('FOO="')).toEqual({ FOO: '"' })
    })

    it('does not unquote a single single-quote character', () => {
      expect(parseEnv("FOO='")).toEqual({ FOO: "'" })
    })

    it('does not unquote mismatched quotes', () => {
      expect(parseEnv('A="bar\'\nB=\'bar"')).toEqual({
        A: '"bar\'',
        B: '\'bar"',
      })
    })

    it('does not unquote when only the start is quoted', () => {
      expect(parseEnv('A="bar\nB=\'bar')).toEqual({ A: '"bar', B: "'bar" })
    })

    it('does not unquote when only the end is quoted', () => {
      expect(parseEnv('A=bar"\nB=bar\'')).toEqual({ A: 'bar"', B: "bar'" })
    })

    it('does not unquote when quotes are not at the edges', () => {
      expect(parseEnv('FOO=a"bar"b')).toEqual({ FOO: 'a"bar"b' })
    })

    it('does not strip inline comments after a quoted value', () => {
      expect(parseEnv('FOO="bar" # comment')).toEqual({
        FOO: '"bar" # comment',
      })
    })

    it('does not process escape sequences inside quotes', () => {
      expect(parseEnv('FOO="a\\nb"')).toEqual({ FOO: 'a\\nb' })
    })

    it('keeps = and # inside quoted values', () => {
      expect(parseEnv('FOO="a=b #c"')).toEqual({ FOO: 'a=b #c' })
    })

    it('does not unquote keys', () => {
      expect(parseEnv('"FOO"=bar')).toEqual({ '"FOO"': 'bar' })
    })
  })

  describe('duplicate keys', () => {
    it('uses the last occurrence', () => {
      expect(parseEnv('A=1\nA=2\nA=3')).toEqual({ A: '3' })
    })

    it('lets a later empty value override an earlier one', () => {
      expect(parseEnv('A=1\nA=')).toEqual({ A: '' })
    })

    it('treats exported and non-exported forms as the same key', () => {
      expect(parseEnv('export A=1\nA=2')).toEqual({ A: '2' })
    })

    it('treats keys differing only by surrounding whitespace as the same', () => {
      expect(parseEnv('A=1\n  A  =2')).toEqual({ A: '2' })
    })

    it('treats keys as case-sensitive', () => {
      expect(parseEnv('a=1\nA=2')).toEqual({ a: '1', A: '2' })
    })

    it('is not affected by a later skipped line', () => {
      expect(parseEnv('A=1\n#A=2\nA')).toEqual({ A: '1' })
    })
  })

  it('parses a realistic .env file', () => {
    const text = [
      '# Database settings',
      'export DB_HOST=localhost',
      'DB_PORT = 5432',
      '',
      'DB_PASSWORD="p@ss=word"',
      "GREETING='hello world'",
      'EMPTY=',
      'NOT A VALID LINE',
      '   # indented comment',
      'DB_HOST=db.example.com',
    ].join('\n')

    expect(parseEnv(text)).toEqual({
      DB_HOST: 'db.example.com',
      DB_PORT: '5432',
      DB_PASSWORD: 'p@ss=word',
      GREETING: 'hello world',
      EMPTY: '',
    })
  })
})
