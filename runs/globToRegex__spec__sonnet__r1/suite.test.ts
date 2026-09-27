import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

function matches(pattern: string, path: string): boolean {
  return globToRegex(pattern).test(path)
}

describe('globToRegex', () => {
  describe('literal characters', () => {
    it('matches an exact literal path', () => {
      expect(matches('foo/bar.txt', 'foo/bar.txt')).toBe(true)
    })

    it('does not match a different path', () => {
      expect(matches('foo/bar.txt', 'foo/baz.txt')).toBe(false)
    })

    it('is anchored at the start', () => {
      expect(matches('bar.txt', 'foo/bar.txt')).toBe(false)
    })

    it('is anchored at the end', () => {
      expect(matches('foo', 'foo/bar')).toBe(false)
    })

    it('is case-sensitive', () => {
      expect(matches('Foo.txt', 'foo.txt')).toBe(false)
    })

    it('treats regex metacharacters as literal characters', () => {
      for (const literal of ['.', '+', '(', ')', '[', ']', '{', '}', '|', '^', '$', '\\']) {
        const pattern = `a${literal}b`
        expect(matches(pattern, `a${literal}b`)).toBe(true)
      }
    })

    it('does not let a literal "." match an arbitrary character', () => {
      expect(matches('a.b', 'axb')).toBe(false)
    })

    it('does not support brace alternation', () => {
      expect(matches('{a,b}', '{a,b}')).toBe(true)
      expect(matches('{a,b}', 'a')).toBe(false)
      expect(matches('{a,b}', 'b')).toBe(false)
    })

    it('does not support character classes', () => {
      expect(matches('[ab]', '[ab]')).toBe(true)
      expect(matches('[ab]', 'a')).toBe(false)
      expect(matches('[ab]', 'b')).toBe(false)
    })

    it('does not support negation', () => {
      expect(matches('[!a]', '[!a]')).toBe(true)
      expect(matches('[!a]', 'b')).toBe(false)
    })
  })

  describe('* wildcard', () => {
    it('matches a run of characters with no slash', () => {
      expect(matches('*.txt', 'foo.txt')).toBe(true)
    })

    it('matches an empty run', () => {
      expect(matches('foo*bar', 'foobar')).toBe(true)
    })

    it('does not match across a slash', () => {
      expect(matches('*.txt', 'foo/bar.txt')).toBe(false)
    })

    it('does not match a leading slash left in the remaining path', () => {
      expect(matches('foo/*', 'foo/')).toBe(true)
      expect(matches('foo/*', 'foo/bar/baz')).toBe(false)
    })

    it('supports multiple * segments', () => {
      expect(matches('*/*.js', 'src/index.js')).toBe(true)
      expect(matches('*/*.js', 'src/lib/index.js')).toBe(false)
    })
  })

  describe('? wildcard', () => {
    it('matches exactly one non-slash character', () => {
      expect(matches('a?c', 'abc')).toBe(true)
    })

    it('does not match zero characters', () => {
      expect(matches('a?c', 'ac')).toBe(false)
    })

    it('does not match two characters', () => {
      expect(matches('a?c', 'abbc')).toBe(false)
    })

    it('does not match a slash', () => {
      expect(matches('a?c', 'a/c')).toBe(false)
    })
  })

  describe('** wildcard', () => {
    it('matches nothing', () => {
      expect(matches('**', '')).toBe(true)
    })

    it('matches a run of characters with no slash', () => {
      expect(matches('**', 'foo')).toBe(true)
    })

    it('matches a run of characters including slashes', () => {
      expect(matches('**', 'foo/bar/baz')).toBe(true)
    })

    it('consumes an immediately following slash, matching the root case', () => {
      expect(matches('**/yarn.lock', 'yarn.lock')).toBe(true)
    })

    it('consumes an immediately following slash, matching a nested case', () => {
      expect(matches('**/yarn.lock', 'a/b/yarn.lock')).toBe(true)
    })

    it('consumes an immediately following slash, matching a single-level case', () => {
      expect(matches('**/yarn.lock', 'a/yarn.lock')).toBe(true)
    })

    it('still requires a full path segment before the literal suffix', () => {
      expect(matches('**/yarn.lock', 'ayarn.lock')).toBe(false)
    })

    it('matches surrounding a middle segment with both endpoints touching', () => {
      expect(matches('a/**/b', 'a/b')).toBe(true)
    })

    it('matches surrounding a middle segment spanning multiple directories', () => {
      expect(matches('a/**/b', 'a/x/y/b')).toBe(true)
    })

    it('does not match when the tail is not a full path segment', () => {
      expect(matches('a/**/b', 'a/xb')).toBe(false)
    })

    it('does not match when the path is missing the required prefix', () => {
      expect(matches('a/**/b', 'x/b')).toBe(false)
    })
  })

  describe('combinations', () => {
    it('combines ** and * and literals', () => {
      expect(matches('src/**/*.test.ts', 'src/globToRegex.test.ts')).toBe(true)
      expect(matches('src/**/*.test.ts', 'src/nested/dir/globToRegex.test.ts')).toBe(true)
      expect(matches('src/**/*.test.ts', 'src/globToRegex.ts')).toBe(false)
    })

    it('combines * and ? in the same segment', () => {
      expect(matches('*.?s', 'index.ts')).toBe(true)
      expect(matches('*.?s', 'index.tsx')).toBe(false)
    })
  })
})
