import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks, type DiffLine } from './parseUnifiedDiffToHunks'

const lines = (...ls: string[]) => ls.join('\n')

const ctx = (content: string, oldLineNo: number, newLineNo: number): DiffLine => ({
  type: 'context',
  content,
  oldLineNo,
  newLineNo,
})
const add = (content: string, newLineNo: number): DiffLine => ({
  type: 'added',
  content,
  oldLineNo: null,
  newLineNo,
})
const rem = (content: string, oldLineNo: number): DiffLine => ({
  type: 'removed',
  content,
  oldLineNo,
  newLineNo: null,
})

describe('parseUnifiedDiffToHunks', () => {
  describe('empty and hunk-less input', () => {
    it('returns [] for an empty string', () => {
      expect(parseUnifiedDiffToHunks('')).toEqual([])
    })

    it('returns [] when there is no hunk header', () => {
      const diff = lines(
        'diff --git a/foo.ts b/foo.ts',
        'index 1234567..89abcde 100644',
        '--- a/foo.ts',
        '+++ b/foo.ts',
        ' context',
        '+added',
        '-removed',
      )
      expect(parseUnifiedDiffToHunks(diff)).toEqual([])
    })
  })

  describe('hunk header', () => {
    it('records oldStart, oldLines, newStart, newLines', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -12,34 +56,78 @@')
      expect(hunk.oldStart).toBe(12)
      expect(hunk.oldLines).toBe(34)
      expect(hunk.newStart).toBe(56)
      expect(hunk.newLines).toBe(78)
    })

    it('records a header of "" when nothing follows the closing @@', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@')
      expect(hunk.header).toBe('')
    })

    it('records everything after the closing @@ exactly as written, including the leading space', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@ function foo(a, b) {')
      expect(hunk.header).toBe(' function foo(a, b) {')
    })

    it('does not trim trailing whitespace in the header', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@  class X  ')
      expect(hunk.header).toBe('  class X  ')
    })

    it('records a header without a leading space verbatim', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@foo')
      expect(hunk.header).toBe('foo')
    })

    it('defaults both counts to 1 when omitted', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -3 +4 @@')
      expect(hunk).toMatchObject({ oldStart: 3, oldLines: 1, newStart: 4, newLines: 1 })
    })

    it('defaults only the old count to 1 when only it is omitted', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -3 +4,7 @@')
      expect(hunk).toMatchObject({ oldStart: 3, oldLines: 1, newStart: 4, newLines: 7 })
    })

    it('defaults only the new count to 1 when only it is omitted', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -3,7 +4 @@')
      expect(hunk).toMatchObject({ oldStart: 3, oldLines: 7, newStart: 4, newLines: 1 })
    })

    it('records explicit zero counts and starts (e.g. a new file)', () => {
      const [hunk] = parseUnifiedDiffToHunks(lines('@@ -0,0 +1,2 @@', '+a', '+b'))
      expect(hunk).toMatchObject({ oldStart: 0, oldLines: 0, newStart: 1, newLines: 2 })
      expect(hunk.lines).toEqual([add('a', 1), add('b', 2)])
    })

    it('records an omitted-count header together with its function context', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -5 +5 @@ def bar():')
      expect(hunk).toMatchObject({
        oldStart: 5,
        oldLines: 1,
        newStart: 5,
        newLines: 1,
        header: ' def bar():',
      })
    })

    it('produces a hunk with no lines when the header has no body', () => {
      expect(parseUnifiedDiffToHunks('@@ -1,0 +1,0 @@')).toEqual([
        { oldStart: 1, oldLines: 0, newStart: 1, newLines: 0, header: '', lines: [] },
      ])
    })
  })

  describe('line classification', () => {
    it('parses context, added, and removed lines with their content minus the prefix', () => {
      const diff = lines('@@ -1,3 +1,3 @@', ' keep', '-old', '+new', ' tail')
      expect(parseUnifiedDiffToHunks(diff)).toEqual([
        {
          oldStart: 1,
          oldLines: 3,
          newStart: 1,
          newLines: 3,
          header: '',
          lines: [ctx('keep', 1, 1), rem('old', 2), add('new', 2), ctx('tail', 3, 3)],
        },
      ])
    })

    it('handles lines that are only a prefix character (empty content)', () => {
      const diff = lines('@@ -1,2 +1,2 @@', ' ', '-', '+')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([
        ctx('', 1, 1),
        rem('', 2),
        add('', 2),
      ])
    })

    it('strips only the first character, preserving further whitespace and prefix chars', () => {
      const diff = lines('@@ -1,3 +1,3 @@', '    indented', '++plus', '--minus', '-  spaced')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([
        ctx('   indented', 1, 1),
        add('+plus', 2),
        rem('-minus', 2),
        rem('  spaced', 3),
      ])
    })

    it('does not treat @@ inside content as a hunk header', () => {
      const diff = lines('@@ -1,1 +1,1 @@', '-a @@ -9,9 +9,9 @@ b', '+c')
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks).toHaveLength(1)
      expect(hunks[0].lines).toEqual([rem('a @@ -9,9 +9,9 @@ b', 1), add('c', 1)])
    })

    it('splits only on \\n, leaving \\r in content', () => {
      const diff = '@@ -1,1 +1,1 @@\n-a\r\n+b\r\n'
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([rem('a\r', 1), add('b\r', 1)])
    })
  })

  describe('skipped lines', () => {
    it('skips empty lines without advancing counters', () => {
      const diff = lines('@@ -10,3 +20,3 @@', ' a', '', ' b', '', '-c', '', '+d')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([
        ctx('a', 10, 20),
        ctx('b', 11, 21),
        rem('c', 12),
        add('d', 22),
      ])
    })

    it('ignores a trailing newline', () => {
      const diff = '@@ -1,1 +1,1 @@\n-a\n+b\n'
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([rem('a', 1), add('b', 1)])
    })

    it('skips "\\ No newline at end of file" without advancing counters', () => {
      const diff = lines(
        '@@ -1,2 +1,2 @@',
        ' a',
        '-b',
        '\\ No newline at end of file',
        '+b',
        '\\ No newline at end of file',
        '+c',
      )
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([
        ctx('a', 1, 1),
        rem('b', 2),
        add('b', 2),
        add('c', 3),
      ])
    })

    it('skips any line starting with a backslash', () => {
      const diff = lines('@@ -1,1 +1,1 @@', '\\', '\\whatever', ' a')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([ctx('a', 1, 1)])
    })

    it('skips lines starting with +++ (including an added line whose text begins with ++)', () => {
      const diff = lines('@@ -1,1 +1,2 @@', ' a', '+++counter', '+++ b/file', '+real')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([ctx('a', 1, 1), add('real', 2)])
    })

    it('skips lines starting with --- (including a removed line whose text begins with --)', () => {
      const diff = lines('@@ -1,2 +1,1 @@', ' a', '--- comment', '---', '-real')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([ctx('a', 1, 1), rem('real', 2)])
    })

    it('ignores other unrecognised lines inside a hunk without advancing counters', () => {
      const diff = lines(
        '@@ -1,2 +1,2 @@',
        ' a',
        'diff --git a/x b/x',
        'index 111..222 100644',
        'garbage',
        '@ not a header',
        ' b',
      )
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([ctx('a', 1, 1), ctx('b', 2, 2)])
    })
  })

  describe('hunk boundaries', () => {
    it('ignores lines before the first hunk header', () => {
      const diff = lines(
        ' stray context',
        '+stray add',
        '-stray remove',
        '@@ -1,1 +1,1 @@',
        '-x',
        '+y',
      )
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks).toHaveLength(1)
      expect(hunks[0].lines).toEqual([rem('x', 1), add('y', 1)])
    })

    it('does not use declared counts to end a hunk', () => {
      const diff = lines('@@ -1,1 +1,1 @@', ' a', ' b', '+c', '-d', ' e')
      const [hunk] = parseUnifiedDiffToHunks(diff)
      expect(hunk.oldLines).toBe(1)
      expect(hunk.newLines).toBe(1)
      expect(hunk.lines).toEqual([
        ctx('a', 1, 1),
        ctx('b', 2, 2),
        add('c', 3),
        rem('d', 3),
        ctx('e', 4, 4),
      ])
    })

    it('keeps a hunk even if it has fewer lines than declared', () => {
      const diff = lines('@@ -1,10 +1,10 @@', ' only', '@@ -50,2 +50,2 @@', ' next')
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks).toHaveLength(2)
      expect(hunks[0].lines).toEqual([ctx('only', 1, 1)])
      expect(hunks[1].lines).toEqual([ctx('next', 50, 50)])
    })

    it('splits consecutive hunks and numbers each independently from its own header', () => {
      const diff = lines(
        '@@ -1,3 +1,4 @@ first',
        ' a',
        '+b',
        ' c',
        '@@ -100,2 +200,1 @@ second',
        '-x',
        ' y',
      )
      expect(parseUnifiedDiffToHunks(diff)).toEqual([
        {
          oldStart: 1,
          oldLines: 3,
          newStart: 1,
          newLines: 4,
          header: ' first',
          lines: [ctx('a', 1, 1), add('b', 2), ctx('c', 2, 3)],
        },
        {
          oldStart: 100,
          oldLines: 2,
          newStart: 200,
          newLines: 1,
          header: ' second',
          lines: [rem('x', 100), ctx('y', 101, 200)],
        },
      ])
    })

    it('does not carry counter drift from a previous hunk into the next', () => {
      const diff = lines('@@ -5,1 +5,4 @@', '+a', '+b', '+c', '@@ -5,1 +5,1 @@', ' z')
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks[1].lines).toEqual([ctx('z', 5, 5)])
    })
  })

  describe('multi-file diffs', () => {
    const diff = lines(
      'diff --git a/src/a.ts b/src/a.ts',
      'index 1111111..2222222 100644',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1,3 +1,3 @@ export function a() {',
      ' const x = 1',
      '-const y = 2',
      '+const y = 3',
      ' return x + y',
      'diff --git a/src/b.ts b/src/b.ts',
      'index 3333333..4444444 100644',
      '--- a/src/b.ts',
      '+++ b/src/b.ts',
      '@@ -10,2 +10,3 @@',
      ' foo()',
      '+bar()',
      ' baz()',
      'diff --git a/src/c.ts b/src/c.ts',
      'new file mode 100644',
      'index 0000000..5555555',
      '--- /dev/null',
      '+++ b/src/c.ts',
      '@@ -0,0 +1 @@',
      '+hello',
      '\\ No newline at end of file',
      '',
    )

    it('returns a flat array of hunks across files in input order', () => {
      expect(parseUnifiedDiffToHunks(diff)).toEqual([
        {
          oldStart: 1,
          oldLines: 3,
          newStart: 1,
          newLines: 3,
          header: ' export function a() {',
          lines: [
            ctx('const x = 1', 1, 1),
            rem('const y = 2', 2),
            add('const y = 3', 2),
            ctx('return x + y', 3, 3),
          ],
        },
        {
          oldStart: 10,
          oldLines: 2,
          newStart: 10,
          newLines: 3,
          header: '',
          lines: [ctx('foo()', 10, 10), add('bar()', 11), ctx('baz()', 11, 12)],
        },
        {
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: 1,
          header: '',
          lines: [add('hello', 1)],
        },
      ])
    })

    it('does not let the next file headers join the previous hunk', () => {
      const hunks = parseUnifiedDiffToHunks(diff)
      for (const hunk of hunks) {
        for (const line of hunk.lines) {
          expect(line.content).not.toMatch(/^(-- |\+\+ )/)
          expect(line.content).not.toMatch(/^diff --git|^index /)
        }
      }
    })
  })
})
