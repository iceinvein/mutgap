import { expect, test } from 'vitest'
import { safeFilename } from './safeFilename'

test('an extension that already has its dot is not given a second one', () => {
  expect(safeFilename('John Smith', '.pdf')).toBe('John-Smith.pdf')
})

test('an extension without a dot gets one', () => {
  expect(safeFilename('John Smith', 'pdf')).toBe('John-Smith.pdf')
})

test('forbidden characters are removed and whitespace becomes single hyphens', () => {
  expect(safeFilename('  a / b: c  ', 'pdf')).toBe('a-b-c.pdf')
})

test('hyphen runs collapse and leading or trailing hyphens and dots are stripped', () => {
  expect(safeFilename('-.a - - b.-', 'txt')).toBe('a-b.txt')
})

test('input that sanitises to nothing falls back to resume', () => {
  expect(safeFilename(' ?*. ', 'pdf')).toBe('resume.pdf')
})
