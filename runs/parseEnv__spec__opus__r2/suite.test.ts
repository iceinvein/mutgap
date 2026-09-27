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

    it('always produces string values', () => {
      expect(parseEnv('PORT=8080\nDEBUG=true')).toEqual({ PORT: '8080', DEBUG: 'true' })
    })

    it('handles a trailing newline', () => {
      expect(parseEnv('A=1\n')).toEqual({ A: '1' })
    })

    it('handles CRLF line endings because each line is trimmed', () => {
      expect(parseEnv('A=1\r\nB=2\r\n')).toEqual({ A: '1', B: '2' })
    })
  })

  describe('whitespace', () => {
    it('trims surrounding whitespace from each line', () => {
      expect(parseEnv('   FOO=bar   \n\tBAZ=qux\t')).toEqual({ FOO: 'bar', BAZ: 'qux' })
    })

    it('trims whitespace around the key', () => {
      expect(parseEnv('FOO   =bar')).toEqual({ FOO: 'bar' })
    })

    it('trims whitespace around the value', () => {
      expect(parseEnv('FOO=   bar')).toEqual({ FOO: 'bar' })
      expect(parseEnv('FOO =  bar  ')).toEqual({ FOO: 'bar' })
    })

    it('preserves whitespace inside the value', () => {
      expect(parseEnv('MSG=hello   world')).toEqual({ MSG: 'hello   world' })
    })
  })

  describe('skipped lines', () => {
    it('skips blank lines', () => {
      expect(parseEnv('\n\nA=1\n\n\nB=2\n\n')).toEqual({ A: '1', B: '2' })
    })

    it('skips whitespace-only lines', () => {
      expect(parseEnv('   \n\t\nA=1\n  \t  ')).toEqual({ A: '1' })
    })

    it('skips comment lines', () => {
      expect(parseEnv('# a comment\nA=1\n#B=2')).toEqual({ A: '1' })
    })

    it('skips comment lines with leading whitespace', () => {
      expect(parseEnv('   # indented comment\n\t#B=2\nA=1')).toEqual({ A: '1' })
    })

    it('does not treat # later in a line as starting a comment line', () => {
      expect(parseEnv('A#B=1')).toEqual({ 'A#B': '1' })
    })

    it('skips lines without an = sign', () => {
      expect(parseEnv('JUSTAKEY\nA=1\nsome random text')).toEqual({ A: '1' })
    })

    it('returns an empty object when every line is skipped', () => {
      expect(parseEnv('# comment\n\n   \nNOEQUALS')).toEqual({})
    })
  })

  describe('export prefix', () => {
    it('removes a leading "export " prefix', () => {
      expect(parseEnv('export FOO=bar')).toEqual({ FOO: 'bar' })
    })

    it('removes the prefix when the line has leading whitespace', () => {
      expect(parseEnv('   export FOO=bar')).toEqual({ FOO: 'bar' })
    })

    it('trims extra whitespace between "export" and the key', () => {
      expect(parseEnv('export    FOO=bar')).toEqual({ FOO: 'bar' })
    })

    it('mixes exported and plain lines', () => {
      expect(parseEnv('export A=1\nB=2')).toEqual({ A: '1', B: '2' })
    })

    it('does not strip "export" when not followed by a space', () => {
      expect(parseEnv('exportFOO=bar')).toEqual({ exportFOO: 'bar' })
    })

    it('allows a key literally named "export"', () => {
      expect(parseEnv('export=1')).toEqual({ export: '1' })
    })

    it('skips an export line that has no = sign', () => {
      expect(parseEnv('export FOO\nA=1')).toEqual({ A: '1' })
    })

    it('only removes the prefix at the start of the line', () => {
      expect(parseEnv('FOO=export bar')).toEqual({ FOO: 'export bar' })
    })
  })

  describe('splitting on the first =', () => {
    it('keeps further = characters in the value', () => {
      expect(parseEnv('URL=postgres://h/db?a=1&b=2')).toEqual({ URL: 'postgres://h/db?a=1&b=2' })
    })

    it('handles values made of = characters', () => {
      expect(parseEnv('PAD===')).toEqual({ PAD: '==' })
    })

    it('handles base64-style trailing =', () => {
      expect(parseEnv('TOKEN=abc123==')).toEqual({ TOKEN: 'abc123==' })
    })
  })

  describe('empty values', () => {
    it('yields "" for an empty value', () => {
      expect(parseEnv('EMPTY=')).toEqual({ EMPTY: '' })
    })

    it('yields "" for a whitespace-only value', () => {
      expect(parseEnv('EMPTY=    ')).toEqual({ EMPTY: '' })
    })

    it('yields "" for an empty double-quoted value', () => {
      expect(parseEnv('EMPTY=""')).toEqual({ EMPTY: '' })
    })

    it("yields \"\" for an empty single-quoted value", () => {
      expect(parseEnv("EMPTY=''")).toEqual({ EMPTY: '' })
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

    it('trims whitespace outside the quotes before unquoting', () => {
      expect(parseEnv('FOO =   "bar"   ')).toEqual({ FOO: 'bar' })
    })

    it('removes only one outer pair of quotes', () => {
      expect(parseEnv('FOO=""bar""')).toEqual({ FOO: '"bar"' })
      expect(parseEnv(`FOO="'bar'"`)).toEqual({ FOO: "'bar'" })
      expect(parseEnv(`FOO='"bar"'`)).toEqual({ FOO: '"bar"' })
    })

    it('does not unquote mismatched quotes', () => {
      expect(parseEnv(`FOO="bar'`)).toEqual({ FOO: `"bar'` })
      expect(parseEnv(`FOO='bar"`)).toEqual({ FOO: `'bar"` })
    })

    it('does not unquote when only the start is quoted', () => {
      expect(parseEnv('FOO="bar')).toEqual({ FOO: '"bar' })
      expect(parseEnv("FOO='bar")).toEqual({ FOO: "'bar" })
    })

    it('does not unquote when only the end is quoted', () => {
      expect(parseEnv('FOO=bar"')).toEqual({ FOO: 'bar"' })
      expect(parseEnv("FOO=bar'")).toEqual({ FOO: "bar'" })
    })

    it('leaves a lone single-character quote untouched', () => {
      expect(parseEnv('FOO="')).toEqual({ FOO: '"' })
      expect(parseEnv("FOO='")).toEqual({ FOO: "'" })
    })

    it('keeps quotes that appear inside the value', () => {
      expect(parseEnv(`FOO=it's "fine"`)).toEqual({ FOO: `it's "fine"` })
    })

    it('keeps = inside quoted values', () => {
      expect(parseEnv('FOO="a=b=c"')).toEqual({ FOO: 'a=b=c' })
    })

    it('does not treat quotes around the key specially', () => {
      expect(parseEnv('"FOO"=bar')).toEqual({ '"FOO"': 'bar' })
    })
  })

  describe('no extra processing', () => {
    it('does not process escape sequences in double-quoted values', () => {
      expect(parseEnv('FOO="a\\nb"')).toEqual({ FOO: 'a\\nb' })
    })

    it('does not process escape sequences in unquoted values', () => {
      expect(parseEnv('FOO=a\\tb\\"c')).toEqual({ FOO: 'a\\tb\\"c' })
    })

    it('does not strip inline comments from unquoted values', () => {
      expect(parseEnv('FOO=bar # comment')).toEqual({ FOO: 'bar # comment' })
    })

    it('does not strip inline comments after quoted values', () => {
      expect(parseEnv('FOO="bar" # comment')).toEqual({ FOO: '"bar" # comment' })
    })

    it('keeps a value that starts with #', () => {
      expect(parseEnv('COLOR=#ff0000')).toEqual({ COLOR: '#ff0000' })
    })

    it('does not expand variable references', () => {
      expect(parseEnv('A=1\nB=${A}\nC=$A')).toEqual({ A: '1', B: '${A}', C: '$A' })
    })
  })

  describe('duplicate keys', () => {
    it('uses the last occurrence', () => {
      expect(parseEnv('A=1\nA=2\nA=3')).toEqual({ A: '3' })
    })

    it('uses the last occurrence even when it is empty', () => {
      expect(parseEnv('A=1\nA=')).toEqual({ A: '' })
    })

    it('treats keys that differ only by surrounding whitespace or export as the same', () => {
      expect(parseEnv('A=1\n  A  =2\nexport A=3')).toEqual({ A: '3' })
    })

    it('treats keys as case-sensitive', () => {
      expect(parseEnv('a=1\nA=2')).toEqual({ a: '1', A: '2' })
    })
  })

  it('parses a realistic .env file', () => {
    const text = [
      '# Database settings',
      'DB_HOST=localhost',
      'DB_PORT = 5432',
      '',
      'export DB_USER="admin"',
      "DB_PASS='s3cr=t'",
      '   # indented comment',
      'DB_URL=postgres://admin@localhost:5432/app?sslmode=disable',
      'EMPTY=',
      'not a valid line',
      'DB_HOST=db.internal',
    ].join('\n')

    expect(parseEnv(text)).toEqual({
      DB_HOST: 'db.internal',
      DB_PORT: '5432',
      DB_USER: 'admin',
      DB_PASS: 's3cr=t',
      DB_URL: 'postgres://admin@localhost:5432/app?sslmode=disable',
      EMPTY: '',
    })
  })
})
