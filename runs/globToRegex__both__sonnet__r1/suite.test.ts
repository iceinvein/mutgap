import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

function matches(pattern: string, path: string): boolean {
  return globToRegex(pattern).test(path)
}

describe('globToRegex', () => {
  describe('literal characters', () => {
    it('matches an identical literal path', () => {
      expect(matches('a/b/c', 'a/b/c')).toBe(true)
    })

    it('does not match a different literal path', () => {
      expect(matches('a/b/c', 'a/b/d')).toBe(false)
    })

    it('anchors at the start', () => {
      expect(matches('b/c', 'a/b/c')).toBe(false)
    })

    it('anchors at the end', () => {
      expect(matches('a/b', 'a/b/c')).toBe(false)
    })

    it('escapes regex metacharacters so they match literally', () => {
      const metaPattern = 'a.+^$()|[]{}\\b'
      expect(matches(metaPattern, metaPattern)).toBe(true)
    })

    it('does not treat "." as a wildcard', () => {
      expect(matches('a.txt', 'aXtxt')).toBe(false)
    })

    it('does not support brace alternation', () => {
      expect(matches('{a,b}', '{a,b}')).toBe(true)
      expect(matches('{a,b}', 'a')).toBe(false)
      expect(matches('{a,b}', 'b')).toBe(false)
    })
  })

  describe('single *', () => {
    it('matches an empty run', () => {
      expect(matches('a*b', 'ab')).toBe(true)
    })

    it('matches a run of non-slash characters', () => {
      expect(matches('a*b', 'axyzb')).toBe(true)
    })

    it('does not match across a slash', () => {
      expect(matches('a*b', 'a/b')).toBe(false)
    })

    it('matches a whole path segment', () => {
      expect(matches('*.js', 'index.js')).toBe(true)
      expect(matches('*.js', 'dir/index.js')).toBe(false)
    })
  })

  describe('?', () => {
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

  describe('**', () => {
    it('matches nothing', () => {
      expect(matches('a**b', 'ab')).toBe(true)
    })

    it('matches a run containing slashes', () => {
      expect(matches('a**b', 'a/x/y/b')).toBe(true)
    })

    it('matches a run without slashes', () => {
      expect(matches('a**b', 'axyzb')).toBe(true)
    })

    it('consumes a following slash: matches at the root', () => {
      expect(matches('**/yarn.lock', 'yarn.lock')).toBe(true)
    })

    it('consumes a following slash: matches nested paths', () => {
      expect(matches('**/yarn.lock', 'a/b/yarn.lock')).toBe(true)
    })

    it('a/**/b matches a/b (the surrounding slashes collapse to one)', () => {
      expect(matches('a/**/b', 'a/b')).toBe(true)
    })

    it('a/**/b matches deeply nested paths', () => {
      expect(matches('a/**/b', 'a/x/y/b')).toBe(true)
    })

    it('still anchors the rest of the pattern', () => {
      expect(matches('**/yarn.lock', 'a/b/yarn.lock.bak')).toBe(false)
      expect(matches('**/yarn.lock', 'a/yarn.lock/b')).toBe(false)
    })
  })

  describe('combinations', () => {
    it('handles multiple wildcards together', () => {
      expect(matches('src/**/*.test.ts', 'src/globToRegex.test.ts')).toBe(true)
      expect(matches('src/**/*.test.ts', 'src/a/b/globToRegex.test.ts')).toBe(true)
      expect(matches('src/**/*.test.ts', 'src/globToRegex.ts')).toBe(false)
    })
  })
})
