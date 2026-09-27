import { describe, expect, it } from 'vitest'
import { parseResetAt } from './parseResetAt'

describe('parseResetAt', () => {
  describe('invalid input', () => {
    it('returns undefined when resetText is undefined', () => {
      expect(parseResetAt(undefined, '2024-03-10T10:00:00')).toBeUndefined()
    })

    it('returns undefined when resetText is empty', () => {
      expect(parseResetAt('', '2024-03-10T10:00:00')).toBeUndefined()
    })

    it('returns undefined when resetText matches none of the known forms', () => {
      expect(parseResetAt('hello world', '2024-03-10T10:00:00')).toBeUndefined()
    })

    it('returns undefined when only "Resets" remains after cleaning', () => {
      expect(parseResetAt('Resets', '2024-03-10T10:00:00')).toBeUndefined()
    })

    it('returns undefined for a mixed duration form like "2h 30m"', () => {
      expect(parseResetAt('2h 30m', '2024-03-10T10:00:00')).toBeUndefined()
    })
  })

  describe('text cleaning', () => {
    it('strips a leading "Resets" (case-insensitive) and trailing timezone group', () => {
      expect(parseResetAt('Resets 3pm (Europe/London)', '2024-03-10T10:00:00')).toBe(
        '2024-03-10T15:00:00',
      )
    })

    it('strips leading "RESETS" regardless of case', () => {
      expect(parseResetAt('RESETS in 2h30m', '2024-03-10T10:00:00')).toBe(
        '2024-03-10T12:30:00',
      )
    })

    it('strips trailing parenthesised zone for the month/day form', () => {
      expect(
        parseResetAt('Resets Mar 12 at 3pm (America/New_York)', '2024-03-10T10:00:00'),
      ).toBe('2024-03-12T15:00:00')
    })
  })

  describe('durations', () => {
    it('parses a compact hours+minutes duration', () => {
      expect(parseResetAt('2h30m', '2024-03-10T10:00:00')).toBe('2024-03-10T12:30:00')
    })

    it('parses a compact minutes-only duration', () => {
      expect(parseResetAt('45m', '2024-03-10T10:00:00')).toBe('2024-03-10T10:45:00')
    })

    it('parses a compact hours-only duration', () => {
      expect(parseResetAt('2h', '2024-03-10T10:00:00')).toBe('2024-03-10T12:00:00')
    })

    it('accepts an optional leading "in "', () => {
      expect(parseResetAt('in 2h30m', '2024-03-10T10:00:00')).toBe('2024-03-10T12:30:00')
    })

    it('is case-insensitive for compact durations', () => {
      expect(parseResetAt('2H30M', '2024-03-10T10:00:00')).toBe('2024-03-10T12:30:00')
    })

    it('parses a verbose duration with full unit words', () => {
      expect(parseResetAt('3 hours', '2024-03-10T10:00:00')).toBe('2024-03-10T13:00:00')
    })

    it('parses a verbose duration combining hr and min', () => {
      expect(parseResetAt('1 hr 5 min', '2024-03-10T10:00:00')).toBe('2024-03-10T11:05:00')
    })

    it('parses a verbose duration with no spaces', () => {
      expect(parseResetAt('1hour5minutes', '2024-03-10T10:00:00')).toBe('2024-03-10T11:05:00')
    })

    it('is case-insensitive for verbose durations', () => {
      expect(parseResetAt('in 3 Hours', '2024-03-10T10:00:00')).toBe('2024-03-10T13:00:00')
    })

    it('keeps the seconds from fetchedAt', () => {
      expect(parseResetAt('2h', '2024-03-10T10:00:45')).toBe('2024-03-10T12:00:45')
    })
  })

  describe('month and day with a time', () => {
    it('parses "Mon D at h:mmam"', () => {
      expect(parseResetAt('Mar 12 at 9:30am', '2024-01-01T00:00:00')).toBe(
        '2024-03-12T09:30:00',
      )
    })

    it('parses "Mon D at hpm"', () => {
      expect(parseResetAt('Mar 12 at 3pm', '2024-01-01T00:00:00')).toBe('2024-03-12T15:00:00')
    })

    it('parses "Mon D at HH:MM" 24-hour time', () => {
      expect(parseResetAt('Mar 12 at 15:00', '2024-01-01T00:00:00')).toBe(
        '2024-03-12T15:00:00',
      )
    })

    it('uses the year of fetchedAt with no rollover, even if the date has already passed', () => {
      expect(parseResetAt('Jan 1 at 9am', '2024-06-01T00:00:00')).toBe('2024-01-01T09:00:00')
    })
  })

  describe('bare 12-hour time', () => {
    it('places a future time on the same local date as fetchedAt', () => {
      expect(parseResetAt('3pm', '2024-03-10T10:00:00')).toBe('2024-03-10T15:00:00')
    })

    it('ignores whitespace between the time and am/pm', () => {
      expect(parseResetAt('9:30 am', '2024-03-10T00:00:00')).toBe('2024-03-10T09:30:00')
    })

    it('parses a time with no whitespace before am/pm', () => {
      expect(parseResetAt('9:30am', '2024-03-10T00:00:00')).toBe('2024-03-10T09:30:00')
    })

    it('treats 12am as midnight', () => {
      expect(parseResetAt('12am', '2024-03-10T00:05:00')).toBe('2024-03-10T00:00:00')
    })

    it('treats 12pm as noon', () => {
      expect(parseResetAt('12pm', '2024-03-10T10:00:00')).toBe('2024-03-10T12:00:00')
    })

    it('stays on the same day when up to 15 minutes in the past', () => {
      expect(parseResetAt('9am', '2024-03-10T09:15:00')).toBe('2024-03-10T09:00:00')
    })

    it('rolls over to the next day when more than 15 minutes in the past', () => {
      expect(parseResetAt('9am', '2024-03-10T09:16:00')).toBe('2024-03-11T09:00:00')
    })

    it('rolls midnight over to the next day when far in the past', () => {
      expect(parseResetAt('12am', '2024-03-10T23:00:00')).toBe('2024-03-11T00:00:00')
    })
  })
})
