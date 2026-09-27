import { describe, expect, it } from 'vitest'
import { parseResetAt } from './parseResetAt'

// fetchedAt values are written without a zone suffix so they are parsed as
// local time, matching the local-time output. Dates avoid DST transitions.
const JUNE = '2026-06-15T10:12:34'

function formatLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  )
}

describe('parseResetAt', () => {
  describe('missing or unrecognised input', () => {
    it('returns undefined for undefined', () => {
      expect(parseResetAt(undefined, JUNE)).toBeUndefined()
    })

    it('returns undefined for an empty string', () => {
      expect(parseResetAt('', JUNE)).toBeUndefined()
    })

    it.each(['soon', 'Resets', 'Resets tomorrow', 'in', '2 days', 'h', '(Europe/London)'])(
      'returns undefined for %j',
      (text) => {
        expect(parseResetAt(text, JUNE)).toBeUndefined()
      },
    )
  })

  describe('cleaning', () => {
    it('strips a leading "Resets" and a trailing parenthesised zone', () => {
      expect(parseResetAt('Resets 3pm (Europe/London)', JUNE)).toBe('2026-06-15T15:00:00')
    })

    it('strips "Resets" case-insensitively', () => {
      expect(parseResetAt('RESETS 3pm', JUNE)).toBe('2026-06-15T15:00:00')
      expect(parseResetAt('resets in 2h', JUNE)).toBe('2026-06-15T12:12:34')
    })

    it('trims surrounding whitespace', () => {
      expect(parseResetAt('   Resets   in 45m   (UTC)  ', JUNE)).toBe('2026-06-15T10:57:34')
    })

    it('works without the "Resets" prefix or zone suffix', () => {
      expect(parseResetAt('3pm', JUNE)).toBe('2026-06-15T15:00:00')
    })
  })

  describe('compact durations', () => {
    it.each([
      ['2h30m', '2026-06-15T12:42:34'],
      ['2h', '2026-06-15T12:12:34'],
      ['45m', '2026-06-15T10:57:34'],
      ['0m', '2026-06-15T10:12:34'],
      ['in 2h30m', '2026-06-15T12:42:34'],
      ['Resets in 2h30m', '2026-06-15T12:42:34'],
      ['2H30M', '2026-06-15T12:42:34'],
      ['IN 45M', '2026-06-15T10:57:34'],
    ])('%j is added to fetchedAt, keeping seconds', (text, expected) => {
      expect(parseResetAt(text, JUNE)).toBe(expected)
    })

    it('handles minutes above 59', () => {
      expect(parseResetAt('90m', JUNE)).toBe('2026-06-15T11:42:34')
    })

    it('rolls over into the next day', () => {
      expect(parseResetAt('in 2h30m', '2026-06-15T23:00:05')).toBe('2026-06-16T01:30:05')
    })

    it('rolls over into the next year', () => {
      expect(parseResetAt('in 1h', '2026-12-31T23:30:00')).toBe('2027-01-01T00:30:00')
    })

    it('rejects the mixed form with a space', () => {
      expect(parseResetAt('2h 30m', JUNE)).toBeUndefined()
      expect(parseResetAt('in 2h 30m', JUNE)).toBeUndefined()
    })

    it('rejects minutes before hours', () => {
      expect(parseResetAt('30m2h', JUNE)).toBeUndefined()
    })
  })

  describe('verbose durations', () => {
    it.each([
      ['3 hours', '2026-06-15T13:12:34'],
      ['1 hour', '2026-06-15T11:12:34'],
      ['1 hr', '2026-06-15T11:12:34'],
      ['5 min', '2026-06-15T10:17:34'],
      ['1 minute', '2026-06-15T10:13:34'],
      ['20 minutes', '2026-06-15T10:32:34'],
      ['1 hr 5 min', '2026-06-15T11:17:34'],
      ['1hr5min', '2026-06-15T11:17:34'],
      ['1hr 5min', '2026-06-15T11:17:34'],
      ['2 hours 30 minutes', '2026-06-15T12:42:34'],
      ['2hours30minutes', '2026-06-15T12:42:34'],
      ['1 hour 1 minute', '2026-06-15T11:13:34'],
      ['in 3 hours', '2026-06-15T13:12:34'],
      ['Resets in 1 hr 5 min', '2026-06-15T11:17:34'],
      ['3 HOURS', '2026-06-15T13:12:34'],
      ['1 Hr 5 Min', '2026-06-15T11:17:34'],
    ])('%j is added to fetchedAt, keeping seconds', (text, expected) => {
      expect(parseResetAt(text, JUNE)).toBe(expected)
    })

    it('rolls over into the next day', () => {
      expect(parseResetAt('in 3 hours', '2026-06-15T22:15:59')).toBe('2026-06-16T01:15:59')
    })
  })

  describe('durations with a UTC fetchedAt', () => {
    it('adds the duration to the instant and prints local time', () => {
      const fetchedAt = '2026-06-15T10:12:34Z'
      const expected = formatLocal(new Date(Date.parse(fetchedAt) + (2 * 60 + 30) * 60_000))
      expect(parseResetAt('in 2h30m', fetchedAt)).toBe(expected)
    })
  })

  describe('month, day and time', () => {
    it.each([
      ['Mar 12 at 9:30am', '2026-03-12T09:30:00'],
      ['Mar 12 at 3pm', '2026-03-12T15:00:00'],
      ['Mar 12 at 15:00', '2026-03-12T15:00:00'],
      ['Resets Mar 12 at 9:30am (Europe/London)', '2026-03-12T09:30:00'],
      ['Jun 20 at 12am', '2026-06-20T00:00:00'],
      ['Jun 20 at 12pm', '2026-06-20T12:00:00'],
      ['Jun 20 at 12:30am', '2026-06-20T00:30:00'],
      ['Dec 31 at 11:59pm', '2026-12-31T23:59:00'],
      ['Jan 1 at 0:00', '2026-01-01T00:00:00'],
    ])('%j uses the year of fetchedAt with seconds zero', (text, expected) => {
      expect(parseResetAt(text, JUNE)).toBe(expected)
    })

    it('does not roll into the next year for a date earlier than fetchedAt', () => {
      expect(parseResetAt('Jan 2 at 9am', '2026-12-30T10:00:00')).toBe('2026-01-02T09:00:00')
    })

    it('does not move a same-day time that is already past', () => {
      expect(parseResetAt('Jun 15 at 9am', JUNE)).toBe('2026-06-15T09:00:00')
    })
  })

  describe('bare 12-hour times', () => {
    it.each([
      ['3pm', '2026-06-15T15:00:00'],
      ['3PM', '2026-06-15T15:00:00'],
      ['11:45am', '2026-06-15T11:45:00'],
      ['11:45 am', '2026-06-15T11:45:00'],
      [' 11 : 45 a m ', '2026-06-15T11:45:00'],
      ['12pm', '2026-06-15T12:00:00'],
      ['11:59pm', '2026-06-15T23:59:00'],
    ])('%j is placed on the date of fetchedAt with seconds zero', (text, expected) => {
      expect(parseResetAt(text, JUNE)).toBe(expected)
    })

    it('treats 12am as midnight, which is in the past and so moves to the next day', () => {
      expect(parseResetAt('12am', JUNE)).toBe('2026-06-16T00:00:00')
    })

    it('treats 12:30am as half past midnight', () => {
      expect(parseResetAt('12:30am', '2026-06-15T00:10:00')).toBe('2026-06-15T00:30:00')
    })

    it('treats 12pm as noon', () => {
      expect(parseResetAt('12pm', '2026-06-15T11:00:00')).toBe('2026-06-15T12:00:00')
    })

    it('keeps a time exactly equal to fetchedAt on the same day', () => {
      expect(parseResetAt('10am', '2026-06-15T10:00:00')).toBe('2026-06-15T10:00:00')
    })

    it('keeps a time up to 15 minutes in the past on the same day', () => {
      expect(parseResetAt('9:30am', '2026-06-15T09:40:00')).toBe('2026-06-15T09:30:00')
    })

    it('keeps a time exactly 15 minutes in the past on the same day', () => {
      expect(parseResetAt('9:30am', '2026-06-15T09:45:00')).toBe('2026-06-15T09:30:00')
    })

    it('moves a time just over 15 minutes in the past to the next day', () => {
      expect(parseResetAt('9:30am', '2026-06-15T09:45:01')).toBe('2026-06-16T09:30:00')
    })

    it('moves a time well in the past to the next day', () => {
      expect(parseResetAt('9am', JUNE)).toBe('2026-06-16T09:00:00')
    })

    it('rolls over month end', () => {
      expect(parseResetAt('Resets 8am (Europe/London)', '2026-06-30T20:00:00')).toBe(
        '2026-07-01T08:00:00',
      )
    })

    it('rolls over year end', () => {
      expect(parseResetAt('9am', '2026-12-31T20:00:00')).toBe('2027-01-01T09:00:00')
    })

    it('uses the local date of a UTC fetchedAt', () => {
      const fetchedAt = '2026-06-15T10:12:34Z'
      const f = new Date(fetchedAt)
      const candidate = new Date(f.getFullYear(), f.getMonth(), f.getDate(), 15, 0, 0)
      if (f.getTime() - candidate.getTime() > 15 * 60_000) candidate.setDate(candidate.getDate() + 1)
      expect(parseResetAt('3pm', fetchedAt)).toBe(formatLocal(candidate))
    })
  })
})
