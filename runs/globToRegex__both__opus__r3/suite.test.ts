import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

const matches = (pattern: string, path: string) => globToRegex(pattern).test(path)

describe('globToRegex', () => {
  describe('anchoring', () => {
    it('matches the whole path exactly', () => {
      expect(matches('a/b', 'a/b')).toBe(true)
    })

    it('does not match a prefix or suffix', () => {
      expect(matches('a/b', 'x/a/b')).toBe(false)
      expect(matches('a/b', 'a/b/c')).toBe(false)
      expect(matches('b', 'abc')).toBe(false)
    })

    it('empty pattern matches only the empty path', () => {
      expect(matches('', '')).toBe(true)
      expect(matches('', 'a')).toBe(false)
    })
  })

  describe('*', () => {
    it('matches any run of non-slash characters', () => {
      expect(matches('*.ts', 'index.ts')).toBe(true)
      expect(matches('src/*.ts', 'src/foo.bar.ts')).toBe(true)
    })

    it('matches an empty run', () => {
      expect(matches('*.ts', '.ts')).toBe(true)
      expect(matches('a*b', 'ab')).toBe(true)
    })

    it('does not cross a /', () => {
      expect(matches('*.ts', 'src/index.ts')).toBe(false)
      expect(matches('a*b', 'a/b')).toBe(false)
    })

    it('can appear multiple times', () => {
      expect(matches('*/*', 'a/b')).toBe(true)
      expect(matches('*/*', 'a/b/c')).toBe(false)
    })
  })

  describe('?', () => {
    it('matches exactly one non-slash character', () => {
      expect(matches('a?c', 'abc')).toBe(true)
      expect(matches('???', 'xyz')).toBe(true)
    })

    it('does not match zero or two characters', () => {
      expect(matches('a?c', 'ac')).toBe(false)
      expect(matches('a?c', 'abbc')).toBe(false)
    })

    it('does not match /', () => {
      expect(matches('a?c', 'a/c')).toBe(false)
    })
  })

  describe('**', () => {
    it('matches any run including / and nothing', () => {
      expect(matches('a**', 'a')).toBe(true)
      expect(matches('a**', 'a/b/c')).toBe(true)
      expect(matches('**', '')).toBe(true)
      expect(matches('**', 'x/y/z')).toBe(true)
      expect(matches('src/**', 'src/a/b.ts')).toBe(true)
    })

    it('**/ at the start matches at the root and at any depth', () => {
      expect(matches('**/yarn.lock', 'yarn.lock')).toBe(true)
      expect(matches('**/yarn.lock', 'a/yarn.lock')).toBe(true)
      expect(matches('**/yarn.lock', 'a/b/yarn.lock')).toBe(true)
    })

    it('**/ still requires the rest of the pattern', () => {
      expect(matches('**/yarn.lock', 'yarn.lockx')).toBe(false)
      expect(matches('**/yarn.lock', 'a/b/package.json')).toBe(false)
    })

    it('/**/ in the middle matches zero or more directories', () => {
      expect(matches('a/**/b', 'a/b')).toBe(true)
      expect(matches('a/**/b', 'a/x/b')).toBe(true)
      expect(matches('a/**/b', 'a/x/y/b')).toBe(true)
    })

    it('/**/ still requires the surrounding literals', () => {
      expect(matches('a/**/b', 'b')).toBe(false)
      expect(matches('a/**/b', 'a/x/y/c')).toBe(false)
    })
  })

  describe('literal characters', () => {
    it.each([
      ['.', 'a.b', 'axb'],
      ['+', 'a+b', 'aab'],
      ['(', 'a(b', 'ab'],
      [')', 'a)b', 'ab'],
      ['[', 'a[b', 'ab'],
      [']', 'a]b', 'ab'],
      ['{', 'a{b', 'ab'],
      ['}', 'a}b', 'ab'],
      ['|', 'a|b', 'a'],
      ['^', 'a^b', 'ab'],
      ['$', 'a$b', 'ab'],
      ['\\', 'a\\b', 'ab'],
    ])('%s matches itself literally', (_ch, pattern, nonMatch) => {
      expect(matches(pattern, pattern)).toBe(true)
      expect(matches(pattern, nonMatch)).toBe(false)
    })

    it('does not treat | as alternation', () => {
      expect(matches('a|b', 'b')).toBe(false)
    })

    it('does not support brace alternation', () => {
      expect(matches('{a,b}', '{a,b}')).toBe(true)
      expect(matches('{a,b}', 'a')).toBe(false)
      expect(matches('*.{js,ts}', 'x.ts')).toBe(false)
    })

    it('does not support character classes', () => {
      expect(matches('[abc]', '[abc]')).toBe(true)
      expect(matches('[abc]', 'a')).toBe(false)
    })

    it('does not support negation', () => {
      expect(matches('!a', '!a')).toBe(true)
      expect(matches('!a', 'b')).toBe(false)
      expect(matches('[!a]', 'b')).toBe(false)
    })
  })

  it('is case-sensitive', () => {
    expect(matches('README.md', 'README.md')).toBe(true)
    expect(matches('README.md', 'readme.md')).toBe(false)
    expect(matches('*.TS', 'a.ts')).toBe(false)
  })
})
