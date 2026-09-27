import { describe, expect, it } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

describe('parseUnifiedDiffToHunks', () => {
  it('returns an empty array for an empty string', () => {
    expect(parseUnifiedDiffToHunks('')).toEqual([])
  })

  it('ignores everything before the first hunk header', () => {
    const diff = [
      'diff --git a/foo.txt b/foo.txt',
      'index 1234567..89abcde 100644',
      '--- a/foo.txt',
      '+++ b/foo.txt',
      '@@ -1,1 +1,1 @@',
      ' unchanged',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(1)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'unchanged', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('parses the header counts, start lines, and trailing header text', () => {
    const diff = '@@ -1,2 +3,4 @@ someFunction()\n context'

    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.oldStart).toBe(1)
    expect(hunk.oldLines).toBe(2)
    expect(hunk.newStart).toBe(3)
    expect(hunk.newLines).toBe(4)
    expect(hunk.header).toBe(' someFunction()')
  })

  it('captures an empty header when there is nothing after the closing @@', () => {
    const diff = '@@ -1,2 +3,4 @@\n context'

    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.header).toBe('')
  })

  it('defaults omitted counts to 1', () => {
    const diff = '@@ -3 +4 @@\n context'

    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.oldStart).toBe(3)
    expect(hunk.oldLines).toBe(1)
    expect(hunk.newStart).toBe(4)
    expect(hunk.newLines).toBe(1)
  })

  it('does not use the declared counts to bound the hunk', () => {
    // Declared as a single line each side, but three lines follow.
    const diff = '@@ -1,1 +1,1 @@\n context1\n context2\n context3'

    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.lines).toHaveLength(3)
  })

  it('classifies context, added, and removed lines and strips the marker', () => {
    const diff = '@@ -1,1 +1,3 @@\n unchanged\n+added\n-removed'

    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.lines).toEqual([
      { type: 'context', content: 'unchanged', oldLineNo: 1, newLineNo: 1 },
      { type: 'added', content: 'added', oldLineNo: null, newLineNo: 2 },
      { type: 'removed', content: 'removed', oldLineNo: 2, newLineNo: null },
    ])
  })

  it('numbers each hunk independently from its own header', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      ' first',
      '@@ -100,1 +200,1 @@',
      ' second',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'first', oldLineNo: 1, newLineNo: 1 },
    ])
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'second', oldLineNo: 100, newLineNo: 200 },
    ])
  })

  it('advances the old counter only for removed lines, leaving newLineNo null', () => {
    const diff = '@@ -5,3 +5,1 @@\n context\n-removed1\n-removed2'

    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 5, newLineNo: 5 },
      { type: 'removed', content: 'removed1', oldLineNo: 6, newLineNo: null },
      { type: 'removed', content: 'removed2', oldLineNo: 7, newLineNo: null },
    ])
  })

  it('advances the new counter only for added lines, leaving oldLineNo null', () => {
    const diff = '@@ -5,1 +5,3 @@\n context\n+added1\n+added2'

    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 5, newLineNo: 5 },
      { type: 'added', content: 'added1', oldLineNo: null, newLineNo: 6 },
      { type: 'added', content: 'added2', oldLineNo: null, newLineNo: 7 },
    ])
  })

  it('skips empty lines without advancing either counter or recording them', () => {
    const diff = '@@ -1,1 +1,1 @@\n\n context'

    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('skips "\\ No newline at end of file" style lines', () => {
    const diff = '@@ -1,1 +1,1 @@\n context\n\\ No newline at end of file'

    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('skips file header lines starting with --- or +++ inside a hunk, ending it', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      ' context1',
      '--- a/next.txt',
      '+++ b/next.txt',
      '@@ -1,1 +1,1 @@',
      ' context2',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'context1', oldLineNo: 1, newLineNo: 1 },
    ])
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'context2', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('skips a removed line whose content begins with "--" instead of treating it as a removed line', () => {
    const diff = '@@ -1,2 +1,1 @@\n context\n---not-a-file-header'

    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('skips an added line whose content begins with "++" instead of treating it as an added line', () => {
    const diff = '@@ -1,1 +1,2 @@\n context\n+++not-a-file-header'

    const [hunk] = parseUnifiedDiffToHunks(diff)

    expect(hunk.lines).toEqual([
      { type: 'context', content: 'context', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('ignores other unrecognized lines, such as "diff --git" or "index", between hunk content', () => {
    const diff = [
      '@@ -1,1 +1,1 @@',
      ' context1',
      'diff --git a/next.txt b/next.txt',
      'index 1111111..2222222 100644',
      '@@ -1,1 +1,1 @@',
      ' context2',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(2)
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'context1', oldLineNo: 1, newLineNo: 1 },
    ])
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'context2', oldLineNo: 1, newLineNo: 1 },
    ])
  })

  it('parses a realistic multi-file, multi-hunk diff end to end', () => {
    const diff = [
      'diff --git a/a.txt b/a.txt',
      'index e69de29..4b825dc 100644',
      '--- a/a.txt',
      '+++ b/a.txt',
      '@@ -1,3 +1,3 @@',
      ' one',
      '-two',
      '+TWO',
      ' three',
      'diff --git a/b.txt b/b.txt',
      'index 1234567..89abcde 100644',
      '--- a/b.txt',
      '+++ b/b.txt',
      '@@ -10,2 +10,3 @@ funcName',
      ' ten',
      '+eleven',
      ' twelve',
    ].join('\n')

    const hunks = parseUnifiedDiffToHunks(diff)

    expect(hunks).toHaveLength(2)

    expect(hunks[0]).toMatchObject({
      oldStart: 1,
      oldLines: 3,
      newStart: 1,
      newLines: 3,
      header: '',
    })
    expect(hunks[0].lines).toEqual([
      { type: 'context', content: 'one', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'two', oldLineNo: 2, newLineNo: null },
      { type: 'added', content: 'TWO', oldLineNo: null, newLineNo: 2 },
      { type: 'context', content: 'three', oldLineNo: 3, newLineNo: 3 },
    ])

    expect(hunks[1]).toMatchObject({
      oldStart: 10,
      oldLines: 2,
      newStart: 10,
      newLines: 3,
      header: ' funcName',
    })
    expect(hunks[1].lines).toEqual([
      { type: 'context', content: 'ten', oldLineNo: 10, newLineNo: 10 },
      { type: 'added', content: 'eleven', oldLineNo: null, newLineNo: 11 },
      { type: 'context', content: 'twelve', oldLineNo: 11, newLineNo: 12 },
    ])
  })
})
