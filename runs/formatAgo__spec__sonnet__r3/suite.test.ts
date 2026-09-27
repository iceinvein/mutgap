import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatAgo } from './formatAgo'

describe('formatAgo', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns en dash when unixS is null or undefined', () => {
    expect(formatAgo(null)).toBe('–')
    expect(formatAgo(undefined)).toBe('–')
  })

  it('returns "just now" for 0 to 4 seconds elapsed', () => {
    expect(formatAgo(100, 100)).toBe('just now')
    expect(formatAgo(99, 100)).toBe('just now')
    expect(formatAgo(96, 100)).toBe('just now')
  })

  it('treats future timestamps as zero seconds elapsed', () => {
    expect(formatAgo(150, 100)).toBe('just now')
  })

  it('returns whole seconds from 5 to 59', () => {
    expect(formatAgo(95, 100)).toBe('5s ago')
    expect(formatAgo(41, 100)).toBe('59s ago')
  })

  it('switches to whole minutes at 60 seconds', () => {
    expect(formatAgo(40, 100)).toBe('1m ago')
    expect(formatAgo(0, 65)).toBe('1m ago')
    expect(formatAgo(0, 119)).toBe('1m ago')
    expect(formatAgo(0, 120)).toBe('2m ago')
    expect(formatAgo(0, 3599)).toBe('59m ago')
  })

  it('switches to whole hours at 60 minutes', () => {
    expect(formatAgo(0, 3600)).toBe('1h ago')
    expect(formatAgo(0, 3600 + 1800)).toBe('1h ago')
    expect(formatAgo(0, 86399)).toBe('23h ago')
  })

  it('switches to whole days at 24 hours, with no upper unit', () => {
    expect(formatAgo(0, 86400)).toBe('1d ago')
    expect(formatAgo(0, 86400 * 12)).toBe('12d ago')
    expect(formatAgo(0, 86400 * 400 + 12345)).toBe('400d ago')
  })

  it('reads the current time from the clock, rounded down, when nowS is omitted', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1_700_000_000_500))
    expect(formatAgo(1_700_000_000_000 / 1000 - 5)).toBe('5s ago')
  })
})
