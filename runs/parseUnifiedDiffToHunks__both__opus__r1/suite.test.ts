import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

const join = (...lines: string[]) => lines.join('\n')

describe('parseUnifiedDiffToHunks', () => {
  describe('empty and hunk-less input', () => {
    it('returns [] for an empty string', () => {
      expect(parseUnifiedDiffToHunks('')).toEqual([])
    })

    it('returns [] when there is no hunk header', () => {
      const diff = join(
        'diff --git a/x b/x',
        'index 1111111..2222222 100644',
        '--- a/x',
        '+++ b/x',
      )
      expect(parseUnifiedDiffToHunks(diff)).toEqual([])
    })

    it('ignores +/-/space lines before the first hunk header', () => {
      const diff = join('+stray', '-stray', ' stray', '@@ -1,1 +1,1 @@', ' a')
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks).toHaveLength(1)
      expect(hunks[0].lines).toEqual([
        { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      ])
    })
  })

  describe('hunk header', () => {
    it('records starts, counts and header text', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -10,7 +12,9 @@ function foo() {')
      expect(hunk).toEqual({
        oldStart: 10,
        oldLines: 7,
        newStart: 12,
        newLines: 9,
        header: ' function foo() {',
        lines: [],
      })
    })

    it('records an empty header when nothing follows the closing @@', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@')
      expect(hunk.header).toBe('')
    })

    it('keeps the header text exactly as written', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@  two  spaces @@ ')
      expect(hunk.header).toBe('  two  spaces @@ ')
    })

    it('defaults both omitted counts to 1', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -3 +4 @@')
      expect(hunk).toMatchObject({ oldStart: 3, oldLines: 1, newStart: 4, newLines: 1 })
    })

    it('defaults only the omitted old count to 1', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -3 +4,5 @@')
      expect(hunk).toMatchObject({ oldStart: 3, oldLines: 1, newStart: 4, newLines: 5 })
    })

    it('defaults only the omitted new count to 1', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -3,5 +4 @@')
      expect(hunk).toMatchObject({ oldStart: 3, oldLines: 5, newStart: 4, newLines: 1 })
    })

    it('keeps an explicit count of 0 (not treated as omitted)', () => {
      const [hunk] = parseUnifiedDiffToHunks(join('@@ -0,0 +1,2 @@', '+a', '+b'))
      expect(hunk).toMatchObject({ oldStart: 0, oldLines: 0, newStart: 1, newLines: 2 })
      expect(hunk.lines).toEqual([
        { type: 'added', content: 'a', oldLineNo: null, newLineNo: 1 },
        { type: 'added', content: 'b', oldLineNo: null, newLineNo: 2 },
      ])
    })

    it('keeps an explicit new count of 0 for a deletion hunk', () => {
      const [hunk] = parseUnifiedDiffToHunks(join('@@ -1,1 +0,0 @@', '-gone'))
      expect(hunk).toMatchObject({ oldStart: 1, oldLines: 1, newStart: 0, newLines: 0 })
      expect(hunk.lines).toEqual([
        { type: 'removed', content: 'gone', oldLineNo: 1, newLineNo: null },
      ])
    })
  })

  describe('line classification', () => {
    it('classifies added, removed and context lines and strips the prefix', () => {
      const diff = join('@@ -1,2 +1,2 @@', ' keep', '-old', '+new')
      const [hunk] = parseUnifiedDiffToHunks(diff)
      expect(hunk.lines.map((l) => [l.type, l.content])).toEqual([
        ['context', 'keep'],
        ['removed', 'old'],
        ['added', 'new'],
      ])
    })

    it('strips only the first character of content', () => {
      const diff = join('@@ -1,3 +1,3 @@', '  indented', '-+plus', '+-minus')
      const [hunk] = parseUnifiedDiffToHunks(diff)
      expect(hunk.lines.map((l) => [l.type, l.content])).toEqual([
        ['context', ' indented'],
        ['removed', '+plus'],
        ['added', '-minus'],
      ])
    })

    it('yields empty content for bare prefix lines', () => {
      const diff = join('@@ -1,2 +1,2 @@', ' ', '-', '+')
      const [hunk] = parseUnifiedDiffToHunks(diff)
      expect(hunk.lines).toEqual([
        { type: 'context', content: '', oldLineNo: 1, newLineNo: 1 },
        { type: 'removed', content: '', oldLineNo: 2, newLineNo: null },
        { type: 'added', content: '', oldLineNo: null, newLineNo: 2 },
      ])
    })

    it('keeps a removed line whose text begins with a single "-"', () => {
      const [hunk] = parseUnifiedDiffToHunks(join('@@ -1 +0,0 @@', '--x'))
      expect(hunk.lines).toEqual([
        { type: 'removed', content: '-x', oldLineNo: 1, newLineNo: null },
      ])
    })

    it('keeps an added line whose text begins with "+" but skips one starting with "+++"', () => {
      const [hunk] = parseUnifiedDiffToHunks(join('@@ -0,0 +1 @@', '++x', '+++y'))
      expect(hunk.lines).toEqual([
        { type: 'added', content: '+x', oldLineNo: null, newLineNo: 1 },
      ])
    })
  })

  describe('skipped lines', () => {
    it('skips empty lines without advancing counters', () => {
      const diff = join('@@ -1,2 +1,2 @@', ' a', '', ' b')
      const [hunk] = parseUnifiedDiffToHunks(diff)
      expect(hunk.lines).toEqual([
        { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
        { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
      ])
    })

    it('skips a trailing newline', () => {
      const [hunk] = parseUnifiedDiffToHunks('@@ -1 +1 @@\n a\n')
      expect(hunk.lines).toEqual([
        { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      ])
    })

    it('skips "\\ No newline at end of file" without advancing counters', () => {
      const diff = join(
        '@@ -1,1 +1,2 @@',
        '-a',
        '\\ No newline at end of file',
        '+a',
        '+b',
        '\\ No newline at end of file',
      )
      const [hunk] = parseUnifiedDiffToHunks(diff)
      expect(hunk.lines).toEqual([
        { type: 'removed', content: 'a', oldLineNo: 1, newLineNo: null },
        { type: 'added', content: 'a', oldLineNo: null, newLineNo: 1 },
        { type: 'added', content: 'b', oldLineNo: null, newLineNo: 2 },
      ])
    })

    it('skips lines starting with "+++" inside a hunk', () => {
      const diff = join('@@ -1,1 +1,1 @@', ' a', '+++ b/file', ' b')
      const [hunk] = parseUnifiedDiffToHunks(diff)
      expect(hunk.lines).toEqual([
        { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
        { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
      ])
    })

    it('skips lines starting with "---" inside a hunk, including removed text starting with "--"', () => {
      const diff = join('@@ -1,2 +1,1 @@', '--- a/file', '---comment', ' b')
      const [hunk] = parseUnifiedDiffToHunks(diff)
      expect(hunk.lines).toEqual([
        { type: 'context', content: 'b', oldLineNo: 1, newLineNo: 1 },
      ])
    })

    it('ignores other unrecognised lines without advancing counters', () => {
      const diff = join(
        '@@ -1,2 +1,2 @@',
        ' a',
        'diff --git a/y b/y',
        'index 1111111..2222222 100644',
        'garbage',
        '\tTabbed',
        ' b',
      )
      const [hunk] = parseUnifiedDiffToHunks(diff)
      expect(hunk.lines).toEqual([
        { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
        { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
      ])
    })
  })

  describe('line numbering', () => {
    it('numbers context, removed and added lines from the header starts', () => {
      const diff = join(
        '@@ -10,4 +20,4 @@',
        ' c1',
        '-r1',
        '-r2',
        '+a1',
        ' c2',
        '+a2',
        ' c3',
      )
      const [hunk] = parseUnifiedDiffToHunks(diff)
      expect(hunk.lines).toEqual([
        { type: 'context', content: 'c1', oldLineNo: 10, newLineNo: 20 },
        { type: 'removed', content: 'r1', oldLineNo: 11, newLineNo: null },
        { type: 'removed', content: 'r2', oldLineNo: 12, newLineNo: null },
        { type: 'added', content: 'a1', oldLineNo: null, newLineNo: 21 },
        { type: 'context', content: 'c2', oldLineNo: 13, newLineNo: 22 },
        { type: 'added', content: 'a2', oldLineNo: null, newLineNo: 23 },
        { type: 'context', content: 'c3', oldLineNo: 14, newLineNo: 24 },
      ])
    })

    it('does not use declared counts to end a hunk', () => {
      const diff = join('@@ -1,1 +1,1 @@', ' a', ' b', '+c', '-d')
      const [hunk] = parseUnifiedDiffToHunks(diff)
      expect(hunk.oldLines).toBe(1)
      expect(hunk.newLines).toBe(1)
      expect(hunk.lines).toHaveLength(4)
      expect(hunk.lines[3]).toEqual({
        type: 'removed',
        content: 'd',
        oldLineNo: 3,
        newLineNo: null,
      })
    })

    it('restarts numbering at each hunk header independently', () => {
      const diff = join(
        '@@ -1,2 +1,3 @@',
        ' a',
        '+b',
        ' c',
        '@@ -50,2 +7,1 @@ second',
        '-x',
        ' y',
      )
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks).toHaveLength(2)
      expect(hunks[0].lines).toEqual([
        { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
        { type: 'added', content: 'b', oldLineNo: null, newLineNo: 2 },
        { type: 'context', content: 'c', oldLineNo: 2, newLineNo: 3 },
      ])
      expect(hunks[1]).toMatchObject({ oldStart: 50, newStart: 7, header: ' second' })
      expect(hunks[1].lines).toEqual([
        { type: 'removed', content: 'x', oldLineNo: 50, newLineNo: null },
        { type: 'context', content: 'y', oldLineNo: 51, newLineNo: 7 },
      ])
    })
  })

  describe('multi-file diffs', () => {
    it('returns a flat array of hunks in order, without file headers joining hunks', () => {
      const diff = join(
        'diff --git a/one.ts b/one.ts',
        'index 1111111..2222222 100644',
        '--- a/one.ts',
        '+++ b/one.ts',
        '@@ -1,2 +1,2 @@ first',
        ' keep',
        '-old',
        '+new',
        '@@ -10 +10 @@',
        '-ten',
        '+TEN',
        'diff --git a/two.ts b/two.ts',
        'new file mode 100644',
        'index 0000000..3333333',
        '--- /dev/null',
        '+++ b/two.ts',
        '@@ -0,0 +1 @@',
        '+hello',
        '',
      )
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks).toEqual([
        {
          oldStart: 1,
          oldLines: 2,
          newStart: 1,
          newLines: 2,
          header: ' first',
          lines: [
            { type: 'context', content: 'keep', oldLineNo: 1, newLineNo: 1 },
            { type: 'removed', content: 'old', oldLineNo: 2, newLineNo: null },
            { type: 'added', content: 'new', oldLineNo: null, newLineNo: 2 },
          ],
        },
        {
          oldStart: 10,
          oldLines: 1,
          newStart: 10,
          newLines: 1,
          header: '',
          lines: [
            { type: 'removed', content: 'ten', oldLineNo: 10, newLineNo: null },
            { type: 'added', content: 'TEN', oldLineNo: null, newLineNo: 10 },
          ],
        },
        {
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: 1,
          header: '',
          lines: [{ type: 'added', content: 'hello', oldLineNo: null, newLineNo: 1 }],
        },
      ])
    })
  })
})
