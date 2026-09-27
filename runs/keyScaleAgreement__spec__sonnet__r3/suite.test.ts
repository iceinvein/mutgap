import { describe, expect, it } from 'vitest'
import { keyScaleAgreement } from './keyScaleAgreement'

describe('keyScaleAgreement', () => {
  describe('missing or empty candidate', () => {
    it('returns undefined when candidate is undefined', () => {
      expect(keyScaleAgreement(undefined, 'A', 'minor')).toBeUndefined()
    })

    it('returns undefined when candidate is an empty string', () => {
      expect(keyScaleAgreement('', 'A', 'minor')).toBeUndefined()
    })
  })

  describe('agreement', () => {
    it('agrees when note and mode match exactly', () => {
      expect(keyScaleAgreement('A minor', 'A', 'minor')).toBe(true)
    })

    it('agrees when note and mode match for major', () => {
      expect(keyScaleAgreement('C major', 'C', 'major')).toBe(true)
    })

    it('ignores surrounding free text', () => {
      expect(keyScaleAgreement('Key: Db major', 'C#', 'major')).toBe(true)
    })

    it('is case-insensitive', () => {
      expect(keyScaleAgreement('a MINOR', 'a', 'MiNoR')).toBe(true)
    })

    it('treats sharp/flat enharmonic spellings as the same pitch (C# / Db)', () => {
      expect(keyScaleAgreement('C# minor', 'Db', 'minor')).toBe(true)
    })

    it('treats sharp/flat enharmonic spellings as the same pitch (D# / Eb)', () => {
      expect(keyScaleAgreement('Eb major', 'D#', 'major')).toBe(true)
    })

    it('reads ♭ as a flat b', () => {
      expect(keyScaleAgreement('D♭ major', 'C#', 'major')).toBe(true)
    })

    it('allows the mode word to appear anywhere in the text', () => {
      expect(keyScaleAgreement('detected as minor, key of A', 'A', 'minor')).toBe(true)
    })
  })

  describe('disagreement', () => {
    it('disagrees when the mode differs', () => {
      expect(keyScaleAgreement('A major', 'A', 'minor')).toBe(false)
    })

    it('disagrees when the note differs', () => {
      expect(keyScaleAgreement('B minor', 'A', 'minor')).toBe(false)
    })

    it('disagrees when both note and mode differ', () => {
      expect(keyScaleAgreement('B major', 'A', 'minor')).toBe(false)
    })
  })

  describe('unparseable candidate', () => {
    it('returns undefined when the candidate has no mode', () => {
      expect(keyScaleAgreement('A', 'A', 'minor')).toBeUndefined()
    })

    it('returns undefined when the candidate has no note', () => {
      expect(keyScaleAgreement('minor', 'A', 'minor')).toBeUndefined()
    })

    it('returns undefined when "minor" only appears as part of another word', () => {
      expect(keyScaleAgreement('A minority', 'A', 'minor')).toBeUndefined()
    })

    it('returns undefined when the note letter does not begin a word', () => {
      expect(keyScaleAgreement('Almost minor', 'A', 'minor')).toBeUndefined()
    })

    it('returns undefined when the note is not followed by whitespace or end of text', () => {
      expect(keyScaleAgreement('Amajor minor', 'A', 'minor')).toBeUndefined()
    })

    it('treats Cb as an unrecognised spelling', () => {
      expect(keyScaleAgreement('Cb minor', 'C', 'minor')).toBeUndefined()
    })

    it('treats Fb as an unrecognised spelling', () => {
      expect(keyScaleAgreement('Fb minor', 'F', 'minor')).toBeUndefined()
    })

    it('treats E# as an unrecognised spelling', () => {
      expect(keyScaleAgreement('E# minor', 'E', 'minor')).toBeUndefined()
    })

    it('treats B# as an unrecognised spelling', () => {
      expect(keyScaleAgreement('B# minor', 'B', 'minor')).toBeUndefined()
    })
  })

  describe('unparseable reference', () => {
    it('returns undefined when the scale is not major or minor', () => {
      expect(keyScaleAgreement('A minor', 'A', 'dorian')).toBeUndefined()
    })

    it('returns undefined when the key is an unrecognised spelling', () => {
      expect(keyScaleAgreement('A minor', 'Cb', 'minor')).toBeUndefined()
    })

    it('returns undefined when both candidate and reference are unparseable', () => {
      expect(keyScaleAgreement('A', 'Cb', 'dorian')).toBeUndefined()
    })
  })
})
