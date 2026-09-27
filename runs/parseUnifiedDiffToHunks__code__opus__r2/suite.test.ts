import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

describe('parseUnifiedDiffToHunks', () => {
  it('returns an empty array for an empty string', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('returns an empty array when there are no hunk headers', () => {
    expect(parseUnifiedDiffToHunks('diff --git a/x b/x\n--- a/x\n+++ b/x')).toEqual([])
  })

  it('parses a single hunk with context, removed and added lines', () => {
    const diff = [
      'diff --git a/file.ts b/file.ts',
      'index 123..456 100644',
      '--- a/file.ts',
      '+++ b/file.ts',
      '@@ -10,3 +10,3 @@ function foo() {',
      ' const a = 1',
      '-const b = 2',
      '+const b = 3',
      ' const c = 4',
    ].join('\n')

    expect(parseUnifiedDiffToHunks(diff)).toEqual([
      {
        oldStart: 10,
        oldLines: 3,
        newStart: 10,
        newLines: 3,
        header: ' function foo() {',
        lines: [
          { type: 'context', content: 'const a = 1', oldLineNo: 10, newLineNo: 10 },
          { type: 'removed', content: 'const b = 2', oldLineNo: 11, newLineNo: null },
          { type: 'added', content: 'const b = 3', oldLineNo: null, newLineNo: 11 },
          { type: 'context', content: 'const c = 4', oldLineNo: 12, newLineNo: 12 },
        ],
      },
    ])
  })

  it('defaults line counts to 1 when omitted from the header', () => {
    const [hunk] = parseUnifiedDiffToHunks('@@ -5 +7 @@\n-old\n+new')
    expect(hunk).toMatchObject({ oldStart: 5, oldLines: 1, newStart: 7, newLines: 1, header: '' })
    expect(hunk.lines).toEqual([
      { type: 'removed', content: 'old', oldLineNo: 5, newLineNo: null },
      { type: 'added', content: 'new', oldLineNo: null, newLineNo: 7 },
    ])
  })

  it('parses zero line counts for pure additions to a new file', () => {
    const [hunk] = parseUnifiedDiffToHunks('@@ -0,0 +1,2 @@\n+line one\n+line two')
    expect(hunk).toMatchObject({ oldStart: 0, oldLines: 0, newStart: 1, newLines: 2 })
    expect(hunk.lines.map((l) => l.newLineNo)).toEqual([1, 2])
    expect(hunk.lines.every((l) => l.oldLineNo === null)).toBe(true)
  })

  it('tracks old and new line numbers independently across uneven changes', () => {
    const diff = ['@@ -1,4 +1,2 @@', ' a', '-b', '-c', '-d', '+x', ' e'].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines.map((l) => [l.type, l.oldLineNo, l.newLineNo])).toEqual([
      ['context', 1, 1],
      ['removed', 2, null],
      ['removed', 3, null],
      ['removed', 4, null],
      ['added', null, 2],
      ['context', 5, 3],
    ])
  })

  it('resets line numbering for each hunk', () => {
    const diff = [
      '@@ -1,2 +1,3 @@',
      ' a',
      '+b',
      ' c',
      '@@ -20,2 +21,1 @@ section two',
      '-y',
      ' z',
    ].join('\n')
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toHaveLength(3)
    expect(hunks[1].header).toBe(' section two')
    expect(hunks[1].lines).toEqual([
      { type: 'removed', content: 'y', oldLineNo: 20, newLineNo: null },
      { type: 'context', content: 'z', oldLineNo: 21, newLineNo: 21 },
    ])
  })

  it('ignores "\\ No newline at end of file" markers without affecting numbering', () => {
    const diff = ['@@ -1 +1 @@', '-old', '\\ No newline at end of file', '+new', '\\ No newline at end of file'].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines).toEqual([
      { type: 'removed', content: 'old', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'new', oldLineNo: null, newLineNo: 1 },
    ])
  })

  it('ignores empty lines such as a trailing newline', () => {
    const [hunk] = parseUnifiedDiffToHunks('@@ -1 +1 @@\n a\n')
    expect(hunk.lines).toEqual([{ type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 }])
  })

  it('ignores lines with an unrecognised prefix inside a hunk', () => {
    const [hunk] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@\n a\ngarbage\n b')
    expect(hunk.lines.map((l) => [l.content, l.oldLineNo])).toEqual([
      ['a', 1],
      ['b', 2],
    ])
  })

  it('preserves content verbatim after the prefix character', () => {
    const [hunk] = parseUnifiedDiffToHunks('@@ -1,3 +1,3 @@\n   indented\n--dashes\n++plus')
    expect(hunk.lines.map((l) => l.content)).toEqual(['  indented', '-dashes', '+plus'])
  })

  it('does not treat the next file\'s ---/+++ headers as diff lines in a multi-file diff', () => {
    const diff = [
      'diff --git a/one.ts b/one.ts',
      '--- a/one.ts',
      '+++ b/one.ts',
      '@@ -1 +1 @@',
      '-a',
      '+b',
      'diff --git a/two.ts b/two.ts',
      '--- a/two.ts',
      '+++ b/two.ts',
      '@@ -1 +1 @@',
      '-c',
      '+d',
    ].join('\n')
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toEqual([
      { type: 'removed', content: 'a', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'b', oldLineNo: null, newLineNo: 1 },
    ])
  })
})
