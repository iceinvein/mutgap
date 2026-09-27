import { expect, test } from 'vitest'
import { velocities } from './velocities'

const done = (...dates: (string | null)[]) => dates.map((doneAt, i) => ({ fr: `FR-${i}`, doneAt }))
const UNMEASURED = 'not enough dated completions to measure a rate; one point is not a rate'

test('two dated completions are enough to measure both rates', () => {
  expect(velocities(done('2026-01-01', '2026-01-03'), '2026-01-05')).toEqual({
    asIs: { value: 0.4, basis: '2 dated completion(s) over 5 calendar day(s) since 2026-01-01, quiet days included' },
    active: { value: 1, basis: '2 dated completion(s) over 2 day(s) something completed' },
  })
})

test('a single dated completion leaves both rates unmeasured', () => {
  expect(velocities(done('2026-01-01', null, '2026-02-31'), '2026-01-05')).toEqual({
    asIs: { value: null, basis: UNMEASURED },
    active: { value: null, basis: UNMEASURED },
  })
})

test('the era extends to a completion dated after today', () => {
  const r = velocities(done('2026-01-10', '2026-01-01', '2026-01-01', 'soon'), '2026-01-05')
  expect(r.asIs.value).toBe(0.3)
  expect(r.active.value).toBe(1.5)
})

test('an era ending today on the day it started is one day long', () => {
  const r = velocities(done('2026-03-04', '2026-03-04', '2026-03-04'), '2026-03-04')
  expect(r.asIs.value).toBe(3)
  expect(r.active.value).toBe(3)
})
