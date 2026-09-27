# safeFilename

`safeFilename(raw, extension)` builds a filesystem-safe filename from
user-provided text and a file extension.

The base name is derived from `raw` in this order: surrounding whitespace is
trimmed; the characters `\ / : * ? " < > |` are removed; each run of
whitespace becomes a single `-`; each run of `-` collapses to a single `-`;
and any run of `-` and `.` characters at the start or at the end is removed.
Letter case is left as it is, so `John Smith` becomes `John-Smith`. If the
base name is empty after this, `resume` is used instead.

The extension may be given with or without its leading dot: `pdf` and `.pdf`
both produce `.pdf`. An extension that already starts with `.` is used as it
is, and any other is prefixed with `.`. The result is the base name followed
by the extension.
