import { describe, expect, it } from 'vitest'
import { formatDuration } from './formatDuration'

describe('formatDuration', () => {
  it('formats null and undefined as an en dash', () => {
    expect(formatDuration(null)).toBe('–')
    expect(formatDuration(undefined)).toBe('–')
  })

  describe('under 1000ms', () => {
    it('writes the raw millisecond count followed by "ms"', () => {
      expect(formatDuration(0)).toBe('0ms')
      expect(formatDuration(999)).toBe('999ms')
      expect(formatDuration(1)).toBe('1ms')
    })
  })

  describe('1000ms up to 10s', () => {
    it('writes seconds with one decimal place', () => {
      expect(formatDuration(1000)).toBe('1.0s')
      expect(formatDuration(1500)).toBe('1.5s')
      expect(formatDuration(9900)).toBe('9.9s')
    })

    it('rounds the decimal using standard rounding', () => {
      expect(formatDuration(9960)).toBe('10.0s')
    })

    it('bases the format choice on the unrounded value', () => {
      expect(formatDuration(9999)).toBe('10.0s')
    })
  })

  describe('10s up to 60s', () => {
    it('rounds to whole seconds', () => {
      expect(formatDuration(10000)).toBe('10s')
      expect(formatDuration(42400)).toBe('42s')
    })

    it('rounds halves up', () => {
      expect(formatDuration(10500)).toBe('11s')
    })

    it('bases the format choice on the unrounded value, not the rounded one', () => {
      expect(formatDuration(59600)).toBe('60s')
      expect(formatDuration(59999)).toBe('60s')
    })
  })

  describe('60s and up', () => {
    it('writes whole minutes (rounded down), a space, and rounded remaining seconds', () => {
      expect(formatDuration(60000)).toBe('1m 0s')
      expect(formatDuration(125000)).toBe('2m 5s')
    })

    it('rounds the remaining seconds after subtracting whole minutes', () => {
      expect(formatDuration(61500)).toBe('1m 2s')
    })

    it('can round the remaining seconds up to 60', () => {
      expect(formatDuration(119600)).toBe('1m 60s')
    })
  })
})
