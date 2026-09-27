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
        'src/index.ts/x',
        'src/index.tsx',
        'asrc/index.ts',
        '',
      ])
    })

    it('matches the empty pattern only against the empty path', () => {
      expectMatches('', [''])
      expectNoMatch('', ['a', '/'])
    })

    it('is case-sensitive', () => {
      expectNoMatch('README.md', ['readme.md', 'README.MD'])
    })
  })

  describe('*', () => {
    it('matches any run of non-slash characters', () => {
      expectMatches('*.ts', ['index.ts', 'a.b.ts', '.ts'])
    })

    it('matches an empty run', () => {
      expectMatches('a*b', ['ab'])
      expectMatches('*', [''])
    })

    it('does not match across /', () => {
      expectNoMatch('*.ts', ['src/index.ts', '/index.ts'])
      expectNoMatch('a*b', ['a/b', 'ax/yb'])
      expectNoMatch('*', ['a/b', '/'])
    })

    it('works in the middle of a path', () => {
      expectMatches('src/*/index.ts', ['src/foo/index.ts'])
      expectNoMatch('src/*/index.ts', ['src/index.ts', 'src/a/b/index.ts'])
    })

    it('handles multiple single stars in one segment', () => {
      expectMatches('*.test.*', ['foo.test.ts', '.test.'])
      expectNoMatch('*.test.*', ['foo.test', 'dir/foo.test.ts'])
    })
  })

  describe('?', () => {
    it('matches exactly one non-slash character', () => {
      expectMatches('a?c', ['abc', 'a.c', 'a?c'])
    })

    it('does not match zero or several characters', () => {
      expectNoMatch('a?c', ['ac', 'abbc'])
    })

    it('does not match /', () => {
      expectNoMatch('a?c', ['a/c'])
    })

    it('can be repeated', () => {
      expectMatches('??.js', ['ab.js'])
      expectNoMatch('??.js', ['a.js', 'abc.js'])
    })
  })

  describe('**', () => {
    it('matches any characters including /', () => {
      expectMatches('a**b', ['ab', 'axb', 'a/b', 'a/x/y/b'])
      expectMatches('**', ['', 'a', 'a/b/c', '/'])
    })

    it('matches across segments when not adjacent to /', () => {
      expectMatches('src/**.ts', ['src/a.ts', 'src/a/b/c.ts'])
      expectNoMatch('src/**.ts', ['lib/a.ts', 'src/a.js'])
    })

    it('matches everything below a directory with a trailing /**', () => {
      expectMatches('a/**', ['a/', 'a/b', 'a/b/c'])
      expectNoMatch('a/**', ['b/c', 'ab'])
    })

    describe('followed by /', () => {
      it('leading **/ matches at the root and at any depth', () => {
        expectMatches('**/yarn.lock', ['yarn.lock', 'a/yarn.lock', 'a/b/yarn.lock'])
      })

      it('leading **/ still requires the rest to match a whole segment', () => {
        expectNoMatch('**/yarn.lock', ['ayarn.lock', 'a/byarn.lock', 'yarn.lock/x'])
      })

      it('middle /**/ matches zero or more directories', () => {
        expectMatches('a/**/b', ['a/b', 'a/x/b', 'a/x/y/b'])
      })

      it('middle /**/ does not match a partial segment', () => {
        expectNoMatch('a/**/b', ['ab', 'a/xb', 'ax/b', 'a/b/c'])
      })

      it('combines with * and ?', () => {
        expectMatches('**/*.test.ts', ['foo.test.ts', 'src/foo.test.ts', 'a/b/c.test.ts'])
        expectNoMatch('**/*.test.ts', ['foo.test.js', 'src/foo.ts'])
        expectMatches('src/**/?.ts', ['src/a.ts', 'src/x/y/b.ts'])
        expectNoMatch('src/**/?.ts', ['src/ab.ts', 'src/x/ab.ts'])
      })

      it('supports several **/ in one pattern', () => {
        expectMatches('**/node_modules/**/package.json', [
          'node_modules/package.json',
          'node_modules/x/package.json',
          'a/node_modules/x/y/package.json',
        ])
        expectNoMatch('**/node_modules/**/package.json', [
          'package.json',
          'a/node_modules_x/package.json',
        ])
      })
    })
  })

  describe('regex metacharacters are literal', () => {
    const cases: Array<[pattern: string, nonMatch: string]> = [
      ['a.b', 'axb'],
      ['a+b', 'aab'],
      ['(a)', 'a'],
      ['[ab]', 'a'],
      ['a{2}', 'aa'],
      ['a|b', 'a'],
      ['^a', 'a'],
      ['a$', 'a'],
      ['a\\d', 'a1'],
      ['a\\', 'a'],
    ]

    for (const [pattern, nonMatch] of cases) {
      it(`${JSON.stringify(pattern)} matches only itself`, () => {
        expectMatches(pattern, [pattern])
        expectNoMatch(pattern, [nonMatch])
      })
    }

    it('does not treat $ or ^ as anchors mid-pattern', () => {
      expectMatches('a$b^c', ['a$b^c'])
    })

    it('handles many metacharacters together', () => {
      const pattern = 'x.+()[]{}|^$\\y'
      expectMatches(pattern, [pattern])
    })

    it('mixes literal metacharacters with wildcards', () => {
      expectMatches('lib/(*)/[?].js', ['lib/(foo)/[a].js', 'lib/()/[b].js'])
      expectNoMatch('lib/(*)/[?].js', ['lib/foo/a.js', 'lib/(a/b)/[a].js'])
    })
  })

  describe('unsupported glob features are literal', () => {
    it('brace alternation matches only the literal text', () => {
      expectMatches('{a,b}', ['{a,b}'])
      expectNoMatch('{a,b}', ['a', 'b'])
      expectMatches('*.{js,ts}', ['foo.{js,ts}'])
      expectNoMatch('*.{js,ts}', ['foo.js', 'foo.ts'])
    })

    it('character classes match only the literal text', () => {
      expectMatches('file[0-9].txt', ['file[0-9].txt'])
      expectNoMatch('file[0-9].txt', ['file1.txt'])
    })

    it('negation is not supported', () => {
      expectMatches('!foo', ['!foo'])
      expectNoMatch('!foo', ['bar'])
      expectMatches('[!a]', ['[!a]'])
      expectNoMatch('[!a]', ['b'])
    })
  })
})
