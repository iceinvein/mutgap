import { describe, expect, it } from 'vitest'
import { keyScaleAgreement } from './keyScaleAgreement'

describe('keyScaleAgreement', () => {
  describe('missing candidate', () => {
    it('returns undefined for an undefined candidate', () => {
      expect(keyScaleAgreement(undefined, 'C', 'major')).toBeUndefined()
    })

    it('returns undefined for an empty candidate', () => {
      expect(keyScaleAgreement('', 'C', 'major')).toBeUndefined()
    })
  })

  describe('basic agreement', () => {
    it('agrees when note and mode match', () => {
      expect(keyScaleAgreement('A minor', 'A', 'minor')).toBe(true)
      expect(keyScaleAgreement('C major', 'C', 'major')).toBe(true)
    })

    it('disagrees when the mode differs', () => {
      expect(keyScaleAgreement('A major', 'A', 'minor')).toBe(false)
      expect(keyScaleAgreement('A minor', 'A', 'major')).toBe(false)
    })

    it('disagrees when the pitch differs', () => {
      expect(keyScaleAgreement('A minor', 'E', 'minor')).toBe(false)
      expect(keyScaleAgreement('C# major', 'C', 'major')).toBe(false)
      expect(keyScaleAgreement('Db major', 'D', 'major')).toBe(false)
    })

    it('disagrees when both pitch and mode differ', () => {
      expect(keyScaleAgreement('A minor', 'C', 'major')).toBe(false)
    })

    it('handles surrounding text in the candidate', () => {
      expect(keyScaleAgreement('Key: Db major', 'Db', 'major')).toBe(true)
      expect(keyScaleAgreement('The piece is in E minor', 'E', 'minor')).toBe(true)
      expect(keyScaleAgreement('Beethoven in E major', 'E', 'major')).toBe(true)
    })
  })

  describe('case insensitivity', () => {
    it('ignores case in the candidate', () => {
      expect(keyScaleAgreement('a MINOR', 'A', 'minor')).toBe(true)
      expect(keyScaleAgreement('KEY: DB MAJOR', 'Db', 'major')).toBe(true)
      expect(keyScaleAgreement('f# Major', 'F#', 'major')).toBe(true)
    })

    it('ignores case in the reference key and scale', () => {
      expect(keyScaleAgreement('A minor', 'a', 'MINOR')).toBe(true)
      expect(keyScaleAgreement('Eb major', 'EB', 'Major')).toBe(true)
    })

    it('reads a lowercase b after a note as a flat', () => {
      expect(keyScaleAgreement('bb minor', 'Bb', 'minor')).toBe(true)
      expect(keyScaleAgreement('ab major', 'G#', 'major')).toBe(true)
    })
  })

  describe('flat sign', () => {
    it('reads ♭ as b in the candidate', () => {
      expect(keyScaleAgreement('B♭ minor', 'Bb', 'minor')).toBe(true)
      expect(keyScaleAgreement('E♭ major', 'D#', 'major')).toBe(true)
    })

    it('reads ♭ as b in the reference key', () => {
      expect(keyScaleAgreement('Ab major', 'A♭', 'major')).toBe(true)
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

      it(`still requires the same mode for ${sharp} and ${flat}`, () => {
        expect(keyScaleAgreement(`${sharp} major`, flat, 'minor')).toBe(false)
      })
    }

    it('does not treat neighbouring pitches as equal', () => {
      expect(keyScaleAgreement('C# major', 'D', 'major')).toBe(false)
      expect(keyScaleAgreement('Bb major', 'B', 'major')).toBe(false)
      expect(keyScaleAgreement('Gb major', 'F', 'major')).toBe(false)
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
        expect(keyScaleAgreement(`${note} major`, note, 'minor')).toBe(false)
      })
    }
  })

  describe('unrecognised spellings', () => {
    for (const note of ['Cb', 'Fb', 'E#', 'B#']) {
      it(`returns undefined for candidate ${note}`, () => {
        expect(keyScaleAgreement(`${note} major`, 'C', 'major')).toBeUndefined()
      })

      it(`returns undefined for reference key ${note}`, () => {
        expect(keyScaleAgreement('C major', note, 'major')).toBeUndefined()
      })
    }

    it('does not recognise letters outside A to G', () => {
      expect(keyScaleAgreement('H minor', 'B', 'minor')).toBeUndefined()
    })
  })

  describe('note parsing', () => {
    it('requires the note to be followed by whitespace or end of text', () => {
      expect(keyScaleAgreement('Am minor', 'A', 'minor')).toBeUndefined()
      expect(keyScaleAgreement('C#m major', 'C#', 'major')).toBeUndefined()
    })

    it('requires the note to begin a word', () => {
      // the "b" and "e" inside words like "tube" or "the" are not notes
      expect(keyScaleAgreement('the tube major', 'E', 'major')).toBeUndefined()
    })

    it('accepts a note at the end of the text', () => {
      expect(keyScaleAgreement('minor key of A', 'A', 'minor')).toBe(true)
      expect(keyScaleAgreement('major, in F#', 'F#', 'major')).toBe(true)
    })

    it('accepts other whitespace after the note', () => {
      expect(keyScaleAgreement('A\tminor', 'A', 'minor')).toBe(true)
      expect(keyScaleAgreement('A\nminor', 'A', 'minor')).toBe(true)
    })

    it('uses the first note found', () => {
      expect(keyScaleAgreement('G major / E minor', 'G', 'minor')).toBe(true)
      expect(keyScaleAgreement('G major / E minor', 'E', 'minor')).toBe(false)
      expect(keyScaleAgreement('D major then A major', 'D', 'major')).toBe(true)
      expect(keyScaleAgreement('D major then A major', 'A', 'major')).toBe(false)
    })

    it('treats a single-letter word such as "a" as a note', () => {
      expect(keyScaleAgreement('a piece in F major', 'A', 'major')).toBe(true)
      expect(keyScaleAgreement('a piece in F major', 'F', 'major')).toBe(false)
    })

    it('returns undefined when there is no note', () => {
      expect(keyScaleAgreement('major', 'C', 'major')).toBeUndefined()
      expect(keyScaleAgreement('Key: unknown minor', 'C', 'minor')).toBeUndefined()
    })
  })

  describe('mode parsing', () => {
    it('prefers minor when both minor and major appear', () => {
      expect(keyScaleAgreement('C major or minor', 'C', 'minor')).toBe(true)
      expect(keyScaleAgreement('C major or minor', 'C', 'major')).toBe(false)
      expect(keyScaleAgreement('C minor or major', 'C', 'minor')).toBe(true)
    })

    it('finds the mode anywhere in the text', () => {
      expect(keyScaleAgreement('minor, in the key of D', 'D', 'minor')).toBe(true)
    })

    it('requires minor and major to be whole words', () => {
      expect(keyScaleAgreement('C majorly', 'C', 'major')).toBeUndefined()
      expect(keyScaleAgreement('C minority', 'C', 'minor')).toBeUndefined()
      expect(keyScaleAgreement('C minority major', 'C', 'major')).toBe(true)
    })

    it('returns undefined when there is no mode', () => {
      expect(keyScaleAgreement('C', 'C', 'major')).toBeUndefined()
      expect(keyScaleAgreement('A min', 'A', 'minor')).toBeUndefined()
      expect(keyScaleAgreement('C dorian', 'C', 'major')).toBeUndefined()
    })
  })

  describe('reference parsing', () => {
    it('returns undefined when the scale is not minor or major', () => {
      expect(keyScaleAgreement('C major', 'C', '')).toBeUndefined()
      expect(keyScaleAgreement('C major', 'C', 'dorian')).toBeUndefined()
    })

    it('returns undefined when the key is not a recognised note', () => {
      expect(keyScaleAgreement('C major', '', 'major')).toBeUndefined()
      expect(keyScaleAgreement('C major', 'X', 'major')).toBeUndefined()
      expect(keyScaleAgreement('C major', 'Cm', 'major')).toBeUndefined()
    })

    it('parses the key and scale joined by a space', () => {
      expect(keyScaleAgreement('A minor', 'A minor', '')).toBe(true)
      expect(keyScaleAgreement('A minor', 'A', 'natural minor')).toBe(true)
    })

    it('returns undefined when both sides are unparseable', () => {
      expect(keyScaleAgreement('nothing', 'X', 'dorian')).toBeUndefined()
    })
  })
})
