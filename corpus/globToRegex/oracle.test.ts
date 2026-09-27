import { expect, test } from 'vitest'
import { globToRegex } from './globToRegex'

test('**/ matches a file at the root as well as nested', () => {
  const re = globToRegex('**/yarn.lock')
  expect(re.test('yarn.lock')).toBe(true)
  expect(re.test('a/b/yarn.lock')).toBe(true)
})

test('a/**/b matches with zero directories in between', () => {
  expect(globToRegex('a/**/b').test('a/b')).toBe(true)
})

test('a single star does not cross a slash', () => {
  const re = globToRegex('src/*.ts')
  expect(re.test('src/index.ts')).toBe(true)
  expect(re.test('src/lib/index.ts')).toBe(false)
})

test('question mark matches one non-slash character', () => {
  const re = globToRegex('a?c')
  expect(re.test('abc')).toBe(true)
  expect(re.test('a/c')).toBe(false)
  expect(re.test('ac')).toBe(false)
})

test('dots and braces are literal and the match is anchored', () => {
  expect(globToRegex('*.min.js').test('appxminxjs')).toBe(false)
  expect(globToRegex('{a,b}.txt').test('{a,b}.txt')).toBe(true)
  expect(globToRegex('dist/**').test('src/dist/x')).toBe(false)
})
