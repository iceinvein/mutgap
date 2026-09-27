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
const del = (content: string, oldLineNo: number): DiffLine => ({
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
        'diff --git a/a.txt b/a.txt',
        'index 1111111..2222222 100644',
        '--- a/a.txt',
        '+++ b/a.txt',
        '+not in a hunk',
        ' also not in a hunk',
      )
      expect(parseUnifiedDiffToHunks(diff)).toEqual([])
    })
  })

  describe('hunk header', () => {
    it('records the start and count values from the header', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -12,7 +15,9 @@\n')
      expect(hunk.oldStart).toBe(12)
      expect(hunk.oldLines).toBe(7)
      expect(hunk.newStart).toBe(15)
      expect(hunk.newLines).toBe(9)
    })

    it('uses 1 when both counts are omitted', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -3 +4 @@\n-a\n+b\n')
      expect(hunk).toMatchObject({ oldStart: 3, oldLines: 1, newStart: 4, newLines: 1 })
    })

    it('uses 1 only for the count that is omitted', () => {
      const [a] = parseUnifiedDiffToHunks('@@ -3 +4,5 @@')
      expect(a).toMatchObject({ oldStart: 3, oldLines: 1, newStart: 4, newLines: 5 })

      const [b] = parseUnifiedDiffToHunks('@@ -3,6 +4 @@')
      expect(b).toMatchObject({ oldStart: 3, oldLines: 6, newStart: 4, newLines: 1 })
    })

    it('keeps explicit zero counts (file creation / deletion)', () => {
      const [created] = parseUnifiedDiffToHunks('@@ -0,0 +1,2 @@\n+a\n+b\n')
      expect(created).toMatchObject({ oldStart: 0, oldLines: 0, newStart: 1, newLines: 2 })
      expect(created.lines).toEqual([add('a', 1), add('b', 2)])

      const [deleted] = parseUnifiedDiffToHunks('@@ -1,2 +0,0 @@\n-a\n-b\n')
      expect(deleted).toMatchObject({ oldStart: 1, oldLines: 2, newStart: 0, newLines: 0 })
      expect(deleted.lines).toEqual([del('a', 1), del('b', 2)])
    })

    it('records header as "" when nothing follows the closing @@', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@\n a\n')
      expect(hunk.header).toBe('')
    })

    it('records the text after the closing @@ exactly, including the leading space', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -10,3 +10,4 @@ function foo(bar) {\n x\n')
      expect(hunk.header).toBe(' function foo(bar) {')
    })

    it('preserves whitespace in the header verbatim', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1 +1 @@   spaced  out  \n x\n')
      expect(hunk.header).toBe('   spaced  out  ')
    })

    it('records header text without a leading space', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1 +1 @@foo\n x\n')
      expect(hunk.header).toBe('foo')
    })

    it('treats only the first @@ after the ranges as closing', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1 +1 @@ a @@ b\n x\n')
      expect(hunk.header).toBe(' a @@ b')
    })

    it('returns a hunk with no lines when the header has no body', () => {
      expect(parseUnifiedDiffToHunks('@@ -1,0 +1,0 @@')).toEqual([
        { oldStart: 1, oldLines: 0, newStart: 1, newLines: 0, header: '', lines: [] },
      ])
    })
  })

  describe('line classification', () => {
    it('classifies context, added and removed lines and strips the prefix', () => {
      const diff = lines('@@ -1,3 +1,3 @@', ' keep', '-old', '+new', ' tail')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([
        ctx('keep', 1, 1),
        del('old', 2),
        add('new', 2),
        ctx('tail', 3, 3),
      ])
    })

    it('strips only the first character, keeping the rest of the text intact', () => {
      const diff = lines('@@ -1,3 +1,3 @@', '  indented', '-\told tab', '+ +plus', '-  -x')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([
        ctx(' indented', 1, 1),
        del('\told tab', 2),
        add(' +plus', 2),
        del('  -x', 3),
      ])
    })

    it('handles lines that are only a prefix character (empty content)', () => {
      const diff = lines('@@ -1,2 +1,2 @@', ' ', '-', '+')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([
        ctx('', 1, 1),
        del('', 2),
        add('', 2),
      ])
    })

    it('keeps "+" / "-" lines whose content begins with a single repeated sign', () => {
      const diff = lines('@@ -1 +1 @@', '-- x', '++ y')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([del('- x', 1), add('+ y', 1)])
    })

    it('splits only on \\n, so a trailing \\r stays in the content', () => {
      const diff = '@@ -1 +1 @@\r\n-old\r\n+new\r\n'
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([del('old\r', 1), add('new\r', 1)])
    })
  })

  describe('skipped lines', () => {
    it('skips empty lines without advancing counters', () => {
      const diff = lines('@@ -5,2 +5,2 @@', ' a', '', '', ' b')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([ctx('a', 5, 5), ctx('b', 6, 6)])
    })

    it('ignores the trailing empty line produced by a final newline', () => {
      expect(parseUnifiedDiffToHunks('@@ -1 +1 @@\n x\n')[0].lines).toEqual([ctx('x', 1, 1)])
    })

    it('skips "\\ No newline at end of file" without advancing counters', () => {
      const diff = lines(
        '@@ -1,2 +1,2 @@',
        ' a',
        '-b',
        '\\ No newline at end of file',
        '+b',
        '\\ No newline at end of file',
      )
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([
        ctx('a', 1, 1),
        del('b', 2),
        add('b', 2),
      ])
    })

    it('skips any line starting with a backslash', () => {
      const diff = lines('@@ -1 +1 @@', '\\anything', ' x')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([ctx('x', 1, 1)])
    })

    it('skips lines starting with "---" and "+++" inside a hunk, even as removed/added text', () => {
      const diff = lines('@@ -1,3 +1,3 @@', ' a', '--- looks like a header', '+++ also', '---', '+++', ' b')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([ctx('a', 1, 1), ctx('b', 2, 2)])
    })

    it('ignores other unrecognised lines inside a hunk without advancing counters', () => {
      const diff = lines('@@ -1,2 +1,2 @@', ' a', 'diff --git a/x b/x', 'index abc..def', 'garbage', ' b')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([ctx('a', 1, 1), ctx('b', 2, 2)])
    })
  })

  describe('hunk boundaries', () => {
    it('ignores lines before the first hunk header', () => {
      const diff = lines(
        'diff --git a/f.ts b/f.ts',
        'index 1234567..89abcde 100644',
        '--- a/f.ts',
        '+++ b/f.ts',
        '+stray',
        '-stray',
        ' stray',
        '@@ -1 +1 @@',
        '-x',
        '+y',
      )
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks).toHaveLength(1)
      expect(hunks[0].lines).toEqual([del('x', 1), add('y', 1)])
    })

    it('does not use the declared counts to end a hunk', () => {
      const diff = lines('@@ -1,1 +1,1 @@', ' a', ' b', '-c', '+d', ' e')
      const [hunk] = parseUnifiedDiffToHunks(diff)
      expect(hunk.oldLines).toBe(1)
      expect(hunk.newLines).toBe(1)
      expect(hunk.lines).toEqual([
        ctx('a', 1, 1),
        ctx('b', 2, 2),
        del('c', 3),
        add('d', 3),
        ctx('e', 4, 4),
      ])
    })

    it('keeps collecting lines when fewer lines than declared are present', () => {
      const diff = lines('@@ -1,10 +1,10 @@', ' a', '@@ -20,2 +20,2 @@', ' z')
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks.map((h) => h.lines)).toEqual([[ctx('a', 1, 1)], [ctx('z', 20, 20)]])
    })

    it('numbers each hunk from its own header, independent of earlier hunks', () => {
      const diff = lines(
        '@@ -1,2 +1,3 @@ first',
        ' a',
        '+b',
        ' c',
        '@@ -50,3 +100,2 @@ second',
        ' x',
        '-y',
        ' z',
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
          oldLines: 3,
          newStart: 100,
          newLines: 2,
          header: ' second',
          lines: [ctx('x', 50, 100), del('y', 51), ctx('z', 52, 101)],
        },
      ])
    })
  })

  describe('line numbering', () => {
    it('advances only the old counter on removals and only the new counter on additions', () => {
      const diff = lines('@@ -10,5 +20,4 @@', ' c1', '-r1', '-r2', '+a1', ' c2', '+a2', '+a3', '-r3', ' c3')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([
        ctx('c1', 10, 20),
        del('r1', 11),
        del('r2', 12),
        add('a1', 21),
        ctx('c2', 13, 22),
        add('a2', 23),
        add('a3', 24),
        del('r3', 14),
        ctx('c3', 15, 25),
      ])
    })

    it('starts counters from zero-valued starts', () => {
      const diff = lines('@@ -0,0 +0,0 @@', ' a', '-b', '+c')
      expect(parseUnifiedDiffToHunks(diff)[0].lines).toEqual([ctx('a', 0, 0), del('b', 1), add('c', 1)])
    })
  })

  describe('multi-file diffs', () => {
    it('returns hunks from all files flat, in input order, without file headers leaking in', () => {
      const diff = [
        'diff --git a/one.ts b/one.ts',
        'index 1111111..2222222 100644',
        '--- a/one.ts',
        '+++ b/one.ts',
        '@@ -1,2 +1,2 @@ export const a',
        ' keep',
        '-old',
        '+new',
        '@@ -40 +40,2 @@',
        ' last',
        '+appended',
        'diff --git a/two.ts b/two.ts',
        'new file mode 100644',
        'index 0000000..3333333',
        '--- /dev/null',
        '+++ b/two.ts',
        '@@ -0,0 +1 @@',
        '+hello',
        '\\ No newline at end of file',
        'diff --git a/three.ts b/three.ts',
        'deleted file mode 100644',
        'index 4444444..0000000',
        '--- a/three.ts',
        '+++ /dev/null',
        '@@ -1,2 +0,0 @@',
        '-bye',
        '-now',
        '',
      ].join('\n')

      expect(parseUnifiedDiffToHunks(diff)).toEqual([
        {
          oldStart: 1,
          oldLines: 2,
          newStart: 1,
          newLines: 2,
          header: ' export const a',
          lines: [ctx('keep', 1, 1), del('old', 2), add('new', 2)],
        },
        {
          oldStart: 40,
          oldLines: 1,
          newStart: 40,
          newLines: 2,
          header: '',
          lines: [ctx('last', 40, 40), add('appended', 41)],
        },
        {
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: 1,
          header: '',
          lines: [add('hello', 1)],
        },
        {
          oldStart: 1,
          oldLines: 2,
          newStart: 0,
          newLines: 0,
          header: '',
          lines: [del('bye', 1), del('now', 2)],
        },
      ])
    })
  })
})
