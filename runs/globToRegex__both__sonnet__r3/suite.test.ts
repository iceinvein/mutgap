import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

function matches(pattern: string, path: string): boolean {
  return globToRegex(pattern).test(path)
}

describe('globToRegex', () => {
  it('matches a literal pattern exactly', () => {
    expect(matches('foo/bar.txt', 'foo/bar.txt')).toBe(true)
  })

  it('anchors at both ends', () => {
    expect(matches('foo', 'xfoo')).toBe(false)
    expect(matches('foo', 'foox')).toBe(false)
    expect(matches('foo', 'foo')).toBe(true)
  })

  describe('*', () => {
    it('matches a run of non-slash characters', () => {
      expect(matches('*.txt', 'file.txt')).toBe(true)
      expect(matches('*.txt', 'a.b.txt')).toBe(true)
    })

    it('matches an empty run', () => {
      expect(matches('*.txt', '.txt')).toBe(true)
    })

    it('does not match across a slash', () => {
      expect(matches('*.txt', 'dir/file.txt')).toBe(false)
    })

    it('works in the middle of a path segment', () => {
      expect(matches('a*b', 'ab')).toBe(true)
      expect(matches('a*b', 'axxxb')).toBe(true)
      expect(matches('a*b', 'axx/b')).toBe(false)
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
      expect(matches('a/**/b', 'a/b')).toBe(true)
    })

    it('matches a single path segment', () => {
      expect(matches('a/**/b', 'a/x/b')).toBe(true)
    })

    it('matches multiple path segments including slashes', () => {
      expect(matches('a/**/b', 'a/x/y/b')).toBe(true)
    })

    it('consumes a following slash so **/yarn.lock matches at the root', () => {
      expect(matches('**/yarn.lock', 'yarn.lock')).toBe(true)
    })

    it('consumes a following slash so **/yarn.lock matches nested paths', () => {
      expect(matches('**/yarn.lock', 'a/b/yarn.lock')).toBe(true)
    })

    it('matches any characters including slashes when not anchored to segments', () => {
      expect(matches('**', 'anything/at/all')).toBe(true)
      expect(matches('**', '')).toBe(true)
    })
  })

  describe('literal regex metacharacters', () => {
    it.each(['.', '+', '(', ')', '[', ']', '{', '}', '|', '^', '$', '\\'])(
      'treats %s as a literal character',
      (char) => {
        const pattern = `a${char}b`
        const literalPath = `a${char}b`
        expect(matches(pattern, literalPath)).toBe(true)
      },
    )

    it('does not treat . as a wildcard for any character', () => {
      expect(matches('a.b', 'axb')).toBe(false)
    })

    it('does not treat parens as a capture group', () => {
      expect(matches('a(b)c', 'a(b)c')).toBe(true)
      expect(matches('a(b)c', 'abc')).toBe(false)
    })
  })

  describe('brace alternation is not supported', () => {
    it('matches only the literal braces text', () => {
      expect(matches('{a,b}', '{a,b}')).toBe(true)
      expect(matches('{a,b}', 'a')).toBe(false)
      expect(matches('{a,b}', 'b')).toBe(false)
    })
  })

  describe('case sensitivity', () => {
    it('does not match differing case', () => {
      expect(matches('Foo', 'foo')).toBe(false)
    })
  })
})
