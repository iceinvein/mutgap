import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

describe('parseUnifiedDiffToHunks', () => {
  it('returns an empty array for an empty string', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('parses a single hunk with context, added, and removed lines', () => {
    const diff = [
      '@@ -1,3 +1,4 @@',
      ' line1',
      '-line2',
      '+line2 modified',
      '+line3 new',
      ' line3',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(1)
    const hunk = hunks[0]
    expect(hunk.oldStart).toBe(1)
    expect(hunk.oldLines).toBe(3)
    expect(hunk.newStart).toBe(1)
    expect(hunk.newLines).toBe(4)
    expect(hunk.header).toBe('')

    expect(hunk.lines).toEqual([
      { type: 'context', content: 'line1', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'line2', oldLineNo: 2, newLineNo: null },
      { type: 'added', content: 'line2 modified', oldLineNo: null, newLineNo: 2 },
      { type: 'added', content: 'line3 new', oldLineNo: null, newLineNo: 3 },
      { type: 'context', content: 'line3', oldLineNo: 3, newLineNo: 4 },
    ])
  })

  it('captures the header text after the @@ markers', () => {
    const diff = '@@ -10,2 +10,2 @@ function foo() {\n context line\n'
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].header).toBe(' function foo() {')
  })

  it('defaults oldLines and newLines to 1 when omitted from the header', () => {
    const diff = '@@ -5 +5 @@\n context\n'
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].oldLines).toBe(1)
    expect(hunks[0].newLines).toBe(1)
  })

  it('parses multiple hunks and tracks line numbers independently per hunk', () => {
    const diff = [
      '@@ -1,2 +1,2 @@',
      ' a',
      '-b',
      '+b2',
      '@@ -10,2 +10,3 @@',
      ' c',
      '+d',
      ' e',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(2)

    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'b', oldLineNo: 2, newLineNo: null },
      { type: 'added', content: 'b2', oldLineNo: null, newLineNo: 2 },
    ])

    expect(hunks[1].oldStart).toBe(10)
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'c', oldLineNo: 10, newLineNo: 10 },
      { type: 'added', content: 'd', oldLineNo: null, newLineNo: 11 },
      { type: 'context', content: 'e', oldLineNo: 11, newLineNo: 12 },
    ])
  })

  it('ignores content before the first hunk header, such as file headers', () => {
    const diff = [
      'diff --git a/file.txt b/file.txt',
      'index 000..111 100644',
      '--- a/file.txt',
      '+++ b/file.txt',
      '@@ -1,1 +1,1 @@',
      '-old',
      '+new',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(1)
    expect(hunks[0].lines).toEqual([
      { type: 'removed', content: 'old', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'new', oldLineNo: null, newLineNo: 1 },
    ])
  })

  it('skips "no newline at end of file" markers', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      '-old',
      '\\ No newline at end of file',
      '+new',
      '\\ No newline at end of file',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].lines).toEqual([
      { type: 'removed', content: 'old', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'new', oldLineNo: null, newLineNo: 1 },
    ])
  })

  it('skips blank lines outside of hunks and ignores lines before any hunk', () => {
    const diff = '\n\nsome preamble\n@@ -1,1 +1,1 @@\n context\n'
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(1)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('handles a diff with no hunk headers by returning no hunks', () => {
    const diff = 'just some text\nwith no diff markers\n'
    expect(parseUnifiedDiffToHunks(diff)).toEqual([])
  })
})
