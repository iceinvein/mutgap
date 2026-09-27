import { describe, expect, it } from 'vitest'
import { safeFilename } from './safeFilename'

describe('safeFilename', () => {
  describe('base name', () => {
    it('replaces spaces with a dash and preserves letter case', () => {
      expect(safeFilename('John Smith', 'pdf')).toBe('John-Smith.pdf')
    })

    it('leaves an already-safe name unchanged', () => {
      expect(safeFilename('report', 'pdf')).toBe('report.pdf')
    })

    it('trims surrounding whitespace', () => {
      expect(safeFilename('  \t John Smith \n ', 'pdf')).toBe('John-Smith.pdf')
    })

    it.each(['\\', '/', ':', '*', '?', '"', '<', '>', '|'])(
      'removes the forbidden character %j',
      (ch) => {
        expect(safeFilename(`a${ch}b`, 'txt')).toBe('ab.txt')
      },
    )

    it('removes all forbidden characters at once', () => {
      expect(safeFilename('a\\/:*?"<>|b', 'txt')).toBe('ab.txt')
    })

    it('collapses each run of whitespace into a single dash', () => {
      expect(safeFilename('a   b\t\tc\n d', 'txt')).toBe('a-b-c-d.txt')
    })

    it('collapses whitespace left adjacent after removing forbidden characters', () => {
      expect(safeFilename('a / b', 'txt')).toBe('a-b.txt')
      expect(safeFilename('a * * b', 'txt')).toBe('a-b.txt')
    })

    it('collapses runs of dashes into one', () => {
      expect(safeFilename('a---b', 'txt')).toBe('a-b.txt')
    })

    it('collapses dashes produced next to existing dashes', () => {
      expect(safeFilename('a - b', 'txt')).toBe('a-b.txt')
      expect(safeFilename('a -- b', 'txt')).toBe('a-b.txt')
    })

    it('keeps internal dots, including consecutive ones', () => {
      expect(safeFilename('v1.2 final', 'txt')).toBe('v1.2-final.txt')
      expect(safeFilename('a..b', 'txt')).toBe('a..b.txt')
    })

    it('strips leading dots and dashes', () => {
      expect(safeFilename('.hidden', 'txt')).toBe('hidden.txt')
      expect(safeFilename('-.-.name', 'txt')).toBe('name.txt')
    })

    it('strips trailing dots and dashes', () => {
      expect(safeFilename('name.', 'txt')).toBe('name.txt')
      expect(safeFilename('name-.-.', 'txt')).toBe('name.txt')
    })

    it('strips leading/trailing dashes that come from forbidden characters or whitespace', () => {
      expect(safeFilename('| name |', 'txt')).toBe('name.txt')
      expect(safeFilename('... name ...', 'txt')).toBe('name.txt')
    })

    it('keeps non-ASCII characters', () => {
      expect(safeFilename('Zoë Ñúñez', 'pdf')).toBe('Zoë-Ñúñez.pdf')
    })
  })

  describe('fallback to "resume"', () => {
    it.each([
      ['empty string', ''],
      ['only whitespace', '   \t\n '],
      ['only forbidden characters', '\\/:*?"<>|'],
      ['only dots and dashes', '.-.--..'],
      ['forbidden characters, whitespace, dots and dashes', ' . / - | . '],
    ])('uses "resume" when the base name is empty (%s)', (_label, raw) => {
      expect(safeFilename(raw, 'pdf')).toBe('resume.pdf')
    })
  })

  describe('extension', () => {
    it('prefixes an extension without a leading dot', () => {
      expect(safeFilename('cv', 'pdf')).toBe('cv.pdf')
    })

    it('uses an extension that already has a leading dot as-is', () => {
      expect(safeFilename('cv', '.pdf')).toBe('cv.pdf')
    })

    it('produces the same result with or without the leading dot', () => {
      expect(safeFilename('John Smith', 'pdf')).toBe(safeFilename('John Smith', '.pdf'))
    })

    it('does not alter the case of the extension', () => {
      expect(safeFilename('cv', 'PDF')).toBe('cv.PDF')
    })

    it('does not add a second dot to an extension starting with multiple dots', () => {
      expect(safeFilename('cv', '..pdf')).toBe('cv..pdf')
    })

    it('supports multi-part extensions', () => {
      expect(safeFilename('backup', 'tar.gz')).toBe('backup.tar.gz')
      expect(safeFilename('backup', '.tar.gz')).toBe('backup.tar.gz')
    })

    it('appends the extension to the fallback name', () => {
      expect(safeFilename('', '.docx')).toBe('resume.docx')
    })
  })
})
