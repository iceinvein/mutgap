import { expect, test } from 'vitest'
import { formatDuration } from './formatDuration'

test('exactly ten seconds is whole seconds', () => {
  expect(formatDuration(10000)).toBe('10s')
})

test('under ten seconds shows one decimal place', () => {
  expect(formatDuration(1000)).toBe('1.0s')
  expect(formatDuration(1500)).toBe('1.5s')
})

test('under one second is raw milliseconds', () => {
  expect(formatDuration(999)).toBe('999ms')
})

test('rounding happens after the bucket is chosen', () => {
  expect(formatDuration(59600)).toBe('60s')
})

test('a minute or more is minutes and remaining seconds', () => {
  expect(formatDuration(60000)).toBe('1m 0s')
  expect(formatDuration(125000)).toBe('2m 5s')
})

test('a missing duration is an en dash', () => {
  expect(formatDuration(null)).toBe('–')
})
