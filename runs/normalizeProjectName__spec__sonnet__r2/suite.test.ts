import { describe, expect, it } from 'vitest'
import { normalizeProjectName } from './normalizeProjectName'

describe('normalizeProjectName', () => {
  describe('anything else (no leading "/" or "-")', () => {
    it('returns a plain relative name unchanged', () => {
      expect(normalizeProjectName('myproject')).toBe('myproject')
    })

    it('returns an empty string unchanged', () => {
      expect(normalizeProjectName('')).toBe('')
    })

    it('returns a windows-style path unchanged', () => {
      expect(normalizeProjectName('C:\\Users\\me\\project')).toBe('C:\\Users\\me\\project')
    })
  })

  describe('absolute paths', () => {
    it('collapses identical last two segments after a marker to the single name', () => {
      expect(normalizeProjectName('/home/me/code/api/api')).toBe('api')
    })

    it('joins segments after a marker with "/"', () => {
      expect(normalizeProjectName('/home/me/code/acme/web')).toBe('acme/web')
    })

    it('falls back to the last two segments when no marker counts', () => {
      expect(normalizeProjectName('/opt/tools/bin')).toBe('tools/bin')
    })

    it('treats a marker as not counting when it is the final segment', () => {
      expect(normalizeProjectName('/home/me/projects')).toBe('me/projects')
    })

    it('returns the input as-is when the result would be empty', () => {
      expect(normalizeProjectName('/')).toBe('/')
    })

    it('does not collapse identical last two segments in the no-marker fallback', () => {
      expect(normalizeProjectName('/opt/bin/bin')).toBe('bin/bin')
    })

    it('picks the earliest marker in priority order even if a later marker appears further right', () => {
      // "workspace" outranks "code", even though "code" is closer to the end.
      expect(normalizeProjectName('/home/workspace/code/foo')).toBe('code/foo')
    })

    it('prefers "src" over "projects" per marker priority order', () => {
      expect(normalizeProjectName('/a/src/projects/b')).toBe('projects/b')
    })

    it('prefers "repos" over "code" per marker priority order', () => {
      expect(normalizeProjectName('/a/repos/code/b')).toBe('code/b')
    })

    it('uses the last occurrence of a marker', () => {
      expect(normalizeProjectName('/code/home/code/api')).toBe('api')
    })

    it('falls back to the next marker when the first marker only occurs as the final segment', () => {
      expect(normalizeProjectName('/a/b/code')).toBe('b/code')
    })

    it('returns a single trailing segment unchanged when only one segment follows the marker', () => {
      expect(normalizeProjectName('/a/code/x')).toBe('x')
    })

    it('collapses to just the last segment when 3+ segments after the marker end in a duplicate pair', () => {
      expect(normalizeProjectName('/home/code/a/b/b')).toBe('b')
    })

    it('joins all segments after the marker when the last two are not identical', () => {
      expect(normalizeProjectName('/home/code/a/b/c')).toBe('a/b/c')
    })

    it('drops empty segments produced by repeated slashes', () => {
      expect(normalizeProjectName('/home//me/code//acme/web')).toBe('acme/web')
    })
  })

  describe('dash-encoded paths', () => {
    it('joins pieces after a marker with "-"', () => {
      expect(normalizeProjectName('-Users-me-projects-my-app')).toBe('my-app')
    })

    it('joins all pieces with "-" when no marker counts and the pieces differ', () => {
      expect(normalizeProjectName('-tmp-scratch')).toBe('tmp-scratch')
    })

    it('returns the input as-is when nothing is left after dropping empty pieces', () => {
      expect(normalizeProjectName('-')).toBe('-')
    })

    it('returns the shared piece when no marker counts and exactly two identical pieces remain', () => {
      expect(normalizeProjectName('-app-app')).toBe('app')
    })

    it('joins more than two pieces with "-" when no marker counts', () => {
      expect(normalizeProjectName('-foo-bar-baz')).toBe('foo-bar-baz')
    })

    it('picks the earliest marker in priority order', () => {
      expect(normalizeProjectName('-workspace-code-foo')).toBe('code-foo')
    })

    it('collapses exactly two identical pieces after a marker to the single piece', () => {
      expect(normalizeProjectName('-a-code-api-api')).toBe('api')
    })

    it('falls back when the only marker occurrence is the final piece', () => {
      expect(normalizeProjectName('-a-b-code')).toBe('a-b-code')
    })

    it('uses the last occurrence of a marker', () => {
      expect(normalizeProjectName('-code-x-code-api')).toBe('api')
    })
  })
})
