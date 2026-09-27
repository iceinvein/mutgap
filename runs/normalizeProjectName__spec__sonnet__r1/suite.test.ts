import { describe, expect, it } from 'vitest'
import { normalizeProjectName } from './normalizeProjectName'

describe('normalizeProjectName', () => {
  describe('unrecognized shapes', () => {
    it('returns a plain name unchanged', () => {
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
    it('collapses identical last two segments after a marker to one', () => {
      expect(normalizeProjectName('/home/me/code/api/api')).toBe('api')
    })

    it('joins the segments after a marker when they differ', () => {
      expect(normalizeProjectName('/home/me/code/acme/web')).toBe('acme/web')
    })

    it('falls back to the last two segments when no marker is present', () => {
      expect(normalizeProjectName('/opt/tools/bin')).toBe('tools/bin')
    })

    it('does not count a marker that is the final segment', () => {
      expect(normalizeProjectName('/home/me/projects')).toBe('me/projects')
    })

    it('returns the input unchanged for the root path', () => {
      expect(normalizeProjectName('/')).toBe('/')
    })

    it('falls back to a single segment when fewer than two are available', () => {
      expect(normalizeProjectName('/home')).toBe('home')
    })

    it('prefers an earlier marker in priority order over a later one', () => {
      // both 'workspace' and 'code' are present and non-final; 'workspace' wins
      expect(normalizeProjectName('/a/workspace/b/code/c/d')).toBe('b/code/c/d')
    })

    it('skips a non-counting marker and uses the next counting one in priority order', () => {
      // 'workspace' is the final segment (does not count); 'src' counts instead
      expect(normalizeProjectName('/a/src/b/workspace')).toBe('b/workspace')
    })

    it('uses the last occurrence of a marker', () => {
      expect(normalizeProjectName('/src/a/src/b')).toBe('b')
    })

    it('collapses to one when the last two of more than two trailing segments are identical', () => {
      expect(normalizeProjectName('/home/me/code/x/y/z/z')).toBe('z')
    })

    it('ignores empty segments from repeated slashes', () => {
      expect(normalizeProjectName('/home//me//code//acme//web')).toBe('acme/web')
    })
  })

  describe('dash-encoded paths', () => {
    it('joins two differing segments after a marker with a dash', () => {
      expect(normalizeProjectName('-Users-me-projects-my-app')).toBe('my-app')
    })

    it('joins all pieces with a dash when no marker counts and pieces differ', () => {
      expect(normalizeProjectName('-tmp-scratch')).toBe('tmp-scratch')
    })

    it('collapses to one piece when no marker counts but the only two pieces are identical', () => {
      expect(normalizeProjectName('-app-app')).toBe('app')
    })

    it('collapses to one piece when exactly two identical pieces follow a counting marker', () => {
      expect(normalizeProjectName('-Users-me-code-api-api')).toBe('api')
    })

    it('joins with a dash when only one piece follows a counting marker', () => {
      expect(normalizeProjectName('-Users-code-solo')).toBe('solo')
    })

    it('joins with a dash (no collapsing) when more than two pieces follow a counting marker, even if the last two match', () => {
      expect(normalizeProjectName('-Users-code-a-b-b')).toBe('a-b-b')
    })

    it('does not count a marker that is the final piece', () => {
      expect(normalizeProjectName('-Users-me-src')).toBe('Users-me-src')
    })

    it('returns the input unchanged when nothing is left after dropping empty pieces', () => {
      expect(normalizeProjectName('-')).toBe('-')
      expect(normalizeProjectName('--')).toBe('--')
    })

    it('prefers an earlier marker in priority order over a later one', () => {
      expect(normalizeProjectName('-a-workspace-b-code-c-d')).toBe('b-code-c-d')
    })

    it('uses the last occurrence of a marker', () => {
      expect(normalizeProjectName('-src-a-src-b')).toBe('b')
    })
  })
})
