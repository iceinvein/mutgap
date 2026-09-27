import { describe, expect, it } from 'vitest'
import { normalizeProjectName } from './normalizeProjectName'

describe('normalizeProjectName', () => {
  describe('unrelated strings', () => {
    it('returns anything not starting with / or - unchanged', () => {
      expect(normalizeProjectName('my-project')).toBe('my-project')
      expect(normalizeProjectName('hello world')).toBe('hello world')
      expect(normalizeProjectName('')).toBe('')
    })
  })

  describe('absolute paths', () => {
    it('collapses duplicated final segment after a counting marker', () => {
      expect(normalizeProjectName('/home/me/code/api/api')).toBe('api')
    })

    it('joins distinct segments after a counting marker with /', () => {
      expect(normalizeProjectName('/home/me/code/acme/web')).toBe('acme/web')
    })

    it('falls back to the last two segments when no marker is present', () => {
      expect(normalizeProjectName('/opt/tools/bin')).toBe('tools/bin')
    })

    it('does not count a marker that is the final segment', () => {
      expect(normalizeProjectName('/home/me/projects')).toBe('me/projects')
    })

    it('returns the input unchanged when there are no segments at all', () => {
      expect(normalizeProjectName('/')).toBe('/')
    })

    it('drops empty segments from repeated slashes', () => {
      expect(normalizeProjectName('//opt//tools//bin//')).toBe('tools/bin')
    })

    it('tries markers in a fixed priority order regardless of position in the path', () => {
      // "src" counts and comes before "code" in priority order, even though
      // "code" appears later in the path.
      expect(normalizeProjectName('/a/src/b/code/c')).toBe('b/code/c')
    })

    it('uses the last occurrence of a marker', () => {
      expect(normalizeProjectName('/a/code/b/code/c')).toBe('c')
    })

    it('does not count a marker whose last occurrence is the final segment', () => {
      expect(normalizeProjectName('/code/x/code')).toBe('x/code')
    })

    it('picks the first marker in priority order that counts, skipping later ones', () => {
      expect(normalizeProjectName('/a/projects/b/repos')).toBe('b/repos')
    })

    it('joins a single trailing segment with itself when only one remains after the marker', () => {
      expect(normalizeProjectName('/home/workspace/only')).toBe('only')
    })
  })

  describe('dash-encoded paths', () => {
    it('joins distinct pieces after a counting marker with -', () => {
      expect(normalizeProjectName('-Users-me-projects-my-app')).toBe('my-app')
    })

    it('falls back to joining all pieces when no marker counts', () => {
      expect(normalizeProjectName('-tmp-scratch')).toBe('tmp-scratch')
    })

    it('returns the input unchanged when nothing is left after dropping empty pieces', () => {
      expect(normalizeProjectName('-')).toBe('-')
      expect(normalizeProjectName('--')).toBe('--')
    })

    it('collapses exactly two identical pieces when no marker counts', () => {
      expect(normalizeProjectName('-tmp-tmp')).toBe('tmp')
    })

    it('does not count a marker that is the final piece', () => {
      expect(normalizeProjectName('-a-src')).toBe('a-src')
    })

    it('collapses two identical pieces even when one looks like a marker but does not count', () => {
      expect(normalizeProjectName('-src-src')).toBe('src')
    })

    it('collapses exactly two identical pieces after a counting marker', () => {
      expect(normalizeProjectName('-a-code-x-x')).toBe('x')
    })

    it('joins a single trailing piece with itself when only one remains after the marker', () => {
      expect(normalizeProjectName('-a-code-x')).toBe('x')
    })

    it('joins three or more pieces after a counting marker with -', () => {
      expect(normalizeProjectName('-a-code-x-y-z')).toBe('x-y-z')
    })

    it('joins three or more pieces with - when no marker counts', () => {
      expect(normalizeProjectName('-a-b-c')).toBe('a-b-c')
    })
  })
})
