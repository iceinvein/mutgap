import { expect, test } from 'vitest'
import { formatAgo } from './formatAgo'

test('five seconds old is reported in seconds', () => {
  expect(formatAgo(995, 1000)).toBe('5s ago')
})

test('under five seconds old, and future timestamps, read as just now', () => {
  expect(formatAgo(996, 1000)).toBe('just now')
  expect(formatAgo(1100, 1000)).toBe('just now')
})

test('minutes, hours and days are whole units rounded down', () => {
  expect(formatAgo(0, 59)).toBe('59s ago')
  expect(formatAgo(0, 60)).toBe('1m ago')
  expect(formatAgo(0, 3599)).toBe('59m ago')
  expect(formatAgo(0, 3600)).toBe('1h ago')
  expect(formatAgo(0, 86399)).toBe('23h ago')
  expect(formatAgo(0, 86400)).toBe('1d ago')
})

test('a missing timestamp is an en dash', () => {
  expect(formatAgo(null, 1000)).toBe('–')
  expect(formatAgo(undefined)).toBe('–')
})
