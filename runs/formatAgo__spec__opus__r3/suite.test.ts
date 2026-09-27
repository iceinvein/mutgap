import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatAgo } from './formatAgo'

const NOW = 1_700_000_000
const MIN = 60
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const ago = (elapsedS: number) => formatAgo(NOW - elapsedS, NOW)

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

    it('does not treat 0 (the epoch) as missing', () => {
      expect(formatAgo(0, 30)).toBe('30s ago')
    })
  })

  describe('just now', () => {
    it.each([0, 1, 4])('returns "just now" for %is elapsed', (s) => {
      expect(ago(s)).toBe('just now')
    })

    it('treats a fractional elapsed time just under 5s as "just now"', () => {
      expect(ago(4.9)).toBe('just now')
    })

    it.each([1, 60, DAY])('treats a timestamp %is in the future as zero elapsed', (s) => {
      expect(formatAgo(NOW + s, NOW)).toBe('just now')
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

  describe('minutes', () => {
    it.each([
      [60, '1m ago'],
      [61, '1m ago'],
      [119, '1m ago'],
      [120, '2m ago'],
      [30 * MIN + 59, '30m ago'],
      [59 * MIN, '59m ago'],
      [HOUR - 1, '59m ago'],
    ])('%is elapsed -> %s', (s, expected) => {
      expect(ago(s)).toBe(expected)
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
    ])('%is elapsed -> %s', (s, expected) => {
      expect(ago(s)).toBe(expected)
    })
  })

  describe('days', () => {
    it.each([
      [DAY, '1d ago'],
      [DAY + 1, '1d ago'],
      [2 * DAY - 1, '1d ago'],
      [2 * DAY, '2d ago'],
      [12 * DAY + 23 * HOUR, '12d ago'],
      [365 * DAY, '365d ago'],
      [10_000 * DAY, '10000d ago'],
    ])('%is elapsed -> %s (no unit above days)', (s, expected) => {
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
      expect(formatAgo(NOW - 90)).toBe('1m ago')
      expect(formatAgo(NOW - 90, undefined)).toBe('1m ago')
    })

    it('uses the current time when nowS is null', () => {
      vi.useFakeTimers()
      vi.setSystemTime(NOW * 1000)
      // The spec allows null for nowS even though the signature does not.
      expect(formatAgo(NOW - 2 * HOUR, null as unknown as undefined)).toBe('2h ago')
    })

    it('rounds the clock down to a whole second', () => {
      vi.useFakeTimers()
      // 4.999s after unixS: flooring the clock gives 4s ("just now");
      // rounding to nearest would give 5s ("5s ago").
      vi.setSystemTime((NOW + 4) * 1000 + 999)
      expect(formatAgo(NOW)).toBe('just now')
      // Exactly 5s once the clock reaches the next whole second.
      vi.setSystemTime((NOW + 5) * 1000)
      expect(formatAgo(NOW)).toBe('5s ago')
    })

    it('rounds the clock down at the minute boundary', () => {
      vi.useFakeTimers()
      vi.setSystemTime((NOW + 59) * 1000 + 999)
      expect(formatAgo(NOW)).toBe('59s ago')
    })

    it('prefers an explicit nowS over the clock', () => {
      vi.useFakeTimers()
      vi.setSystemTime((NOW + DAY) * 1000)
      expect(formatAgo(NOW - 10, NOW)).toBe('10s ago')
    })
  })
})
