import { describe, it, expect } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

const lines = (...ls: string[]) => ls.join('\n')

describe('parseUnifiedDiffToHunks', () => {
  it('returns [] for an empty string', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('returns [] when there is no hunk header', () => {
    expect(
      parseUnifiedDiffToHunks(lines('diff --git a/x b/x', 'index 1..2', ' context')),
    ).toEqual([])
  })

  describe('hunk header', () => {
    it('records start, counts and header text', () => {
      const [h] = parseUnifiedDiffToHunks('@@ -10,7 +12,8 @@ function foo() {')
      expect(h).toEqual({
        oldStart: 10,
        oldLines: 7,
        newStart: 12,
        newLines: 8,
        header: ' function foo() {',
        lines: [],
      })
    })

    it('records an empty header when nothing follows the closing @@', () => {
      const [h] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@')
      expect(h.header).toBe('')
    })

    it('keeps the header text exactly as written', () => {
      const [h] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@  two spaces @@ x ')
      expect(h.header).toBe('  two spaces @@ x ')
    })

    it('defaults omitted counts to 1', () => {
      const [h] = parseUnifiedDiffToHunks('@@ -3 +4 @@')
      expect(h).toMatchObject({ oldStart: 3, oldLines: 1, newStart: 4, newLines: 1 })
    })

    it('defaults only the omitted count', () => {
      const [a] = parseUnifiedDiffToHunks('@@ -3,5 +4 @@')
      expect(a).toMatchObject({ oldLines: 5, newLines: 1 })
      const [b] = parseUnifiedDiffToHunks('@@ -3 +4,6 @@')
      expect(b).toMatchObject({ oldLines: 1, newLines: 6 })
    })

    it('records an explicit count of 0 as 0', () => {
      const [h] = parseUnifiedDiffToHunks(lines('@@ -0,0 +1,2 @@', '+a', '+b'))
      expect(h).toMatchObject({ oldStart: 0, oldLines: 0, newStart: 1, newLines: 2 })
      expect(h.lines).toEqual([
        { type: 'added', content: 'a', oldLineNo: null, newLineNo: 1 },
        { type: 'added', content: 'b', oldLineNo: null, newLineNo: 2 },
      ])
    })
  })

  describe('line classification and numbering', () => {
    it('classifies lines and strips the prefix character', () => {
      const [h] = parseUnifiedDiffToHunks(
        lines('@@ -5,3 +5,3 @@', ' keep', '-old', '+new', ' tail'),
      )
      expect(h.lines).toEqual([
        { type: 'context', content: 'keep', oldLineNo: 5, newLineNo: 5 },
        { type: 'removed', content: 'old', oldLineNo: 6, newLineNo: null },
        { type: 'added', content: 'new', oldLineNo: null, newLineNo: 6 },
        { type: 'context', content: 'tail', oldLineNo: 7, newLineNo: 7 },
      ])
    })

    it('advances old and new counters independently', () => {
      const [h] = parseUnifiedDiffToHunks(
        lines('@@ -10,4 +20,3 @@', '-r1', '-r2', '+a1', ' c', '-r3', '+a2', '+a3'),
      )
      expect(h.lines.map((l) => [l.type, l.oldLineNo, l.newLineNo])).toEqual([
        ['removed', 10, null],
        ['removed', 11, null],
        ['added', null, 20],
        ['context', 12, 21],
        ['removed', 13, null],
        ['added', null, 22],
        ['added', null, 23],
      ])
    })

    it('preserves content after the prefix verbatim, including empty content', () => {
      const [h] = parseUnifiedDiffToHunks(
        lines('@@ -1,3 +1,3 @@', ' ', '-  indented\t', '+@@ not a header'),
      )
      expect(h.lines).toEqual([
        { type: 'context', content: '', oldLineNo: 1, newLineNo: 1 },
        { type: 'removed', content: '  indented\t', oldLineNo: 2, newLineNo: null },
        { type: 'added', content: '@@ not a header', oldLineNo: null, newLineNo: 2 },
      ])
    })

    it('keeps a trailing \\r as part of content', () => {
      const [h] = parseUnifiedDiffToHunks('@@ -1 +1 @@\n+x\r')
      expect(h.lines[0].content).toBe('x\r')
    })
  })

  describe('skipped lines', () => {
    it('skips empty lines without advancing counters', () => {
      const [h] = parseUnifiedDiffToHunks(lines('@@ -1,2 +1,2 @@', ' a', '', ' b', ''))
      expect(h.lines).toEqual([
        { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
        { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
      ])
    })

    it('skips "\\ No newline at end of file" without advancing counters', () => {
      const [h] = parseUnifiedDiffToHunks(
        lines('@@ -1 +1 @@', '-old', '\\ No newline at end of file', '+new', '\\ No newline at end of file'),
      )
      expect(h.lines).toEqual([
        { type: 'removed', content: 'old', oldLineNo: 1, newLineNo: null },
        { type: 'added', content: 'new', oldLineNo: null, newLineNo: 1 },
      ])
    })

    it('skips lines starting with +++', () => {
      const [h] = parseUnifiedDiffToHunks(lines('@@ -1 +1,2 @@', ' a', '+++ b/file', '+b'))
      expect(h.lines).toEqual([
        { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
        { type: 'added', content: 'b', oldLineNo: null, newLineNo: 2 },
      ])
    })

    it('skips lines starting with ---, including a removed line whose text begins with --', () => {
      const [h] = parseUnifiedDiffToHunks(
        lines('@@ -1,3 +1 @@', '--- a/file', '---- comment', '-real', ' c'),
      )
      expect(h.lines).toEqual([
        { type: 'removed', content: 'real', oldLineNo: 1, newLineNo: null },
        { type: 'context', content: 'c', oldLineNo: 2, newLineNo: 1 },
      ])
    })

    it('ignores other lines such as diff --git and index inside a hunk', () => {
      const [h] = parseUnifiedDiffToHunks(
        lines('@@ -1 +1 @@', ' a', 'diff --git a/x b/x', 'index abc..def 100644', 'garbage', ' b'),
      )
      expect(h.lines).toEqual([
        { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
        { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
      ])
    })

    it('ignores everything before the first hunk header', () => {
      const [h, ...rest] = parseUnifiedDiffToHunks(
        lines('+stray added', '-stray removed', ' stray context', '@@ -1 +1 @@', ' a'),
      )
      expect(rest).toEqual([])
      expect(h.lines).toEqual([{ type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 }])
    })
  })

  describe('multiple hunks', () => {
    it('does not use declared counts to end a hunk', () => {
      const [h] = parseUnifiedDiffToHunks(lines('@@ -1,1 +1,1 @@', ' a', ' b', '+c', '-d'))
      expect(h.oldLines).toBe(1)
      expect(h.newLines).toBe(1)
      expect(h.lines).toHaveLength(4)
    })

    it('numbers each hunk from its own header', () => {
      const hunks = parseUnifiedDiffToHunks(
        lines('@@ -1,2 +1,3 @@', ' a', '+b', ' c', '@@ -50,2 +51,1 @@ fn', ' x', '-y'),
      )
      expect(hunks).toHaveLength(2)
      expect(hunks[0].lines.map((l) => [l.oldLineNo, l.newLineNo])).toEqual([
        [1, 1],
        [null, 2],
        [2, 3],
      ])
      expect(hunks[1]).toEqual({
        oldStart: 50,
        oldLines: 2,
        newStart: 51,
        newLines: 1,
        header: ' fn',
        lines: [
          { type: 'context', content: 'x', oldLineNo: 50, newLineNo: 51 },
          { type: 'removed', content: 'y', oldLineNo: 51, newLineNo: null },
        ],
      })
    })

    it('keeps a hunk with no lines', () => {
      const hunks = parseUnifiedDiffToHunks(lines('@@ -1 +1 @@', '@@ -5 +5 @@', ' x'))
      expect(hunks).toHaveLength(2)
      expect(hunks[0].lines).toEqual([])
      expect(hunks[1].lines).toHaveLength(1)
    })

    it('parses a multi-file git diff into a flat list without leaking file headers', () => {
      const diff = lines(
        'diff --git a/one.ts b/one.ts',
        'index 1111111..2222222 100644',
        '--- a/one.ts',
        '+++ b/one.ts',
        '@@ -1,2 +1,2 @@ export {}',
        ' const a = 1',
        '-const b = 2',
        '+const b = 3',
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
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks).toEqual([
        {
          oldStart: 1,
          oldLines: 2,
          newStart: 1,
          newLines: 2,
          header: ' export {}',
          lines: [
            { type: 'context', content: 'const a = 1', oldLineNo: 1, newLineNo: 1 },
            { type: 'removed', content: 'const b = 2', oldLineNo: 2, newLineNo: null },
            { type: 'added', content: 'const b = 3', oldLineNo: null, newLineNo: 2 },
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
