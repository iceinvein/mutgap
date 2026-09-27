import { describe, expect, it } from 'vitest'
import { safeFilename } from './safeFilename'

describe('safeFilename', () => {
  describe('base name', () => {
    it('keeps a simple name unchanged', () => {
      expect(safeFilename('resume', 'pdf')).toBe('resume.pdf')
    })

    it('preserves letter case', () => {
      expect(safeFilename('John Smith', 'pdf')).toBe('John-Smith.pdf')
      expect(safeFilename('ALLCAPS mixedCase', 'pdf')).toBe('ALLCAPS-mixedCase.pdf')
    })

    it('trims surrounding whitespace', () => {
      expect(safeFilename('   John Smith \t\n', 'pdf')).toBe('John-Smith.pdf')
    })

    it('removes each forbidden character without replacing it', () => {
      for (const ch of ['\\', '/', ':', '*', '?', '"', '<', '>', '|']) {
        expect(safeFilename(`a${ch}b`, 'pdf')).toBe('ab.pdf')
      }
    })

    it('removes all forbidden characters together', () => {
      expect(safeFilename('a\\/:*?"<>|b', 'pdf')).toBe('ab.pdf')
    })

    it('replaces each run of whitespace with a single hyphen', () => {
      expect(safeFilename('a  b', 'pdf')).toBe('a-b.pdf')
      expect(safeFilename('a \t\n b', 'pdf')).toBe('a-b.pdf')
      expect(safeFilename('a b c', 'pdf')).toBe('a-b-c.pdf')
    })

    it('collapses runs of hyphens', () => {
      expect(safeFilename('a---b', 'pdf')).toBe('a-b.pdf')
    })

    it('collapses hyphens produced by whitespace next to existing hyphens', () => {
      expect(safeFilename('a - b', 'pdf')).toBe('a-b.pdf')
      expect(safeFilename('a -- b', 'pdf')).toBe('a-b.pdf')
    })

    it('removes forbidden characters before turning whitespace into hyphens', () => {
      expect(safeFilename('a * b', 'pdf')).toBe('a-b.pdf')
      expect(safeFilename('a-/-b', 'pdf')).toBe('a-b.pdf')
    })

    it('strips leading and trailing hyphens', () => {
      expect(safeFilename('--a--', 'pdf')).toBe('a.pdf')
    })

    it('strips leading and trailing dots', () => {
      expect(safeFilename('..a..', 'pdf')).toBe('a.pdf')
    })

    it('strips mixed runs of hyphens and dots at the edges', () => {
      expect(safeFilename('.-.a-.-', 'pdf')).toBe('a.pdf')
      expect(safeFilename('report. -', 'pdf')).toBe('report.pdf')
    })

    it('strips edge hyphens created from whitespace left after character removal', () => {
      expect(safeFilename('/ a /', 'pdf')).toBe('a.pdf')
      expect(safeFilename(' . foo . ', 'pdf')).toBe('foo.pdf')
    })

    it('keeps interior dots', () => {
      expect(safeFilename('v1.2 final', 'pdf')).toBe('v1.2-final.pdf')
    })

    it('keeps interior mixed dot/hyphen sequences', () => {
      expect(safeFilename('a.-.b', 'pdf')).toBe('a.-.b.pdf')
    })

    it('leaves other characters alone', () => {
      expect(safeFilename('Zoë_O\'Brien (2024)', 'pdf')).toBe("Zoë_O'Brien-(2024).pdf")
    })
  })

  describe('fallback to "resume"', () => {
    it.each([
      ['empty string', ''],
      ['only whitespace', '   \t\n '],
      ['only forbidden characters', '\\/:*?"<>|'],
      ['only hyphens', '---'],
      ['only dots', '...'],
      ['only dots, hyphens and whitespace', ' . - . '],
      ['forbidden characters, dots and hyphens', '*.-/.?'],
    ])('uses "resume" when the base name is empty: %s', (_label, raw) => {
      expect(safeFilename(raw, 'pdf')).toBe('resume.pdf')
    })
  })

  describe('extension', () => {
    it('adds a leading dot when missing', () => {
      expect(safeFilename('cv', 'pdf')).toBe('cv.pdf')
    })

    it('uses an extension starting with a dot as is', () => {
      expect(safeFilename('cv', '.pdf')).toBe('cv.pdf')
    })

    it('produces the same result with or without the leading dot', () => {
      expect(safeFilename('John Smith', 'docx')).toBe(safeFilename('John Smith', '.docx'))
    })

    it('does not change the case of the extension', () => {
      expect(safeFilename('cv', 'PDF')).toBe('cv.PDF')
      expect(safeFilename('cv', '.PDF')).toBe('cv.PDF')
    })

    it('handles multi-part extensions', () => {
      expect(safeFilename('backup', 'tar.gz')).toBe('backup.tar.gz')
      expect(safeFilename('backup', '.tar.gz')).toBe('backup.tar.gz')
    })

    it('does not add a second dot to an extension starting with a dot', () => {
      expect(safeFilename('cv', '..pdf')).toBe('cv..pdf')
    })

    it('appends the extension to the fallback name', () => {
      expect(safeFilename('', '.txt')).toBe('resume.txt')
    })
  })
})
