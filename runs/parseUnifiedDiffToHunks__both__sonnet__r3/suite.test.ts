import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

describe('parseUnifiedDiffToHunks', () => {
  it('returns [] for an empty string', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('returns [] when there is no hunk header', () => {
    const diff = ['diff --git a/foo b/foo', 'index abc123..def456 100644'].join('\n')
    expect(parseUnifiedDiffToHunks(diff)).toEqual([])
  })

  it('ignores lines before the first hunk header, including file headers', () => {
    const diff = [
      'diff --git a/foo b/foo',
      'index abc123..def456 100644',
      '--- a/foo',
      '+++ b/foo',
      '@@ -1 +1 @@',
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

  it('parses oldStart/oldLines/newStart/newLines and defaults omitted counts to 1', () => {
    const diff = '@@ -3 +4 @@\n context\n'
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0]).toMatchObject({
      oldStart: 3,
      oldLines: 1,
      newStart: 4,
      newLines: 1,
    })
  })

  it('captures the header text exactly as written, including a function name', () => {
    const diff = '@@ -10,5 +12,6 @@ function foo() {\n context\n'
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].header).toBe(' function foo() {')
  })

  it('records an empty header when nothing follows the closing @@', () => {
    const diff = '@@ -1,3 +1,4 @@\n context\n'
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].header).toBe('')
  })

  it('numbers context, added and removed lines from the hunk header', () => {
    const diff = [
      '@@ -1,3 +1,4 @@',
      ' context line',
      '-old line',
      '+new line',
      '+another new line',
      ' context line 2',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(1)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'context line', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'old line', oldLineNo: 2, newLineNo: null },
      { type: 'added', content: 'new line', oldLineNo: null, newLineNo: 2 },
      { type: 'added', content: 'another new line', oldLineNo: null, newLineNo: 3 },
      { type: 'context', content: 'context line 2', oldLineNo: 3, newLineNo: 4 },
    ])
  })

  it('numbers each hunk independently from its own header', () => {
    const diff = [
      '@@ -1,2 +1,2 @@',
      ' a',
      '-b',
      '@@ -10,2 +9,3 @@',
      ' c',
      '+d',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'b', oldLineNo: 2, newLineNo: null },
    ])
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'c', oldLineNo: 10, newLineNo: 9 },
      { type: 'added', content: 'd', oldLineNo: null, newLineNo: 10 },
    ])
  })

  it('skips empty lines without advancing either counter', () => {
    const diff = ['@@ -1,2 +1,2 @@', ' a', '', '-b'].join('\n')
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'b', oldLineNo: 2, newLineNo: null },
    ])
  })

  it('skips "\\ No newline at end of file" markers without advancing either counter', () => {
    const diff = ['@@ -1 +1 @@', '-old', '\\ No newline at end of file', '+new'].join('\n')
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].lines).toEqual([
      { type: 'removed', content: 'old', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'new', oldLineNo: null, newLineNo: 1 },
    ])
  })

  it('ignores unrecognized lines such as "diff --git" or "index" inside a hunk', () => {
    const diff = ['@@ -1,2 +1,2 @@', ' a', 'index abc..def 100644', '-b'].join('\n')
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'b', oldLineNo: 2, newLineNo: null },
    ])
  })

  it("keeps a following file's +++/--- headers from joining the previous hunk in a multi-file diff", () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      '-old',
      '+new',
      'diff --git a/bar b/bar',
      'index 1..2 100644',
      '--- a/bar',
      '+++ b/bar',
      '@@ -1,1 +1,1 @@',
      '-x',
      '+y',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toEqual([
      { type: 'removed', content: 'old', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'new', oldLineNo: null, newLineNo: 1 },
    ])
    expect(hunks[1].lines).toEqual([
      { type: 'removed', content: 'x', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'y', oldLineNo: null, newLineNo: 1 },
    ])
  })

  it('skips a removed line whose text itself begins with "--" (line starts with "---")', () => {
    const diff = ['@@ -1,3 +1,2 @@', ' context', '---something', ' after'].join('\n')
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'after', oldLineNo: 2, newLineNo: 2 },
    ])
  })

  it('preserves leading whitespace in content beyond the marker character', () => {
    const diff = ['@@ -1,1 +1,1 @@', '   indented context'].join('\n')
    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: '  indented context', oldLineNo: 1, newLineNo: 1 },
    ])
  })
})
