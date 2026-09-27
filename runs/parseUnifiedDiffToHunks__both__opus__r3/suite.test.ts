import { describe, it, expect } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

describe('parseUnifiedDiffToHunks', () => {
  it('returns [] for an empty string', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('returns [] when there is no hunk header', () => {
    const diff = ['diff --git a/x b/x', 'index 123..456 100644', '--- a/x', '+++ b/x'].join('\n')
    expect(parseUnifiedDiffToHunks(diff)).toEqual([])
  })

  it('parses a single hunk with line numbers', () => {
    const diff = [
      'diff --git a/f.ts b/f.ts',
      'index 1111111..2222222 100644',
      '--- a/f.ts',
      '+++ b/f.ts',
      '@@ -10,4 +10,4 @@ function foo() {',
      ' a',
      '-b',
      '+B',
      ' c',
      ' d',
    ].join('\n')
    expect(parseUnifiedDiffToHunks(diff)).toEqual([
      {
        oldStart: 10,
        oldLines: 4,
        newStart: 10,
        newLines: 4,
        header: ' function foo() {',
        lines: [
          { type: 'context', content: 'a', oldLineNo: 10, newLineNo: 10 },
          { type: 'removed', content: 'b', oldLineNo: 11, newLineNo: null },
          { type: 'added', content: 'B', oldLineNo: null, newLineNo: 11 },
          { type: 'context', content: 'c', oldLineNo: 12, newLineNo: 12 },
          { type: 'context', content: 'd', oldLineNo: 13, newLineNo: 13 },
        ],
      },
    ])
  })

  describe('header', () => {
    it('defaults omitted counts to 1', () => {
      const [h] = parseUnifiedDiffToHunks('@@ -3 +4 @@\n-x\n+y')
      expect(h).toMatchObject({ oldStart: 3, oldLines: 1, newStart: 4, newLines: 1 })
    })

    it('defaults each omitted count independently', () => {
      const [a] = parseUnifiedDiffToHunks('@@ -3,5 +4 @@')
      expect(a).toMatchObject({ oldLines: 5, newLines: 1 })
      const [b] = parseUnifiedDiffToHunks('@@ -3 +4,7 @@')
      expect(b).toMatchObject({ oldLines: 1, newLines: 7 })
    })

    it('records a zero count as 0, not 1', () => {
      const [h] = parseUnifiedDiffToHunks('@@ -0,0 +1,2 @@\n+a\n+b')
      expect(h).toMatchObject({ oldStart: 0, oldLines: 0, newStart: 1, newLines: 2 })
      expect(h.lines).toEqual([
        { type: 'added', content: 'a', oldLineNo: null, newLineNo: 1 },
        { type: 'added', content: 'b', oldLineNo: null, newLineNo: 2 },
      ])
    })

    it('uses "" as header when nothing follows the closing @@', () => {
      const [h] = parseUnifiedDiffToHunks('@@ -1,1 +1,1 @@\n x')
      expect(h.header).toBe('')
    })

    it('keeps the header text exactly as written', () => {
      const [h] = parseUnifiedDiffToHunks('@@ -1 +1 @@  class  A @@ x  ')
      expect(h.header).toBe('  class  A @@ x  ')
    })

    it('keeps header text with no leading space', () => {
      const [h] = parseUnifiedDiffToHunks('@@ -1 +1 @@foo')
      expect(h.header).toBe('foo')
    })

    it('handles multi-digit numbers', () => {
      const [h] = parseUnifiedDiffToHunks('@@ -1234,56 +7890,123 @@')
      expect(h).toMatchObject({ oldStart: 1234, oldLines: 56, newStart: 7890, newLines: 123 })
    })
  })

  describe('hunk boundaries', () => {
    it('ignores lines before the first hunk header', () => {
      const diff = [' stray context', '+stray add', '-stray remove', '@@ -1 +1 @@', ' kept'].join('\n')
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks).toHaveLength(1)
      expect(hunks[0].lines).toEqual([{ type: 'context', content: 'kept', oldLineNo: 1, newLineNo: 1 }])
    })

    it('does not use declared counts to end a hunk', () => {
      const diff = ['@@ -1,1 +1,1 @@', ' a', ' b', '+c', '-d'].join('\n')
      const [h] = parseUnifiedDiffToHunks(diff)
      expect(h.oldLines).toBe(1)
      expect(h.newLines).toBe(1)
      expect(h.lines.map((l) => l.content)).toEqual(['a', 'b', 'c', 'd'])
    })

    it('does not end a hunk early when there are fewer lines than declared', () => {
      const diff = ['@@ -1,10 +1,10 @@', ' a', '@@ -20,2 +20,2 @@', ' b'].join('\n')
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks).toHaveLength(2)
      expect(hunks[0].lines.map((l) => l.content)).toEqual(['a'])
      expect(hunks[1].lines.map((l) => l.content)).toEqual(['b'])
    })

    it('allows a hunk with no lines', () => {
      expect(parseUnifiedDiffToHunks('@@ -1,0 +1,0 @@')).toEqual([
        { oldStart: 1, oldLines: 0, newStart: 1, newLines: 0, header: '', lines: [] },
      ])
    })
  })

  describe('line classification', () => {
    it('strips only the first character for content', () => {
      const diff = ['@@ -1 +1 @@', '  indented', '++plus', '-  spaced', ' '].join('\n')
      const [h] = parseUnifiedDiffToHunks(diff)
      expect(h.lines.map((l) => [l.type, l.content])).toEqual([
        ['context', ' indented'],
        ['added', '+plus'],
        ['removed', '  spaced'],
        ['context', ''],
      ])
    })

    it('treats a lone "+" or "-" as an added/removed empty line', () => {
      const [h] = parseUnifiedDiffToHunks('@@ -1 +1 @@\n-\n+')
      expect(h.lines).toEqual([
        { type: 'removed', content: '', oldLineNo: 1, newLineNo: null },
        { type: 'added', content: '', oldLineNo: null, newLineNo: 1 },
      ])
    })

    it('skips empty lines without advancing counters', () => {
      const diff = ['@@ -5 +7 @@', ' a', '', ' b', ''].join('\n')
      const [h] = parseUnifiedDiffToHunks(diff)
      expect(h.lines).toEqual([
        { type: 'context', content: 'a', oldLineNo: 5, newLineNo: 7 },
        { type: 'context', content: 'b', oldLineNo: 6, newLineNo: 8 },
      ])
    })

    it('skips "\\ No newline at end of file" without advancing counters', () => {
      const diff = ['@@ -1,2 +1,2 @@', '-a', '\\ No newline at end of file', '+a', '\\ No newline at end of file', ' b'].join('\n')
      const [h] = parseUnifiedDiffToHunks(diff)
      expect(h.lines).toEqual([
        { type: 'removed', content: 'a', oldLineNo: 1, newLineNo: null },
        { type: 'added', content: 'a', oldLineNo: null, newLineNo: 1 },
        { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
      ])
    })

    it('skips lines starting with "+++" without advancing counters', () => {
      const diff = ['@@ -1 +1 @@', '+++ b/other', '+real', ' ctx'].join('\n')
      const [h] = parseUnifiedDiffToHunks(diff)
      expect(h.lines).toEqual([
        { type: 'added', content: 'real', oldLineNo: null, newLineNo: 1 },
        { type: 'context', content: 'ctx', oldLineNo: 1, newLineNo: 2 },
      ])
    })

    it('skips lines starting with "---" (including removed lines whose text begins with "--")', () => {
      const diff = ['@@ -1 +1 @@', '--- a/other', '--- SQL comment', '-real', ' ctx'].join('\n')
      const [h] = parseUnifiedDiffToHunks(diff)
      expect(h.lines).toEqual([
        { type: 'removed', content: 'real', oldLineNo: 1, newLineNo: null },
        { type: 'context', content: 'ctx', oldLineNo: 2, newLineNo: 1 },
      ])
    })

    it('does not skip "++" or "--" prefixes shorter than three characters', () => {
      const [h] = parseUnifiedDiffToHunks('@@ -1 +1 @@\n--x\n++y')
      expect(h.lines).toEqual([
        { type: 'removed', content: '-x', oldLineNo: 1, newLineNo: null },
        { type: 'added', content: '+y', oldLineNo: null, newLineNo: 1 },
      ])
    })

    it('ignores other lines inside a hunk without advancing counters', () => {
      const diff = ['@@ -1 +1 @@', ' a', 'diff --git a/y b/y', 'index abc..def 100644', 'garbage', '\tTab', ' b'].join('\n')
      const [h] = parseUnifiedDiffToHunks(diff)
      expect(h.lines).toEqual([
        { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
        { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
      ])
    })

    it('ignores malformed hunk headers', () => {
      const diff = ['@@ -1 +1 @@', ' a', '@@ -x +1 @@', '@@ -1 +1', ' b'].join('\n')
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks).toHaveLength(1)
      expect(hunks[0].lines.map((l) => l.content)).toEqual(['a', 'b'])
    })
  })

  describe('line numbering', () => {
    it('advances counters correctly across runs of removals and additions', () => {
      const diff = ['@@ -3,5 +3,4 @@', ' c', '-r1', '-r2', '-r3', '+a1', '+a2', ' c2', '+a3'].join('\n')
      const [h] = parseUnifiedDiffToHunks(diff)
      expect(h.lines.map((l) => [l.type, l.oldLineNo, l.newLineNo])).toEqual([
        ['context', 3, 3],
        ['removed', 4, null],
        ['removed', 5, null],
        ['removed', 6, null],
        ['added', null, 4],
        ['added', null, 5],
        ['context', 7, 6],
        ['added', null, 7],
      ])
    })

    it('numbers each hunk from its own header, independently of earlier hunks', () => {
      const diff = ['@@ -1,2 +1,3 @@', ' a', '+b', ' c', '@@ -50,2 +80,1 @@ fn', '-x', ' y'].join('\n')
      const hunks = parseUnifiedDiffToHunks(diff)
      expect(hunks[1]).toEqual({
        oldStart: 50,
        oldLines: 2,
        newStart: 80,
        newLines: 1,
        header: ' fn',
        lines: [
          { type: 'removed', content: 'x', oldLineNo: 50, newLineNo: null },
          { type: 'context', content: 'y', oldLineNo: 51, newLineNo: 80 },
        ],
      })
    })
  })

  describe('multi-file diffs', () => {
    it('returns a flat array of hunks in input order and keeps file headers out of hunks', () => {
      const diff = [
        'diff --git a/one.ts b/one.ts',
        'index 1111111..2222222 100644',
        '--- a/one.ts',
        '+++ b/one.ts',
        '@@ -1,2 +1,2 @@',
        '-old1',
        '+new1',
        ' same1',
        'diff --git a/two.ts b/two.ts',
        'new file mode 100644',
        'index 0000000..3333333',
        '--- /dev/null',
        '+++ b/two.ts',
        '@@ -0,0 +1,2 @@',
        '+x',
        '+y',
        'diff --git a/three.ts b/three.ts',
        'deleted file mode 100644',
        'index 4444444..0000000',
        '--- a/three.ts',
        '+++ /dev/null',
        '@@ -1 +0,0 @@',
        '-gone',
        '\\ No newline at end of file',
        '',
      ].join('\n')
      expect(parseUnifiedDiffToHunks(diff)).toEqual([
        {
          oldStart: 1,
          oldLines: 2,
          newStart: 1,
          newLines: 2,
          header: '',
          lines: [
            { type: 'removed', content: 'old1', oldLineNo: 1, newLineNo: null },
            { type: 'added', content: 'new1', oldLineNo: null, newLineNo: 1 },
            { type: 'context', content: 'same1', oldLineNo: 2, newLineNo: 2 },
          ],
        },
        {
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: 2,
          header: '',
          lines: [
            { type: 'added', content: 'x', oldLineNo: null, newLineNo: 1 },
            { type: 'added', content: 'y', oldLineNo: null, newLineNo: 2 },
          ],
        },
        {
          oldStart: 1,
          oldLines: 1,
          newStart: 0,
          newLines: 0,
          header: '',
          lines: [{ type: 'removed', content: 'gone', oldLineNo: 1, newLineNo: null }],
        },
      ])
    })
  })
})
