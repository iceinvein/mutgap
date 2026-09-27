import { describe, expect, it } from 'vitest'
import { globToRegex } from './globToRegex'

describe('globToRegex', () => {
  it('matches an exact literal string', () => {
    const re = globToRegex('foo.txt')
    expect(re.test('foo.txt')).toBe(true)
    expect(re.test('foo_txt')).toBe(false)
    expect(re.test('foo.txtx')).toBe(false)
    expect(re.test('xfoo.txt')).toBe(false)
  })

  it('escapes regex special characters so they are treated literally', () => {
    const re = globToRegex('a.b+c^d$e(f)g|h[i]j{k}l\\m')
    expect(re.test('a.b+c^d$e(f)g|h[i]j{k}l\\m')).toBe(true)
    expect(re.test('aXb+c^d$e(f)g|h[i]j{k}l\\m')).toBe(false)
  })

  it('matches "?" against exactly one non-slash character', () => {
    const re = globToRegex('fo?.txt')
    expect(re.test('foo.txt')).toBe(true)
    expect(re.test('fob.txt')).toBe(true)
    expect(re.test('fo.txt')).toBe(false)
    expect(re.test('fooo.txt')).toBe(false)
    expect(re.test('fo/.txt')).toBe(false)
  })

  it('matches "*" against zero or more non-slash characters', () => {
    const re = globToRegex('*.txt')
    expect(re.test('foo.txt')).toBe(true)
    expect(re.test('.txt')).toBe(true)
    expect(re.test('a/b.txt')).toBe(false)
  })

  it('does not let "*" cross a directory separator', () => {
    const re = globToRegex('src/*.ts')
    expect(re.test('src/index.ts')).toBe(true)
    expect(re.test('src/nested/index.ts')).toBe(false)
  })

  it('matches "**" against any characters including slashes', () => {
    const re = globToRegex('src/**/index.ts')
    expect(re.test('src/index.ts')).toBe(false)
    expect(re.test('src/a/index.ts')).toBe(true)
    expect(re.test('src/a/b/c/index.ts')).toBe(true)
  })

  it('treats a bare "**" as matching anything, including empty and slashes', () => {
    const re = globToRegex('**')
    expect(re.test('')).toBe(true)
    expect(re.test('anything')).toBe(true)
    expect(re.test('a/b/c')).toBe(true)
  })

  it('anchors the match to the full string', () => {
    const re = globToRegex('foo')
    expect(re.test('foo')).toBe(true)
    expect(re.test('xfoo')).toBe(false)
    expect(re.test('foox')).toBe(false)
    expect(re.test('barfoobar')).toBe(false)
  })

  it('matches an empty pattern only against an empty string', () => {
    const re = globToRegex('')
    expect(re.test('')).toBe(true)
    expect(re.test('a')).toBe(false)
  })

  it('combines wildcards and literals in a single pattern', () => {
    const re = globToRegex('**/*.test.?s')
    expect(re.test('src/globToRegex.test.ts')).toBe(true)
    expect(re.test('src/deep/nested/globToRegex.test.js')).toBe(true)
    expect(re.test('src/globToRegex.test.tsx')).toBe(false)
    expect(re.test('src/globToRegex.spec.ts')).toBe(false)
  })
})
