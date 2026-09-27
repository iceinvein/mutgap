import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

const matches = (pattern: string, input: string) => globToRegex(pattern).test(input)

describe('globToRegex', () => {
  describe('literals', () => {
    it('matches an exact string', () => {
      expect(matches('foo.txt', 'foo.txt')).toBe(true)
      expect(matches('foo.txt', 'foo.txtx')).toBe(false)
      expect(matches('foo.txt', 'xfoo.txt')).toBe(false)
    })

    it('anchors the whole input', () => {
      expect(globToRegex('abc').source).toBe('^abc$')
    })

    it('matches only the empty string for an empty pattern', () => {
      expect(matches('', '')).toBe(true)
      expect(matches('', 'a')).toBe(false)
    })

    it('is case sensitive', () => {
      expect(matches('Foo', 'foo')).toBe(false)
    })
  })

  describe('regex special characters', () => {
    it.each(['.', '+', '^', '$', '(', ')', '|', '[', ']', '\\', '{', '}'])(
      'treats %s literally',
      (ch) => {
        const pattern = `a${ch}b`
        expect(matches(pattern, pattern)).toBe(true)
      },
    )

    it('does not treat . as a wildcard', () => {
      expect(matches('a.b', 'axb')).toBe(false)
    })

    it('does not treat + as a quantifier', () => {
      expect(matches('a+', 'aa')).toBe(false)
    })

    it('does not treat braces as alternation or quantifiers', () => {
      expect(matches('{a,b}', 'a')).toBe(false)
      expect(matches('{a,b}', '{a,b}')).toBe(true)
      expect(matches('a{2}', 'aa')).toBe(false)
    })

    it('does not treat brackets as a character class', () => {
      expect(matches('[ab]', 'a')).toBe(false)
      expect(matches('[ab]', '[ab]')).toBe(true)
    })

    it('does not treat | as alternation', () => {
      expect(matches('a|b', 'a')).toBe(false)
    })
  })

  describe('? wildcard', () => {
    it('matches exactly one character', () => {
      expect(matches('a?c', 'abc')).toBe(true)
      expect(matches('a?c', 'ac')).toBe(false)
      expect(matches('a?c', 'abbc')).toBe(false)
    })

    it('does not match a slash', () => {
      expect(matches('a?c', 'a/c')).toBe(false)
    })
  })

  describe('* wildcard', () => {
    it('matches any run of non-slash characters, including none', () => {
      expect(matches('*.ts', 'index.ts')).toBe(true)
      expect(matches('*.ts', '.ts')).toBe(true)
      expect(matches('*.ts', 'index.js')).toBe(false)
    })

    it('does not cross directory separators', () => {
      expect(matches('*.ts', 'src/index.ts')).toBe(false)
      expect(matches('src/*.ts', 'src/index.ts')).toBe(true)
      expect(matches('src/*.ts', 'src/lib/index.ts')).toBe(false)
    })

    it('supports multiple single stars', () => {
      expect(matches('*/*', 'a/b')).toBe(true)
      expect(matches('*/*', 'a/b/c')).toBe(false)
    })
  })

  describe('** wildcard', () => {
    it('matches across directory separators', () => {
      expect(matches('**', 'a/b/c')).toBe(true)
      expect(matches('**', '')).toBe(true)
      expect(matches('src/**', 'src/a/b.ts')).toBe(true)
      expect(matches('**.ts', 'src/lib/index.ts')).toBe(true)
    })

    it('requires the surrounding slashes in a/**/b', () => {
      expect(matches('a/**/b', 'a/x/y/b')).toBe(true)
      expect(matches('a/**/b', 'a/x/b')).toBe(true)
      // Current behaviour: ** does not collapse the adjacent slashes.
      expect(matches('a/**/b', 'a/b')).toBe(false)
    })

    it('compiles ** to .* and a trailing third star to [^/]*', () => {
      expect(globToRegex('**').source).toBe('^.*$')
      expect(globToRegex('***').source).toBe('^.*[^/]*$')
    })
  })

  it('combines wildcards and literals', () => {
    const re = globToRegex('src/**/test-?.spec.ts')
    expect(re.test('src/a/b/test-1.spec.ts')).toBe(true)
    expect(re.test('src/a/test-12.spec.ts')).toBe(false)
    expect(re.test('src/a/test-1xspec.ts')).toBe(false)
  })
})
