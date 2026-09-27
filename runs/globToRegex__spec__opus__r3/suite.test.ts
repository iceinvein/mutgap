import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

function expectMatches(pattern: string, paths: string[]) {
  const re = globToRegex(pattern)
  for (const path of paths) {
    expect(re.test(path), `${pattern} should match ${JSON.stringify(path)}`).toBe(true)
  }
}

function expectNoMatch(pattern: string, paths: string[]) {
  const re = globToRegex(pattern)
  for (const path of paths) {
    expect(re.test(path), `${pattern} should not match ${JSON.stringify(path)}`).toBe(false)
  }
}

describe('globToRegex', () => {
  it('returns a RegExp', () => {
    expect(globToRegex('a')).toBeInstanceOf(RegExp)
  })

  it('gives the same answer when the returned regex is reused', () => {
    const re = globToRegex('*.js')
    expect(re.test('a.js')).toBe(true)
    expect(re.test('a.js')).toBe(true)
    expect(re.test('b.js')).toBe(true)
    expect(re.test('a.ts')).toBe(false)
  })

  describe('literal patterns', () => {
    it('matches the exact path', () => {
      expectMatches('src/index.ts', ['src/index.ts'])
    })

    it('is anchored at both ends', () => {
      expectNoMatch('src/index.ts', [
        'x/src/index.ts',
        'src/index.tsx',
        'xsrc/index.ts',
        'src/index.ts/',
        '/src/index.ts',
        'src',
      ])
    })

    it('is case-sensitive', () => {
      expectNoMatch('README.md', ['readme.md', 'README.MD', 'Readme.md'])
      expectMatches('README.md', ['README.md'])
    })

    it('empty pattern matches only the empty path', () => {
      expectMatches('', [''])
      expectNoMatch('', ['a', '/'])
    })
  })

  describe('*', () => {
    it('matches any run of non-slash characters', () => {
      expectMatches('*.js', ['a.js', 'index.js', 'a.b.js', '.js'])
    })

    it('matches an empty run', () => {
      expectMatches('a*b', ['ab'])
      expectMatches('*', [''])
    })

    it('does not cross a slash', () => {
      expectNoMatch('*.js', ['src/a.js', '/a.js'])
      expectNoMatch('*', ['a/b', '/'])
      expectNoMatch('a*b', ['a/b', 'ax/yb'])
    })

    it('works in the middle of a path segment and across segments', () => {
      expectMatches('src/*/index.ts', ['src/foo/index.ts', 'src//index.ts'])
      expectNoMatch('src/*/index.ts', ['src/index.ts', 'src/a/b/index.ts'])
      expectMatches('foo*bar', ['foobar', 'fooXbar', 'foo-baz-bar'])
    })

    it('respects the anchors', () => {
      expectNoMatch('*.js', ['a.js.map', 'a.jsx'])
    })

    it('supports multiple single stars', () => {
      expectMatches('*/*', ['a/b', '/', 'a/', '/b'])
      expectNoMatch('*/*', ['a', 'a/b/c'])
    })
  })

  describe('?', () => {
    it('matches exactly one non-slash character', () => {
      expectMatches('a?c', ['abc', 'a.c', 'a?c', 'a*c'])
    })

    it('does not match zero characters', () => {
      expectNoMatch('a?c', ['ac'])
    })

    it('does not match more than one character', () => {
      expectNoMatch('a?c', ['abbc'])
    })

    it('does not match a slash', () => {
      expectNoMatch('a?c', ['a/c'])
    })

    it('can be repeated', () => {
      expectMatches('???', ['abc'])
      expectNoMatch('???', ['ab', 'abcd', 'a/c'])
    })
  })

  describe('**', () => {
    it('matches anything, including slashes and nothing', () => {
      expectMatches('**', ['', 'a', 'a/b/c', '/', 'a/'])
    })

    it('crosses slashes when not followed by /', () => {
      expectMatches('**.js', ['a.js', 'src/a.js', 'a/b/c.js', '.js'])
      expectNoMatch('**.js', ['a.ts', 'a.js/b'])
      expectMatches('src/**', ['src/', 'src/a', 'src/a/b/c.ts'])
      expectNoMatch('src/**', ['src', 'lib/a'])
    })

    it('**/ at the start matches at the root and at any depth', () => {
      expectMatches('**/yarn.lock', ['yarn.lock', 'a/yarn.lock', 'a/b/yarn.lock'])
      expectNoMatch('**/yarn.lock', ['yarn.lockx', 'a/yarn.lock/b', 'a/package.json'])
    })

    it('/**/ in the middle matches zero or more directories', () => {
      expectMatches('a/**/b', ['a/b', 'a/x/b', 'a/x/y/b'])
      expectNoMatch('a/**/b', ['ab', 'a/b/c', 'x/a/b', 'b'])
    })

    it('combines with * and ?', () => {
      expectMatches('src/**/*.test.ts', [
        'src/a.test.ts',
        'src/x/a.test.ts',
        'src/x/y/a.test.ts',
      ])
      expectNoMatch('src/**/*.test.ts', ['src/a.ts', 'lib/a.test.ts', 'a.test.ts'])
      expectMatches('**/?.md', ['a.md', 'x/y/b.md'])
      expectNoMatch('**/?.md', ['ab.md', 'x/ab.md'])
    })

    it('supports multiple ** segments', () => {
      expectMatches('**/node_modules/**', [
        'node_modules/',
        'node_modules/a',
        'x/node_modules/a/b',
      ])
      expectNoMatch('**/node_modules/**', ['node_modules', 'x/node_modulesx/a'])
    })
  })

  describe('literal special characters', () => {
    it('treats . literally', () => {
      expectMatches('a.b', ['a.b'])
      expectNoMatch('a.b', ['axb', 'a/b'])
      expectNoMatch('*.js', ['ajs'])
    })

    it('treats + literally', () => {
      expectMatches('a+b', ['a+b'])
      expectNoMatch('a+b', ['ab', 'aab'])
    })

    it('treats ( ) and | literally', () => {
      expectMatches('(a|b)', ['(a|b)'])
      expectNoMatch('(a|b)', ['a', 'b', 'a|b'])
      expectMatches('a|b', ['a|b'])
      expectNoMatch('a|b', ['a', 'b'])
    })

    it('treats [ ] literally (no character classes)', () => {
      expectMatches('[ab].txt', ['[ab].txt'])
      expectNoMatch('[ab].txt', ['a.txt', 'b.txt'])
      expectMatches('[!a].txt', ['[!a].txt'])
      expectNoMatch('[!a].txt', ['b.txt'])
    })

    it('treats { } literally (no brace alternation)', () => {
      expectMatches('*.{js,ts}', ['a.{js,ts}'])
      expectNoMatch('*.{js,ts}', ['a.js', 'a.ts'])
      expectMatches('a{2}', ['a{2}'])
      expectNoMatch('a{2}', ['aa'])
    })

    it('treats ^ and $ literally', () => {
      expectMatches('^a$', ['^a$'])
      expectNoMatch('^a$', ['a'])
      expectMatches('$HOME/x', ['$HOME/x'])
    })

    it('treats backslash literally', () => {
      expectMatches('a\\b', ['a\\b'])
      expectNoMatch('a\\b', ['ab', 'a/b'])
      expectMatches('a\\*', ['a\\', 'a\\xyz'])
      expectNoMatch('a\\*', ['a*', 'a'])
      expectMatches('\\d', ['\\d'])
      expectNoMatch('\\d', ['1'])
    })

    it('does not treat ! as negation', () => {
      expectMatches('!foo', ['!foo'])
      expectNoMatch('!foo', ['bar', 'foo'])
    })

    it('does not break on a pattern of only metacharacters', () => {
      const pattern = '.+()[]{}|^$\\'
      expectMatches(pattern, [pattern])
      expectNoMatch(pattern, ['', 'x'])
    })
  })
})
