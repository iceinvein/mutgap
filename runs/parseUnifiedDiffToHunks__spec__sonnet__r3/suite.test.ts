import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

describe('parseUnifiedDiffToHunks', () => {
  it('returns an empty array for an empty string', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('parses a single hunk, classifying lines and numbering each side independently', () => {
    const diff = [
      'diff --git a/file.txt b/file.txt',
      'index abc123..def456 100644',
      '--- a/file.txt',
      '+++ b/file.txt',
      '@@ -1,3 +1,4 @@ function context',
      ' line one',
      '-line two',
      '+line two modified',
      '+line three',
      ' line four',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(1)
    const hunk = hunks[0]
    expect(hunk.oldStart).toBe(1)
    expect(hunk.oldLines).toBe(3)
    expect(hunk.newStart).toBe(1)
    expect(hunk.newLines).toBe(4)
    expect(hunk.header).toBe(' function context')

    expect(hunk.lines).toEqual([
      { type: 'context', content: 'line one', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'line two', oldLineNo: 2, newLineNo: null },
      { type: 'added', content: 'line two modified', oldLineNo: null, newLineNo: 2 },
      { type: 'added', content: 'line three', oldLineNo: null, newLineNo: 3 },
      { type: 'context', content: 'line four', oldLineNo: 3, newLineNo: 4 },
    ])
  })

  it('defaults an omitted count to 1', () => {
    const diff = ['@@ -3 +4 @@', ' only line'].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(1)
    expect(hunks[0].oldStart).toBe(3)
    expect(hunks[0].oldLines).toBe(1)
    expect(hunks[0].newStart).toBe(4)
    expect(hunks[0].newLines).toBe(1)
  })

  it('records an empty header when nothing follows the closing @@', () => {
    const diff = ['@@ -1,1 +1,1 @@', ' line'].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks[0].header).toBe('')
  })

  it('ignores lines before the first hunk header', () => {
    const diff = [
      'diff --git a/file.txt b/file.txt',
      'index abc123..def456 100644',
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

  it('parses a multi-file diff into a flat, ordered array of hunks without the next file header joining the previous hunk', () => {
    const diff = [
      'diff --git a/a.txt b/a.txt',
      'index 111..222 100644',
      '--- a/a.txt',
      '+++ b/a.txt',
      '@@ -1,1 +1,1 @@',
      '-old content',
      '+new content',
      'diff --git a/b.txt b/b.txt',
      'index 333..444 100644',
      '--- a/b.txt',
      '+++ b/b.txt',
      '@@ -5,2 +5,2 @@',
      ' shared',
      '-old content2',
      '+new content2',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(2)

    expect(hunks[0].oldStart).toBe(1)
    expect(hunks[0].lines).toEqual([
      { type: 'removed', content: 'old content', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'new content', oldLineNo: null, newLineNo: 1 },
    ])

    expect(hunks[1].oldStart).toBe(5)
    expect(hunks[1].newStart).toBe(5)
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'shared', oldLineNo: 5, newLineNo: 5 },
      { type: 'removed', content: 'old content2', oldLineNo: 6, newLineNo: null },
      { type: 'added', content: 'new content2', oldLineNo: null, newLineNo: 6 },
    ])
  })

  it('numbers each hunk from its own header, independent of prior hunks', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      '-first',
      '+first replacement',
      '@@ -50,1 +60,1 @@',
      '-second',
      '+second replacement',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(2)
    expect(hunks[1].lines).toEqual([
      { type: 'removed', content: 'second', oldLineNo: 50, newLineNo: null },
      { type: 'added', content: 'second replacement', oldLineNo: null, newLineNo: 60 },
    ])
  })

  it('extends a hunk through every line up to the next header, ignoring the declared counts', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      ' line a',
      ' line b',
      ' line c',
      ' line d',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(1)
    expect(hunks[0].oldLines).toBe(1)
    expect(hunks[0].newLines).toBe(1)
    expect(hunks[0].lines).toHaveLength(4)
    expect(hunks[0].lines[3]).toEqual({
      type: 'context',
      content: 'line d',
      oldLineNo: 4,
      newLineNo: 4,
    })
  })

  it('skips empty lines within a hunk without advancing either counter', () => {
    const diff = [
      '@@ -1,2 +1,2 @@',
      ' line one',
      '',
      ' line two',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'line one', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'line two', oldLineNo: 2, newLineNo: 2 },
    ])
  })

  it('treats a line that is a single space as an empty context line, distinct from a truly empty line', () => {
    const diff = ['@@ -1,1 +1,1 @@', ' '].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks[0].lines).toEqual([
      { type: 'context', content: '', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('skips "\\ No newline at end of file" markers without advancing counters', () => {
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

  it('ignores other non-content lines such as "diff --git" or "index" inside a hunk body', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      'diff --git a/x b/x',
      'index 000..111 100644',
      ' context',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('drops a removed line whose content itself begins with "--" instead of misreading it as a removed line', () => {
    const diff = [
      '@@ -1,2 +1,1 @@',
      ' before',
      '---looks like a file header',
      ' after',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'before', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'after', oldLineNo: 2, newLineNo: 2 },
    ])
  })

  it('drops an added line whose content itself begins with "++"', () => {
    const diff = [
      '@@ -1,1 +1,2 @@',
      ' before',
      '+++looks like a file header',
      ' after',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'before', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'after', oldLineNo: 2, newLineNo: 2 },
    ])
  })
})
