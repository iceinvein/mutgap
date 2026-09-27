# planShards

`planShards(chunks, budget, maxFiles)` packs the files of a diff into shards
for parallel review. Each chunk is `{ path, text, lines }`. It returns an array
of shards, each shard an array of chunks.

Files are grouped by directory so related files stay together. A file's group
is its directory path capped at two segments: a file with no `/` belongs to
group `.`; `a/x.ts` belongs to `a`; `a/b/x.ts` and `a/b/c/x.ts` both belong to
`a/b`. Groups are processed in the order each group first appears in the
input, and files within a group keep their input order, so files of the same
group that were far apart in the input end up next to each other.

Shards are filled in order. Before starting a group, if the current shard is
non-empty and adding the whole group would take it over `budget` total lines
or over `maxFiles` files, the current shard is closed and the group starts a
fresh one. Files are then added one at a time; before each file, if the current
shard is non-empty and adding that file would take it over `budget` lines or
over `maxFiles` files, the shard is closed first.

"Over" means strictly greater: a shard whose total is exactly `budget` lines,
or exactly `maxFiles` files, is allowed. A single file larger than `budget`
still gets a shard of its own; no file is ever dropped. No shard is ever empty,
and an empty input returns `[]`.
