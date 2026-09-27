import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

const matches = (pattern: string, path: string) => globToRegex(pattern).test(path)

describe('globToRegex', () => {
  describe('anchoring', () => {
    it('matches the whole path only', () => {
      expect(matches('a/b', 'a/b')).toBe(true)
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
      expect(matches('src/*.ts', 'src/index.ts')).toBe(true)
      expect(matches('a*c', 'abbbc')).toBe(true)
    })

    it('matches an empty run', () => {
      expect(matches('*.ts', '.ts')).toBe(true)
      expect(matches('a*c', 'ac')).toBe(true)
      expect(matches('a/*', 'a/')).toBe(true)
    })

    it('does not cross a slash', () => {
      expect(matches('*.ts', 'src/index.ts')).toBe(false)
      expect(matches('a*c', 'a/c')).toBe(false)
      expect(matches('a/*', 'a/b/c')).toBe(false)
    })
  })

  describe('?', () => {
    it('matches exactly one non-slash character', () => {
      expect(matches('a?c', 'abc')).toBe(true)
      expect(matches('a?c', 'ac')).toBe(false)
      expect(matches('a?c', 'abbc')).toBe(false)
      expect(matches('a?c', 'a/c')).toBe(false)
    })

    it('can be repeated', () => {
      expect(matches('??', 'ab')).toBe(true)
      expect(matches('??', 'a')).toBe(false)
    })
  })

  describe('**', () => {
    it('matches any run of characters including slashes', () => {
      expect(matches('a/**', 'a/b')).toBe(true)
      expect(matches('a/**', 'a/b/c/d')).toBe(true)
      expect(matches('**', 'x/y/z')).toBe(true)
      expect(matches('a**z', 'a/b/z')).toBe(true)
    })

    it('matches nothing', () => {
      expect(matches('a/**', 'a/')).toBe(true)
      expect(matches('**', '')).toBe(true)
      expect(matches('a**z', 'az')).toBe(true)
    })

    it('**/ matches at the root and at any depth', () => {
      expect(matches('**/yarn.lock', 'yarn.lock')).toBe(true)
      expect(matches('**/yarn.lock', 'a/yarn.lock')).toBe(true)
      expect(matches('**/yarn.lock', 'a/b/yarn.lock')).toBe(true)
      expect(matches('**/yarn.lock', 'a/b/xyarn.lock')).toBe(false)
    })

    it('a/**/b matches zero or more intermediate segments', () => {
      expect(matches('a/**/b', 'a/b')).toBe(true)
      expect(matches('a/**/b', 'a/x/b')).toBe(true)
      expect(matches('a/**/b', 'a/x/y/b')).toBe(true)
      expect(matches('a/**/b', 'ab')).toBe(false)
      expect(matches('a/**/b', 'b')).toBe(false)
    })

    it('combines with *', () => {
      expect(matches('src/**/*.ts', 'src/index.ts')).toBe(true)
      expect(matches('src/**/*.ts', 'src/a/b/index.ts')).toBe(true)
      expect(matches('src/**/*.ts', 'src/a/index.js')).toBe(false)
    })
  })

  describe('literal characters', () => {
    it.each(['.', '+', '(', ')', '[', ']', '{', '}', '|', '^', '$', '\\'])(
      'treats %s literally',
      (ch) => {
        expect(matches(`a${ch}b`, `a${ch}b`)).toBe(true)
        expect(matches(`a${ch}b`, 'axb')).toBe(false)
        expect(matches(`a${ch}b`, 'ab')).toBe(false)
      },
    )

    it('. does not act as a wildcard', () => {
      expect(matches('file.ts', 'file.ts')).toBe(true)
      expect(matches('file.ts', 'filexts')).toBe(false)
    })

    it('does not support brace alternation', () => {
      expect(matches('{a,b}', '{a,b}')).toBe(true)
      expect(matches('{a,b}', 'a')).toBe(false)
      expect(matches('{a,b}', 'b')).toBe(false)
    })

    it('does not support character classes', () => {
      expect(matches('[ab]', '[ab]')).toBe(true)
      expect(matches('[ab]', 'a')).toBe(false)
    })

    it('does not support negation', () => {
      expect(matches('!a', '!a')).toBe(true)
      expect(matches('!a', 'b')).toBe(false)
      expect(matches('[!a]', '[!a]')).toBe(true)
      expect(matches('[!a]', 'b')).toBe(false)
    })

    it('treats alternation and quantifier metacharacters literally', () => {
      expect(matches('a|b', 'a')).toBe(false)
      expect(matches('a+', 'aa')).toBe(false)
      expect(matches('(a)', 'a')).toBe(false)
    })
  })

  it('is case-sensitive', () => {
    expect(matches('README.md', 'README.md')).toBe(true)
    expect(matches('README.md', 'readme.md')).toBe(false)
    expect(matches('*.TS', 'index.ts')).toBe(false)
  })
})
