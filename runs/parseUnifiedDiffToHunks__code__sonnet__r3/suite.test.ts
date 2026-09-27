import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

describe('parseUnifiedDiffToHunks', () => {
  it('returns an empty array for empty input', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('returns an empty array when there is no hunk header', () => {
    const diff = 'diff --git a/file.txt b/file.txt\nindex 111..222 100644\n--- a/file.txt\n+++ b/file.txt\n'
    expect(parseUnifiedDiffToHunks(diff)).toEqual([])
  })

  it('parses a single hunk header with explicit counts', () => {
    const diff = '@@ -1,3 +1,4 @@\n context\n-removed\n+added\n context2\n'
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(1)
    expect(hunks[0]).toMatchObject({
      oldStart: 1,
      oldLines: 3,
      newStart: 1,
      newLines: 4,
      header: '',
    })
  })

  it('defaults line counts to 1 when omitted from the header', () => {
    const diff = '@@ -5 +7 @@\n context\n'
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0]).toMatchObject({
      oldStart: 5,
      oldLines: 1,
      newStart: 7,
      newLines: 1,
    })
  })

  it('captures the trailing header text (e.g. function context)', () => {
    const diff = '@@ -1,2 +1,2 @@ function foo() {\n context\n'
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].header).toBe(' function foo() {')
  })

  it('classifies added, removed, and context lines with correct content', () => {
    const diff = '@@ -1,2 +1,2 @@\n unchanged\n-old line\n+new line\n'
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines).toEqual([
      { type: 'context', content: 'unchanged', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'old line', oldLineNo: 2, newLineNo: null },
      { type: 'added', content: 'new line', oldLineNo: null, newLineNo: 2 },
    ])
  })

  it('tracks old/new line numbers independently as lines are added and removed', () => {
    const diff = '@@ -10,2 +20,3 @@\n context\n-removed\n+added1\n+added2\n'
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 10, newLineNo: 20 },
      { type: 'removed', content: 'removed', oldLineNo: 11, newLineNo: null },
      { type: 'added', content: 'added1', oldLineNo: null, newLineNo: 21 },
      { type: 'added', content: 'added2', oldLineNo: null, newLineNo: 22 },
    ])
  })

  it('ignores "no newline at end of file" markers', () => {
    const diff = '@@ -1,1 +1,1 @@\n-old\n+new\n\\ No newline at end of file\n'
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines).toEqual([
      { type: 'removed', content: 'old', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'new', oldLineNo: null, newLineNo: 1 },
    ])
  })

  it('skips blank lines within a hunk', () => {
    const diff = '@@ -1,2 +1,2 @@\n context1\n\n context2\n'
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines).toEqual([
      { type: 'context', content: 'context1', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'context2', oldLineNo: 2, newLineNo: 2 },
    ])
  })

  it('ignores lines before the first hunk header', () => {
    const diff = 'diff --git a/file.txt b/file.txt\n--- a/file.txt\n+++ b/file.txt\n@@ -1,1 +1,1 @@\n context\n'
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(1)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('parses multiple hunks and resets counters for each', () => {
    const diff =
      '@@ -1,1 +1,1 @@\n-a\n+b\n@@ -50,2 +52,2 @@\n context\n-removed\n'
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(2)
    expect(hunks[0]).toMatchObject({ oldStart: 1, newStart: 1 })
    expect(hunks[0].lines).toEqual([
      { type: 'removed', content: 'a', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'b', oldLineNo: null, newLineNo: 1 },
    ])
    expect(hunks[1]).toMatchObject({ oldStart: 50, newStart: 52 })
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 50, newLineNo: 52 },
      { type: 'removed', content: 'removed', oldLineNo: 51, newLineNo: null },
    ])
  })

  it('handles a diff with a full file header preceding a real hunk', () => {
    const diff = [
      'diff --git a/foo.txt b/foo.txt',
      'index abc123..def456 100644',
      '--- a/foo.txt',
      '+++ b/foo.txt',
      '@@ -1,3 +1,3 @@',
      ' line1',
      '-line2',
      '+line2 modified',
      ' line3',
      '',
    ].join('\n')
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(1)
    expect(hunks[0].lines).toHaveLength(4)
  })
})
