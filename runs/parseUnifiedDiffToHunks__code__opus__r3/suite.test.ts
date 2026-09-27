import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

describe('parseUnifiedDiffToHunks', () => {
  it('returns an empty array for an empty string', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('returns an empty array when there are no hunk headers', () => {
    expect(parseUnifiedDiffToHunks('just some text\nwith no hunks')).toEqual([])
  })

  it('parses a single hunk with context, removed and added lines', () => {
    const diff = [
      'diff --git a/foo.ts b/foo.ts',
      'index 1111111..2222222 100644',
      '--- a/foo.ts',
      '+++ b/foo.ts',
      '@@ -10,3 +10,3 @@ function foo() {',
      ' const a = 1',
      '-const b = 2',
      '+const b = 3',
      ' return a + b',
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
          { type: 'context', content: 'return a + b', oldLineNo: 12, newLineNo: 12 },
        ],
      },
    ])
  })

  it('ignores the file header lines that precede the first hunk', () => {
    const diff = ['--- a/x', '+++ b/x', '@@ -1 +1 @@', '-a', '+b'].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines.map((l) => l.type)).toEqual(['removed', 'added'])
  })

  it('defaults line counts to 1 when omitted from the header', () => {
    const [hunk] = parseUnifiedDiffToHunks('@@ -5 +7 @@\n-x\n+y')
    expect(hunk).toMatchObject({ oldStart: 5, oldLines: 1, newStart: 7, newLines: 1 })
  })

  it('keeps explicit zero line counts (pure additions / deletions)', () => {
    const [added] = parseUnifiedDiffToHunks('@@ -0,0 +1,2 @@\n+one\n+two')
    expect(added).toMatchObject({ oldStart: 0, oldLines: 0, newStart: 1, newLines: 2 })
    expect(added.lines).toEqual([
      { type: 'added', content: 'one', oldLineNo: null, newLineNo: 1 },
      { type: 'added', content: 'two', oldLineNo: null, newLineNo: 2 },
    ])

    const [removed] = parseUnifiedDiffToHunks('@@ -1,2 +0,0 @@\n-one\n-two')
    expect(removed).toMatchObject({ oldStart: 1, oldLines: 2, newStart: 0, newLines: 0 })
    expect(removed.lines.map((l) => l.oldLineNo)).toEqual([1, 2])
  })

  it('uses an empty header when nothing follows the closing @@', () => {
    const [hunk] = parseUnifiedDiffToHunks('@@ -1,1 +1,1 @@\n x')
    expect(hunk.header).toBe('')
  })

  it('tracks old and new line numbers independently across uneven changes', () => {
    const diff = [
      '@@ -1,4 +1,5 @@',
      ' a',
      '-b',
      '-c',
      '+B',
      '+C',
      '+D',
      ' e',
      ' f',
    ].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines.map((l) => [l.type, l.oldLineNo, l.newLineNo])).toEqual([
      ['context', 1, 1],
      ['removed', 2, null],
      ['removed', 3, null],
      ['added', null, 2],
      ['added', null, 3],
      ['added', null, 4],
      ['context', 4, 5],
      ['context', 5, 6],
    ])
  })

  it('parses multiple hunks and resets line numbers for each', () => {
    const diff = [
      '@@ -1,2 +1,2 @@',
      '-old1',
      '+new1',
      ' keep',
      '@@ -20,2 +20,3 @@ section two',
      ' ctx',
      '+inserted',
      ' ctx2',
    ].join('\n')
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(2)
    expect(hunks[1].header).toBe(' section two')
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'ctx', oldLineNo: 20, newLineNo: 20 },
      { type: 'added', content: 'inserted', oldLineNo: null, newLineNo: 21 },
      { type: 'context', content: 'ctx2', oldLineNo: 21, newLineNo: 22 },
    ])
  })

  it('skips "\\ No newline at end of file" markers without advancing line numbers', () => {
    const diff = [
      '@@ -1,2 +1,2 @@',
      ' a',
      '-b',
      '\\ No newline at end of file',
      '+b',
      '\\ No newline at end of file',
    ].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'b', oldLineNo: 2, newLineNo: null },
      { type: 'added', content: 'b', oldLineNo: null, newLineNo: 2 },
    ])
  })

  it('ignores a trailing newline at the end of the diff', () => {
    const [hunk] = parseUnifiedDiffToHunks('@@ -1 +1 @@\n-a\n+b\n')
    expect(hunk.lines).toHaveLength(2)
  })

  it('preserves content after the prefix character, including whitespace and markers', () => {
    const diff = ['@@ -1,3 +1,3 @@', '  indented', '--- not a header', '++ plus'].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines.map((l) => l.content)).toEqual([' indented', '-- not a header', '+ plus'])
  })

  it('does not treat the next file\'s ---/+++ headers as hunk lines in a multi-file diff', () => {
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
    expect(hunks[0].lines.map((l) => l.content)).toEqual(['a', 'b'])
    expect(hunks[1].lines.map((l) => l.content)).toEqual(['c', 'd'])
  })
})
