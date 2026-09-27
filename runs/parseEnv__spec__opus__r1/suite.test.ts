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
      expect(parseEnv('FOO=bar\nBAZ=qux\nNUM=42')).toEqual({
        FOO: 'bar',
        BAZ: 'qux',
        NUM: '42',
      })
    })

    it('returns values as strings', () => {
      const result = parseEnv('PORT=8080\nDEBUG=true')
      expect(result.PORT).toBe('8080')
      expect(result.DEBUG).toBe('true')
    })

    it('handles a trailing newline', () => {
      expect(parseEnv('FOO=bar\n')).toEqual({ FOO: 'bar' })
    })
  })

  describe('whitespace', () => {
    it('trims whitespace around each line', () => {
      expect(parseEnv('   FOO=bar   \n\tBAZ=qux\t')).toEqual({ FOO: 'bar', BAZ: 'qux' })
    })

    it('trims whitespace around the key', () => {
      expect(parseEnv('FOO   =bar')).toEqual({ FOO: 'bar' })
    })

    it('trims whitespace around the value', () => {
      expect(parseEnv('FOO=   bar   ')).toEqual({ FOO: 'bar' })
    })

    it('trims whitespace on both sides of the first =', () => {
      expect(parseEnv('FOO = bar')).toEqual({ FOO: 'bar' })
    })

    it('preserves internal whitespace in the value', () => {
      expect(parseEnv('GREETING=hello   world')).toEqual({ GREETING: 'hello   world' })
    })

    it('strips a trailing \\r from CRLF line endings via trimming', () => {
      expect(parseEnv('FOO=bar\r\nBAZ=qux\r\n')).toEqual({ FOO: 'bar', BAZ: 'qux' })
    })
  })

  describe('skipped lines', () => {
    it('skips blank lines', () => {
      expect(parseEnv('\n\nFOO=bar\n\n\nBAZ=qux\n\n')).toEqual({ FOO: 'bar', BAZ: 'qux' })
    })

    it('skips whitespace-only lines', () => {
      expect(parseEnv('   \n\t\nFOO=bar\n  \t  ')).toEqual({ FOO: 'bar' })
    })

    it('skips comment lines', () => {
      expect(parseEnv('# a comment\nFOO=bar\n#BAZ=qux')).toEqual({ FOO: 'bar' })
    })

    it('skips comment lines that are indented', () => {
      expect(parseEnv('   # indented comment\n\t#BAZ=qux\nFOO=bar')).toEqual({ FOO: 'bar' })
    })

    it('skips a comment line containing =', () => {
      expect(parseEnv('#FOO=bar')).toEqual({})
    })

    it('skips lines with no =', () => {
      expect(parseEnv('JUSTAKEY\nFOO=bar\nanother line')).toEqual({ FOO: 'bar' })
    })

    it('does not treat # later in the line as a comment marker for skipping', () => {
      expect(parseEnv('FOO#=bar')).toEqual({ 'FOO#': 'bar' })
    })

    it('returns an empty object when every line is skipped', () => {
      expect(parseEnv('# comment\n\n   \nNOEQUALS')).toEqual({})
    })
  })

  describe('export prefix', () => {
    it('removes a leading "export " prefix', () => {
      expect(parseEnv('export FOO=bar')).toEqual({ FOO: 'bar' })
    })

    it('removes the export prefix on indented lines', () => {
      expect(parseEnv('   export FOO=bar')).toEqual({ FOO: 'bar' })
    })

    it('handles a mix of exported and non-exported lines', () => {
      expect(parseEnv('export FOO=bar\nBAZ=qux')).toEqual({ FOO: 'bar', BAZ: 'qux' })
    })

    it('does not remove "export" when it is part of the key', () => {
      expect(parseEnv('EXPORTED=1\nexporter=2')).toEqual({ EXPORTED: '1', exporter: '2' })
    })

    it('only removes the prefix at the start of the line', () => {
      expect(parseEnv('FOO=export bar')).toEqual({ FOO: 'export bar' })
    })

    it('skips an exported line with no =', () => {
      expect(parseEnv('export FOO')).toEqual({})
    })
  })

  describe('keys and values', () => {
    it('splits on the first = only, keeping later = in the value', () => {
      expect(parseEnv('URL=postgres://host/db?a=1&b=2')).toEqual({
        URL: 'postgres://host/db?a=1&b=2',
      })
    })

    it('keeps a value made only of = characters', () => {
      expect(parseEnv('FOO===')).toEqual({ FOO: '==' })
    })

    it('allows an empty value', () => {
      expect(parseEnv('EMPTY=')).toEqual({ EMPTY: '' })
    })

    it('treats a whitespace-only value as empty', () => {
      expect(parseEnv('EMPTY=    ')).toEqual({ EMPTY: '' })
    })

    it('uses the last occurrence when a key is repeated', () => {
      expect(parseEnv('FOO=first\nBAR=x\nFOO=second\nFOO=third')).toEqual({
        FOO: 'third',
        BAR: 'x',
      })
    })

    it('lets a later empty value override an earlier one', () => {
      expect(parseEnv('FOO=bar\nFOO=')).toEqual({ FOO: '' })
    })

    it('treats keys as case-sensitive', () => {
      expect(parseEnv('foo=1\nFOO=2')).toEqual({ foo: '1', FOO: '2' })
    })
  })

  describe('quotes', () => {
    it('removes surrounding double quotes', () => {
      expect(parseEnv('FOO="bar"')).toEqual({ FOO: 'bar' })
    })

    it('removes surrounding single quotes', () => {
      expect(parseEnv("FOO='bar'")).toEqual({ FOO: 'bar' })
    })

    it('preserves whitespace inside quotes', () => {
      expect(parseEnv('FOO="  bar  "')).toEqual({ FOO: '  bar  ' })
      expect(parseEnv("FOO='  bar  '")).toEqual({ FOO: '  bar  ' })
    })

    it('strips quotes after trimming the value', () => {
      expect(parseEnv('FOO =   "bar"   ')).toEqual({ FOO: 'bar' })
    })

    it('turns an empty pair of double quotes into an empty string', () => {
      expect(parseEnv('FOO=""')).toEqual({ FOO: '' })
    })

    it('turns an empty pair of single quotes into an empty string', () => {
      expect(parseEnv("FOO=''")).toEqual({ FOO: '' })
    })

    it('leaves a lone double quote unchanged', () => {
      expect(parseEnv('FOO="')).toEqual({ FOO: '"' })
    })

    it('leaves a lone single quote unchanged', () => {
      expect(parseEnv("FOO='")).toEqual({ FOO: "'" })
    })

    it('does not strip mismatched quotes', () => {
      expect(parseEnv('FOO="bar\'')).toEqual({ FOO: '"bar\'' })
      expect(parseEnv('FOO=\'bar"')).toEqual({ FOO: '\'bar"' })
    })

    it('does not strip a quote only at the start', () => {
      expect(parseEnv('FOO="bar')).toEqual({ FOO: '"bar' })
      expect(parseEnv("FOO='bar")).toEqual({ FOO: "'bar" })
    })

    it('does not strip a quote only at the end', () => {
      expect(parseEnv('FOO=bar"')).toEqual({ FOO: 'bar"' })
      expect(parseEnv("FOO=bar'")).toEqual({ FOO: "bar'" })
    })

    it('does not strip quotes that are not at the edges of the value', () => {
      expect(parseEnv('FOO=a"b"c')).toEqual({ FOO: 'a"b"c' })
    })

    it('removes only one outer pair of quotes', () => {
      expect(parseEnv('FOO=""bar""')).toEqual({ FOO: '"bar"' })
      expect(parseEnv("FOO=''bar''")).toEqual({ FOO: "'bar'" })
    })

    it('keeps inner quotes of the other kind', () => {
      expect(parseEnv('FOO="it\'s"')).toEqual({ FOO: "it's" })
      expect(parseEnv('FOO=\'say "hi"\'')).toEqual({ FOO: 'say "hi"' })
    })

    it('keeps inner quotes of the same kind', () => {
      expect(parseEnv('FOO="a"b"')).toEqual({ FOO: 'a"b' })
    })

    it('keeps = inside a quoted value', () => {
      expect(parseEnv('FOO="a=b"')).toEqual({ FOO: 'a=b' })
    })

    it('does not unquote the key', () => {
      expect(parseEnv('"FOO"=bar')).toEqual({ '"FOO"': 'bar' })
    })
  })

  describe('no extra processing', () => {
    it('does not process escape sequences in double-quoted values', () => {
      expect(parseEnv('FOO="a\\nb"')).toEqual({ FOO: 'a\\nb' })
    })

    it('does not process escape sequences in unquoted values', () => {
      expect(parseEnv('FOO=a\\tb\\\\c')).toEqual({ FOO: 'a\\tb\\\\c' })
    })

    it('does not strip inline comments from unquoted values', () => {
      expect(parseEnv('FOO=bar # comment')).toEqual({ FOO: 'bar # comment' })
    })

    it('does not strip inline comments after quoted values', () => {
      expect(parseEnv('FOO="bar" # comment')).toEqual({ FOO: '"bar" # comment' })
    })

    it('keeps a value that starts with #', () => {
      expect(parseEnv('FOO=#bar')).toEqual({ FOO: '#bar' })
    })

    it('does not expand variable references', () => {
      expect(parseEnv('A=1\nB=${A}\nC=$A')).toEqual({ A: '1', B: '${A}', C: '$A' })
    })
  })

  it('parses a realistic .env file', () => {
    const text = [
      '# Database settings',
      'export DB_HOST=localhost',
      'DB_PORT = 5432',
      '',
      'DB_URL="postgres://user:p=ss@localhost:5432/app"',
      "SECRET='s3cr3t # not a comment'",
      '   # indented comment',
      'EMPTY=',
      'INVALID_LINE',
      'DB_PORT=6543',
    ].join('\n')

    expect(parseEnv(text)).toEqual({
      DB_HOST: 'localhost',
      DB_PORT: '6543',
      DB_URL: 'postgres://user:p=ss@localhost:5432/app',
      SECRET: 's3cr3t # not a comment',
      EMPTY: '',
    })
  })
})
