import { expect, test } from 'vitest'
import { parseUnifiedDiffToHunks } from './parseUnifiedDiffToHunks'

test('the next file header lines do not join the previous hunk', () => {
  const diff = [
    'diff --git a/a.ts b/a.ts',
    '--- a/a.ts',
    '+++ b/a.ts',
    '@@ -1,1 +1,1 @@',
    '-old',
    '+new',
    'diff --git a/b.ts b/b.ts',
    '--- a/b.ts',
    '+++ b/b.ts',
    '@@ -5 +5,2 @@ fn',
    ' keep',
    '+added',
  ].join('\n')
  const hunks = parseUnifiedDiffToHunks(diff)
  expect(hunks).toHaveLength(2)
  expect(hunks[0]?.lines).toEqual([
    { type: 'removed', content: 'old', oldLineNo: 1, newLineNo: null },
    { type: 'added', content: 'new', oldLineNo: null, newLineNo: 1 },
  ])
})

test('header fields default an omitted count to 1 and keep the trailing text', () => {
  const [h] = parseUnifiedDiffToHunks('@@ -5 +7,3 @@ function f() {\n x')
  expect(h).toMatchObject({ oldStart: 5, oldLines: 1, newStart: 7, newLines: 3, header: ' function f() {' })
})

test('line numbers advance per side through a mixed hunk', () => {
  const diff = '@@ -10,3 +20,3 @@\n a\n-b\n+c\n+d\n e\n\\ No newline at end of file'
  expect(parseUnifiedDiffToHunks(diff)[0]?.lines).toEqual([
    { type: 'context', content: 'a', oldLineNo: 10, newLineNo: 20 },
    { type: 'removed', content: 'b', oldLineNo: 11, newLineNo: null },
    { type: 'added', content: 'c', oldLineNo: null, newLineNo: 21 },
    { type: 'added', content: 'd', oldLineNo: null, newLineNo: 22 },
    { type: 'context', content: 'e', oldLineNo: 12, newLineNo: 23 },
  ])
})

test('a removed line whose text begins with -- is skipped', () => {
  const lines = parseUnifiedDiffToHunks('@@ -1,2 +1,1 @@\n--- note\n-x')[0]?.lines
  expect(lines).toEqual([{ type: 'removed', content: 'x', oldLineNo: 1, newLineNo: null }])
})

test('empty input returns no hunks', () => {
  expect(parseUnifiedDiffToHunks('')).toEqual([])
})
