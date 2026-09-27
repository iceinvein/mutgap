import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

describe('parseUnifiedDiffToHunks', () => {
  it('returns [] for an empty string', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('ignores everything before the first hunk header', () => {
    const diff = [
      'diff --git a/foo.txt b/foo.txt',
      'index e69de29..d00491f 100644',
      '--- a/foo.txt',
      '+++ b/foo.txt',
      '@@ -1,3 +1,4 @@',
      ' line1',
      '-line2',
      '+line2 changed',
      '+new line',
      ' line3',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(1)
    expect(hunks[0].oldStart).toBe(1)
    expect(hunks[0].oldLines).toBe(3)
    expect(hunks[0].newStart).toBe(1)
    expect(hunks[0].newLines).toBe(4)
  })

  it('parses added, removed, and context lines with correct content and numbering', () => {
    const diff = [
      '@@ -1,3 +1,4 @@',
      ' line1',
      '-line2',
      '+line2 changed',
      '+new line',
      ' line3',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(1)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'line1', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'line2', oldLineNo: 2, newLineNo: null },
      { type: 'added', content: 'line2 changed', oldLineNo: null, newLineNo: 2 },
      { type: 'added', content: 'new line', oldLineNo: null, newLineNo: 3 },
      { type: 'context', content: 'line3', oldLineNo: 3, newLineNo: 4 },
    ])
  })

  it('defaults omitted counts to 1', () => {
    const diff = ['@@ -3 +4 @@', ' only line'].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0]).toMatchObject({
      oldStart: 3,
      oldLines: 1,
      newStart: 4,
      newLines: 1,
    })
  })

  it('records the header text exactly as written, including a function name', () => {
    const diff = ['@@ -1,2 +1,2 @@ function fooBar() {', ' a', ' b'].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].header).toBe(' function fooBar() {')
  })

  it('uses an empty string header when nothing follows the closing @@', () => {
    const diff = ['@@ -1,2 +1,2 @@', ' a', ' b'].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].header).toBe('')
  })

  it('does not use the declared counts to decide where a hunk ends', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      ' a',
      ' b',
      ' c',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(1)
    expect(hunks[0].lines).toHaveLength(3)
    expect(hunks[0].lines[2]).toEqual({
      type: 'context',
      content: 'c',
      oldLineNo: 3,
      newLineNo: 3,
    })
  })

  it('skips blank lines without advancing counters', () => {
    const diff = [
      '@@ -1,2 +1,2 @@',
      ' a',
      '',
      ' b',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
    ])
  })

  it('treats a lone space as a context line with empty content', () => {
    const diff = ['@@ -1,1 +1,1 @@', ' '].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: '', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('skips "\\ No newline at end of file" markers', () => {
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

  it('skips other unrecognized lines such as diff --git and index', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      ' a',
      'diff --git a/bar b/bar',
      'index 111..222 100644',
      ' b',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(1)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
    ])
  })

  it('ends a hunk when the next file headers appear, without joining them in', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      ' a',
      '--- a/next.txt',
      '+++ b/next.txt',
      '@@ -1,1 +1,1 @@',
      ' z',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
    ])
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'z', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('skips a removed line whose content itself begins with "--"', () => {
    const diff = [
      '@@ -1,2 +1,1 @@',
      ' a',
      '---looks-like-a-header',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('numbers each hunk independently from its own header', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      ' a',
      '@@ -10,2 +20,2 @@',
      ' b',
      ' c',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
    ])
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'b', oldLineNo: 10, newLineNo: 20 },
      { type: 'context', content: 'c', oldLineNo: 11, newLineNo: 21 },
    ])
  })

  it('flattens hunks from multiple files into input order', () => {
    const diff = [
      'diff --git a/foo.txt b/foo.txt',
      '--- a/foo.txt',
      '+++ b/foo.txt',
      '@@ -1,1 +1,1 @@',
      '-foo old',
      '+foo new',
      'diff --git a/bar.txt b/bar.txt',
      '--- a/bar.txt',
      '+++ b/bar.txt',
      '@@ -5,1 +5,1 @@',
      '-bar old',
      '+bar new',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(2)
    expect(hunks[0].oldStart).toBe(1)
    expect(hunks[0].lines.map((l) => l.content)).toEqual(['foo old', 'foo new'])
    expect(hunks[1].oldStart).toBe(5)
    expect(hunks[1].lines.map((l) => l.content)).toEqual(['bar old', 'bar new'])
  })
})
