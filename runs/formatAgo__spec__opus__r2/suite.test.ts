import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatAgo } from './formatAgo'

const NOW = 1_700_000_000

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const ago = (elapsed: number) => formatAgo(NOW - elapsed, NOW)

describe('formatAgo', () => {
  describe('missing timestamp', () => {
    it('returns an en dash for null', () => {
      expect(formatAgo(null, NOW)).toBe('–')
    })

    it('returns an en dash for undefined', () => {
      expect(formatAgo(undefined, NOW)).toBe('–')
    })

    it('returns an en dash when nowS is also omitted', () => {
      expect(formatAgo(null)).toBe('–')
      expect(formatAgo(undefined)).toBe('–')
    })

    it('treats 0 as a real timestamp, not a missing one', () => {
      expect(formatAgo(0, 30)).toBe('30s ago')
    })
  })

  describe('just now', () => {
    it.each([0, 1, 4])('returns "just now" for %is elapsed', (elapsed) => {
      expect(ago(elapsed)).toBe('just now')
    })

    it.each([1, 60, DAY, 365 * DAY])(
      'treats a timestamp %is in the future as zero elapsed',
      (ahead) => {
        expect(formatAgo(NOW + ahead, NOW)).toBe('just now')
      },
    )
  })

  describe('seconds', () => {
    it.each([
      [5, '5s ago'],
      [6, '6s ago'],
      [30, '30s ago'],
      [59, '59s ago'],
    ])('%is elapsed -> %s', (elapsed, expected) => {
      expect(ago(elapsed)).toBe(expected)
    })
  })

  describe('minutes', () => {
    it.each([
      [60, '1m ago'],
      [61, '1m ago'],
      [119, '1m ago'],
      [120, '2m ago'],
      [30 * MINUTE + 59, '30m ago'],
      [59 * MINUTE, '59m ago'],
      [HOUR - 1, '59m ago'],
    ])('%is elapsed -> %s', (elapsed, expected) => {
      expect(ago(elapsed)).toBe(expected)
    })
  })

  describe('hours', () => {
    it.each([
      [HOUR, '1h ago'],
      [HOUR + 1, '1h ago'],
      [2 * HOUR - 1, '1h ago'],
      [2 * HOUR, '2h ago'],
      [23 * HOUR, '23h ago'],
      [DAY - 1, '23h ago'],
    ])('%is elapsed -> %s', (elapsed, expected) => {
      expect(ago(elapsed)).toBe(expected)
    })
  })

  describe('days', () => {
    it.each([
      [DAY, '1d ago'],
      [DAY + 1, '1d ago'],
      [2 * DAY - 1, '1d ago'],
      [2 * DAY, '2d ago'],
      [12 * DAY + 23 * HOUR, '12d ago'],
      [30 * DAY, '30d ago'],
      [365 * DAY, '365d ago'],
      [1000 * DAY, '1000d ago'],
    ])('%is elapsed -> %s (no larger unit)', (elapsed, expected) => {
      expect(ago(elapsed)).toBe(expected)
    })
  })

  describe('explicit nowS', () => {
    it('uses nowS rather than the clock', () => {
      expect(formatAgo(1000, 1010)).toBe('10s ago')
    })

    it('treats nowS = 0 as a real time, not as omitted', () => {
      expect(formatAgo(-10, 0)).toBe('10s ago')
      expect(formatAgo(-2 * HOUR, 0)).toBe('2h ago')
    })
  })

  describe('omitted nowS reads the clock', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('uses the current time when nowS is undefined', () => {
      vi.setSystemTime(NOW * 1000)
      expect(formatAgo(NOW - 10)).toBe('10s ago')
      expect(formatAgo(NOW - 10, undefined)).toBe('10s ago')
    })

    it('uses the current time when nowS is null', () => {
      vi.setSystemTime(NOW * 1000)
      expect(formatAgo(NOW - 3 * HOUR, null as unknown as undefined)).toBe('3h ago')
    })

    it('rounds the clock down to a whole second', () => {
      // 999ms past NOW: rounding down gives NOW, rounding to nearest/up gives NOW + 1
      vi.setSystemTime(NOW * 1000 + 999)
      expect(formatAgo(NOW - 5)).toBe('5s ago')
      expect(formatAgo(NOW - 4)).toBe('just now')
      expect(formatAgo(NOW - 59)).toBe('59s ago')
      expect(formatAgo(NOW - (HOUR - 1))).toBe('59m ago')
    })

    it('follows the clock as it advances', () => {
      vi.setSystemTime(NOW * 1000)
      const ts = NOW
      expect(formatAgo(ts)).toBe('just now')
      vi.advanceTimersByTime(5_000)
      expect(formatAgo(ts)).toBe('5s ago')
      vi.advanceTimersByTime(55_000)
      expect(formatAgo(ts)).toBe('1m ago')
      vi.setSystemTime((NOW + DAY) * 1000)
      expect(formatAgo(ts)).toBe('1d ago')
    })
  })
})
