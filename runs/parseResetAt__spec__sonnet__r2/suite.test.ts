import { describe, expect, it } from 'vitest'
import { parseResetAt } from './parseResetAt'

describe('parseResetAt', () => {
  describe('invalid input', () => {
    it('returns undefined when resetText is undefined', () => {
      expect(parseResetAt(undefined, '2024-03-10T12:00:00')).toBeUndefined()
    })

    it('returns undefined when resetText is empty', () => {
      expect(parseResetAt('', '2024-03-10T12:00:00')).toBeUndefined()
    })

    it('returns undefined when resetText matches no known form', () => {
      expect(parseResetAt('gibberish', '2024-03-10T12:00:00')).toBeUndefined()
    })

    it('returns undefined for a mixed compact/verbose duration like "2h 30m"', () => {
      expect(parseResetAt('2h 30m', '2024-03-10T12:00:00')).toBeUndefined()
    })

    it('returns undefined when "Resets" has no following text to strip', () => {
      expect(parseResetAt('Resets', '2024-03-10T12:00:00')).toBeUndefined()
    })
  })

  describe('cleaning of the input text', () => {
    it('strips a leading "Resets" case-insensitively', () => {
      expect(parseResetAt('resets 3pm', '2024-03-10T12:00:00')).toBe('2024-03-10T15:00:00')
      expect(parseResetAt('RESETS 3pm', '2024-03-10T12:00:00')).toBe('2024-03-10T15:00:00')
    })

    it('strips a trailing parenthesised zone', () => {
      expect(parseResetAt('Resets 3pm (Europe/London)', '2024-03-10T12:00:00')).toBe(
        '2024-03-10T15:00:00',
      )
    })

    it('strips a trailing parenthesised zone from a month/day form', () => {
      expect(
        parseResetAt('Resets Mar 12 at 3pm (America/New_York)', '2024-03-10T12:00:00'),
      ).toBe('2024-03-12T15:00:00')
    })
  })

  describe('durations', () => {
    it('parses a compact hours+minutes duration', () => {
      expect(parseResetAt('2h30m', '2024-03-10T12:00:00')).toBe('2024-03-10T14:30:00')
    })

    it('parses a compact hours-only duration', () => {
      expect(parseResetAt('2h', '2024-03-10T12:00:00')).toBe('2024-03-10T14:00:00')
    })

    it('parses a compact minutes-only duration', () => {
      expect(parseResetAt('45m', '2024-03-10T12:00:00')).toBe('2024-03-10T12:45:00')
    })

    it('accepts an optional leading "in "', () => {
      expect(parseResetAt('in 2h30m', '2024-03-10T12:00:00')).toBe('2024-03-10T14:30:00')
    })

    it('preserves the seconds of fetchedAt', () => {
      expect(parseResetAt('2h30m', '2024-03-10T12:00:45')).toBe('2024-03-10T14:30:45')
    })

    it('parses a verbose duration with full unit words', () => {
      expect(parseResetAt('3 hours', '2024-03-10T12:00:00')).toBe('2024-03-10T15:00:00')
    })

    it('parses a verbose duration combining hours and minutes without spaces', () => {
      expect(parseResetAt('1hr5min', '2024-03-10T12:00:00')).toBe('2024-03-10T13:05:00')
    })

    it('parses a verbose duration with spaces between value and unit', () => {
      expect(parseResetAt('in 1 hr 5 min', '2024-03-10T12:00:00')).toBe('2024-03-10T13:05:00')
    })

    it('is case-insensitive for verbose units', () => {
      expect(parseResetAt('3 HOURS', '2024-03-10T12:00:00')).toBe('2024-03-10T15:00:00')
    })

    it('accepts singular unit spellings', () => {
      expect(parseResetAt('1 hour 1 minute', '2024-03-10T12:00:00')).toBe('2024-03-10T13:01:00')
    })
  })

  describe('month/day "at" time', () => {
    it('parses a 12-hour time with minutes', () => {
      expect(parseResetAt('Mar 12 at 9:30am', '2024-03-10T12:00:00')).toBe(
        '2024-03-12T09:30:00',
      )
    })

    it('parses a bare 12-hour hour with pm', () => {
      expect(parseResetAt('Mar 12 at 3pm', '2024-03-10T12:00:00')).toBe('2024-03-12T15:00:00')
    })

    it('parses a 24-hour time', () => {
      expect(parseResetAt('Mar 12 at 15:00', '2024-03-10T12:00:00')).toBe('2024-03-12T15:00:00')
    })

    it('zero-pads single-digit day, hour and minute', () => {
      expect(parseResetAt('Mar 5 at 9:05am', '2024-03-10T12:00:00')).toBe('2024-03-05T09:05:00')
    })

    it('uses the year of fetchedAt with no rollover into the next year', () => {
      expect(parseResetAt('Jan 5 at 3pm', '2024-12-20T10:00:00')).toBe('2024-01-05T15:00:00')
    })

    it('always sets seconds to zero', () => {
      expect(parseResetAt('Mar 12 at 15:00', '2024-03-10T12:00:45')).toBe('2024-03-12T15:00:00')
    })
  })

  describe('bare 12-hour time', () => {
    it('places a future time on the same local date as fetchedAt', () => {
      expect(parseResetAt('3pm', '2024-03-10T12:00:00')).toBe('2024-03-10T15:00:00')
    })

    it('rolls over to the next day when more than 15 minutes in the past', () => {
      expect(parseResetAt('9:30am', '2024-03-10T12:00:00')).toBe('2024-03-11T09:30:00')
    })

    it('ignores whitespace between the time and am/pm', () => {
      expect(parseResetAt('9:30 am', '2024-03-10T12:00:00')).toBe('2024-03-11T09:30:00')
    })

    it('is case-insensitive for am/pm', () => {
      expect(parseResetAt('3PM', '2024-03-10T12:00:00')).toBe('2024-03-10T15:00:00')
      expect(parseResetAt('9:30AM', '2024-03-10T12:00:00')).toBe('2024-03-11T09:30:00')
    })

    it('treats 12am as midnight', () => {
      expect(parseResetAt('12am', '2024-03-10T12:00:00')).toBe('2024-03-11T00:00:00')
    })

    it('treats 12pm as noon', () => {
      expect(parseResetAt('12pm', '2024-03-10T11:00:00')).toBe('2024-03-10T12:00:00')
    })

    it('stays on the same day when exactly 15 minutes in the past', () => {
      expect(parseResetAt('11:45am', '2024-03-10T12:00:00')).toBe('2024-03-10T11:45:00')
    })

    it('rolls over to the next day when 16 minutes in the past', () => {
      expect(parseResetAt('11:44am', '2024-03-10T12:00:00')).toBe('2024-03-11T11:44:00')
    })

    it('always sets seconds to zero', () => {
      expect(parseResetAt('3pm', '2024-03-10T12:00:45')).toBe('2024-03-10T15:00:00')
    })
  })
})
