import { describe, it, expect } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

describe('parseUnifiedDiffToHunks', () => {
  it('returns [] for an empty string', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('returns [] when there is no hunk header', () => {
    const diff = ['diff --git a/file.ts b/file.ts', 'index 111..222 100644', '--- a/file.ts', '+++ b/file.ts'].join(
      '\n',
    )
    expect(parseUnifiedDiffToHunks(diff)).toEqual([])
  })

  it('parses a single hunk header and its lines', () => {
    const diff = ['@@ -1,3 +1,4 @@', ' context line', '-removed line', '+added line', ' another context'].join('\n')
    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(1)
    const hunk = hunks[0]
    expect(hunk.oldStart).toBe(1)
    expect(hunk.oldLines).toBe(3)
    expect(hunk.newStart).toBe(1)
    expect(hunk.newLines).toBe(4)
    expect(hunk.header).toBe('')

    expect(hunk.lines).toEqual([
      { type: 'context', content: 'context line', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'removed line', oldLineNo: 2, newLineNo: null },
      { type: 'added', content: 'added line', oldLineNo: null, newLineNo: 2 },
      { type: 'context', content: 'another context', oldLineNo: 3, newLineNo: 3 },
    ])
  })

  it('defaults omitted counts to 1', () => {
    const diff = ['@@ -3 +4 @@', ' only line'].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.oldStart).toBe(3)
    expect(hunk.oldLines).toBe(1)
    expect(hunk.newStart).toBe(4)
    expect(hunk.newLines).toBe(1)
  })

  it('captures everything after the closing @@ as header, verbatim', () => {
    const diff = ['@@ -10,2 +10,2 @@ function foo() {', ' x'].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.header).toBe(' function foo() {')
  })

  it('records declared counts without using them to bound the hunk', () => {
    // Declares only 1 old line and 1 new line, but far more lines follow.
    const diff = ['@@ -1,1 +1,1 @@', ' a', ' b', ' c', ' d', ' e'].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.oldLines).toBe(1)
    expect(hunk.newLines).toBe(1)
    expect(hunk.lines).toHaveLength(5)
  })

  it('ignores lines before the first hunk header', () => {
    const diff = [
      'diff --git a/file.ts b/file.ts',
      'index 111..222 100644',
      '--- a/file.ts',
      '+++ b/file.ts',
      '@@ -1,1 +1,1 @@',
      ' line',
    ].join('\n')
    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(1)
    expect(hunks[0].lines).toEqual([{ type: 'context', content: 'line', oldLineNo: 1, newLineNo: 1 }])
  })

  it('resets line numbering per hunk, independently of earlier hunks', () => {
    const diff = [
      '@@ -1,2 +1,2 @@',
      ' a',
      ' b',
      '@@ -50,1 +60,1 @@',
      ' z',
    ].join('\n')
    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
    ])
    expect(hunks[1].lines).toEqual([{ type: 'context', content: 'z', oldLineNo: 50, newLineNo: 60 }])
  })

  it('parses multiple hunks across multiple files into a flat, ordered array', () => {
    const diff = [
      'diff --git a/one.ts b/one.ts',
      'index 111..222 100644',
      '--- a/one.ts',
      '+++ b/one.ts',
      '@@ -1,1 +1,1 @@',
      '-old one',
      '+new one',
      'diff --git a/two.ts b/two.ts',
      'index 333..444 100644',
      '--- a/two.ts',
      '+++ b/two.ts',
      '@@ -5,1 +5,1 @@',
      '-old two',
      '+new two',
    ].join('\n')
    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(2)
    expect(hunks[0].oldStart).toBe(1)
    expect(hunks[0].lines).toEqual([
      { type: 'removed', content: 'old one', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'new one', oldLineNo: null, newLineNo: 1 },
    ])
    expect(hunks[1].oldStart).toBe(5)
    expect(hunks[1].lines).toEqual([
      { type: 'removed', content: 'old two', oldLineNo: 5, newLineNo: null },
      { type: 'added', content: 'new two', oldLineNo: null, newLineNo: 5 },
    ])
  })

  it('skips "\\ No newline at end of file" markers without advancing counters', () => {
    const diff = ['@@ -1,1 +1,1 @@', '-old', '\\ No newline at end of file', '+new'].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.lines).toEqual([
      { type: 'removed', content: 'old', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'new', oldLineNo: null, newLineNo: 1 },
    ])
  })

  it('skips empty lines without advancing counters', () => {
    const diff = ['@@ -1,2 +1,2 @@', ' a', '', ' b'].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
    ])
  })

  it('ignores a trailing empty element produced by a trailing newline', () => {
    const diff = '@@ -1,1 +1,1 @@\n context\n'
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines).toEqual([{ type: 'context', content: 'context', oldLineNo: 1, newLineNo: 1 }])
  })

  it('skips "+++" file header lines so they never join the current hunk', () => {
    const diff = ['@@ -1,1 +1,1 @@', ' a', '+++ b/file.ts', ' b'].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
    ])
  })

  it('skips "---" file header lines, including a removed line whose content begins with "--"', () => {
    const diff = ['@@ -1,1 +1,1 @@', ' a', '---not really a header', ' b'].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)

    // The "---..." line is skipped entirely: not recorded, and the old counter
    // is not advanced for it.
    expect(hunk.lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
    ])
  })

  it('ignores other non-diff lines such as "diff --git" and "index" inside a hunk', () => {
    const diff = ['@@ -1,1 +1,1 @@', ' a', 'diff --git a/x b/x', 'index abc..def 100644', ' b'].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
    ])
  })

  it('treats an added line starting with an extra "+" as content, not as a file header', () => {
    const diff = ['@@ -1,1 +1,1 @@', '++still added'].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.lines).toEqual([{ type: 'added', content: '+still added', oldLineNo: null, newLineNo: 1 }])
  })
})
