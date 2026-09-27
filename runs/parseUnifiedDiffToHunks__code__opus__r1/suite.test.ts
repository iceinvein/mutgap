import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

describe('parseUnifiedDiffToHunks', () => {
  it('returns an empty array for an empty string', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('returns an empty array when there are no hunk headers', () => {
    expect(parseUnifiedDiffToHunks('--- a/foo\n+++ b/foo\nsome text')).toEqual([])
  })

  it('parses a single hunk with context, added and removed lines', () => {
    const diff = [
      '--- a/foo.ts',
      '+++ b/foo.ts',
      '@@ -1,3 +1,3 @@',
      ' line one',
      '-line two',
      '+line 2',
      ' line three',
    ].join('\n')

    expect(parseUnifiedDiffToHunks(diff)).toEqual([
      {
        oldStart: 1,
        oldLines: 3,
        newStart: 1,
        newLines: 3,
        header: '',
        lines: [
          { type: 'context', content: 'line one', oldLineNo: 1, newLineNo: 1 },
          { type: 'removed', content: 'line two', oldLineNo: 2, newLineNo: null },
          { type: 'added', content: 'line 2', oldLineNo: null, newLineNo: 2 },
          { type: 'context', content: 'line three', oldLineNo: 3, newLineNo: 3 },
        ],
      },
    ])
  })

  it('tracks old and new line numbers independently', () => {
    const diff = [
      '@@ -10,4 +20,5 @@',
      ' a',
      '+b',
      '+c',
      '-d',
      ' e',
      ' f',
    ].join('\n')

    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines.map((l) => [l.type, l.oldLineNo, l.newLineNo])).toEqual([
      ['context', 10, 20],
      ['added', null, 21],
      ['added', null, 22],
      ['removed', 11, null],
      ['context', 12, 23],
      ['context', 13, 24],
    ])
  })

  it('defaults line counts to 1 when omitted from the header', () => {
    const [hunk] = parseUnifiedDiffToHunks('@@ -5 +7 @@\n-old\n+new')
    expect(hunk).toMatchObject({ oldStart: 5, oldLines: 1, newStart: 7, newLines: 1 })
  })

  it('handles zero line counts (new or deleted file)', () => {
    const [added] = parseUnifiedDiffToHunks('@@ -0,0 +1,2 @@\n+a\n+b')
    expect(added).toMatchObject({ oldStart: 0, oldLines: 0, newStart: 1, newLines: 2 })
    expect(added.lines.map((l) => l.newLineNo)).toEqual([1, 2])

    const [removed] = parseUnifiedDiffToHunks('@@ -1,2 +0,0 @@\n-a\n-b')
    expect(removed).toMatchObject({ oldStart: 1, oldLines: 2, newStart: 0, newLines: 0 })
    expect(removed.lines.map((l) => l.oldLineNo)).toEqual([1, 2])
  })

  it('captures the section heading after the hunk range', () => {
    const [hunk] = parseUnifiedDiffToHunks('@@ -1,1 +1,1 @@ function foo() {\n x')
    expect(hunk.header).toBe(' function foo() {')
  })

  it('parses multiple hunks and resets line numbers for each', () => {
    const diff = [
      '@@ -1,2 +1,2 @@',
      '-a',
      '+A',
      ' b',
      '@@ -50,2 +50,3 @@',
      ' x',
      '+y',
      ' z',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)
    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toHaveLength(3)
    expect(hunks[1]).toMatchObject({ oldStart: 50, newStart: 50 })
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'x', oldLineNo: 50, newLineNo: 50 },
      { type: 'added', content: 'y', oldLineNo: null, newLineNo: 51 },
      { type: 'context', content: 'z', oldLineNo: 51, newLineNo: 52 },
    ])
  })

  it('skips "\\ No newline at end of file" markers', () => {
    const diff = '@@ -1 +1 @@\n-old\n\\ No newline at end of file\n+new\n\\ No newline at end of file'
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines).toEqual([
      { type: 'removed', content: 'old', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: 'new', oldLineNo: null, newLineNo: 1 },
    ])
  })

  it('ignores blank lines, including a trailing newline', () => {
    const [hunk] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@\n a\n\n b\n')
    expect(hunk.lines.map((l) => l.content)).toEqual(['a', 'b'])
    expect(hunk.lines[1]).toMatchObject({ oldLineNo: 2, newLineNo: 2 })
  })

  it('preserves the content after the prefix character verbatim', () => {
    const [hunk] = parseUnifiedDiffToHunks('@@ -1,2 +1,2 @@\n-  indented\n++plus\n ')
    expect(hunk.lines).toEqual([
      { type: 'removed', content: '  indented', oldLineNo: 1, newLineNo: null },
      { type: 'added', content: '+plus', oldLineNo: null, newLineNo: 1 },
      { type: 'context', content: '', oldLineNo: 2, newLineNo: 2 },
    ])
  })

  it('ignores lines before the first hunk header', () => {
    const diff = [
      'diff --git a/foo b/foo',
      'index 123..456 100644',
      '--- a/foo',
      '+++ b/foo',
      '@@ -1 +1 @@',
      ' x',
    ].join('\n')
    const [hunk] = parseUnifiedDiffToHunks(diff)
    expect(hunk.lines).toHaveLength(1)
  })

  it('does not treat file headers of a following file as hunk lines', () => {
    const diff = [
      'diff --git a/one b/one',
      '--- a/one',
      '+++ b/one',
      '@@ -1 +1 @@',
      '-a',
      '+b',
      'diff --git a/two b/two',
      '--- a/two',
      '+++ b/two',
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
