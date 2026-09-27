import { describe, expect, it } from 'vitest'
import { parseResetAt } from './parseResetAt'

describe('parseResetAt', () => {
  describe('invalid input', () => {
    it('returns undefined when resetText is undefined', () => {
      expect(parseResetAt(undefined, '2024-03-12T14:22:05')).toBeUndefined()
    })

    it('returns undefined when resetText is empty', () => {
      expect(parseResetAt('', '2024-03-12T14:22:05')).toBeUndefined()
    })

    it('returns undefined when resetText matches none of the known forms', () => {
      expect(parseResetAt('whenever it feels like it', '2024-03-12T14:22:05')).toBeUndefined()
    })

    it('returns undefined for a mixed duration form ("2h 30m" with a space)', () => {
      expect(parseResetAt('Resets in 2h 30m', '2024-03-12T14:22:05')).toBeUndefined()
    })
  })

  describe('cleaning of the input text', () => {
    it('strips a leading "Resets" (case-insensitive)', () => {
      expect(parseResetAt('resets 3pm', '2024-03-12T14:22:05')).toBe('2024-03-12T15:00:00')
      expect(parseResetAt('RESETS 3pm', '2024-03-12T14:22:05')).toBe('2024-03-12T15:00:00')
    })

    it('strips a trailing parenthesised timezone group', () => {
      expect(parseResetAt('Resets 3pm (Europe/London)', '2024-03-12T14:22:05')).toBe(
        '2024-03-12T15:00:00',
      )
    })
  })

  describe('durations', () => {
    it('parses compact hours and minutes ("2h30m")', () => {
      expect(parseResetAt('Resets 2h30m', '2024-03-12T14:22:05')).toBe('2024-03-12T16:52:05')
    })

    it('parses compact minutes only ("45m")', () => {
      expect(parseResetAt('Resets 45m', '2024-03-12T14:22:05')).toBe('2024-03-12T15:07:05')
    })

    it('parses compact hours only ("2h")', () => {
      expect(parseResetAt('Resets 2h', '2024-03-12T14:22:05')).toBe('2024-03-12T16:22:05')
    })

    it('accepts an optional leading "in "', () => {
      expect(parseResetAt('Resets in 2h30m', '2024-03-12T14:22:05')).toBe('2024-03-12T16:52:05')
    })

    it('parses verbose durations ("3 hours")', () => {
      expect(parseResetAt('Resets in 3 hours', '2024-03-12T14:22:05')).toBe('2024-03-12T17:22:05')
    })

    it('parses verbose durations with mixed units ("1 hr 5 min")', () => {
      expect(parseResetAt('Resets in 1 hr 5 min', '2024-03-12T14:22:05')).toBe(
        '2024-03-12T15:27:05',
      )
    })

    it('parses verbose durations case-insensitively and without spaces', () => {
      expect(parseResetAt('Resets in 1HOUR5MINUTES', '2024-03-12T14:22:05')).toBe(
        '2024-03-12T15:27:05',
      )
    })

    it('keeps the seconds from fetchedAt', () => {
      expect(parseResetAt('Resets 1h', '2024-03-12T14:22:47')).toBe('2024-03-12T15:22:47')
    })

    it('rolls over into the next day when the duration crosses midnight', () => {
      expect(parseResetAt('Resets 2h', '2024-03-12T23:00:00')).toBe('2024-03-13T01:00:00')
    })
  })

  describe('month and day with an explicit time', () => {
    it('parses "Mon D at h:mmam/pm"', () => {
      expect(parseResetAt('Resets Mar 12 at 9:30am', '2024-01-05T10:00:00')).toBe(
        '2024-03-12T09:30:00',
      )
    })

    it('parses "Mon D at hpm"', () => {
      expect(parseResetAt('Resets Mar 12 at 3pm', '2024-01-05T10:00:00')).toBe(
        '2024-03-12T15:00:00',
      )
    })

    it('parses "Mon D at HH:MM" (24-hour)', () => {
      expect(parseResetAt('Resets Mar 12 at 15:00', '2024-01-05T10:00:00')).toBe(
        '2024-03-12T15:00:00',
      )
    })

    it('uses the year of fetchedAt with no rollover into the next year', () => {
      expect(parseResetAt('Resets Jan 5 at 9:00am', '2024-12-20T10:00:00')).toBe(
        '2024-01-05T09:00:00',
      )
    })

    it('always sets seconds to zero', () => {
      expect(parseResetAt('Resets Mar 12 at 9:30am', '2024-01-05T10:00:45')).toBe(
        '2024-03-12T09:30:00',
      )
    })
  })

  describe('bare 12-hour time', () => {
    it('places the time on the local date of fetchedAt', () => {
      expect(parseResetAt('Resets 3pm', '2024-03-12T10:00:00')).toBe('2024-03-12T15:00:00')
    })

    it('treats 12am as midnight', () => {
      expect(parseResetAt('Resets 12am', '2024-03-12T10:00:00')).toBe('2024-03-12T00:00:00')
    })

    it('treats 12pm as noon', () => {
      expect(parseResetAt('Resets 12pm', '2024-03-12T00:00:00')).toBe('2024-03-12T12:00:00')
    })

    it('ignores whitespace between the time and am/pm', () => {
      expect(parseResetAt('Resets 9:30 am', '2024-03-12T08:00:00')).toBe('2024-03-12T09:30:00')
    })

    it('always sets seconds to zero', () => {
      expect(parseResetAt('Resets 3:15pm', '2024-03-12T10:00:00')).toBe('2024-03-12T15:15:00')
    })

    it('stays on the same day when up to 15 minutes in the past', () => {
      expect(parseResetAt('Resets 2:07pm', '2024-03-12T14:22:00')).toBe('2024-03-12T14:07:00')
    })

    it('rolls to the next day when more than 15 minutes in the past', () => {
      expect(parseResetAt('Resets 2:07pm', '2024-03-12T14:22:01')).toBe('2024-03-13T14:07:00')
    })

    it('rolls to the next day for a time well in the past', () => {
      expect(parseResetAt('Resets 2pm', '2024-03-12T14:22:05')).toBe('2024-03-13T14:00:00')
    })

    it('stays on the same day for a time in the future', () => {
      expect(parseResetAt('Resets 2:30pm', '2024-03-12T14:22:05')).toBe('2024-03-12T14:30:00')
    })
  })
})
