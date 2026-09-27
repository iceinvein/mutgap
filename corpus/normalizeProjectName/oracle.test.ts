import { expect, test } from 'vitest'
import { normalizeProjectName } from './normalizeProjectName'

test('an absolute path ending in a marker directory falls back to its last two segments', () => {
  expect(normalizeProjectName('/home/me/projects')).toBe('me/projects')
})

test('an absolute path keeps the segments after the marker', () => {
  expect(normalizeProjectName('/home/me/code/acme/web')).toBe('acme/web')
})

test('a repeated final segment after the marker collapses to one', () => {
  expect(normalizeProjectName('/home/me/src/api/api')).toBe('api')
})

test('an absolute path with no marker gives its last two segments', () => {
  expect(normalizeProjectName('/opt/tools/bin')).toBe('tools/bin')
})

test('a dash-encoded path keeps the pieces after the marker joined by dashes', () => {
  expect(normalizeProjectName('-Users-me-projects-my-app')).toBe('my-app')
})

test('a plain name is returned unchanged', () => {
  expect(normalizeProjectName('scratch')).toBe('scratch')
})
