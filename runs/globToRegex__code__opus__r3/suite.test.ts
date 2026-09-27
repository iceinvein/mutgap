import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

describe('globToRegex', () => {
  it('returns a RegExp anchored at both ends', () => {
    const re = globToRegex('abc')
    expect(re).toBeInstanceOf(RegExp)
    expect(re.source).toBe('^abc$')
    expect(re.test('abc')).toBe(true)
    expect(re.test('xabc')).toBe(false)
    expect(re.test('abcx')).toBe(false)
  })

  it('matches only the empty string for an empty pattern', () => {
    const re = globToRegex('')
    expect(re.test('')).toBe(true)
    expect(re.test('a')).toBe(false)
  })

  describe('*', () => {
    it('matches any run of non-slash characters, including none', () => {
      const re = globToRegex('*.ts')
      expect(re.test('index.ts')).toBe(true)
      expect(re.test('.ts')).toBe(true)
      expect(re.test('src/index.ts')).toBe(false)
      expect(re.test('index.tsx')).toBe(false)
    })

    it('matches within a single path segment', () => {
      const re = globToRegex('src/*/index.ts')
      expect(re.test('src/foo/index.ts')).toBe(true)
      expect(re.test('src//index.ts')).toBe(true)
      expect(re.test('src/foo/bar/index.ts')).toBe(false)
    })
  })

  describe('**', () => {
    it('matches across path separators', () => {
      const re = globToRegex('src/**')
      expect(re.test('src/')).toBe(true)
      expect(re.test('src/a')).toBe(true)
      expect(re.test('src/a/b/c.ts')).toBe(true)
      expect(re.test('lib/a')).toBe(false)
    })

    it('matches nested files with a suffix', () => {
      const re = globToRegex('**/*.ts')
      expect(re.test('a/b.ts')).toBe(true)
      expect(re.test('a/b/c/d.ts')).toBe(true)
      expect(re.test('a/b.js')).toBe(false)
    })

    it('keeps the literal slashes around it (a/**/b does not match a/b)', () => {
      const re = globToRegex('a/**/b')
      expect(re.test('a/x/b')).toBe(true)
      expect(re.test('a/x/y/b')).toBe(true)
      expect(re.test('a/b')).toBe(false)
    })

    it('treats *** as ** followed by *', () => {
      expect(globToRegex('***').source).toBe('^.*[^/]*$')
    })
  })

  describe('?', () => {
    it('matches exactly one non-slash character', () => {
      const re = globToRegex('file?.txt')
      expect(re.test('file1.txt')).toBe(true)
      expect(re.test('file.txt')).toBe(false)
      expect(re.test('file12.txt')).toBe(false)
      expect(re.test('file/.txt')).toBe(false)
    })
  })

  describe('escaping', () => {
    it('treats . as a literal dot', () => {
      const re = globToRegex('a.b')
      expect(re.test('a.b')).toBe(true)
      expect(re.test('axb')).toBe(false)
    })

    it.each(['+', '^', '$', '(', ')', '|', '[', ']', '\\', '{', '}'])(
      'treats %s as a literal character',
      (ch) => {
        const re = globToRegex(`a${ch}b`)
        expect(re.test(`a${ch}b`)).toBe(true)
      },
    )

    it('does not interpret regex quantifiers or groups', () => {
      expect(globToRegex('a+').test('aa')).toBe(false)
      expect(globToRegex('(a|b)').test('a')).toBe(false)
      expect(globToRegex('(a|b)').test('(a|b)')).toBe(true)
      expect(globToRegex('[abc]').test('a')).toBe(false)
      expect(globToRegex('[abc]').test('[abc]')).toBe(true)
      expect(globToRegex('{a,b}').test('a')).toBe(false)
      expect(globToRegex('{a,b}').test('{a,b}')).toBe(true)
    })

    it('does not throw on patterns that would be invalid regex', () => {
      expect(() => globToRegex('(')).not.toThrow()
      expect(() => globToRegex('[')).not.toThrow()
      expect(() => globToRegex('\\')).not.toThrow()
      expect(globToRegex('\\').test('\\')).toBe(true)
    })
  })

  it('passes through ordinary characters unchanged', () => {
    const re = globToRegex('src/my-file_1.test.ts')
    expect(re.test('src/my-file_1.test.ts')).toBe(true)
  })

  it('combines wildcards in one pattern', () => {
    const re = globToRegex('src/**/test?/*.spec.ts')
    expect(re.test('src/a/b/test1/foo.spec.ts')).toBe(true)
    expect(re.test('src/a/test1/foo.spec.ts')).toBe(true)
    expect(re.test('src/a/test12/foo.spec.ts')).toBe(false)
    expect(re.test('src/a/test1/x/foo.spec.ts')).toBe(false)
  })
})
