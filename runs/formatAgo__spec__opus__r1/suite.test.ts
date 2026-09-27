import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatAgo } from './formatAgo'

const NOW = 1_700_000_000
const MIN = 60
const HOUR = 60 * MIN
const DAY = 24 * HOUR

// Elapsed seconds -> formatted string, relative to a fixed `nowS`.
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
    })

    it('treats a unixS of 0 as a real timestamp, not missing', () => {
      expect(formatAgo(0, 30)).toBe('30s ago')
    })
  })

  describe('just now', () => {
    it.each([0, 1, 4])('%is elapsed -> "just now"', (s) => {
      expect(ago(s)).toBe('just now')
    })

    it('treats future timestamps as zero elapsed', () => {
      expect(ago(-1)).toBe('just now')
      expect(ago(-10 * DAY)).toBe('just now')
    })
  })

  describe('seconds', () => {
    it.each([
      [5, '5s ago'],
      [6, '6s ago'],
      [30, '30s ago'],
      [59, '59s ago'],
    ])('%is elapsed -> %s', (s, expected) => {
      expect(ago(s)).toBe(expected)
    })
  })

  describe('minutes (rounded down)', () => {
    it.each([
      [60, '1m ago'],
      [61, '1m ago'],
      [119, '1m ago'],
      [120, '2m ago'],
      [30 * MIN + 59, '30m ago'],
      [HOUR - 1, '59m ago'],
    ])('%is elapsed -> %s', (s, expected) => {
      expect(ago(s)).toBe(expected)
    })
  })

  describe('hours (rounded down)', () => {
    it.each([
      [HOUR, '1h ago'],
      [2 * HOUR - 1, '1h ago'],
      [2 * HOUR, '2h ago'],
      [23 * HOUR, '23h ago'],
      [DAY - 1, '23h ago'],
    ])('%is elapsed -> %s', (s, expected) => {
      expect(ago(s)).toBe(expected)
    })
  })

  describe('days (rounded down, no upper unit)', () => {
    it.each([
      [DAY, '1d ago'],
      [2 * DAY - 1, '1d ago'],
      [2 * DAY, '2d ago'],
      [12 * DAY + 23 * HOUR, '12d ago'],
      [365 * DAY, '365d ago'],
      [10_000 * DAY, '10000d ago'],
    ])('%is elapsed -> %s', (s, expected) => {
      expect(ago(s)).toBe(expected)
    })
  })

  describe('reading the clock', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('uses the current time when nowS is undefined', () => {
      vi.useFakeTimers()
      vi.setSystemTime(NOW * 1000)
      expect(formatAgo(NOW - 3 * HOUR)).toBe('3h ago')
      expect(formatAgo(NOW - 10, undefined)).toBe('10s ago')
    })

    it('uses the current time when nowS is null', () => {
      vi.useFakeTimers()
      vi.setSystemTime(NOW * 1000)
      expect(formatAgo(NOW - 2 * DAY, null as unknown as undefined)).toBe('2d ago')
    })

    it('uses an explicit nowS of 0 rather than the clock', () => {
      vi.useFakeTimers()
      vi.setSystemTime(NOW * 1000)
      expect(formatAgo(-10, 0)).toBe('10s ago')
    })

    it('rounds the clock down to a whole second', () => {
      vi.useFakeTimers()
      // 999ms past NOW: rounding down gives NOW; rounding to nearest/up gives NOW + 1.
      vi.setSystemTime(NOW * 1000 + 999)
      expect(formatAgo(NOW - 4)).toBe('just now')
      expect(formatAgo(NOW - 59)).toBe('59s ago')
      expect(formatAgo(NOW - (HOUR - 1))).toBe('59m ago')
    })

    it('does not produce fractional seconds from the clock', () => {
      vi.useFakeTimers()
      vi.setSystemTime(NOW * 1000 + 500)
      expect(formatAgo(NOW - 7)).toBe('7s ago')
    })
  })
})
