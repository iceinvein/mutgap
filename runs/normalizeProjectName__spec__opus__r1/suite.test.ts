import { describe, expect, it } from 'vitest'
import { normalizeProjectName } from './normalizeProjectName'

describe('normalizeProjectName', () => {
  describe('absolute paths', () => {
    it.each([
      // examples from the spec
      ['/home/me/code/api/api', 'api'],
      ['/home/me/code/acme/web', 'acme/web'],
      ['/opt/tools/bin', 'tools/bin'],
      ['/home/me/projects', 'me/projects'],
    ])('spec example %s -> %s', (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected)
    })

    it.each([
      ['/workspace/a/b', 'a/b'],
      ['/x/src/a', 'a'],
      ['/x/projects/a/b', 'a/b'],
      ['/srv/repos/a/b', 'a/b'],
      ['/x/code/a', 'a'],
    ])('recognises each marker: %s -> %s', (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected)
    })

    it.each([
      ['/workspace/src/a', 'src/a'],
      ['/x/src/a/code/b', 'a/code/b'],
      ['/x/code/a/src/b', 'b'],
      ['/projects/a/repos/b', 'a/repos/b'],
      ['/repos/a/code/b', 'a/code/b'],
      ['/code/a/workspace/b', 'b'],
    ])('tries markers in priority order, not position: %s -> %s', (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected)
    })

    it('uses the last occurrence of a marker', () => {
      expect(normalizeProjectName('/code/a/code/b')).toBe('b')
    })

    it('skips a marker that is the final segment and tries the next one', () => {
      expect(normalizeProjectName('/x/code/a/src')).toBe('a/src')
    })

    it('does not fall back to an earlier occurrence when the last occurrence is final', () => {
      expect(normalizeProjectName('/src/a/src')).toBe('a/src')
    })

    it('collapses identical last two segments when there are more than two after the marker', () => {
      expect(normalizeProjectName('/code/org/api/api')).toBe('api')
    })

    it('does not collapse identical segments that are not the last two', () => {
      expect(normalizeProjectName('/code/api/api/v2')).toBe('api/api/v2')
    })

    it('joins all segments after the marker', () => {
      expect(normalizeProjectName('/home/me/code/a/b/c')).toBe('a/b/c')
    })

    it('ignores empty segments from repeated and trailing slashes', () => {
      expect(normalizeProjectName('//home//me//code//acme//web//')).toBe('acme/web')
      expect(normalizeProjectName('/home/me/code/api/')).toBe('api')
      expect(normalizeProjectName('/home/me/code/')).toBe('me/code')
    })

    it('matches markers exactly, not by substring or case-insensitively', () => {
      expect(normalizeProjectName('/home/mycode/a')).toBe('mycode/a')
      expect(normalizeProjectName('/home/Code/a')).toBe('Code/a')
      expect(normalizeProjectName('/home/src-old/a')).toBe('src-old/a')
    })

    it('without a marker, does not collapse identical last two segments', () => {
      expect(normalizeProjectName('/opt/api/api')).toBe('api/api')
    })

    it('returns the single segment when there is only one and no marker', () => {
      expect(normalizeProjectName('/foo')).toBe('foo')
    })

    it('returns a lone marker segment as is', () => {
      expect(normalizeProjectName('/code')).toBe('code')
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
      ['-workspace-a-b', 'a-b'],
      ['-x-src-a', 'a'],
      ['-x-projects-a-b', 'a-b'],
      ['-srv-repos-a-b', 'a-b'],
      ['-x-code-a', 'a'],
    ])('recognises each marker: %s -> %s', (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected)
    })

    it.each([
      ['-workspace-src-a', 'src-a'],
      ['-x-src-a-code-b', 'a-code-b'],
      ['-x-code-a-src-b', 'b'],
      ['-projects-a-repos-b', 'a-repos-b'],
      ['-repos-a-code-b', 'a-code-b'],
    ])('tries markers in priority order, not position: %s -> %s', (input, expected) => {
      expect(normalizeProjectName(input)).toBe(expected)
    })

    it('uses the last occurrence of a marker', () => {
      expect(normalizeProjectName('-code-a-code-b')).toBe('b')
    })

    it('skips a marker that is the final piece and tries the next one', () => {
      expect(normalizeProjectName('-x-code-a-src')).toBe('a-src')
    })

    it('with no counting marker, joins all pieces', () => {
      expect(normalizeProjectName('-Users-me-projects')).toBe('Users-me-projects')
      expect(normalizeProjectName('-src-a-src')).toBe('src-a-src')
    })

    it('collapses exactly two identical pieces after the marker', () => {
      expect(normalizeProjectName('-Users-me-code-api-api')).toBe('api')
    })

    it('does not collapse identical last pieces when more than two follow the marker', () => {
      expect(normalizeProjectName('-code-org-api-api')).toBe('org-api-api')
    })

    it('does not collapse two different pieces after the marker', () => {
      expect(normalizeProjectName('-code-api-web')).toBe('api-web')
    })

    it('without a marker, collapses exactly two identical pieces', () => {
      expect(normalizeProjectName('-api-api')).toBe('api')
    })

    it('without a marker, does not collapse when there are more than two pieces', () => {
      expect(normalizeProjectName('-x-api-api')).toBe('x-api-api')
    })

    it('without a marker, returns a single piece without the leading dash', () => {
      expect(normalizeProjectName('-foo')).toBe('foo')
    })

    it('ignores empty pieces from repeated and trailing dashes', () => {
      expect(normalizeProjectName('--Users--me--code--api--')).toBe('api')
      expect(normalizeProjectName('--a--b')).toBe('a-b')
      expect(normalizeProjectName('--api---api-')).toBe('api')
    })

    it('matches markers exactly, not by substring or case-insensitively', () => {
      expect(normalizeProjectName('-home-mycode-a')).toBe('home-mycode-a')
      expect(normalizeProjectName('-home-Code-a')).toBe('home-Code-a')
    })

    it('returns the input unchanged when there are no pieces', () => {
      expect(normalizeProjectName('-')).toBe('-')
      expect(normalizeProjectName('---')).toBe('---')
    })
  })

  describe('other inputs', () => {
    it.each([
      [''],
      ['my-project'],
      ['api'],
      ['home/me/code/api'],
      ['code-a-b'],
      [' /home/me/code/api'],
      ['C:\\Users\\me\\code\\api'],
      ['~/code/api'],
    ])('returns %j unchanged', (input) => {
      expect(normalizeProjectName(input)).toBe(input)
    })
  })
})
