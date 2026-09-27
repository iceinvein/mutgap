# parseUnifiedDiffToHunks

`parseUnifiedDiffToHunks(diff)` parses unified diff text (one file or several,
as `git diff` prints it) into a flat array of hunks, in input order. An empty
string returns `[]`. The text is split into lines on `\n`.

A hunk starts at a header line of the form `@@ -A,B +C,D @@rest`. The hunk
records `oldStart` A, `oldLines` B, `newStart` C, `newLines` D, and `header`,
which is everything after the closing `@@` exactly as written (usually a
leading space and a function name, or `""`). When a count is omitted, as in
`@@ -3 +4 @@`, it is 1. The declared counts are only recorded; they are not
used to decide where the hunk ends. Every line up to the next hunk header
belongs to the current hunk, and lines before the first hunk header are
ignored.

Inside a hunk, a line starting with `+` is an added line, `-` a removed line,
and a space a context line; `content` is the line without that first
character. Some lines are skipped entirely: empty lines, lines starting with
`\` (such as `\ No newline at end of file`), and lines starting with `+++` or
`---`, so the file headers of the next file in a multi-file diff never join
the previous hunk (and neither does a removed line whose text itself begins
with `--`). Any other line, such as `diff --git ...` or `index ...`, is also
ignored.

Each hunk numbers its lines from its own header, independently of earlier
hunks: an old-side counter starts at `oldStart` and a new-side counter at
`newStart`. A context line gets both current numbers and advances both. A
removed line gets the old number (`newLineNo: null`) and advances only the old
counter. An added line gets the new number (`oldLineNo: null`) and advances
only the new counter. Skipped lines do not advance either counter.
