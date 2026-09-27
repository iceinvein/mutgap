import { describe, expect, it } from 'vitest'
import { normalizeProjectName } from './normalizeProjectName'

describe('normalizeProjectName', () => {
  describe('absolute paths', () => {
    it.each([
      // Examples from the spec
      ['/home/me/code/api/api', 'api'],
      ['/home/me/code/acme/web', 'acme/web'],
      ['/opt/tools/bin', 'tools/bin'],
      ['/home/me/projects', 'me/projects'],
    ])('spec example %s -> %s', (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected)
    })

    it.each([
      ['workspace', '/home/me/workspace/app'],
      ['src', '/home/me/src/app'],
      ['projects', '/home/me/projects/app'],
      ['repos', '/home/me/repos/app'],
      ['code', '/home/me/code/app'],
    ])('recognises the %s marker', (_marker, input) => {
      expect(normalizeProjectName(input)).toBe('app')
    })

    it('keeps all segments after the marker', () => {
      expect(normalizeProjectName('/w/workspace/org/team/repo')).toBe('org/team/repo')
    })

    it('collapses only when the last two segments are identical', () => {
      expect(normalizeProjectName('/code/org/api/api')).toBe('api')
      expect(normalizeProjectName('/code/api/api/x')).toBe('api/api/x')
    })

    it('tries markers in priority order, not by position', () => {
      // src outranks code even though code appears first
      expect(normalizeProjectName('/x/code/a/src/b')).toBe('b')
      // workspace outranks src even though src appears later
      expect(normalizeProjectName('/x/workspace/a/src/b')).toBe('a/src/b')
      // projects outranks repos
      expect(normalizeProjectName('/x/projects/a/repos/b')).toBe('a/repos/b')
    })

    it('uses the last occurrence of a marker', () => {
      expect(normalizeProjectName('/a/src/x/src/y')).toBe('y')
    })

    it('skips a marker that is the final segment and falls through to the next marker', () => {
      expect(normalizeProjectName('/home/code/app/src')).toBe('app/src')
    })

    it('ignores a marker whose last occurrence is final, even if an earlier occurrence is not', () => {
      expect(normalizeProjectName('/a/src/b/src')).toBe('b/src')
    })

    it('falls back to the last two segments when no marker counts', () => {
      expect(normalizeProjectName('/usr/local/lib/node')).toBe('lib/node')
      expect(normalizeProjectName('/code')).toBe('code')
      expect(normalizeProjectName('/foo')).toBe('foo')
    })

    it('does not collapse identical segments in the no-marker fallback', () => {
      expect(normalizeProjectName('/opt/app/app')).toBe('app/app')
    })

    it('drops empty segments from repeated and trailing slashes', () => {
      expect(normalizeProjectName('//home//me//code//x//')).toBe('x')
      expect(normalizeProjectName('/opt/tools/bin/')).toBe('tools/bin')
    })

    it('matches markers as whole segments only', () => {
      expect(normalizeProjectName('/home/mysrc/app')).toBe('mysrc/app')
      expect(normalizeProjectName('/home/codebase/app')).toBe('codebase/app')
    })

    it('matches markers case-sensitively', () => {
      expect(normalizeProjectName('/home/me/Code/org/app')).toBe('org/app')
      expect(normalizeProjectName('/home/Code/app')).toBe('Code/app')
    })

    it('returns the input unchanged when there are no segments', () => {
      expect(normalizeProjectName('/')).toBe('/')
      expect(normalizeProjectName('///')).toBe('///')
    })
  })

  describe('dash-encoded paths', () => {
    it.each([
      ['-Users-me-projects-my-app', 'my-app'],
      ['-tmp-scratch', 'tmp-scratch'],
    ])('spec example %s -> %s', (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected)
    })

    it.each([
      ['workspace', '-home-me-workspace-app'],
      ['src', '-home-me-src-app'],
      ['projects', '-home-me-projects-app'],
      ['repos', '-home-me-repos-app'],
      ['code', '-home-me-code-app'],
    ])('recognises the %s marker', (_marker, input) => {
      expect(normalizeProjectName(input)).toBe('app')
    })

    it('collapses exactly two identical pieces after a marker', () => {
      expect(normalizeProjectName('-Users-me-code-api-api')).toBe('api')
    })

    it('does not collapse when there are more than two pieces after a marker', () => {
      expect(normalizeProjectName('-x-code-a-a-a')).toBe('a-a-a')
      expect(normalizeProjectName('-x-code-b-a-a')).toBe('b-a-a')
    })

    it('tries markers in priority order, not by position', () => {
      expect(normalizeProjectName('-x-code-a-src-b')).toBe('b')
      expect(normalizeProjectName('-x-workspace-a-src-b')).toBe('a-src-b')
    })

    it('uses the last occurrence of a marker', () => {
      expect(normalizeProjectName('-a-src-x-src-y')).toBe('y')
    })

    it('skips a marker that is the final piece and falls through to the next marker', () => {
      expect(normalizeProjectName('-home-code-app-src')).toBe('app-src')
    })

    it('joins all pieces when no marker counts', () => {
      expect(normalizeProjectName('-opt-tools-bin')).toBe('opt-tools-bin')
      expect(normalizeProjectName('-Users-me-projects')).toBe('Users-me-projects')
      expect(normalizeProjectName('-a-src-b-src')).toBe('a-src-b-src')
      expect(normalizeProjectName('-foo')).toBe('foo')
    })

    it('collapses exactly two identical pieces when no marker counts', () => {
      expect(normalizeProjectName('-foo-foo')).toBe('foo')
      expect(normalizeProjectName('-foo-foo-foo')).toBe('foo-foo-foo')
    })

    it('drops empty pieces from repeated dashes', () => {
      expect(normalizeProjectName('-Users--me--code--x')).toBe('x')
      expect(normalizeProjectName('-tmp--scratch-')).toBe('tmp-scratch')
    })

    it('matches markers as whole pieces only', () => {
      expect(normalizeProjectName('-home-mysrc-app')).toBe('home-mysrc-app')
    })

    it('returns the input unchanged when there are no pieces', () => {
      expect(normalizeProjectName('-')).toBe('-')
      expect(normalizeProjectName('---')).toBe('---')
    })
  })

  describe('other inputs', () => {
    it.each([
      'my-project',
      'code/app',
      'workspace-src-app',
      'C:\\Users\\me\\code\\app',
      ' /home/me/code/app',
      '',
    ])('returns %j unchanged', (input) => {
      expect(normalizeProjectName(input)).toBe(input)
    })
  })
})
