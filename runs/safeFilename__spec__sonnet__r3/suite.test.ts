import { describe, expect, it } from 'vitest'
import { safeFilename } from './safeFilename'

describe('safeFilename', () => {
  it('joins a simple name and extension with a dash for the space', () => {
    expect(safeFilename('John Smith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('preserves letter case', () => {
    expect(safeFilename('JOHN smith', 'pdf')).toBe('JOHN-smith.pdf')
  })

  it('trims surrounding whitespace before processing', () => {
    expect(safeFilename('  John Smith  ', 'pdf')).toBe('John-Smith.pdf')
  })

  it('collapses a run of whitespace into a single dash', () => {
    expect(safeFilename('John   Smith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('treats tabs and newlines as whitespace', () => {
    expect(safeFilename('John\tSmith\nDoe', 'pdf')).toBe('John-Smith-Doe.pdf')
  })

  it('removes reserved characters without inserting a dash', () => {
    expect(safeFilename('a/b\\c:d*e?f"g<h>i|j', 'pdf')).toBe('abcdefghij.pdf')
  })

  it('collapses whitespace left behind after a reserved character between spaces is removed', () => {
    expect(safeFilename('John : Smith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('collapses a run of dashes into a single dash', () => {
    expect(safeFilename('John---Smith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('collapses mixed whitespace and dashes into a single dash', () => {
    expect(safeFilename('foo - bar', 'pdf')).toBe('foo-bar.pdf')
  })

  it('strips a leading and trailing run of dashes', () => {
    expect(safeFilename('--test--', 'pdf')).toBe('test.pdf')
  })

  it('strips a leading and trailing run of dots', () => {
    expect(safeFilename('...test...', 'pdf')).toBe('test.pdf')
  })

  it('strips a leading and trailing run mixing dashes and dots', () => {
    expect(safeFilename('-.test.-', 'pdf')).toBe('test.pdf')
  })

  it('keeps internal dots as literal characters', () => {
    expect(safeFilename('my.file.name', 'pdf')).toBe('my.file.name.pdf')
  })

  it('falls back to "resume" when the raw text is only whitespace', () => {
    expect(safeFilename('   ', 'pdf')).toBe('resume.pdf')
  })

  it('falls back to "resume" when nothing but reserved characters remain', () => {
    expect(safeFilename('***', 'pdf')).toBe('resume.pdf')
  })

  it('falls back to "resume" when only dashes remain after collapsing', () => {
    expect(safeFilename('---', 'pdf')).toBe('resume.pdf')
  })

  it('falls back to "resume" for an empty string', () => {
    expect(safeFilename('', 'pdf')).toBe('resume.pdf')
  })

  it('accepts an extension without a leading dot', () => {
    expect(safeFilename('John Smith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('accepts an extension with a leading dot as-is', () => {
    expect(safeFilename('John Smith', '.pdf')).toBe('John-Smith.pdf')
  })

  it('keeps extra dots inside an extension', () => {
    expect(safeFilename('John Smith', 'tar.gz')).toBe('John-Smith.tar.gz')
  })
})
