import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

function matches(pattern: string, path: string): boolean {
  return globToRegex(pattern).test(path)
}

describe('globToRegex', () => {
  it('returns a RegExp', () => {
    expect(globToRegex('foo')).toBeInstanceOf(RegExp)
  })

  describe('literal characters', () => {
    it('matches an exact literal path', () => {
      expect(matches('foo/bar.txt', 'foo/bar.txt')).toBe(true)
    })

    it('does not match a different literal path', () => {
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

    it('matches regex metacharacters literally: dot', () => {
      expect(matches('foo.txt', 'fooXtxt')).toBe(false)
      expect(matches('foo.txt', 'foo.txt')).toBe(true)
    })

    it('matches regex metacharacters literally: plus', () => {
      expect(matches('a+b', 'a+b')).toBe(true)
      expect(matches('a+b', 'aab')).toBe(false)
    })

    it('matches regex metacharacters literally: parens', () => {
      expect(matches('(foo)', '(foo)')).toBe(true)
    })

    it('matches regex metacharacters literally: square brackets', () => {
      expect(matches('[abc]', '[abc]')).toBe(true)
      expect(matches('[abc]', 'a')).toBe(false)
    })

    it('matches regex metacharacters literally: braces (no alternation support)', () => {
      expect(matches('{a,b}', '{a,b}')).toBe(true)
      expect(matches('{a,b}', 'a')).toBe(false)
      expect(matches('{a,b}', 'b')).toBe(false)
    })

    it('matches regex metacharacters literally: pipe', () => {
      expect(matches('a|b', 'a|b')).toBe(true)
      expect(matches('a|b', 'a')).toBe(false)
    })

    it('matches regex metacharacters literally: caret and dollar', () => {
      expect(matches('^a$', '^a$')).toBe(true)
    })

    it('matches a literal backslash', () => {
      expect(matches('a\\b', 'a\\b')).toBe(true)
    })
  })

  describe('single *', () => {
    it('matches a run of characters within a path segment', () => {
      expect(matches('*.txt', 'foo.txt')).toBe(true)
    })

    it('matches an empty run', () => {
      expect(matches('foo*.txt', 'foo.txt')).toBe(true)
    })

    it('does not match across a slash', () => {
      expect(matches('*.txt', 'foo/bar.txt')).toBe(false)
    })

    it('matches multiple characters in the middle of a segment', () => {
      expect(matches('a*z', 'abcxyz')).toBe(true)
    })

    it('works combined with directories', () => {
      expect(matches('src/*.ts', 'src/index.ts')).toBe(true)
      expect(matches('src/*.ts', 'src/nested/index.ts')).toBe(false)
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

    it('matches a run of characters including slashes', () => {
      expect(matches('a**b', 'a/x/y/b')).toBe(true)
    })

    it('matches a single path segment', () => {
      expect(matches('a**b', 'axb')).toBe(true)
    })

    it('as a full segment matches zero directories', () => {
      expect(matches('**/yarn.lock', 'yarn.lock')).toBe(true)
    })

    it('as a full segment matches one directory, consuming the trailing slash', () => {
      expect(matches('**/yarn.lock', 'a/yarn.lock')).toBe(true)
    })

    it('as a full segment matches multiple nested directories', () => {
      expect(matches('**/yarn.lock', 'a/b/yarn.lock')).toBe(true)
    })

    it('matches surrounded by literal path segments, zero dirs in between', () => {
      expect(matches('a/**/b', 'a/b')).toBe(true)
    })

    it('matches surrounded by literal path segments, one dir in between', () => {
      expect(matches('a/**/b', 'a/x/b')).toBe(true)
    })

    it('matches surrounded by literal path segments, multiple dirs in between', () => {
      expect(matches('a/**/b', 'a/x/y/b')).toBe(true)
    })

    it('still requires the literal suffix to match', () => {
      expect(matches('a/**/b', 'a/x/y/c')).toBe(false)
    })
  })

  describe('combinations', () => {
    it('combines * and ** and literals', () => {
      expect(matches('src/**/*.test.ts', 'src/globToRegex.test.ts')).toBe(true)
      expect(matches('src/**/*.test.ts', 'src/nested/dir/globToRegex.test.ts')).toBe(true)
      expect(matches('src/**/*.test.ts', 'src/globToRegex.ts')).toBe(false)
    })

    it('combines ? and * within a segment', () => {
      expect(matches('a?*.txt', 'abc.txt')).toBe(true)
      expect(matches('a?*.txt', 'a.txt')).toBe(false)
    })
  })
})
