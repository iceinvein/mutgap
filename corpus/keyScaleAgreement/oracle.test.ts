import { expect, test } from 'vitest'
import { keyScaleAgreement } from './keyScaleAgreement'

test('a candidate naming no mode cannot be compared', () => {
  expect(keyScaleAgreement('C', 'C', 'major')).toBeUndefined()
})

test('same note and mode agree, ignoring case', () => {
  expect(keyScaleAgreement('a MINOR', 'A', 'minor')).toBe(true)
})

test('enharmonic spellings and the flat sign agree', () => {
  expect(keyScaleAgreement('Key: Db major', 'C#', 'major')).toBe(true)
  expect(keyScaleAgreement('B♭ minor', 'A#', 'minor')).toBe(true)
})

test('a different mode disagrees', () => {
  expect(keyScaleAgreement('A major', 'A', 'minor')).toBe(false)
})

test('a missing candidate or unrecognised note cannot be compared', () => {
  expect(keyScaleAgreement(undefined, 'A', 'minor')).toBeUndefined()
  expect(keyScaleAgreement('H minor', 'A', 'minor')).toBeUndefined()
})
