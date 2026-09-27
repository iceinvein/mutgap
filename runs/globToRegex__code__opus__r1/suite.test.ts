import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

const matches = (pattern: string, path: string) => globToRegex(pattern).test(path)

describe('globToRegex', () => {
  it('returns a RegExp', () => {
    expect(globToRegex('a')).toBeInstanceOf(RegExp)
  })

  describe('literals', () => {
    it('matches an exact string', () => {
      expect(matches('foo/bar.ts', 'foo/bar.ts')).toBe(true)
    })

    it('is anchored at both ends', () => {
      expect(matches('bar', 'foobar')).toBe(false)
      expect(matches('foo', 'foobar')).toBe(false)
      expect(matches('bar', 'bar/baz')).toBe(false)
    })

    it('is case-sensitive', () => {
      expect(matches('Foo', 'foo')).toBe(false)
    })

    it('empty pattern matches only the empty string', () => {
      expect(matches('', '')).toBe(true)
      expect(matches('', 'a')).toBe(false)
    })
  })

  describe('*', () => {
    it('matches any run of non-slash characters, including none', () => {
      expect(matches('*.ts', 'index.ts')).toBe(true)
      expect(matches('*.ts', '.ts')).toBe(true)
      expect(matches('src/*', 'src/')).toBe(true)
      expect(matches('a*b', 'axyzb')).toBe(true)
    })

    it('does not cross directory separators', () => {
      expect(matches('*.ts', 'src/index.ts')).toBe(false)
      expect(matches('src/*.ts', 'src/lib/index.ts')).toBe(false)
    })

    it('supports multiple wildcards in one segment', () => {
      expect(matches('*.test.*', 'foo.test.ts')).toBe(true)
      expect(matches('*.test.*', 'foo.spec.ts')).toBe(false)
    })
  })

  describe('**', () => {
    it('matches across directory separators', () => {
      expect(matches('src/**', 'src/a/b/c.ts')).toBe(true)
      expect(matches('**.ts', 'src/a/b.ts')).toBe(true)
      expect(matches('src/**/*.ts', 'src/a/b/c.ts')).toBe(true)
    })

    it('matches the empty string', () => {
      expect(matches('src/**', 'src/')).toBe(true)
    })

    it('does not make surrounding slashes optional', () => {
      // `**` is translated to `.*`, so the literal `/` after it is still required.
      expect(matches('src/**/*.ts', 'src/index.ts')).toBe(false)
      expect(matches('src/**/*.ts', 'src//index.ts')).toBe(true)
    })

    it('treats *** as ** followed by *', () => {
      expect(globToRegex('***').source).toBe('^.*[^/]*$')
    })
  })

  describe('?', () => {
    it('matches exactly one non-slash character', () => {
      expect(matches('file?.txt', 'file1.txt')).toBe(true)
      expect(matches('file?.txt', 'file.txt')).toBe(false)
      expect(matches('file?.txt', 'file12.txt')).toBe(false)
      expect(matches('a?b', 'a/b')).toBe(false)
    })
  })

  describe('regex metacharacter escaping', () => {
    it.each(['.', '+', '^', '$', '(', ')', '|', '[', ']', '\\', '{', '}'])(
      'treats %s literally',
      (ch) => {
        const pattern = `a${ch}b`
        expect(() => globToRegex(pattern)).not.toThrow()
        expect(matches(pattern, pattern)).toBe(true)
      },
    )

    it('does not treat . as a wildcard', () => {
      expect(matches('a.ts', 'abts')).toBe(false)
    })

    it('does not support character classes or brace expansion', () => {
      expect(matches('[abc].ts', 'a.ts')).toBe(false)
      expect(matches('[abc].ts', '[abc].ts')).toBe(true)
      expect(matches('*.{js,ts}', 'a.ts')).toBe(false)
      expect(matches('*.{js,ts}', 'a.{js,ts}')).toBe(true)
    })

    it('does not treat a+ or a| as regex operators', () => {
      expect(matches('a+', 'aa')).toBe(false)
      expect(matches('a|b', 'a')).toBe(false)
    })
  })

  it('produces the expected regex source', () => {
    expect(globToRegex('src/**/*.ts').source).toBe('^src\\/.*\\/[^/]*\\.ts$')
  })
})
