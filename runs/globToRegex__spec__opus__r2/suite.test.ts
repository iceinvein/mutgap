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

  describe('literal patterns', () => {
    it('matches the exact path', () => {
      expectMatches('src/index.ts', ['src/index.ts'])
    })

    it('is anchored at both ends', () => {
      expectNoMatch('src/index.ts', [
        'x/src/index.ts',
        'src/index.tsx',
        'xsrc/index.ts',
        '/src/index.ts',
        'src/index.ts/',
        '',
      ])
    })

    it('is case-sensitive', () => {
      expectNoMatch('README.md', ['readme.md', 'README.MD'])
      expectNoMatch('*.TS', ['a.ts'])
    })

    it('empty pattern matches only the empty path', () => {
      expectMatches('', [''])
      expectNoMatch('', ['a', '/'])
    })
  })

  describe('*', () => {
    it('matches any run of non-slash characters', () => {
      expectMatches('*.ts', ['a.ts', 'index.ts', 'a.b.ts'])
      expectMatches('src/*.ts', ['src/a.ts'])
    })

    it('matches an empty run', () => {
      expectMatches('*.ts', ['.ts'])
      expectMatches('a*', ['a'])
      expectMatches('*', [''])
      expectMatches('src/*', ['src/'])
    })

    it('does not match across /', () => {
      expectNoMatch('*.ts', ['src/a.ts', '/a.ts'])
      expectNoMatch('src/*.ts', ['src/lib/a.ts'])
      expectNoMatch('*', ['a/b', '/'])
    })

    it('can appear in the middle of a segment and multiple times', () => {
      expectMatches('a*b*c', ['abc', 'axbyc', 'axxbyyc'])
      expectNoMatch('a*b*c', ['ab', 'a/b/c', 'axb/c'])
    })
  })

  describe('?', () => {
    it('matches exactly one non-slash character', () => {
      expectMatches('?.ts', ['a.ts', 'Z.ts', '..ts'])
      expectMatches('a?c', ['abc', 'a.c'])
    })

    it('does not match zero characters', () => {
      expectNoMatch('?.ts', ['.ts'])
      expectNoMatch('a?c', ['ac'])
    })

    it('does not match more than one character', () => {
      expectNoMatch('?.ts', ['ab.ts'])
    })

    it('does not match /', () => {
      expectNoMatch('a?c', ['a/c'])
    })

    it('can be repeated', () => {
      expectMatches('???', ['abc'])
      expectNoMatch('???', ['ab', 'abcd', 'a/c'])
    })
  })

  describe('**', () => {
    it('matches any run of characters including /', () => {
      expectMatches('a**z', ['az', 'abz', 'a/z', 'a/b/c/z'])
      expectMatches('**', ['', 'a', 'a/b/c', '/'])
      expectMatches('src/**', ['src/', 'src/a.ts', 'src/a/b/c.ts'])
    })

    it('does not consume a / that precedes it', () => {
      expectNoMatch('src/**', ['src', 'srcx'])
    })

    it('**/ at the start matches at the root and at any depth', () => {
      expectMatches('**/yarn.lock', ['yarn.lock', 'a/yarn.lock', 'a/b/yarn.lock'])
      expectNoMatch('**/yarn.lock', ['xyarn.lock', 'a/xyarn.lock', 'yarn.lock/x'])
    })

    it('/**/ in the middle matches zero or more segments', () => {
      expectMatches('a/**/b', ['a/b', 'a/x/b', 'a/x/y/b'])
      expectNoMatch('a/**/b', ['ab', 'a/xb', 'xa/b', 'a/b/x'])
    })

    it('combines with * and ?', () => {
      expectMatches('src/**/*.ts', ['src/a.ts', 'src/lib/a.ts', 'src/a/b/c.ts'])
      expectNoMatch('src/**/*.ts', ['src/a.js', 'lib/a.ts'])
      expectMatches('**/?.md', ['a.md', 'docs/b.md'])
      expectNoMatch('**/?.md', ['ab.md', 'docs/.md'])
    })

    it('handles multiple ** sequences', () => {
      expectMatches('**/node_modules/**', ['node_modules/', 'node_modules/x', 'a/node_modules/b/c'])
      expectNoMatch('**/node_modules/**', ['node_modules', 'a/node_modulesx/b'])
    })
  })

  describe('regex metacharacters are literal', () => {
    it.each(['.', '+', '(', ')', '[', ']', '{', '}', '|', '^', '$', '\\'])(
      '%s matches only itself',
      (ch) => {
        const pattern = `a${ch}b`
        expectMatches(pattern, [pattern])
        expectNoMatch(pattern, ['axb', 'ab', `a${ch}${ch}b`])
      },
    )

    it('. does not act as a wildcard', () => {
      expectMatches('*.ts', ['a.ts'])
      expectNoMatch('*.ts', ['axts'])
    })

    it('+ does not act as a quantifier', () => {
      expectNoMatch('a+', ['aa'])
    })

    it('| does not act as alternation', () => {
      expectMatches('a|b', ['a|b'])
      expectNoMatch('a|b', ['a', 'b'])
    })

    it('^ and $ do not act as anchors', () => {
      expectMatches('^a$', ['^a$'])
      expectNoMatch('^a$', ['a'])
    })

    it('parentheses do not create groups', () => {
      expectMatches('(a)', ['(a)'])
      expectNoMatch('(a)', ['a'])
    })

    it('backslash does not escape glob characters', () => {
      expectMatches('a\\*', ['a\\', 'a\\xyz'])
      expectNoMatch('a\\*', ['a*'])
      expectMatches('a\\?', ['a\\x'])
      expectNoMatch('a\\?', ['a?'])
    })

    it('handles patterns that would be invalid regexes', () => {
      expect(() => globToRegex('(')).not.toThrow()
      expect(() => globToRegex('[')).not.toThrow()
      expect(() => globToRegex('\\')).not.toThrow()
      expectMatches('(', ['('])
      expectMatches('[', ['['])
      expectMatches('\\', ['\\'])
    })
  })

  describe('no brace, class or negation support', () => {
    it('treats {a,b} literally', () => {
      expectMatches('{a,b}', ['{a,b}'])
      expectNoMatch('{a,b}', ['a', 'b'])
      expectMatches('*.{js,ts}', ['index.{js,ts}'])
      expectNoMatch('*.{js,ts}', ['index.js', 'index.ts'])
    })

    it('treats [abc] literally', () => {
      expectMatches('[abc]', ['[abc]'])
      expectNoMatch('[abc]', ['a', 'b'])
    })

    it('treats a leading ! literally', () => {
      expectMatches('!a', ['!a'])
      expectNoMatch('!a', ['b'])
    })

    it('treats glob wildcards inside braces and brackets as wildcards', () => {
      expectMatches('[*]', ['[]', '[abc]'])
      expectNoMatch('[*]', ['a'])
    })
  })
})
