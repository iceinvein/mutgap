import { describe, expect, it } from 'vitest'
import { safeFilename } from './safeFilename'

describe('safeFilename', () => {
  describe('base name', () => {
    it('replaces spaces with a dash and preserves letter case', () => {
      expect(safeFilename('John Smith', 'pdf')).toBe('John-Smith.pdf')
    })

    it('leaves an already-safe name unchanged', () => {
      expect(safeFilename('report_2024', 'pdf')).toBe('report_2024.pdf')
    })

    it('trims surrounding whitespace', () => {
      expect(safeFilename('  John Smith \t\n', 'pdf')).toBe('John-Smith.pdf')
    })

    it.each(['\\', '/', ':', '*', '?', '"', '<', '>', '|'])(
      'removes the reserved character %s',
      (ch) => {
        expect(safeFilename(`a${ch}b`, 'pdf')).toBe('ab.pdf')
      },
    )

    it('removes every reserved character at once', () => {
      expect(safeFilename('a\\/:*?"<>|b', 'pdf')).toBe('ab.pdf')
    })

    it('keeps characters that are not reserved', () => {
      expect(safeFilename('Zoë_résumé(1)&co', 'pdf')).toBe('Zoë_résumé(1)&co.pdf')
    })

    it('collapses each run of whitespace into a single dash', () => {
      expect(safeFilename('a   b\t\tc\n d', 'pdf')).toBe('a-b-c-d.pdf')
    })

    it('collapses runs of dashes into a single dash', () => {
      expect(safeFilename('a---b--c', 'pdf')).toBe('a-b-c.pdf')
    })

    it('collapses dashes produced next to whitespace', () => {
      expect(safeFilename('a - b', 'pdf')).toBe('a-b.pdf')
      expect(safeFilename('a -- b', 'pdf')).toBe('a-b.pdf')
    })

    it('removes reserved characters before collapsing whitespace', () => {
      expect(safeFilename('a / b', 'pdf')).toBe('a-b.pdf')
      expect(safeFilename('a /\\ b', 'pdf')).toBe('a-b.pdf')
    })

    it('strips leading and trailing dashes', () => {
      expect(safeFilename('--name--', 'pdf')).toBe('name.pdf')
    })

    it('strips leading and trailing dots', () => {
      expect(safeFilename('..name..', 'pdf')).toBe('name.pdf')
    })

    it('strips mixed leading and trailing runs of dashes and dots', () => {
      expect(safeFilename('.-.-name-.-.', 'pdf')).toBe('name.pdf')
    })

    it('strips dashes that appear at the edges after whitespace becomes dashes', () => {
      // trim, then "* a *" -> " a " -> "-a-" -> "a"
      expect(safeFilename(' * a * ', 'pdf')).toBe('a.pdf')
    })

    it('keeps dots and dashes in the middle', () => {
      expect(safeFilename('v1.2-final', 'pdf')).toBe('v1.2-final.pdf')
      expect(safeFilename('a.-.b', 'pdf')).toBe('a.-.b.pdf')
    })

    it('does not collapse runs of dots in the middle', () => {
      expect(safeFilename('a..b', 'pdf')).toBe('a..b.pdf')
    })

    it('removes a trailing dot so the extension is not doubled', () => {
      expect(safeFilename('name.', '.pdf')).toBe('name.pdf')
    })
  })

  describe('empty base name falls back to "resume"', () => {
    it.each([
      ['empty string', ''],
      ['only whitespace', '   \t\n'],
      ['only reserved characters', '\\/:*?"<>|'],
      ['only dots', '...'],
      ['only dashes', '---'],
      ['only dashes, dots and whitespace', ' .- -. '],
      ['reserved characters and whitespace', ' / * ? '],
    ])('%s', (_label, raw) => {
      expect(safeFilename(raw, 'pdf')).toBe('resume.pdf')
    })
  })

  describe('extension', () => {
    it('adds a leading dot when missing', () => {
      expect(safeFilename('cv', 'pdf')).toBe('cv.pdf')
    })

    it('uses an extension that already starts with a dot as is', () => {
      expect(safeFilename('cv', '.pdf')).toBe('cv.pdf')
    })

    it('produces the same result with or without the leading dot', () => {
      expect(safeFilename('John Smith', 'docx')).toBe(safeFilename('John Smith', '.docx'))
    })

    it('does not change the case of the extension', () => {
      expect(safeFilename('cv', 'PDF')).toBe('cv.PDF')
      expect(safeFilename('cv', '.PDF')).toBe('cv.PDF')
    })

    it('keeps multi-part extensions as given', () => {
      expect(safeFilename('archive', 'tar.gz')).toBe('archive.tar.gz')
      expect(safeFilename('archive', '.tar.gz')).toBe('archive.tar.gz')
    })

    it('does not add a second dot to an extension starting with multiple dots', () => {
      expect(safeFilename('cv', '..pdf')).toBe('cv..pdf')
    })

    it('is appended to the fallback base name', () => {
      expect(safeFilename('', '.txt')).toBe('resume.txt')
    })
  })
})
