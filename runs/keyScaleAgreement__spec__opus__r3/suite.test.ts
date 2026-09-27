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

    it('returns undefined for a whitespace-only candidate', () => {
      expect(keyScaleAgreement('   ', 'C', 'major')).toBeUndefined()
    })
  })

  describe('basic agreement', () => {
    it('agrees on identical key and mode', () => {
      expect(keyScaleAgreement('A minor', 'A', 'minor')).toBe(true)
      expect(keyScaleAgreement('C major', 'C', 'major')).toBe(true)
    })

    it('accepts surrounding free text', () => {
      expect(keyScaleAgreement('Key: Db major', 'Db', 'major')).toBe(true)
      expect(keyScaleAgreement('The song is in F# minor.', 'F#', 'minor')).toBe(true)
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

    it('treats relative keys as disagreeing', () => {
      expect(keyScaleAgreement('A minor', 'C', 'major')).toBe(false)
    })
  })

  describe('case insensitivity', () => {
    it('ignores case in the candidate', () => {
      expect(keyScaleAgreement('a MINOR', 'A', 'minor')).toBe(true)
      expect(keyScaleAgreement('DB Major', 'Db', 'major')).toBe(true)
      expect(keyScaleAgreement('bb minor', 'Bb', 'minor')).toBe(true)
    })

    it('ignores case in the reference', () => {
      expect(keyScaleAgreement('Eb major', 'eb', 'MAJOR')).toBe(true)
      expect(keyScaleAgreement('G minor', 'g', 'Minor')).toBe(true)
    })
  })

  describe('flat sign', () => {
    it('reads ♭ as b in the candidate', () => {
      expect(keyScaleAgreement('E♭ minor', 'Eb', 'minor')).toBe(true)
    })

    it('reads ♭ as b in the reference', () => {
      expect(keyScaleAgreement('Ab major', 'A♭', 'major')).toBe(true)
    })

    it('treats ♭ notes enharmonically', () => {
      expect(keyScaleAgreement('B♭ major', 'A#', 'major')).toBe(true)
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
        expect(keyScaleAgreement(`${sharp} minor`, flat, 'minor')).toBe(true)
        expect(keyScaleAgreement(`${flat} major`, sharp, 'major')).toBe(true)
      })

      it(`still requires the same mode for ${sharp}/${flat}`, () => {
        expect(keyScaleAgreement(`${sharp} minor`, flat, 'major')).toBe(false)
      })
    }

    it('does not equate unrelated neighbours', () => {
      expect(keyScaleAgreement('C# major', 'D', 'major')).toBe(false)
      expect(keyScaleAgreement('Gb major', 'G', 'major')).toBe(false)
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
      })
    }
  })

  describe('unrecognised spellings', () => {
    for (const note of ['Cb', 'Fb', 'E#', 'B#']) {
      it(`returns undefined for candidate ${note}`, () => {
        expect(keyScaleAgreement(`${note} major`, 'C', 'major')).toBeUndefined()
      })

      it(`returns undefined for reference ${note}`, () => {
        expect(keyScaleAgreement('C major', note, 'major')).toBeUndefined()
      })
    }

    it('does not treat Cb as B or E# as F', () => {
      expect(keyScaleAgreement('Cb major', 'B', 'major')).toBeUndefined()
      expect(keyScaleAgreement('E# minor', 'F', 'minor')).toBeUndefined()
    })
  })

  describe('note parsing', () => {
    it('accepts a note at the end of the text', () => {
      expect(keyScaleAgreement('major C', 'C', 'major')).toBe(true)
      expect(keyScaleAgreement('minor, key of F#', 'F#', 'minor')).toBe(true)
    })

    it('accepts non-space whitespace after the note', () => {
      expect(keyScaleAgreement('F#\tminor', 'F#', 'minor')).toBe(true)
      expect(keyScaleAgreement('G\nmajor', 'G', 'major')).toBe(true)
    })

    it('ignores letters that do not begin a word', () => {
      expect(keyScaleAgreement('Bach in G major', 'G', 'major')).toBe(true)
    })

    it('ignores A-G words that are not followed by whitespace or end', () => {
      expect(keyScaleAgreement('Detected G major', 'G', 'major')).toBe(true)
      expect(keyScaleAgreement('Estimated key G minor', 'G', 'minor')).toBe(true)
    })

    it('requires the note to be followed by whitespace or end of text', () => {
      expect(keyScaleAgreement('C-major', 'C', 'major')).toBeUndefined()
      expect(keyScaleAgreement('Cmajor', 'C', 'major')).toBeUndefined()
      expect(keyScaleAgreement('Am minor', 'A', 'minor')).toBeUndefined()
    })

    it('uses the first qualifying note', () => {
      expect(keyScaleAgreement('F# or G major', 'F#', 'major')).toBe(true)
      expect(keyScaleAgreement('F# or G major', 'G', 'major')).toBe(false)
    })

    it('treats a standalone article "a" as the note A', () => {
      expect(keyScaleAgreement('a key of C major', 'A', 'major')).toBe(true)
      expect(keyScaleAgreement('a key of C major', 'C', 'major')).toBe(false)
    })

    it('returns undefined when there is no note', () => {
      expect(keyScaleAgreement('major', 'C', 'major')).toBeUndefined()
      expect(keyScaleAgreement('H minor', 'B', 'minor')).toBeUndefined()
    })

    it('returns undefined when the reference key is empty', () => {
      expect(keyScaleAgreement('C major', '', 'major')).toBeUndefined()
    })
  })

  describe('mode parsing', () => {
    it('prefers minor over major when both appear', () => {
      expect(keyScaleAgreement('C major or minor', 'C', 'minor')).toBe(true)
      expect(keyScaleAgreement('C major or minor', 'C', 'major')).toBe(false)
    })

    it('applies minor anywhere in the text to the first note', () => {
      expect(keyScaleAgreement('G major (relative E minor)', 'G', 'minor')).toBe(true)
    })

    it('requires minor and major to be whole words', () => {
      expect(keyScaleAgreement('A minority major', 'A', 'major')).toBe(true)
      expect(keyScaleAgreement('C majority', 'C', 'major')).toBeUndefined()
      expect(keyScaleAgreement('C minors', 'C', 'minor')).toBeUndefined()
    })

    it('accepts mode words next to punctuation', () => {
      expect(keyScaleAgreement('D (minor)', 'D', 'minor')).toBe(true)
      expect(keyScaleAgreement('Key = E major.', 'E', 'major')).toBe(true)
      expect(keyScaleAgreement('Key = E, major.', 'E', 'major')).toBeUndefined()
    })

    it('returns undefined when the candidate has no mode', () => {
      expect(keyScaleAgreement('C', 'C', 'major')).toBeUndefined()
      expect(keyScaleAgreement('C dorian', 'C', 'major')).toBeUndefined()
    })

    it('returns undefined when the reference has no mode', () => {
      expect(keyScaleAgreement('C major', 'C', '')).toBeUndefined()
      expect(keyScaleAgreement('C major', 'C', 'dorian')).toBeUndefined()
    })

    it('returns undefined when both sides are unparseable', () => {
      expect(keyScaleAgreement('nothing here', 'X', 'lydian')).toBeUndefined()
    })
  })
})
