import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

describe('globToRegex', () => {
  it('matches a literal pattern exactly', () => {
    const re = globToRegex('foo.txt')
    expect(re.test('foo.txt')).toBe(true)
    expect(re.test('fooxtxt')).toBe(false)
    expect(re.test('foo.txtx')).toBe(false)
    expect(re.test('xfoo.txt')).toBe(false)
  })

  it('matches an empty pattern only against an empty string', () => {
    const re = globToRegex('')
    expect(re.test('')).toBe(true)
    expect(re.test('a')).toBe(false)
  })

  it('anchors the pattern to the full string', () => {
    const re = globToRegex('abc')
    expect(re.source).toBe('^abc$')
  })

  describe('* wildcard', () => {
    it('matches zero or more non-slash characters', () => {
      const re = globToRegex('*.js')
      expect(re.test('index.js')).toBe(true)
      expect(re.test('.js')).toBe(true)
      expect(re.test('a.b.js')).toBe(true)
    })

    it('does not match a slash', () => {
      const re = globToRegex('*.js')
      expect(re.test('src/index.js')).toBe(false)
    })

    it('supports multiple single-star segments', () => {
      const re = globToRegex('src/*.js')
      expect(re.test('src/index.js')).toBe(true)
      expect(re.test('src/sub/index.js')).toBe(false)
    })
  })

  describe('** wildcard', () => {
    it('matches across slashes', () => {
      const re = globToRegex('src/**/index.js')
      expect(re.test('src//index.js')).toBe(true)
      expect(re.test('src/a/index.js')).toBe(true)
      expect(re.test('src/a/b/index.js')).toBe(true)
      expect(re.test('src/index.js')).toBe(false)
    })

    it('matches an empty string when the whole pattern is **', () => {
      const re = globToRegex('**')
      expect(re.test('')).toBe(true)
      expect(re.test('anything/at/all')).toBe(true)
    })
  })

  describe('? wildcard', () => {
    it('matches exactly one non-slash character', () => {
      const re = globToRegex('a?c')
      expect(re.test('abc')).toBe(true)
      expect(re.test('axc')).toBe(true)
      expect(re.test('ac')).toBe(false)
      expect(re.test('abbc')).toBe(false)
    })

    it('does not match a slash', () => {
      const re = globToRegex('a?c')
      expect(re.test('a/c')).toBe(false)
    })
  })

  describe('regex special characters', () => {
    it('escapes characters that are meaningful in regex', () => {
      const re = globToRegex('a.b+c^d$e(f)g|h[i]j{k}l\\m')
      expect(re.test('a.b+c^d$e(f)g|h[i]j{k}l\\m')).toBe(true)
    })

    it('treats a literal dot as a literal dot, not "any character"', () => {
      const re = globToRegex('a.b')
      expect(re.test('a.b')).toBe(true)
      expect(re.test('axb')).toBe(false)
    })

    it('treats parentheses and pipes as literals rather than grouping/alternation', () => {
      const re = globToRegex('(a|b)')
      expect(re.test('(a|b)')).toBe(true)
      expect(re.test('a')).toBe(false)
      expect(re.test('b')).toBe(false)
    })
  })

  describe('combined patterns', () => {
    it('handles a mix of wildcards and literals', () => {
      const re = globToRegex('**/*.test.?s')
      expect(re.test('src/globToRegex.test.ts')).toBe(true)
      expect(re.test('src/deep/nested/foo.test.js')).toBe(true)
      expect(re.test('src/foo.test.tsx')).toBe(false)
    })
  })
})
