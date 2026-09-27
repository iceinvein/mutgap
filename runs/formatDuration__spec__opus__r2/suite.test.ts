import { describe, expect, it } from 'vitest'
import { formatDuration } from './formatDuration'

describe('formatDuration', () => {
  describe('missing values', () => {
    it('returns an en dash for null', () => {
      expect(formatDuration(null)).toBe('–')
    })

    it('returns an en dash for undefined', () => {
      expect(formatDuration(undefined)).toBe('–')
    })

    it('returns an en dash, not a hyphen or em dash', () => {
      const result = formatDuration(null)
      expect(result).not.toBe('-')
      expect(result).not.toBe('—')
    })
  })

  describe('under 1000 ms', () => {
    it.each([
      [0, '0ms'],
      [1, '1ms'],
      [42, '42ms'],
      [500, '500ms'],
      [999, '999ms'],
    ])('formats %d as %s', (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected)
    })

    it('prints non-integer values exactly as String() does', () => {
      expect(formatDuration(0.5)).toBe('0.5ms')
      expect(formatDuration(12.34)).toBe('12.34ms')
      expect(formatDuration(999.9)).toBe('999.9ms')
    })
  })

  describe('from 1 s to under 10 s', () => {
    it.each([
      [1000, '1.0s'],
      [1500, '1.5s'],
      [2000, '2.0s'],
      [9900, '9.9s'],
    ])('formats %d as %s', (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected)
    })

    it('rounds to one decimal place', () => {
      expect(formatDuration(1040)).toBe('1.0s')
      expect(formatDuration(1060)).toBe('1.1s')
      expect(formatDuration(1234)).toBe('1.2s')
      expect(formatDuration(1260)).toBe('1.3s')
    })

    it('switches from ms to seconds at exactly 1000', () => {
      expect(formatDuration(999)).toBe('999ms')
      expect(formatDuration(1000)).toBe('1.0s')
    })

    it('chooses the format on the unrounded value (9960 ms stays in this range)', () => {
      expect(formatDuration(9960)).toBe('10.0s')
      expect(formatDuration(9999)).toBe('10.0s')
    })
  })

  describe('from 10 s to under 60 s', () => {
    it.each([
      [10000, '10s'],
      [42400, '42s'],
      [30000, '30s'],
      [59000, '59s'],
    ])('formats %d as %s', (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected)
    })

    it('rounds to whole seconds with halves rounding up', () => {
      expect(formatDuration(10400)).toBe('10s')
      expect(formatDuration(10500)).toBe('11s')
      expect(formatDuration(42600)).toBe('43s')
      expect(formatDuration(59499)).toBe('59s')
    })

    it('switches from one decimal to whole seconds at exactly 10000', () => {
      expect(formatDuration(9900)).toBe('9.9s')
      expect(formatDuration(10000)).toBe('10s')
    })

    it('chooses the format on the unrounded value (59600 ms stays in this range)', () => {
      expect(formatDuration(59600)).toBe('60s')
      expect(formatDuration(59999)).toBe('60s')
    })
  })

  describe('60 s and above', () => {
    it.each([
      [60000, '1m 0s'],
      [125000, '2m 5s'],
      [61000, '1m 1s'],
      [90000, '1m 30s'],
      [600000, '10m 0s'],
    ])('formats %d as %s', (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected)
    })

    it('switches to minutes at exactly 60000', () => {
      expect(formatDuration(59999)).toBe('60s')
      expect(formatDuration(60000)).toBe('1m 0s')
    })

    it('rounds minutes down', () => {
      expect(formatDuration(119000)).toBe('1m 59s')
      expect(formatDuration(179000)).toBe('2m 59s')
    })

    it('rounds the remaining seconds to a whole number, halves up', () => {
      expect(formatDuration(60400)).toBe('1m 0s')
      expect(formatDuration(60500)).toBe('1m 1s')
      expect(formatDuration(125400)).toBe('2m 5s')
      expect(formatDuration(125600)).toBe('2m 6s')
    })

    it('rounds the remainder after taking the minutes (119600 ms is 1m 60s)', () => {
      expect(formatDuration(119600)).toBe('1m 60s')
      expect(formatDuration(179999)).toBe('2m 60s')
    })

    it('does not roll over into hours', () => {
      expect(formatDuration(3600000)).toBe('60m 0s')
      expect(formatDuration(3725000)).toBe('62m 5s')
    })
  })
})
