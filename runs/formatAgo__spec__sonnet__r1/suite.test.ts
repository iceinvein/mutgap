import { describe, expect, it, vi } from 'vitest'
import { formatAgo } from './formatAgo'

describe('formatAgo', () => {
  it('returns an en dash for null', () => {
    expect(formatAgo(null, 1000)).toBe('–')
  })

  it('returns an en dash for undefined', () => {
    expect(formatAgo(undefined, 1000)).toBe('–')
  })

  it('treats a future timestamp as zero seconds elapsed', () => {
    expect(formatAgo(1000, 500)).toBe('just now')
  })

  it('returns "just now" for 0 seconds elapsed', () => {
    expect(formatAgo(1000, 1000)).toBe('just now')
  })

  it('returns "just now" for 4 seconds elapsed', () => {
    expect(formatAgo(996, 1000)).toBe('just now')
  })

  it('returns seconds at the lower boundary of 5', () => {
    expect(formatAgo(995, 1000)).toBe('5s ago')
  })

  it('returns seconds at the upper boundary of 59', () => {
    expect(formatAgo(1000 - 59, 1000)).toBe('59s ago')
  })

  it('returns minutes at the lower boundary of 60 seconds', () => {
    expect(formatAgo(1000 - 60, 1000)).toBe('1m ago')
  })

  it('rounds minutes down', () => {
    expect(formatAgo(1000 - 119, 1000)).toBe('1m ago')
  })

  it('returns minutes at the upper boundary of 59', () => {
    expect(formatAgo(1000 - 59 * 60, 1000)).toBe('59m ago')
  })

  it('returns hours at the lower boundary of 60 minutes', () => {
    expect(formatAgo(1000 - 60 * 60, 1000)).toBe('1h ago')
  })

  it('rounds hours down', () => {
    expect(formatAgo(1000 - (2 * 60 * 60 - 1), 1000)).toBe('1h ago')
  })

  it('returns hours at the upper boundary of 23', () => {
    expect(formatAgo(1000 - 23 * 60 * 60, 1000)).toBe('23h ago')
  })

  it('returns days at the lower boundary of 24 hours', () => {
    expect(formatAgo(1000 - 24 * 60 * 60, 1000)).toBe('1d ago')
  })

  it('rounds days down', () => {
    expect(formatAgo(1000 - (2 * 24 * 60 * 60 - 1), 1000)).toBe('1d ago')
  })

  it('has no upper bound on days', () => {
    expect(formatAgo(1000 - 12 * 24 * 60 * 60, 1000)).toBe('12d ago')
  })

  it('reads the current time from the clock when nowS is omitted', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000 * 1000)
    expect(formatAgo(1_000_000 - 10)).toBe('10s ago')
    vi.useRealTimers()
  })

  it('rounds the default clock time down to a whole second', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000 * 1000 + 900)
    expect(formatAgo(1_000_000)).toBe('just now')
    vi.useRealTimers()
  })

  it('treats a null nowS the same as an omitted nowS', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000 * 1000)
    // @ts-expect-error exercising null per spec alongside undefined
    expect(formatAgo(1_000_000 - 10, null)).toBe('10s ago')
    vi.useRealTimers()
  })
})
