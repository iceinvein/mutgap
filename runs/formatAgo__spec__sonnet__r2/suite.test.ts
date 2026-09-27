import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatAgo } from './formatAgo'

describe('formatAgo', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns en dash for null unixS', () => {
    expect(formatAgo(null, 1000)).toBe('–')
  })

  it('returns en dash for undefined unixS', () => {
    expect(formatAgo(undefined, 1000)).toBe('–')
  })

  it('returns "just now" for 0 seconds elapsed', () => {
    expect(formatAgo(1000, 1000)).toBe('just now')
  })

  it('returns "just now" for fewer than 5 seconds elapsed', () => {
    expect(formatAgo(1000, 1004)).toBe('just now')
  })

  it('treats a future timestamp as zero seconds elapsed', () => {
    expect(formatAgo(2000, 1000)).toBe('just now')
  })

  it('returns seconds at the 5 second boundary', () => {
    expect(formatAgo(1000, 1005)).toBe('5s ago')
  })

  it('returns seconds up to 59', () => {
    expect(formatAgo(1000, 1059)).toBe('59s ago')
  })

  it('returns "1m ago" at the 60 second boundary', () => {
    expect(formatAgo(1000, 1060)).toBe('1m ago')
  })

  it('rounds down minutes', () => {
    expect(formatAgo(1000, 1119)).toBe('1m ago')
  })

  it('returns minutes up to 59', () => {
    expect(formatAgo(0, 59 * 60)).toBe('59m ago')
  })

  it('returns "1h ago" at the 60 minute boundary', () => {
    expect(formatAgo(0, 60 * 60)).toBe('1h ago')
  })

  it('rounds down hours', () => {
    expect(formatAgo(0, 60 * 60 + 59 * 60)).toBe('1h ago')
  })

  it('returns hours up to 23', () => {
    expect(formatAgo(0, 23 * 60 * 60)).toBe('23h ago')
  })

  it('returns "1d ago" at the 24 hour boundary', () => {
    expect(formatAgo(0, 24 * 60 * 60)).toBe('1d ago')
  })

  it('rounds down days with no upper unit', () => {
    expect(formatAgo(0, 12 * 24 * 60 * 60)).toBe('12d ago')
  })

  it('handles large day counts with no upper unit', () => {
    expect(formatAgo(0, 400 * 24 * 60 * 60)).toBe('400d ago')
  })

  it('reads the current time from the clock, rounded down, when nowS is omitted', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_700_000_000_500)
    expect(formatAgo(1_700_000_000_000 / 1000 - 10)).toBe('10s ago')
  })

  it('reads the current time from the clock when nowS is null', () => {
    vi.useFakeTimers()
    vi.setSystemTime(2_000_000_000_000)
    expect(formatAgo(2_000_000_000 - 5, null as unknown as undefined)).toBe('5s ago')
  })
})
