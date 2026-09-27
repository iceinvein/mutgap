import { describe, expect, it } from 'vitest'
import { safeFilename } from './safeFilename'

describe('safeFilename', () => {
  it('preserves letter case and joins words with a hyphen', () => {
    expect(safeFilename('John Smith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('trims surrounding whitespace', () => {
    expect(safeFilename('  John Smith  ', 'pdf')).toBe('John-Smith.pdf')
  })

  it('collapses a run of whitespace into a single hyphen', () => {
    expect(safeFilename('John    Smith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('collapses tabs and newlines as whitespace', () => {
    expect(safeFilename('John\t\nSmith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('collapses a run of hyphens into a single hyphen', () => {
    expect(safeFilename('John----Smith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('removes forbidden filesystem characters', () => {
    expect(safeFilename('a\\/:*?"<>|b', 'pdf')).toBe('ab.pdf')
  })

  it('collapses hyphens created by removing forbidden characters adjacent to hyphens', () => {
    expect(safeFilename('a-*-b', 'pdf')).toBe('a-b.pdf')
  })

  it('collapses whitespace created by removing forbidden characters between spaces', () => {
    expect(safeFilename('foo * bar', 'pdf')).toBe('foo-bar.pdf')
  })

  it('strips a leading run of hyphens and dots', () => {
    expect(safeFilename('-.foo', 'pdf')).toBe('foo.pdf')
  })

  it('strips a trailing run of hyphens and dots', () => {
    expect(safeFilename('foo.-', 'pdf')).toBe('foo.pdf')
  })

  it('strips leading and trailing runs of hyphens and dots together', () => {
    expect(safeFilename('-.foo.-', 'pdf')).toBe('foo.pdf')
  })

  it('leaves dots in the middle of the name untouched', () => {
    expect(safeFilename('foo...bar', 'pdf')).toBe('foo...bar.pdf')
  })

  it('falls back to "resume" when the base name is empty', () => {
    expect(safeFilename('', 'pdf')).toBe('resume.pdf')
  })

  it('falls back to "resume" when the input is only whitespace', () => {
    expect(safeFilename('   ', 'pdf')).toBe('resume.pdf')
  })

  it('falls back to "resume" when the input is only hyphens', () => {
    expect(safeFilename('---', 'pdf')).toBe('resume.pdf')
  })

  it('falls back to "resume" when the input is only dots', () => {
    expect(safeFilename('...', 'pdf')).toBe('resume.pdf')
  })

  it('falls back to "resume" when the input is only forbidden characters', () => {
    expect(safeFilename('***', 'pdf')).toBe('resume.pdf')
  })

  it('adds a leading dot to an extension given without one', () => {
    expect(safeFilename('John Smith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('does not double the dot when the extension already has one', () => {
    expect(safeFilename('John Smith', '.pdf')).toBe('John-Smith.pdf')
  })

  it('uses a multi-dot extension as-is', () => {
    expect(safeFilename('John Smith', '.tar.gz')).toBe('John-Smith.tar.gz')
  })

  it('prefixes a multi-dot extension given without a leading dot', () => {
    expect(safeFilename('John Smith', 'tar.gz')).toBe('John-Smith.tar.gz')
  })
})
