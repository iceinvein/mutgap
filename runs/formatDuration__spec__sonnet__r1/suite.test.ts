import { describe, expect, it } from 'vitest'
import { formatDuration } from './formatDuration'

describe('formatDuration', () => {
  it('formats null and undefined as an en dash', () => {
    expect(formatDuration(null)).toBe('–')
    expect(formatDuration(undefined)).toBe('–')
  })

  it('formats durations under 1000ms as milliseconds', () => {
    expect(formatDuration(0)).toBe('0ms')
    expect(formatDuration(1)).toBe('1ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('formats durations from 1s up to under 10s with one decimal place', () => {
    expect(formatDuration(1000)).toBe('1.0s')
    expect(formatDuration(1500)).toBe('1.5s')
    expect(formatDuration(9900)).toBe('9.9s')
  })

  it('rounds the decimal seconds format using standard rounding', () => {
    // 9960ms = 9.96s, still under 10s unrounded, so uses decimal format,
    // which rounds up to 10.0s
    expect(formatDuration(9960)).toBe('10.0s')
  })

  it('formats durations from 10s up to under 60s as whole seconds', () => {
    expect(formatDuration(10000)).toBe('10s')
    expect(formatDuration(42400)).toBe('42s')
  })

  it('rounds whole seconds half up', () => {
    expect(formatDuration(42500)).toBe('43s')
  })

  it('picks the whole-seconds format based on the unrounded value, even if that rounds up to 60', () => {
    // 59600ms = 59.6s, unrounded value is still under 60s, so it is not
    // promoted to minutes formatting, even though it rounds to 60s
    expect(formatDuration(59600)).toBe('60s')
  })

  it('formats durations from 60s on as minutes and whole seconds', () => {
    expect(formatDuration(60000)).toBe('1m 0s')
    expect(formatDuration(125000)).toBe('2m 5s')
  })

  it('rounds the remaining seconds after subtracting whole minutes, which can reach 60', () => {
    // 119600ms = 1m 59.6s; minutes are floored to 1, and the remainder
    // (59.6s) is rounded on its own, giving 60s rather than rolling to 2m 0s
    expect(formatDuration(119600)).toBe('1m 60s')
  })
})
