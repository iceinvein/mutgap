import { describe, expect, it } from 'vitest'
import { keyScaleAgreement } from './keyScaleAgreement'

describe('keyScaleAgreement', () => {
  describe('missing/empty candidate', () => {
    it('returns undefined when candidate is undefined', () => {
      expect(keyScaleAgreement(undefined, 'A', 'minor')).toBeUndefined()
    })

    it('returns undefined when candidate is empty', () => {
      expect(keyScaleAgreement('', 'A', 'minor')).toBeUndefined()
    })
  })

  describe('agreement', () => {
    it('agrees on an exact match', () => {
      expect(keyScaleAgreement('A minor', 'A', 'minor')).toBe(true)
    })

    it('agrees case-insensitively', () => {
      expect(keyScaleAgreement('a MINOR', 'A', 'minor')).toBe(true)
    })

    it('agrees through a prefixed candidate like "Key: Db major"', () => {
      expect(keyScaleAgreement('Key: Db major', 'C#', 'major')).toBe(true)
    })

    it('agrees when the mode word is embedded in a longer sentence', () => {
      expect(keyScaleAgreement('A minor key detected', 'A', 'minor')).toBe(true)
    })
  })

  describe('disagreement', () => {
    it('disagrees on mode when the note matches but the mode differs', () => {
      expect(keyScaleAgreement('A minor', 'A', 'major')).toBe(false)
    })

    it('disagrees on note when the mode matches but the note differs', () => {
      expect(keyScaleAgreement('C major', 'D', 'major')).toBe(false)
    })

    it('disagrees when both note and mode differ', () => {
      expect(keyScaleAgreement('C major', 'A', 'minor')).toBe(false)
    })
  })

  describe('enharmonic equivalence', () => {
    it.each([
      ['C#', 'Db'],
      ['D#', 'Eb'],
      ['F#', 'Gb'],
      ['G#', 'Ab'],
      ['A#', 'Bb'],
    ])('treats %s and %s as the same pitch', (sharp, flat) => {
      expect(keyScaleAgreement(`${sharp} minor`, flat, 'minor')).toBe(true)
      expect(keyScaleAgreement(`${flat} minor`, sharp, 'minor')).toBe(true)
    })

    it('reads ♭ as b', () => {
      expect(keyScaleAgreement('A♭ minor', 'G#', 'minor')).toBe(true)
    })

    it('does not treat different naturals as equivalent', () => {
      expect(keyScaleAgreement('C major', 'D', 'major')).toBe(false)
    })
  })

  describe('unparseable candidate', () => {
    it('returns undefined when the candidate has no mode', () => {
      expect(keyScaleAgreement('A', 'A', 'minor')).toBeUndefined()
    })

    it('returns undefined when the candidate has no recognised note', () => {
      expect(keyScaleAgreement('major', 'A', 'major')).toBeUndefined()
    })

    it.each(['Cb major', 'Fb major', 'E# major', 'B# major'])(
      'returns undefined for the unrecognised spelling "%s"',
      (candidate) => {
        expect(keyScaleAgreement(candidate, 'C', 'major')).toBeUndefined()
      },
    )

    it('returns undefined when the note is not followed by whitespace or end of text', () => {
      expect(keyScaleAgreement('Amin', 'A', 'minor')).toBeUndefined()
    })

    it('returns undefined when the note does not begin a word', () => {
      expect(keyScaleAgreement('xA minor', 'A', 'minor')).toBeUndefined()
    })
  })

  describe('unparseable reference', () => {
    it('returns undefined when the reference key is not a recognised note', () => {
      expect(keyScaleAgreement('A minor', 'H', 'minor')).toBeUndefined()
    })

    it('returns undefined when the reference key is an unrecognised spelling', () => {
      expect(keyScaleAgreement('A minor', 'Cb', 'major')).toBeUndefined()
    })

    it('returns undefined when the reference scale has no recognised mode word', () => {
      expect(keyScaleAgreement('A minor', 'A', 'dorian')).toBeUndefined()
    })
  })

  describe('reference parsing', () => {
    it('parses the reference case-insensitively', () => {
      expect(keyScaleAgreement('A minor', 'a', 'MINOR')).toBe(true)
    })

    it('accepts sharps and flats for the reference key', () => {
      expect(keyScaleAgreement('Bb major', 'A#', 'major')).toBe(true)
    })
  })
})
