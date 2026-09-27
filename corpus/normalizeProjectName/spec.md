# normalizeProjectName

`normalizeProjectName(project)` turns a raw project identifier, as recorded by
coding tools, into a short display name. It handles three shapes: absolute
paths starting with `/`, dash-encoded paths starting with `-` (a path with
every `/` replaced by `-`), and anything else, which is returned unchanged.

For an absolute path, the path is split on `/` and empty segments are dropped.
The marker directories `workspace`, `src`, `projects`, `repos` and `code` are
then tried in that order. For each marker, its last occurrence in the segments
is found; the marker counts only if it is present and is not the final
segment. The first marker that counts decides the result: the segments after
it are taken, and if there are at least two of them and the last two are
identical, just the last one is returned (`/home/me/code/api/api` gives
`api`); otherwise they are joined with `/` (`/home/me/code/acme/web` gives
`acme/web`). If no marker counts, including when the only marker is the final
segment, the last two segments are joined with `/` (`/opt/tools/bin` gives
`tools/bin`, `/home/me/projects` gives `me/projects`). If that is empty, as
for `/`, the input is returned as it is.

For a dash-encoded path, the string is split on `-` and empty pieces are
dropped; if nothing is left, the input is returned as it is. The same markers
are tried in the same order under the same rule. For the first marker that
counts, the pieces after it are taken; if there are exactly two and they are
identical, that one piece is returned, otherwise they are joined with `-`
(`-Users-me-projects-my-app` gives `my-app`). If no marker counts, then if
there are exactly two pieces and they are identical that piece is returned,
otherwise all pieces are joined with `-`, which drops the leading dash
(`-tmp-scratch` gives `tmp-scratch`).
