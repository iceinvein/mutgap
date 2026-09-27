import { describe, expect, it } from 'vitest'
import { formatDuration } from './formatDuration'

describe('formatDuration', () => {
  it('returns an en dash for null or undefined', () => {
    expect(formatDuration(null)).toBe('–')
    expect(formatDuration(undefined)).toBe('–')
  })

  describe('under 1000 ms', () => {
    it('formats as the raw number of milliseconds', () => {
      expect(formatDuration(0)).toBe('0ms')
      expect(formatDuration(1)).toBe('1ms')
      expect(formatDuration(999)).toBe('999ms')
    })
  })

  describe('1000 ms up to 10 seconds', () => {
    it('formats with one decimal place, standard rounding', () => {
      expect(formatDuration(1000)).toBe('1.0s')
      expect(formatDuration(1500)).toBe('1.5s')
      expect(formatDuration(9900)).toBe('9.9s')
    })

    it('bases the format choice on the unrounded value', () => {
      // 9960 ms is 9.96s, still under 10s, so it stays in decimal
      // format and rounds up to 10.0s rather than becoming "10s".
      expect(formatDuration(9960)).toBe('10.0s')
    })
  })

  describe('10 seconds up to 60 seconds', () => {
    it('formats as whole seconds, rounded', () => {
      expect(formatDuration(10000)).toBe('10s')
      expect(formatDuration(42400)).toBe('42s')
    })

    it('rounds halves up', () => {
      expect(formatDuration(10500)).toBe('11s')
      expect(formatDuration(42500)).toBe('43s')
    })

    it('bases the format choice on the unrounded value', () => {
      // 59600 ms is 59.6s, still under a minute, so it rounds to
      // "60s" rather than rolling over into minutes.
      expect(formatDuration(59600)).toBe('60s')
    })
  })

  describe('60 seconds and up', () => {
    it('formats as whole minutes and rounded remaining seconds', () => {
      expect(formatDuration(60000)).toBe('1m 0s')
      expect(formatDuration(125000)).toBe('2m 5s')
    })

    it('rounds the remainder after subtracting whole minutes', () => {
      // 119600 ms is 1m 59.6s; the remainder rounds to 60 rather
      // than carrying into a second minute.
      expect(formatDuration(119600)).toBe('1m 60s')
    })
  })
})
