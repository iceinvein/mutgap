import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

const matches = (pattern: string, path: string) => globToRegex(pattern).test(path)

describe('globToRegex', () => {
  describe('anchoring', () => {
    it('matches the whole path only', () => {
      expect(matches('a/b', 'a/b')).toBe(true)
      expect(matches('a/b', 'x/a/b')).toBe(false)
      expect(matches('a/b', 'a/b/c')).toBe(false)
      expect(matches('b', 'ab')).toBe(false)
    })

    it('empty pattern matches only the empty path', () => {
      expect(matches('', '')).toBe(true)
      expect(matches('', 'a')).toBe(false)
    })
  })

  describe('*', () => {
    it('matches any run of non-slash characters', () => {
      expect(matches('*.ts', 'index.ts')).toBe(true)
      expect(matches('src/*.ts', 'src/a.b.ts')).toBe(true)
    })

    it('matches an empty run', () => {
      expect(matches('*.ts', '.ts')).toBe(true)
      expect(matches('a*b', 'ab')).toBe(true)
    })

    it('does not cross /', () => {
      expect(matches('*.ts', 'src/index.ts')).toBe(false)
      expect(matches('src/*', 'src/a/b')).toBe(false)
    })
  })

  describe('?', () => {
    it('matches exactly one non-slash character', () => {
      expect(matches('a?c', 'abc')).toBe(true)
      expect(matches('a?c', 'ac')).toBe(false)
      expect(matches('a?c', 'abbc')).toBe(false)
    })

    it('does not match /', () => {
      expect(matches('a?c', 'a/c')).toBe(false)
    })
  })

  describe('**', () => {
    it('matches any run including / and nothing', () => {
      expect(matches('a/**', 'a/b/c/d')).toBe(true)
      expect(matches('a/**', 'a/')).toBe(true)
      expect(matches('**', '')).toBe(true)
      expect(matches('**', 'x/y/z')).toBe(true)
      expect(matches('a**z', 'a/b/z')).toBe(true)
    })

    it('**/ matches at the root and at any depth', () => {
      expect(matches('**/yarn.lock', 'yarn.lock')).toBe(true)
      expect(matches('**/yarn.lock', 'a/yarn.lock')).toBe(true)
      expect(matches('**/yarn.lock', 'a/b/yarn.lock')).toBe(true)
    })

    it('a/**/b matches zero or more intermediate segments', () => {
      expect(matches('a/**/b', 'a/b')).toBe(true)
      expect(matches('a/**/b', 'a/x/b')).toBe(true)
      expect(matches('a/**/b', 'a/x/y/b')).toBe(true)
      expect(matches('a/**/b', 'b')).toBe(false)
      expect(matches('a/**/b', 'a/b/c')).toBe(false)
    })
  })

  describe('literal characters', () => {
    it.each(['.', '+', '(', ')', '[', ']', '{', '}', '|', '^', '$', '\\'])(
      'treats %s literally',
      (ch) => {
        const pattern = `a${ch}b`
        expect(matches(pattern, pattern)).toBe(true)
      },
    )

    it('does not treat . as a wildcard', () => {
      expect(matches('a.b', 'axb')).toBe(false)
    })

    it('does not treat + or | as regex operators', () => {
      expect(matches('a+', 'aa')).toBe(false)
      expect(matches('a|b', 'a')).toBe(false)
    })

    it('has no brace alternation', () => {
      expect(matches('{a,b}', '{a,b}')).toBe(true)
      expect(matches('{a,b}', 'a')).toBe(false)
      expect(matches('*.{js,ts}', 'x.ts')).toBe(false)
    })

    it('has no character classes', () => {
      expect(matches('[ab]', '[ab]')).toBe(true)
      expect(matches('[ab]', 'a')).toBe(false)
    })

    it('has no negation', () => {
      expect(matches('!a', '!a')).toBe(true)
      expect(matches('!a', 'b')).toBe(false)
    })
  })

  it('is case-sensitive', () => {
    expect(matches('README.md', 'readme.md')).toBe(false)
    expect(matches('*.TS', 'a.ts')).toBe(false)
  })
})
