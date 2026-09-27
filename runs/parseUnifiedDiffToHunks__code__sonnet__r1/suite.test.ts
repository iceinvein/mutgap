import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

describe('parseUnifiedDiffToHunks', () => {
  it('returns an empty array for an empty string', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('parses a single hunk with context, added, and removed lines', () => {
    const diff = [
      '--- a/file.txt',
      '+++ b/file.txt',
      '@@ -1,3 +1,3 @@',
      ' unchanged',
      '-removed line',
      '+added line',
      ' trailing',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(1)
    const hunk = hunks[0]
    expect(hunk.oldStart).toBe(1)
    expect(hunk.oldLines).toBe(3)
    expect(hunk.newStart).toBe(1)
    expect(hunk.newLines).toBe(3)
    expect(hunk.header).toBe('')
    expect(hunk.lines).toEqual([
      { type: 'context', content: 'unchanged', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'removed line', oldLineNo: 2, newLineNo: null },
      { type: 'added', content: 'added line', oldLineNo: null, newLineNo: 2 },
      { type: 'context', content: 'trailing', oldLineNo: 3, newLineNo: 3 },
    ])
  })

  it('tracks old/new line numbers independently across added and removed lines', () => {
    const diff = ['@@ -10,2 +10,3 @@', '-old1', '-old2', '+new1', '+new2', '+new3'].join('\n')

    const hunk = parseUnifiedDiffToHunks(diff)[0]

    expect(hunk.lines.map((l) => [l.type, l.oldLineNo, l.newLineNo])).toEqual([
      ['removed', 10, null],
      ['removed', 11, null],
      ['added', null, 10],
      ['added', null, 11],
      ['added', null, 12],
    ])
  })

  it('defaults oldLines/newLines to 1 when omitted from the header', () => {
    const diff = ['@@ -5 +5 @@', ' context line'].join('\n')

    const hunk = parseUnifiedDiffToHunks(diff)[0]

    expect(hunk.oldStart).toBe(5)
    expect(hunk.oldLines).toBe(1)
    expect(hunk.newStart).toBe(5)
    expect(hunk.newLines).toBe(1)
  })

  it('captures the trailing header text after the @@ markers', () => {
    const diff = ['@@ -1,2 +1,2 @@ function foo() {', ' a', ' b'].join('\n')

    const hunk = parseUnifiedDiffToHunks(diff)[0]

    expect(hunk.header).toBe(' function foo() {')
  })

  it('parses multiple hunks and resets line counters per hunk', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      '-a',
      '+b',
      '@@ -20,1 +20,2 @@',
      ' c',
      '+d',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toEqual([
      { type: 'removed', content: 'a', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'b', oldLineNo: null, newLineNo: 1 },
    ])
    expect(hunks[1].oldStart).toBe(20)
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'c', oldLineNo: 20, newLineNo: 20 },
      { type: 'added', content: 'd', oldLineNo: null, newLineNo: 21 },
    ])
  })

  it('ignores "no newline at end of file" markers', () => {
    const diff = ['@@ -1,1 +1,1 @@', '-a', '\\ No newline at end of file', '+b'].join('\n')

    const hunk = parseUnifiedDiffToHunks(diff)[0]

    expect(hunk.lines).toEqual([
      { type: 'removed', content: 'a', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'b', oldLineNo: null, newLineNo: 1 },
    ])
  })

  it('ignores blank lines and lines before the first hunk header', () => {
    const diff = [
      'diff --git a/file.txt b/file.txt',
      'index 000..111 100644',
      '--- a/file.txt',
      '+++ b/file.txt',
      '@@ -1,2 +1,2 @@',
      ' a',
      '',
      ' b',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(1)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
    ])
  })

  it('returns no hunks when the diff has no hunk headers', () => {
    expect(parseUnifiedDiffToHunks('just some text\nwith no diff markers')).toEqual([])
  })
})
