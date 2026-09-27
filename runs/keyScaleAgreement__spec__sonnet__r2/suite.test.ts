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

  describe('basic agreement', () => {
    it('agrees on matching note and mode', () => {
      expect(keyScaleAgreement('A minor', 'A', 'minor')).toBe(true)
    })

    it('agrees on matching major', () => {
      expect(keyScaleAgreement('C major', 'C', 'major')).toBe(true)
    })

    it('disagrees on different note, same mode', () => {
      expect(keyScaleAgreement('A minor', 'B', 'minor')).toBe(false)
    })

    it('disagrees on same note, different mode', () => {
      expect(keyScaleAgreement('A minor', 'A', 'major')).toBe(false)
    })

    it('disagrees on different note and different mode', () => {
      expect(keyScaleAgreement('A minor', 'B', 'major')).toBe(false)
    })
  })

  describe('case-insensitivity', () => {
    it('ignores case in candidate and reference', () => {
      expect(keyScaleAgreement('a MINOR', 'a', 'MINOR')).toBe(true)
    })

    it('ignores case with mixed casing', () => {
      expect(keyScaleAgreement('Bb Major', 'bb', 'major')).toBe(true)
    })
  })

  describe('♭ symbol handling', () => {
    it('reads ♭ as b in the candidate', () => {
      expect(keyScaleAgreement('D♭ major', 'C#', 'major')).toBe(true)
    })

    it('reads ♭ as b in the reference', () => {
      expect(keyScaleAgreement('C# major', 'D♭', 'major')).toBe(true)
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

    it('does not treat different black-key pitches as equivalent', () => {
      expect(keyScaleAgreement('C# minor', 'Eb', 'minor')).toBe(false)
    })
  })

  describe('unrecognised note spellings', () => {
    it.each(['Cb', 'Fb', 'E#', 'B#'])(
      'treats %s as unparseable in the candidate',
      (spelling) => {
        expect(keyScaleAgreement(`${spelling} minor`, 'C', 'minor')).toBeUndefined()
      },
    )

    it.each(['Cb', 'Fb', 'E#', 'B#'])(
      'treats %s as unparseable in the reference',
      (spelling) => {
        expect(keyScaleAgreement('C minor', spelling, 'minor')).toBeUndefined()
      },
    )
  })

  describe('recognised sharps and flats', () => {
    it.each(['C#', 'D#', 'F#', 'G#', 'A#'])('recognises sharp %s', (note) => {
      expect(keyScaleAgreement(`${note} major`, note, 'major')).toBe(true)
    })

    it.each(['Db', 'Eb', 'Gb', 'Ab', 'Bb'])('recognises flat %s', (note) => {
      expect(keyScaleAgreement(`${note} major`, note, 'major')).toBe(true)
    })

    it.each(['A', 'B', 'C', 'D', 'E', 'F', 'G'])('recognises natural %s', (note) => {
      expect(keyScaleAgreement(`${note} minor`, note, 'minor')).toBe(true)
    })
  })

  describe('mode detection', () => {
    it('requires the whole word "minor", not a substring', () => {
      expect(keyScaleAgreement('C minorish', 'C', 'minor')).toBeUndefined()
    })

    it('requires the whole word "major", not a substring', () => {
      expect(keyScaleAgreement('C majorly', 'C', 'major')).toBeUndefined()
    })

    it('prefers minor when both minor and major appear', () => {
      expect(keyScaleAgreement('A major minor', 'A', 'minor')).toBe(true)
      expect(keyScaleAgreement('A major minor', 'A', 'major')).toBe(false)
    })

    it('finds the mode word anywhere in the text', () => {
      expect(keyScaleAgreement('Detected key: A minor (confidence high)', 'A', 'minor')).toBe(true)
    })
  })

  describe('note position rules', () => {
    it('requires the note to be followed by whitespace or end of text', () => {
      expect(keyScaleAgreement('Cmajor', 'C', 'major')).toBeUndefined()
    })

    it('accepts a note at the end of the text', () => {
      expect(keyScaleAgreement('minor A', 'A', 'minor')).toBe(true)
    })

    it('requires the note to begin a word', () => {
      expect(keyScaleAgreement('xA minor', 'A', 'minor')).toBeUndefined()
    })

    it('parses a prefixed example like "Key: Db major"', () => {
      expect(keyScaleAgreement('Key: Db major', 'C#', 'major')).toBe(true)
    })
  })

  describe('unparseable text', () => {
    it('returns undefined when candidate has no note and no mode', () => {
      expect(keyScaleAgreement('hello world', 'A', 'minor')).toBeUndefined()
    })

    it('returns undefined when candidate has a note but no mode', () => {
      expect(keyScaleAgreement('A', 'A', 'minor')).toBeUndefined()
    })

    it('returns undefined when candidate has a mode but no note', () => {
      expect(keyScaleAgreement('minor', 'A', 'minor')).toBeUndefined()
    })

    it('returns undefined when the reference note is invalid', () => {
      expect(keyScaleAgreement('A minor', 'H', 'minor')).toBeUndefined()
    })

    it('returns undefined when the reference scale is not major or minor', () => {
      expect(keyScaleAgreement('A minor', 'A', 'dorian')).toBeUndefined()
    })
  })
})
