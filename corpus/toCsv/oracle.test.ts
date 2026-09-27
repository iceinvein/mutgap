import { expect, test } from 'vitest'
import { toCsv } from './toCsv'

test('embedded double quotes are doubled', () => {
  expect(toCsv([{ q: 'say "hi"' }])).toBe('q\n"say ""hi"""\n')
})

test('fields with commas are quoted, missing keys are empty', () => {
  expect(toCsv([{ a: 'x,y', b: 2 }, { a: 'z' }])).toBe('a,b\n"x,y",2\nz,\n')
})

test('empty input is the empty string', () => {
  expect(toCsv([])).toBe('')
})
