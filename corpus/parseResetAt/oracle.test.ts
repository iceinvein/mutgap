import { expect, test } from 'vitest'
import { parseResetAt } from './parseResetAt'

test('12am is midnight, rolling to the next day once past', () => {
  expect(parseResetAt('Resets 12am', '2026-03-10T22:00:00Z')).toBe('2026-03-11T00:00:00')
})

test('a bare time later today stays today and the zone note is ignored', () => {
  expect(parseResetAt('Resets 3pm (Europe/London)', '2026-03-10T10:00:00Z')).toBe('2026-03-10T15:00:00')
})

test('a time up to 15 minutes past stays today, beyond that moves to tomorrow', () => {
  expect(parseResetAt('Resets 10am', '2026-03-10T10:10:00Z')).toBe('2026-03-10T10:00:00')
  expect(parseResetAt('Resets 10am', '2026-03-10T10:20:00Z')).toBe('2026-03-11T10:00:00')
})

test('a compact duration is added to the fetch time keeping its seconds', () => {
  expect(parseResetAt('Resets in 2h30m', '2026-03-10T10:00:15Z')).toBe('2026-03-10T12:30:15')
})

test('a month and day with a time uses the fetch year', () => {
  expect(parseResetAt('Resets Mar 12 at 9:30am', '2026-03-10T10:00:00Z')).toBe('2026-03-12T09:30:00')
})

test('missing or unrecognised text gives undefined', () => {
  expect(parseResetAt(undefined, '2026-03-10T10:00:00Z')).toBeUndefined()
  expect(parseResetAt('Resets soon', '2026-03-10T10:00:00Z')).toBeUndefined()
})
