import { expect, test } from 'vitest'
import { resolveAppRoute } from './resolveAppRoute'

const at = (pathname: string, search = '', hash = '') => resolveAppRoute({ pathname, search, hash })

test('a resume path wins over the resume query parameter', () => {
  expect(at('/resume/alice', '?resume=bob')).toEqual({ mode: 'shared-resume', slug: 'alice' })
})

test('the hash wins over the path', () => {
  expect(at('/resume/alice', '', '#/resume/carol')).toEqual({ mode: 'shared-resume', slug: 'carol' })
})

test('a flag-like query value opens the default resume', () => {
  expect(at('/', '?resume=true')).toEqual({ mode: 'shared-resume', slug: 'resume' })
})

test('slugs are normalised', () => {
  expect(at('/', '', '#Jane_Doe.mdx')).toEqual({ mode: 'shared-resume', slug: 'jane-doe' })
})

test('a URL with no resume signal opens the editor', () => {
  expect(at('/')).toEqual({ mode: 'editor' })
  expect(at('/resume/alice/extra')).toEqual({ mode: 'editor' })
})
