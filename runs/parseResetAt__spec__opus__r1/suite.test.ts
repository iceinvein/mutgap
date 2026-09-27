import { describe, expect, it } from 'vitest'
import { parseResetAt } from './parseResetAt'

// Builds an ISO fetchedAt for a wall-clock moment in the local time zone, so the
// tests hold whatever TZ they run in. Dates avoid DST transitions.
function localIso(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): string {
  return new Date(year, month - 1, day, hour, minute, second).toISOString()
}

const JUN_15_14_00_27 = localIso(2026, 6, 15, 14, 0, 27)

describe('parseResetAt', () => {
  describe('returns undefined', () => {
    it.each([
      ['undefined', undefined],
      ['empty string', ''],
      ['unrecognised text', 'soon'],
      ['only the Resets prefix', 'Resets'],
      ['only a parenthesised group', '(Europe/London)'],
      ['mixed compact duration with a space', '2h 30m'],
      ['mixed compact duration after "in"', 'in 2h 30m'],
      ['minutes before hours in compact form', '30m2h'],
    ])('for %s', (_label, text) => {
      expect(parseResetAt(text, JUN_15_14_00_27)).toBeUndefined()
    })
  })

  describe('cleaning', () => {
    it('strips a leading "Resets" and a trailing parenthesised group', () => {
      expect(parseResetAt('Resets 3pm (Europe/London)', localIso(2026, 6, 15, 10))).toBe('2026-06-15T15:00:00')
    })

    it('strips "Resets" case-insensitively', () => {
      expect(parseResetAt('RESETS 3pm', localIso(2026, 6, 15, 10))).toBe('2026-06-15T15:00:00')
      expect(parseResetAt('resets 3pm', localIso(2026, 6, 15, 10))).toBe('2026-06-15T15:00:00')
    })

    it('trims whitespace left after cleaning', () => {
      expect(parseResetAt('Resets   3pm   (UTC)  ', localIso(2026, 6, 15, 10))).toBe('2026-06-15T15:00:00')
    })

    it('ignores the zone in the parenthesised group and uses local time', () => {
      expect(parseResetAt('Resets 3pm (America/New_York)', localIso(2026, 6, 15, 10))).toBe('2026-06-15T15:00:00')
    })
  })

  describe('durations', () => {
    it.each([
      ['2h', '2026-06-15T16:00:27'],
      ['45m', '2026-06-15T14:45:27'],
      ['2h30m', '2026-06-15T16:30:27'],
      ['in 2h30m', '2026-06-15T16:30:27'],
      ['Resets in 2h30m', '2026-06-15T16:30:27'],
      ['2H30M', '2026-06-15T16:30:27'],
      ['IN 45M', '2026-06-15T14:45:27'],
    ])('adds compact duration %j keeping seconds', (text, expected) => {
      expect(parseResetAt(text, JUN_15_14_00_27)).toBe(expected)
    })

    it.each([
      ['3 hours', '2026-06-15T17:00:27'],
      ['1 hour', '2026-06-15T15:00:27'],
      ['1 hr', '2026-06-15T15:00:27'],
      ['1 hr 5 min', '2026-06-15T15:05:27'],
      ['1hr5min', '2026-06-15T15:05:27'],
      ['2 hours 15 minutes', '2026-06-15T16:15:27'],
      ['1 minute', '2026-06-15T14:01:27'],
      ['30 min', '2026-06-15T14:30:27'],
      ['in 3 hours', '2026-06-15T17:00:27'],
      ['Resets in 1 hr 5 min', '2026-06-15T15:05:27'],
      ['3 HOURS', '2026-06-15T17:00:27'],
      ['1 Hr 5 Min', '2026-06-15T15:05:27'],
    ])('adds verbose duration %j keeping seconds', (text, expected) => {
      expect(parseResetAt(text, JUN_15_14_00_27)).toBe(expected)
    })

    it('rolls over midnight and month end', () => {
      expect(parseResetAt('in 3h', localIso(2026, 6, 30, 22, 30, 5))).toBe('2026-07-01T01:30:05')
    })

    it('rolls over the year end', () => {
      expect(parseResetAt('in 2 hours', localIso(2026, 12, 31, 23, 0, 0))).toBe('2027-01-01T01:00:00')
    })
  })

  describe('month, day and time', () => {
    const fetchedAt = localIso(2026, 3, 1, 10, 20, 45)

    it.each([
      ['Mar 12 at 9:30am', '2026-03-12T09:30:00'],
      ['Mar 12 at 3pm', '2026-03-12T15:00:00'],
      ['Mar 12 at 15:00', '2026-03-12T15:00:00'],
      ['Resets Mar 12 at 9:30am (Europe/London)', '2026-03-12T09:30:00'],
      ['Jan 5 at 12am', '2026-01-05T00:00:00'],
      ['Jan 5 at 12pm', '2026-01-05T12:00:00'],
    ])('parses %j in the year of fetchedAt with zero seconds', (text, expected) => {
      expect(parseResetAt(text, fetchedAt)).toBe(expected)
    })

    it('does not roll into the next year for a date earlier than fetchedAt', () => {
      expect(parseResetAt('Jan 3 at 3pm', localIso(2026, 12, 20, 12))).toBe('2026-01-03T15:00:00')
    })

    it('does not roll to the next day for a time earlier on the same date', () => {
      expect(parseResetAt('Mar 1 at 9am', fetchedAt)).toBe('2026-03-01T09:00:00')
    })
  })

  describe('bare 12-hour time', () => {
    it('places a later time on the same local date with zero seconds', () => {
      expect(parseResetAt('3pm', localIso(2026, 6, 15, 10, 5, 33))).toBe('2026-06-15T15:00:00')
    })

    it.each([
      ['9:30am', '2026-06-15T09:30:00'],
      ['9:30 am', '2026-06-15T09:30:00'],
      ['9 : 30  AM', '2026-06-15T09:30:00'],
      ['9:30AM', '2026-06-15T09:30:00'],
      ['11:59 pm', '2026-06-15T23:59:00'],
    ])('accepts %j', (text, expected) => {
      expect(parseResetAt(text, localIso(2026, 6, 15, 8))).toBe(expected)
    })

    it('treats 12am as midnight (next day, since today’s midnight is past)', () => {
      expect(parseResetAt('12am', localIso(2026, 6, 15, 8))).toBe('2026-06-16T00:00:00')
    })

    it('treats 12am as midnight on the same day when within the grace window', () => {
      expect(parseResetAt('12am', localIso(2026, 6, 15, 0, 10))).toBe('2026-06-15T00:00:00')
    })

    it('treats 12pm as noon', () => {
      expect(parseResetAt('12pm', localIso(2026, 6, 15, 8))).toBe('2026-06-15T12:00:00')
      expect(parseResetAt('12:30pm', localIso(2026, 6, 15, 8))).toBe('2026-06-15T12:30:00')
    })

    it('keeps a time on the same day when fetchedAt is exactly that time', () => {
      expect(parseResetAt('3pm', localIso(2026, 6, 15, 15))).toBe('2026-06-15T15:00:00')
    })

    it('keeps a time up to 15 minutes in the past on the same day', () => {
      expect(parseResetAt('3pm', localIso(2026, 6, 15, 15, 10))).toBe('2026-06-15T15:00:00')
      expect(parseResetAt('3pm', localIso(2026, 6, 15, 15, 15, 0))).toBe('2026-06-15T15:00:00')
    })

    it('moves a time more than 15 minutes in the past to the next day', () => {
      expect(parseResetAt('3pm', localIso(2026, 6, 15, 15, 15, 1))).toBe('2026-06-16T15:00:00')
      expect(parseResetAt('9:30am', localIso(2026, 6, 15, 20))).toBe('2026-06-16T09:30:00')
    })

    it('rolls to the next month and year when moving to the next day', () => {
      expect(parseResetAt('9am', localIso(2026, 6, 30, 23))).toBe('2026-07-01T09:00:00')
      expect(parseResetAt('9am', localIso(2026, 12, 31, 23))).toBe('2027-01-01T09:00:00')
    })

    it('uses the local date of fetchedAt, not its UTC date', () => {
      // 23:50 local may be a different UTC date in non-UTC zones.
      expect(parseResetAt('11:55pm', localIso(2026, 6, 15, 23, 50))).toBe('2026-06-15T23:55:00')
    })
  })
})
