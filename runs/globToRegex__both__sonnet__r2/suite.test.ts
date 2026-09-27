import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

function matches(pattern: string, path: string): boolean {
  return globToRegex(pattern).test(path)
}

describe('globToRegex', () => {
  describe('literal matching', () => {
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
  })

  describe('single *', () => {
    it('matches a run of characters within a path segment', () => {
      expect(matches('a/*.js', 'a/foo.js')).toBe(true)
    })

    it('matches an empty run', () => {
      expect(matches('a/*.js', 'a/.js')).toBe(true)
    })

    it('does not match across a /', () => {
      expect(matches('a/*.js', 'a/b/foo.js')).toBe(false)
    })

    it('does not match a bare / itself', () => {
      expect(matches('a*b', 'a/b')).toBe(false)
    })
  })

  describe('?', () => {
    it('matches exactly one character', () => {
      expect(matches('a?c', 'abc')).toBe(true)
    })

    it('does not match zero characters', () => {
      expect(matches('a?c', 'ac')).toBe(false)
    })

    it('does not match two characters', () => {
      expect(matches('a?c', 'abbc')).toBe(false)
    })

    it('does not match /', () => {
      expect(matches('a?c', 'a/c')).toBe(false)
    })
  })

  describe('**', () => {
    it('matches nothing', () => {
      expect(matches('a**b', 'ab')).toBe(true)
    })

    it('matches a run of characters including /', () => {
      expect(matches('a/**/b', 'a/x/y/b')).toBe(true)
    })

    it('matches when the middle segment is absent, consuming the / after **', () => {
      expect(matches('a/**/b', 'a/b')).toBe(true)
    })

    it('matches yarn.lock at the root when pattern is **/yarn.lock', () => {
      expect(matches('**/yarn.lock', 'yarn.lock')).toBe(true)
    })

    it('matches yarn.lock nested in directories when pattern is **/yarn.lock', () => {
      expect(matches('**/yarn.lock', 'a/b/yarn.lock')).toBe(true)
    })

    it('matches across multiple / when not followed by /', () => {
      expect(matches('a/**c', 'a/b/xc')).toBe(true)
    })
  })

  describe('regex metacharacter escaping', () => {
    it.each(['.', '+', '(', ')', '[', ']', '{', '}', '|', '^', '$', '\\'])(
      'treats %s as a literal character',
      (char) => {
        const pattern = `a${char}b`
        expect(matches(pattern, `a${char}b`)).toBe(true)
      },
    )

    it('does not treat . as a wildcard', () => {
      expect(matches('a.b', 'axb')).toBe(false)
    })

    it('does not treat parentheses as a group', () => {
      expect(matches('a(b)c', 'a(b)c')).toBe(true)
      expect(matches('a(b)c', 'abc')).toBe(false)
    })
  })

  describe('brace alternation is not supported', () => {
    it('matches only the literal {a,b} text', () => {
      expect(matches('{a,b}', '{a,b}')).toBe(true)
    })

    it('does not treat {a,b} as an alternation of a and b', () => {
      expect(matches('{a,b}', 'a')).toBe(false)
      expect(matches('{a,b}', 'b')).toBe(false)
    })
  })

  describe('case sensitivity', () => {
    it('does not match differing case', () => {
      expect(matches('Foo', 'foo')).toBe(false)
    })
  })

  describe('combined patterns', () => {
    it('matches a realistic pattern with * and literal directories', () => {
      expect(matches('src/**/*.test.ts', 'src/globToRegex.test.ts')).toBe(true)
      expect(matches('src/**/*.test.ts', 'src/a/b/globToRegex.test.ts')).toBe(true)
      expect(matches('src/**/*.test.ts', 'src/globToRegex.ts')).toBe(false)
    })
  })
})
