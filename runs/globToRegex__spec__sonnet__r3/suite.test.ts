import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

function matches(pattern: string, path: string): boolean {
  return globToRegex(pattern).test(path)
}

describe('globToRegex', () => {
  it('matches a literal pattern exactly', () => {
    expect(matches('foo/bar.txt', 'foo/bar.txt')).toBe(true)
  })

  it('is anchored at the start', () => {
    expect(matches('bar.txt', 'foo/bar.txt')).toBe(false)
  })

  it('is anchored at the end', () => {
    expect(matches('foo', 'foo/bar.txt')).toBe(false)
  })

  it('does not match a completely different literal', () => {
    expect(matches('foo/bar.txt', 'foo/baz.txt')).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(matches('Foo.txt', 'foo.txt')).toBe(false)
  })

  describe('*', () => {
    it('matches a run of characters within a segment', () => {
      expect(matches('*.txt', 'bar.txt')).toBe(true)
    })

    it('matches an empty run', () => {
      expect(matches('foo*.txt', 'foo.txt')).toBe(true)
    })

    it('does not match across a slash', () => {
      expect(matches('*.txt', 'foo/bar.txt')).toBe(false)
    })

    it('matches within a single segment in the middle of a path', () => {
      expect(matches('foo/*.txt', 'foo/bar.txt')).toBe(true)
    })

    it('does not let a single * expand into multiple segments', () => {
      expect(matches('foo/*.txt', 'foo/bar/baz.txt')).toBe(false)
    })

    it('supports multiple * in one pattern', () => {
      expect(matches('*-*.txt', 'foo-bar.txt')).toBe(true)
    })
  })

  describe('?', () => {
    it('matches exactly one non-slash character', () => {
      expect(matches('foo.?xt', 'foo.txt')).toBe(true)
    })

    it('does not match zero characters', () => {
      expect(matches('foo.?xt', 'foo.xt')).toBe(false)
    })

    it('does not match two characters', () => {
      expect(matches('fo?.txt', 'foobar.txt')).toBe(false)
    })

    it('does not match a slash', () => {
      expect(matches('foo?bar', 'foo/bar')).toBe(false)
    })
  })

  describe('**', () => {
    it('matches nothing', () => {
      expect(matches('a/**/b', 'a/b')).toBe(true)
    })

    it('matches a single intermediate segment', () => {
      expect(matches('a/**/b', 'a/x/b')).toBe(true)
    })

    it('matches multiple intermediate segments', () => {
      expect(matches('a/**/b', 'a/x/y/b')).toBe(true)
    })

    it('matches at the root when followed by a slash', () => {
      expect(matches('**/yarn.lock', 'yarn.lock')).toBe(true)
    })

    it('matches nested paths when followed by a slash', () => {
      expect(matches('**/yarn.lock', 'a/b/yarn.lock')).toBe(true)
    })

    it('matches a run including slashes when standalone', () => {
      expect(matches('**', 'a/b/c')).toBe(true)
    })

    it('matches an empty string when standalone', () => {
      expect(matches('**', '')).toBe(true)
    })

    it('can match zero characters and consume the following slash', () => {
      // a/**/b with ** matching "" still requires the single slash between a and b
      expect(matches('a/**/b', 'a//b')).toBe(true)
    })
  })

  describe('literal regex metacharacters', () => {
    it.each(['.', '+', '(', ')', '[', ']', '{', '}', '|', '^', '$', '\\'])(
      'treats %s as a literal character',
      (char) => {
        const pattern = `foo${char}bar`
        expect(matches(pattern, `foo${char}bar`)).toBe(true)
        expect(matches(pattern, 'foo_bar')).toBe(false)
      },
    )

    it('does not treat {a,b} as brace alternation', () => {
      expect(matches('{a,b}', '{a,b}')).toBe(true)
      expect(matches('{a,b}', 'a')).toBe(false)
      expect(matches('{a,b}', 'b')).toBe(false)
    })

    it('does not treat [ab] as a character class', () => {
      expect(matches('[ab]', '[ab]')).toBe(true)
      expect(matches('[ab]', 'a')).toBe(false)
    })

    it('does not treat a leading ! as negation', () => {
      expect(matches('!foo', '!foo')).toBe(true)
      expect(matches('!foo', 'foo')).toBe(false)
    })
  })
})
