import { describe, expect, it } from 'vitest'
import { safeFilename } from './safeFilename'

describe('safeFilename', () => {
  it('joins a simple base name with a dotted extension', () => {
    expect(safeFilename('resume', '.pdf')).toBe('resume.pdf')
  })

  it('adds a leading dot to an extension that lacks one', () => {
    expect(safeFilename('resume', 'pdf')).toBe('resume.pdf')
  })

  it('trims surrounding whitespace', () => {
    expect(safeFilename('  resume  ', 'pdf')).toBe('resume.pdf')
  })

  it('removes forbidden characters', () => {
    expect(safeFilename('a\\b/c:d*e?f"g<h>i|j', 'pdf')).toBe('abcdefghij.pdf')
  })

  it('replaces each run of whitespace with a single hyphen', () => {
    expect(safeFilename('John   Smith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('preserves letter case', () => {
    expect(safeFilename('John Smith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('collapses runs of hyphens into a single hyphen', () => {
    expect(safeFilename('John---Smith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('collapses hyphens produced by whitespace and literal hyphens together', () => {
    expect(safeFilename('John - Smith', 'pdf')).toBe('John-Smith.pdf')
  })

  it('strips leading and trailing runs of hyphens and dots', () => {
    expect(safeFilename('--.John Smith.--', 'pdf')).toBe('John-Smith.pdf')
  })

  it('strips leading and trailing dots produced by removed forbidden characters', () => {
    expect(safeFilename('...resume...', 'pdf')).toBe('resume.pdf')
  })

  it('falls back to "resume" when the base name is empty after cleanup', () => {
    expect(safeFilename('', 'pdf')).toBe('resume.pdf')
  })

  it('falls back to "resume" when the input is only whitespace', () => {
    expect(safeFilename('   ', 'pdf')).toBe('resume.pdf')
  })

  it('falls back to "resume" when the input is only forbidden characters', () => {
    expect(safeFilename('\\/:*?"<>|', 'pdf')).toBe('resume.pdf')
  })

  it('falls back to "resume" when the input is only hyphens and dots', () => {
    expect(safeFilename('---...---', 'pdf')).toBe('resume.pdf')
  })

  it('uses an already-dotted extension as-is', () => {
    expect(safeFilename('John Smith', '.tar.gz')).toBe('John-Smith.tar.gz')
  })

  it('handles a realistic mixed example', () => {
    expect(safeFilename('  John/Smith:  Resume?  ', 'docx')).toBe('JohnSmith-Resume.docx')
  })
})
