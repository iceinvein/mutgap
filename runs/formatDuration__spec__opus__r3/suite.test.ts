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
  })

  describe('under 1000 ms', () => {
    it.each([
      [0, '0ms'],
      [1, '1ms'],
      [42, '42ms'],
      [999, '999ms'],
    ])('formats %d as %s', (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected)
    })

    it('prints fractional milliseconds exactly as String() would', () => {
      expect(formatDuration(0.5)).toBe('0.5ms')
      expect(formatDuration(999.5)).toBe('999.5ms')
    })
  })

  describe('1 s up to under 10 s', () => {
    it.each([
      [1000, '1.0s'],
      [1500, '1.5s'],
      [9900, '9.9s'],
      [1049, '1.0s'],
      [1051, '1.1s'],
      [2340, '2.3s'],
      [2360, '2.4s'],
    ])('formats %d as %s with one decimal place', (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected)
    })

    it('chooses the format from the unrounded value', () => {
      expect(formatDuration(9960)).toBe('10.0s')
      expect(formatDuration(9999)).toBe('10.0s')
    })
  })

  describe('10 s up to under 60 s', () => {
    it.each([
      [10000, '10s'],
      [42400, '42s'],
      [42600, '43s'],
      [59499, '59s'],
    ])('formats %d as %s in whole seconds', (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected)
    })

    it('rounds halves up', () => {
      expect(formatDuration(10500)).toBe('11s')
      expect(formatDuration(42500)).toBe('43s')
    })

    it('chooses the format from the unrounded value', () => {
      expect(formatDuration(59600)).toBe('60s')
      expect(formatDuration(59999)).toBe('60s')
    })
  })

  describe('60 s and above', () => {
    it.each([
      [60000, '1m 0s'],
      [61000, '1m 1s'],
      [125000, '2m 5s'],
      [90400, '1m 30s'],
      [3600000, '60m 0s'],
    ])('formats %d as %s', (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected)
    })

    it('rounds down the minutes', () => {
      expect(formatDuration(119000)).toBe('1m 59s')
    })

    it('rounds the remaining seconds, halves up', () => {
      expect(formatDuration(90500)).toBe('1m 31s')
      expect(formatDuration(90600)).toBe('1m 31s')
    })

    it('rounds the remainder after the minutes are taken', () => {
      expect(formatDuration(119600)).toBe('1m 60s')
    })
  })
})
