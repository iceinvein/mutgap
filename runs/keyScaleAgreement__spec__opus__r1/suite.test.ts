import { describe, expect, it } from 'vitest'
import { keyScaleAgreement } from './keyScaleAgreement'

describe('keyScaleAgreement', () => {
  describe('missing candidate', () => {
    it('returns undefined for an undefined candidate', () => {
      expect(keyScaleAgreement(undefined, 'A', 'minor')).toBeUndefined()
    })

    it('returns undefined for an empty candidate', () => {
      expect(keyScaleAgreement('', 'A', 'minor')).toBeUndefined()
    })
  })

  describe('basic agreement', () => {
    it('agrees on identical key and mode', () => {
      expect(keyScaleAgreement('A minor', 'A', 'minor')).toBe(true)
      expect(keyScaleAgreement('C major', 'C', 'major')).toBe(true)
    })

    it('finds the note after a leading label', () => {
      expect(keyScaleAgreement('Key: Db major', 'Db', 'major')).toBe(true)
    })

    it('disagrees when the pitch differs', () => {
      expect(keyScaleAgreement('A minor', 'E', 'minor')).toBe(false)
    })

    it('disagrees when the mode differs', () => {
      expect(keyScaleAgreement('A minor', 'A', 'major')).toBe(false)
      expect(keyScaleAgreement('C major', 'C', 'minor')).toBe(false)
    })

    it('disagrees on relative keys (same notes, different tonic)', () => {
      expect(keyScaleAgreement('A minor', 'C', 'major')).toBe(false)
    })

    it('does not treat a sharp as its natural', () => {
      expect(keyScaleAgreement('C# major', 'C', 'major')).toBe(false)
      expect(keyScaleAgreement('Bb major', 'B', 'major')).toBe(false)
    })
  })

  describe('case insensitivity', () => {
    it('ignores case in the candidate', () => {
      expect(keyScaleAgreement('a MINOR', 'A', 'minor')).toBe(true)
      expect(keyScaleAgreement('KEY: DB MAJOR', 'Db', 'major')).toBe(true)
    })

    it('reads a lowercase b after a note as a flat', () => {
      expect(keyScaleAgreement('bb major', 'Bb', 'major')).toBe(true)
      expect(keyScaleAgreement('eb minor', 'D#', 'minor')).toBe(true)
    })

    it('ignores case in the reference', () => {
      expect(keyScaleAgreement('F# minor', 'f#', 'MINOR')).toBe(true)
      expect(keyScaleAgreement('Ab major', 'AB', 'Major')).toBe(true)
    })
  })

  describe('flat symbol', () => {
    it('reads ♭ as b in the candidate', () => {
      expect(keyScaleAgreement('D♭ major', 'Db', 'major')).toBe(true)
      expect(keyScaleAgreement('D♭ major', 'C#', 'major')).toBe(true)
    })

    it('reads ♭ as b in the reference', () => {
      expect(keyScaleAgreement('Bb minor', 'B♭', 'minor')).toBe(true)
      expect(keyScaleAgreement('A# minor', 'B♭', 'minor')).toBe(true)
    })
  })

  describe('enharmonic equivalence', () => {
    const pairs: [string, string][] = [
      ['C#', 'Db'],
      ['D#', 'Eb'],
      ['F#', 'Gb'],
      ['G#', 'Ab'],
      ['A#', 'Bb'],
    ]

    for (const [sharp, flat] of pairs) {
      it(`treats ${sharp} and ${flat} as the same pitch`, () => {
        expect(keyScaleAgreement(`${sharp} major`, flat, 'major')).toBe(true)
        expect(keyScaleAgreement(`${flat} minor`, sharp, 'minor')).toBe(true)
      })

      it(`still checks the mode for ${sharp}/${flat}`, () => {
        expect(keyScaleAgreement(`${sharp} major`, flat, 'minor')).toBe(false)
      })
    }

    it('does not equate neighbouring pitches', () => {
      expect(keyScaleAgreement('C# major', 'D', 'major')).toBe(false)
      expect(keyScaleAgreement('Db major', 'D', 'major')).toBe(false)
      expect(keyScaleAgreement('Eb major', 'E', 'major')).toBe(false)
    })
  })

  describe('all recognised notes', () => {
    const notes = [
      'C', 'D', 'E', 'F', 'G', 'A', 'B',
      'C#', 'D#', 'F#', 'G#', 'A#',
      'Db', 'Eb', 'Gb', 'Ab', 'Bb',
    ]

    for (const note of notes) {
      it(`recognises ${note}`, () => {
        expect(keyScaleAgreement(`${note} major`, note, 'major')).toBe(true)
        expect(keyScaleAgreement(`${note} minor`, note, 'minor')).toBe(true)
      })
    }
  })

  describe('unrecognised spellings', () => {
    it.each([
      ['Cb', 'B'],
      ['Fb', 'E'],
      ['E#', 'F'],
      ['B#', 'C'],
    ])('does not recognise %s in the candidate', (spelling, natural) => {
      expect(keyScaleAgreement(`${spelling} major`, natural, 'major')).toBeUndefined()
      expect(keyScaleAgreement(`${spelling} major`, spelling, 'major')).toBeUndefined()
    })

    it.each([
      ['Cb', 'B'],
      ['Fb', 'E'],
      ['E#', 'F'],
      ['B#', 'C'],
    ])('does not recognise %s in the reference', (spelling, natural) => {
      expect(keyScaleAgreement(`${natural} major`, spelling, 'major')).toBeUndefined()
    })

    it('does not recognise letters outside A to G', () => {
      expect(keyScaleAgreement('H minor', 'B', 'minor')).toBeUndefined()
      expect(keyScaleAgreement('B minor', 'H', 'minor')).toBeUndefined()
    })
  })

  describe('note parsing', () => {
    it('requires the note to be followed by whitespace or end of text', () => {
      expect(keyScaleAgreement('Am', 'A', 'minor')).toBeUndefined()
      expect(keyScaleAgreement('Aminor', 'A', 'minor')).toBeUndefined()
      expect(keyScaleAgreement('C#minor', 'C#', 'minor')).toBeUndefined()
    })

    it('accepts a note at the end of the text', () => {
      expect(keyScaleAgreement('minor, tonic A', 'A', 'minor')).toBe(true)
      expect(keyScaleAgreement('major key of F#', 'F#', 'major')).toBe(true)
    })

    it('accepts any whitespace after the note', () => {
      expect(keyScaleAgreement('G\tmajor', 'G', 'major')).toBe(true)
      expect(keyScaleAgreement('G\nmajor', 'G', 'major')).toBe(true)
      expect(keyScaleAgreement('G   major', 'G', 'major')).toBe(true)
    })

    it('does not take a note from the middle or start of a longer word', () => {
      // "Detected" starts with D and "scale" contains "a"/"e", none qualify
      expect(keyScaleAgreement('Detected scale: E minor', 'E', 'minor')).toBe(true)
      expect(keyScaleAgreement('Detected scale: E minor', 'D', 'minor')).toBe(false)
    })

    it('uses the first qualifying note', () => {
      expect(keyScaleAgreement('E minor or G major', 'E', 'minor')).toBe(true)
      expect(keyScaleAgreement('E minor or G major', 'G', 'minor')).toBe(false)
    })

    it('treats a lone "a" word as the note A', () => {
      // Per the spec, the English article "a" is a word that is a valid note.
      expect(keyScaleAgreement('probably a C major', 'A', 'major')).toBe(true)
      expect(keyScaleAgreement('probably a C major', 'C', 'major')).toBe(false)
    })

    it('is unparseable when there is no note', () => {
      expect(keyScaleAgreement('minor', 'A', 'minor')).toBeUndefined()
      expect(keyScaleAgreement('unknown major', 'A', 'major')).toBeUndefined()
    })
  })

  describe('mode parsing', () => {
    it('is unparseable when there is no mode', () => {
      expect(keyScaleAgreement('A', 'A', 'minor')).toBeUndefined()
      expect(keyScaleAgreement('A dorian', 'A', 'minor')).toBeUndefined()
    })

    it('prefers minor when both minor and major appear', () => {
      expect(keyScaleAgreement('A major minor', 'A', 'minor')).toBe(true)
      expect(keyScaleAgreement('A major minor', 'A', 'major')).toBe(false)
      expect(keyScaleAgreement('A minor, not major', 'A', 'minor')).toBe(true)
    })

    it('requires minor and major to be whole words', () => {
      expect(keyScaleAgreement('A minority', 'A', 'minor')).toBeUndefined()
      expect(keyScaleAgreement('A majority', 'A', 'major')).toBeUndefined()
      expect(keyScaleAgreement('A minority major', 'A', 'major')).toBe(true)
      expect(keyScaleAgreement('A minority major', 'A', 'minor')).toBe(false)
    })

    it('finds the mode anywhere in the text', () => {
      expect(keyScaleAgreement('Key: F# (minor)', 'F#', 'minor')).toBe(true)
      expect(keyScaleAgreement('mode=major, tonic: C', 'C', 'major')).toBe(true)
    })
  })

  describe('reference parsing', () => {
    it('is undefined when the reference scale has no mode', () => {
      expect(keyScaleAgreement('A minor', 'A', '')).toBeUndefined()
      expect(keyScaleAgreement('A minor', 'A', 'dorian')).toBeUndefined()
    })

    it('is undefined when the reference key is empty or unrecognised', () => {
      expect(keyScaleAgreement('A minor', '', 'minor')).toBeUndefined()
      expect(keyScaleAgreement('A minor', 'X', 'minor')).toBeUndefined()
    })

    it('parses the scale as whole words', () => {
      expect(keyScaleAgreement('A minor', 'A', 'natural minor')).toBe(true)
      expect(keyScaleAgreement('A minor', 'A', 'minority')).toBeUndefined()
    })

    it('is undefined when both sides are unparseable', () => {
      expect(keyScaleAgreement('nonsense', '', '')).toBeUndefined()
    })
  })
})
