import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

describe('parseUnifiedDiffToHunks', () => {
  it('returns [] for an empty string', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('returns [] when there is no hunk header (lines before the first hunk are ignored)', () => {
    const diff = [
      'diff --git a/foo.txt b/foo.txt',
      'index e69de29..4b825dc 100644',
      '--- a/foo.txt',
      '+++ b/foo.txt',
    ].join('\n')

    expect(parseUnifiedDiffToHunks(diff)).toEqual([])
  })

  it('parses header fields and trailing text exactly as written', () => {
    const diff = [
      '@@ -1,3 +1,4 @@ function foo() {',
      ' line1',
      '-line2',
      '+line2a',
      '+line2b',
      ' line3',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(1)
    expect(hunks[0]).toMatchObject({
      oldStart: 1,
      oldLines: 3,
      newStart: 1,
      newLines: 4,
      header: ' function foo() {',
    })
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'line1', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'line2', oldLineNo: 2, newLineNo: null },
      { type: 'added', content: 'line2a', oldLineNo: null, newLineNo: 2 },
      { type: 'added', content: 'line2b', oldLineNo: null, newLineNo: 3 },
      { type: 'context', content: 'line3', oldLineNo: 3, newLineNo: 4 },
    ])
  })

  it('records "" as the header when nothing follows the closing @@', () => {
    const diff = ['@@ -1,2 +1,2 @@', ' a', ' b'].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks[0].header).toBe('')
  })

  it('defaults an omitted count to 1', () => {
    const diff = ['@@ -3 +4 @@', ' context'].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks[0]).toMatchObject({
      oldStart: 3,
      oldLines: 1,
      newStart: 4,
      newLines: 1,
    })
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 3, newLineNo: 4 },
    ])
  })

  it('does not use the declared counts to decide where a hunk ends', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      '+a',
      '+b',
      '+c',
      '@@ -5,1 +7,1 @@',
      ' context',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toEqual([
      { type: 'added', content: 'a', oldLineNo: null, newLineNo: 1 },
      { type: 'added', content: 'b', oldLineNo: null, newLineNo: 2 },
      { type: 'added', content: 'c', oldLineNo: null, newLineNo: 3 },
    ])
    expect(hunks[1]).toMatchObject({ oldStart: 5, newStart: 7 })
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 5, newLineNo: 7 },
    ])
  })

  it('numbers each hunk independently from its own header', () => {
    const diff = [
      '@@ -1,2 +1,2 @@',
      ' a',
      '-b',
      '@@ -100,1 +99,1 @@',
      ' c',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'b', oldLineNo: 2, newLineNo: null },
    ])
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'c', oldLineNo: 100, newLineNo: 99 },
    ])
  })

  it('does not let a second file\'s headers join the previous hunk, and starts fresh numbering', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      ' a',
      'diff --git a/bar.txt b/bar.txt',
      'index 111..222 100644',
      '--- a/bar.txt',
      '+++ b/bar.txt',
      '@@ -1,1 +1,1 @@',
      ' b',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
    ])
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'b', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('skips empty lines and "\\ No newline at end of file" lines without advancing counters', () => {
    const diff = [
      '@@ -1,2 +1,2 @@',
      ' a',
      '',
      '-b',
      '\\ No newline at end of file',
      '+c',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'b', oldLineNo: 2, newLineNo: null },
      { type: 'added', content: 'c', oldLineNo: null, newLineNo: 2 },
    ])
  })

  it('ignores unrecognized lines such as "diff --git" and "index" inside a hunk', () => {
    const diff = [
      '@@ -1,2 +1,2 @@',
      ' a',
      'index abc..def 100644',
      ' b',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'a', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'b', oldLineNo: 2, newLineNo: 2 },
    ])
  })

  it('skips a removed line whose text itself begins with "--", like a file header', () => {
    const diff = [
      '@@ -1,3 +1,2 @@',
      ' context1',
      '---content-starting-with-dashes',
      ' context2',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'context1', oldLineNo: 1, newLineNo: 1 },
      { type: 'context', content: 'context2', oldLineNo: 2, newLineNo: 2 },
    ])
  })
})
