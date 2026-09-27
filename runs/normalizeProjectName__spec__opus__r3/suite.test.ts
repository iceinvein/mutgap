import { describe, it, expect } from 'vitest'
import { normalizeProjectName } from './normalizeProjectName'

describe('normalizeProjectName', () => {
  describe('absolute paths', () => {
    it.each([
      // examples from the spec
      ['/home/me/code/api/api', 'api'],
      ['/home/me/code/acme/web', 'acme/web'],
      ['/opt/tools/bin', 'tools/bin'],
      ['/home/me/projects', 'me/projects'],
    ])('%s -> %s (spec examples)', (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected)
    })

    it.each([
      ['/home/me/workspace/app', 'app'],
      ['/home/me/src/app', 'app'],
      ['/home/me/projects/app', 'app'],
      ['/home/me/repos/app', 'app'],
      ['/home/me/code/app', 'app'],
    ])('recognises each marker: %s -> %s', (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected)
    })

    it('tries markers in priority order, not by position in the path', () => {
      expect(normalizeProjectName('/x/code/a/workspace/b')).toBe('b')
      expect(normalizeProjectName('/x/workspace/a/code/b')).toBe('a/code/b')
      expect(normalizeProjectName('/x/repos/a/src/b')).toBe('b')
      expect(normalizeProjectName('/x/src/a/projects/b')).toBe('a/projects/b')
    })

    it('uses the last occurrence of a marker', () => {
      expect(normalizeProjectName('/src/a/src/b')).toBe('b')
      expect(normalizeProjectName('/code/a/code/b/c')).toBe('b/c')
    })

    it('ignores a marker that is the final segment and falls through to the next marker', () => {
      expect(normalizeProjectName('/home/projects/foo/src')).toBe('foo/src')
    })

    it('uses the earlier occurrence only if the last one does not count', () => {
      // last "code" is final, so "code" does not count at all; no other marker
      expect(normalizeProjectName('/code/a/code')).toBe('a/code')
    })

    it('falls back to the last two segments when the only marker is final', () => {
      expect(normalizeProjectName('/code')).toBe('code')
      expect(normalizeProjectName('/home/me/code/code')).toBe('code/code')
    })

    it('collapses identical last two segments after a marker, even with more segments', () => {
      expect(normalizeProjectName('/code/a/b/b')).toBe('b')
    })

    it('does not collapse when the last two segments after a marker differ', () => {
      expect(normalizeProjectName('/code/b/b/a')).toBe('b/b/a')
    })

    it('does not collapse identical segments in the no-marker fallback', () => {
      expect(normalizeProjectName('/opt/foo/foo')).toBe('foo/foo')
    })

    it('drops empty segments from repeated and trailing slashes', () => {
      expect(normalizeProjectName('//home//me//code//app//')).toBe('app')
      expect(normalizeProjectName('/opt/tools/bin/')).toBe('tools/bin')
    })

    it('returns a single segment when there is only one and no marker', () => {
      expect(normalizeProjectName('/foo')).toBe('foo')
    })

    it('returns the input unchanged when there are no segments', () => {
      expect(normalizeProjectName('/')).toBe('/')
      expect(normalizeProjectName('///')).toBe('///')
    })

    it('matches markers exactly', () => {
      expect(normalizeProjectName('/home/Code/app')).toBe('Code/app')
      expect(normalizeProjectName('/home/mycode/app')).toBe('mycode/app')
    })
  })

  describe('dash-encoded paths', () => {
    it.each([
      // examples from the spec
      ['-Users-me-projects-my-app', 'my-app'],
      ['-tmp-scratch', 'tmp-scratch'],
    ])('%s -> %s (spec examples)', (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected)
    })

    it.each([
      ['-home-me-workspace-app', 'app'],
      ['-home-me-src-app', 'app'],
      ['-home-me-projects-app', 'app'],
      ['-home-me-repos-app', 'app'],
      ['-home-me-code-app', 'app'],
    ])('recognises each marker: %s -> %s', (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected)
    })

    it('tries markers in priority order, not by position', () => {
      expect(normalizeProjectName('-x-code-a-workspace-b')).toBe('b')
      expect(normalizeProjectName('-x-workspace-a-code-b')).toBe('a-code-b')
    })

    it('uses the last occurrence of a marker', () => {
      expect(normalizeProjectName('-src-a-src-b')).toBe('b')
    })

    it('ignores a marker that is the final piece', () => {
      expect(normalizeProjectName('-Users-me-projects')).toBe('Users-me-projects')
      expect(normalizeProjectName('-home-projects-foo-src')).toBe('foo-src')
    })

    it('collapses exactly two identical pieces after a marker', () => {
      expect(normalizeProjectName('-Users-me-code-api-api')).toBe('api')
    })

    it('does not collapse when there are more than two pieces after a marker', () => {
      expect(normalizeProjectName('-Users-me-code-a-b-b')).toBe('a-b-b')
    })

    it('collapses exactly two identical pieces when no marker counts', () => {
      expect(normalizeProjectName('-foo-foo')).toBe('foo')
    })

    it('joins all pieces when no marker counts and they are not a duplicate pair', () => {
      expect(normalizeProjectName('-a-b-b')).toBe('a-b-b')
      expect(normalizeProjectName('-code')).toBe('code')
    })

    it('drops empty pieces from repeated and trailing dashes', () => {
      expect(normalizeProjectName('-Users--me--code--app-')).toBe('app')
      expect(normalizeProjectName('--tmp--scratch--')).toBe('tmp-scratch')
    })

    it('returns the input unchanged when nothing is left', () => {
      expect(normalizeProjectName('-')).toBe('-')
      expect(normalizeProjectName('---')).toBe('---')
    })
  })

  describe('other inputs', () => {
    it.each([
      'my-project',
      'relative/code/app',
      'code-app',
      '',
      ' /home/me/code/app',
      'C:\\Users\\me\\code\\app',
    ])('returns %j unchanged', (input) => {
      expect(normalizeProjectName(input)).toBe(input)
    })
  })
})
