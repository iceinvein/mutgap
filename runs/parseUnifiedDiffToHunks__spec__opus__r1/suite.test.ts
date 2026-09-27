import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks, type DiffLine } from './parseUnifiedDiffToHunks'

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
const del = (content: string, oldLineNo: number): DiffLine => ({
  type: 'removed',
  content,
  oldLineNo,
  newLineNo: null,
})

const lines = (...ls: string[]) => ls.join('\n')

describe('parseUnifiedDiffToHunks', () => {
  describe('empty and hunk-less input', () => {
    it('returns [] for an empty string', () => {
      expect(parseUnifiedDiffToHunks('')).toEqual([])
    })

    it('returns [] when there is no hunk header', () => {
      const diff = lines(
        'diff --git a/f.txt b/f.txt',
        'index 111..222 100644',
        '--- a/f.txt',
        '+++ b/f.txt',
        ' context',
        '+added',
        '-removed',
      )
      expect(parseUnifiedDiffToHunks(diff)).toEqual([])
    })
  })

  describe('hunk header', () => {
    it('records all four counts', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -12,34 +56,78 @@')
      expect(hunk).toMatchObject({ oldStart: 12, oldLines: 34, newStart: 56, newLines: 78 })
    })

    it('records the header text after the closing @@ exactly, including the leading space', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@ function foo() {')
      expect(hunk.header).toBe(' function foo() {')
    })

    it('records an empty header when nothing follows @@', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@')
      expect(hunk.header).toBe('')
    })

    it('keeps header text with no leading space and trailing whitespace as written', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@x  y  ')
      expect(hunk.header).toBe('x  y  ')
    })

    it('defaults both omitted counts to 1', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -3 +4 @@')
      expect(hunk).toMatchObject({ oldStart: 3, oldLines: 1, newStart: 4, newLines: 1 })
    })

    it('defaults only the old count when only it is omitted', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -3 +4,7 @@')
      expect(hunk).toMatchObject({ oldStart: 3, oldLines: 1, newStart: 4, newLines: 7 })
    })

    it('defaults only the new count when only it is omitted', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -3,5 +4 @@')
      expect(hunk).toMatchObject({ oldStart: 3, oldLines: 5, newStart: 4, newLines: 1 })
    })

    it('records explicit zero counts as 0, not the default', () => {
      const [hunk] = parseUnifiedDiffToHunks(lines('@@ -0,0 +1,2 @@', '+a', '+b'))
      expect(hunk).toMatchObject({ oldStart: 0, oldLines: 0, newStart: 1, newLines: 2 })
      expect(hunk.lines).toEqual([add('a', 1), add('b', 2)])
    })

    it('returns a hunk with no lines for a bare header', () => {
      expect(parseUnifiedDiffToHunks('@@ -1,0 +1,0 @@')).toEqual([
        { oldStart: 1, oldLines: 0, newStart: 1, newLines: 0, header: '', lines: [] },
      ])
    })
  })

  describe('line classification', () => {
    it('parses context, removed and added lines with the first character stripped', () => {
      const diff = lines('@@ -1,3 +1,3 @@', ' keep', '-old', '+new', ' tail')
      expect(parseUnifiedDiffToHunks(diff)).toEqual([
        {
          oldStart: 1,
          oldLines: 3,
          newStart: 1,
          newLines: 3,
          header: '',
          lines: [ctx('keep', 1, 1), del('old', 2), add('new', 2), ctx('tail', 3, 3)],
        },
      ])
    })

    it('keeps the rest of the line verbatim, including leading/trailing whitespace and markers', () => {
      const diff = lines('@@ -1,3 +1,3 @@', '  indented ', '-+plus', '+-minus', '-', '+', ' ')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([
        ctx(' indented ', 1, 1),
        del('+plus', 2),
        add('-minus', 2),
        del('', 3),
        add('', 3),
        ctx('', 4, 4),
      ])
    })

    it('keeps content that itself contains @@ or starts with a single + or -', () => {
      const diff = lines('@@ -1 +1 @@', '-x @@ y', '+-y')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([del('x @@ y', 1), add('-y', 1)])
    })
  })

  describe('skipped lines', () => {
    it('skips empty lines without advancing counters', () => {
      const diff = lines('@@ -10,2 +20,2 @@', ' a', '', ' b', '')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([ctx('a', 10, 20), ctx('b', 11, 21)])
    })

    it('skips "\\ No newline at end of file" without advancing counters', () => {
      const diff = lines(
        '@@ -1 +1 @@',
        '-old',
        '\\ No newline at end of file',
        '+new',
        '\\ No newline at end of file',
        ' after',
      )
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([
        del('old', 1),
        add('new', 1),
        ctx('after', 2, 2),
      ])
    })

    it('skips lines starting with +++ and --- inside a hunk', () => {
      const diff = lines('@@ -1,2 +1,2 @@', '--- a/x', '+++ b/x', '---', '+++', ' c')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([ctx('c', 1, 1)])
    })

    it('skips a removed line whose text begins with "--"', () => {
      const diff = lines('@@ -1,2 +1,1 @@', '--- comment', ' kept')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([ctx('kept', 1, 1)])
    })

    it('does not skip lines starting with just ++ or --', () => {
      const diff = lines('@@ -1,2 +1,2 @@', '--x', '++y')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([del('-x', 1), add('+y', 1)])
    })

    it('ignores other lines (diff --git, index, arbitrary text) without advancing counters', () => {
      const diff = lines(
        '@@ -5,2 +7,2 @@',
        ' a',
        'diff --git a/y b/y',
        'index abc..def 100644',
        'garbage',
        '\ttab-prefixed',
        ' b',
      )
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([ctx('a', 5, 7), ctx('b', 6, 8)])
    })

    it('ignores lines before the first hunk header, even ones that look like diff lines', () => {
      const diff = lines(' pre', '+pre', '-pre', '@@ -1 +1 @@', ' x')
      expect(parseUnifiedDiffToHunks(diff)).toEqual([
        { oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, header: '', lines: [ctx('x', 1, 1)] },
      ])
    })
  })

  describe('line numbering', () => {
    it('advances old only on removals and new only on additions', () => {
      const diff = lines(
        '@@ -100,6 +200,5 @@',
        ' c1',
        '-r1',
        '-r2',
        '+a1',
        ' c2',
        '+a2',
        '+a3',
        '-r3',
        ' c3',
      )
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([
        ctx('c1', 100, 200),
        del('r1', 101),
        del('r2', 102),
        add('a1', 201),
        ctx('c2', 103, 202),
        add('a2', 203),
        add('a3', 204),
        del('r3', 104),
        ctx('c3', 105, 205),
      ])
    })

    it('does not use declared counts to end the hunk', () => {
      const diff = lines('@@ -1,1 +1,1 @@', ' a', ' b', '+c', '-d', ' e')
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks).toHaveLength(1)
      expect(hunks[0].oldLines).toBe(1)
      expect(hunks[0].newLines).toBe(1)
      expect(hunks[0].lines).toEqual([
        ctx('a', 1, 1),
        ctx('b', 2, 2),
        add('c', 3),
        del('d', 3),
        ctx('e', 4, 4),
      ])
    })

    it('numbers each hunk from its own header, independently of earlier hunks', () => {
      const diff = lines(
        '@@ -1,2 +1,3 @@ first',
        ' a',
        '+b',
        ' c',
        '@@ -50,2 +60,1 @@ second',
        '-x',
        ' y',
      )
      expect(parseUnifiedDiffToHunks(diff)).toEqual([
        {
          oldStart: 1,
          oldLines: 2,
          newStart: 1,
          newLines: 3,
          header: ' first',
          lines: [ctx('a', 1, 1), add('b', 2), ctx('c', 2, 3)],
        },
        {
          oldStart: 50,
          oldLines: 2,
          newStart: 60,
          newLines: 1,
          header: ' second',
          lines: [del('x', 50), ctx('y', 51, 60)],
        },
      ])
    })

    it('restarts numbering even when a later hunk starts lower than an earlier one', () => {
      const diff = lines('@@ -10 +10 @@', ' a', '@@ -2 +3 @@', ' b')
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks.map((h) => h.lines)).toEqual([[ctx('a', 10, 10)], [ctx('b', 2, 3)]])
    })
  })

  describe('multi-file diffs', () => {
    it('returns a flat array of hunks in input order and keeps file headers out of hunks', () => {
      const diff = lines(
        'diff --git a/one.ts b/one.ts',
        'index 1111111..2222222 100644',
        '--- a/one.ts',
        '+++ b/one.ts',
        '@@ -1,3 +1,3 @@ export function one() {',
        ' const a = 1',
        '-const b = 2',
        '+const b = 3',
        ' return a + b',
        '@@ -20,2 +20,3 @@',
        ' x',
        '+y',
        ' z',
        'diff --git a/two.ts b/two.ts',
        'new file mode 100644',
        'index 0000000..3333333',
        '--- /dev/null',
        '+++ b/two.ts',
        '@@ -0,0 +1 @@',
        '+hello',
        '\\ No newline at end of file',
        '',
      )
      expect(parseUnifiedDiffToHunks(diff)).toEqual([
        {
          oldStart: 1,
          oldLines: 3,
          newStart: 1,
          newLines: 3,
          header: ' export function one() {',
          lines: [
            ctx('const a = 1', 1, 1),
            del('const b = 2', 2),
            add('const b = 3', 2),
            ctx('return a + b', 3, 3),
          ],
        },
        {
          oldStart: 20,
          oldLines: 2,
          newStart: 20,
          newLines: 3,
          header: '',
          lines: [ctx('x', 20, 20), add('y', 21), ctx('z', 21, 22)],
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
  })
})
