import { describe, expect, it } from 'vitest'
import { parseResetAt } from './parseResetAt'

// Builds an ISO (UTC, `Z`-suffixed) timestamp for a *local* wall-clock time,
// so expectations stay correct whatever time zone the tests run in.
// Dates are chosen away from DST transitions.
function localIso(year: number, month: number, day: number, h = 0, m = 0, s = 0): string {
  return new Date(year, month - 1, day, h, m, s).toISOString()
}

// 2026-06-10 14:20:45 local
const FETCHED = localIso(2026, 6, 10, 14, 20, 45)

describe('parseResetAt', () => {
  describe('missing or unrecognised input', () => {
    it('returns undefined for undefined', () => {
      expect(parseResetAt(undefined, FETCHED)).toBeUndefined()
    })

    it('returns undefined for an empty string', () => {
      expect(parseResetAt('', FETCHED)).toBeUndefined()
    })

    it.each(['soon', 'Resets', 'Resets tomorrow', '2 days', 'Mar 12', 'Mar 12 at'])(
      'returns undefined for unrecognised text %j',
      (text) => {
        expect(parseResetAt(text, FETCHED)).toBeUndefined()
      },
    )
  })

  describe('cleaning', () => {
    it('strips a leading "Resets" and a trailing parenthesised zone', () => {
      expect(parseResetAt('Resets 3pm (Europe/London)', FETCHED)).toBe('2026-06-10T15:00:00')
    })

    it('strips "Resets" case-insensitively', () => {
      expect(parseResetAt('resets 3pm', FETCHED)).toBe('2026-06-10T15:00:00')
      expect(parseResetAt('RESETS 3pm', FETCHED)).toBe('2026-06-10T15:00:00')
    })

    it('trims surrounding whitespace', () => {
      expect(parseResetAt('  Resets   in 2h30m  (UTC)  ', FETCHED)).toBe('2026-06-10T16:50:45')
    })

    it('works without the "Resets" prefix', () => {
      expect(parseResetAt('3pm', FETCHED)).toBe('2026-06-10T15:00:00')
    })
  })

  describe('durations', () => {
    it.each([
      ['Resets in 2h30m', '2026-06-10T16:50:45'],
      ['in 2h', '2026-06-10T16:20:45'],
      ['45m', '2026-06-10T15:05:45'],
      ['2H30M', '2026-06-10T16:50:45'],
      ['IN 2h', '2026-06-10T16:20:45'],
    ])('parses compact duration %j', (text, expected) => {
      expect(parseResetAt(text, FETCHED)).toBe(expected)
    })

    it.each([
      ['Resets in 3 hours', '2026-06-10T17:20:45'],
      ['1 hr 5 min', '2026-06-10T15:25:45'],
      ['1hr5min', '2026-06-10T15:25:45'],
      ['1 hour', '2026-06-10T15:20:45'],
      ['2 hours 10 minutes', '2026-06-10T16:30:45'],
      ['1 minute', '2026-06-10T14:21:45'],
      ['30 min', '2026-06-10T14:50:45'],
      ['in 1 HOUR 1 MINUTE', '2026-06-10T15:21:45'],
    ])('parses verbose duration %j', (text, expected) => {
      expect(parseResetAt(text, FETCHED)).toBe(expected)
    })

    it('keeps the seconds of fetchedAt', () => {
      const fetched = localIso(2026, 6, 10, 9, 0, 7)
      expect(parseResetAt('in 5m', fetched)).toBe('2026-06-10T09:05:07')
    })

    it('rolls over into the next day', () => {
      const fetched = localIso(2026, 6, 30, 23, 30, 0)
      expect(parseResetAt('in 1h', fetched)).toBe('2026-07-01T00:30:00')
    })

    it('rejects the mixed form "2h 30m"', () => {
      expect(parseResetAt('Resets in 2h 30m', FETCHED)).toBeUndefined()
    })
  })

  describe('month, day and time', () => {
    it.each([
      ['Resets Mar 12 at 9:30am', '2026-03-12T09:30:00'],
      ['Mar 12 at 3pm', '2026-03-12T15:00:00'],
      ['Mar 12 at 15:00', '2026-03-12T15:00:00'],
      ['Mar 12 at 12am', '2026-03-12T00:00:00'],
      ['Mar 12 at 12pm', '2026-03-12T12:00:00'],
      ['Resets Nov 3 at 9:30am (America/New_York)', '2026-11-03T09:30:00'],
    ])('parses %j', (text, expected) => {
      expect(parseResetAt(text, FETCHED)).toBe(expected)
    })

    it('uses the year of fetchedAt with no rollover into the next year', () => {
      const fetched = localIso(2026, 12, 30, 10, 0, 0)
      expect(parseResetAt('Jan 2 at 3pm', fetched)).toBe('2026-01-02T15:00:00')
    })

    it('sets seconds to zero', () => {
      const fetched = localIso(2026, 6, 10, 14, 20, 45)
      expect(parseResetAt('Jun 11 at 3pm', fetched)).toBe('2026-06-11T15:00:00')
    })
  })

  describe('bare 12-hour time', () => {
    it.each([
      ['3pm', '2026-06-10T15:00:00'],
      ['9:30pm', '2026-06-10T21:30:00'],
      ['9:30 pm', '2026-06-10T21:30:00'],
      ['9 : 30 PM', '2026-06-10T21:30:00'],
      ['Resets 11:59pm (Europe/London)', '2026-06-10T23:59:00'],
    ])('places later-today time %j on the same day', (text, expected) => {
      expect(parseResetAt(text, FETCHED)).toBe(expected)
    })

    it('treats 12pm as noon', () => {
      const fetched = localIso(2026, 6, 10, 11, 0, 0)
      expect(parseResetAt('12pm', fetched)).toBe('2026-06-10T12:00:00')
    })

    it('treats 12am as midnight (next day when already past)', () => {
      expect(parseResetAt('12am', FETCHED)).toBe('2026-06-11T00:00:00')
    })

    it('treats 12:30am as 00:30', () => {
      expect(parseResetAt('12:30am', FETCHED)).toBe('2026-06-11T00:30:00')
    })

    it('moves a time well in the past to the next day', () => {
      expect(parseResetAt('9:30am', FETCHED)).toBe('2026-06-11T09:30:00')
    })

    it('moves to the next day across a month boundary', () => {
      const fetched = localIso(2026, 6, 30, 20, 0, 0)
      expect(parseResetAt('9am', fetched)).toBe('2026-07-01T09:00:00')
    })

    it('moves to the next day across a year boundary', () => {
      const fetched = localIso(2026, 12, 31, 20, 0, 0)
      expect(parseResetAt('9am', fetched)).toBe('2027-01-01T09:00:00')
    })

    it('stays on the same day when exactly the fetch time', () => {
      const fetched = localIso(2026, 6, 10, 15, 0, 0)
      expect(parseResetAt('3pm', fetched)).toBe('2026-06-10T15:00:00')
    })

    it('stays on the same day when up to 15 minutes in the past', () => {
      expect(parseResetAt('3pm', localIso(2026, 6, 10, 15, 10, 0))).toBe('2026-06-10T15:00:00')
      expect(parseResetAt('3pm', localIso(2026, 6, 10, 15, 15, 0))).toBe('2026-06-10T15:00:00')
    })

    it('moves to the next day when more than 15 minutes in the past', () => {
      expect(parseResetAt('3pm', localIso(2026, 6, 10, 15, 15, 1))).toBe('2026-06-11T15:00:00')
      expect(parseResetAt('3pm', localIso(2026, 6, 10, 15, 16, 0))).toBe('2026-06-11T15:00:00')
    })
  })
})
