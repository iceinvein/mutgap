# toCsv

`toCsv(rows)` serialises an array of flat objects (values are strings or
numbers) to CSV text.

An empty array returns the empty string. Otherwise the header line is the keys
of the first row, in that row's key order, joined with commas. Header names are
written as they are, without quoting.

Each row then produces one line: its values for the header keys, in header
order, joined with commas. A key missing from a row produces an empty field;
keys a later row has that the first row lacks are ignored. Numbers are written
with `String()`.

A field that contains a comma, a double quote or a newline is wrapped in double
quotes, and every double quote inside it is escaped by doubling it (so
`say "hi"` becomes `"say ""hi"""`), following RFC 4180. Other fields are
written unchanged.

Lines are joined with `\n`, and the output ends with a trailing `\n`.
