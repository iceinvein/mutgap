import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

describe('globToRegex', () => {
  it('matches an exact literal string', () => {
    const re = globToRegex('foo')
    expect(re.test('foo')).toBe(true)
    expect(re.test('foobar')).toBe(false)
    expect(re.test('barfoo')).toBe(false)
  })

  it('anchors the pattern to the full string', () => {
    const re = globToRegex('foo.txt')
    expect(re.source.startsWith('^')).toBe(true)
    expect(re.source.endsWith('$')).toBe(true)
  })

  describe('* wildcard', () => {
    it('matches any sequence of characters excluding /', () => {
      const re = globToRegex('*.js')
      expect(re.test('index.js')).toBe(true)
      expect(re.test('a.b.js')).toBe(true)
      expect(re.test('.js')).toBe(true)
    })

    it('does not match across path separators', () => {
      const re = globToRegex('*.js')
      expect(re.test('src/index.js')).toBe(false)
    })

    it('supports multiple single-star segments', () => {
      const re = globToRegex('*-*.js')
      expect(re.test('foo-bar.js')).toBe(true)
      expect(re.test('foo.js')).toBe(false)
    })
  })

  describe('** wildcard', () => {
    it('matches across path separators', () => {
      const re = globToRegex('src/**/index.js')
      expect(re.test('src/a/index.js')).toBe(true)
      expect(re.test('src/a/b/index.js')).toBe(true)
      expect(re.test('other/a/index.js')).toBe(false)
    })

    it('still requires the literal slashes surrounding it', () => {
      const re = globToRegex('src/**/index.js')
      expect(re.test('src/index.js')).toBe(false)
    })

    it('matches an entire path when used alone', () => {
      const re = globToRegex('**')
      expect(re.test('')).toBe(true)
      expect(re.test('a/b/c')).toBe(true)
    })
  })

  describe('? wildcard', () => {
    it('matches exactly one character excluding /', () => {
      const re = globToRegex('a?c')
      expect(re.test('abc')).toBe(true)
      expect(re.test('ac')).toBe(false)
      expect(re.test('abbc')).toBe(false)
    })

    it('does not match a path separator', () => {
      const re = globToRegex('a?c')
      expect(re.test('a/c')).toBe(false)
    })
  })

  describe('special regex characters', () => {
    it('escapes characters that are meaningful in regex', () => {
      const re = globToRegex('a.b+c^d$e(f)g|h[i]j{k}l\\m')
      expect(re.test('a.b+c^d$e(f)g|h[i]j{k}l\\m')).toBe(true)
    })

    it('treats a literal dot as a literal, not "any character"', () => {
      const re = globToRegex('a.js')
      expect(re.test('ajs')).toBe(false)
      expect(re.test('a.js')).toBe(true)
    })

    it('treats parentheses and pipes as literals, not regex alternation', () => {
      const re = globToRegex('(a|b)')
      expect(re.test('(a|b)')).toBe(true)
      expect(re.test('a')).toBe(false)
      expect(re.test('b')).toBe(false)
    })

    it('treats brackets as literals, not a character class', () => {
      const re = globToRegex('[abc]')
      expect(re.test('[abc]')).toBe(true)
      expect(re.test('a')).toBe(false)
    })
  })

  describe('empty pattern', () => {
    it('matches only the empty string', () => {
      const re = globToRegex('')
      expect(re.test('')).toBe(true)
      expect(re.test('a')).toBe(false)
    })
  })

  describe('combined patterns', () => {
    it('handles mixed wildcards and literals', () => {
      const re = globToRegex('src/**/*.test.?s')
      expect(re.test('src/a/b/foo.test.ts')).toBe(true)
      expect(re.test('src/a/foo.test.js')).toBe(true)
      expect(re.test('src/a/foo.test.tsx')).toBe(false)
      expect(re.test('other/a/foo.test.ts')).toBe(false)
    })
  })
})
