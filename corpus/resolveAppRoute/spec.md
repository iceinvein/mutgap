# resolveAppRoute

`resolveAppRoute(location)` decides which screen the app opens from the parts
of the current URL. `location` has string fields `pathname`, `search` and
`hash`. It returns `{ mode: "shared-resume", slug }` when the URL points at a
shared resume, and `{ mode: "editor" }` otherwise. The hash is checked first,
then the path, then the `resume` query parameter; the first one that yields a
slug decides the result.

Every slug candidate is normalised: trimmed, lower-cased, a trailing `.mdx`
removed, each run of underscores or whitespace turned into `-`, every character
other than `a`-`z`, `0`-`9` and `-` dropped, repeated dashes collapsed to one,
and leading and trailing dashes removed. So `Jane_Doe.mdx` becomes `jane-doe`.

Hash: after trimming, removing one leading `#` and any leading or trailing
slashes, the hash is split on `/`, each segment is normalised and empty ones are
dropped. A single segment is the slug (`#alice` or `#/alice/`). With two or more
segments, the second is the slug if the first is `resume` (`#/resume/alice`);
otherwise the hash yields nothing. Path: the pathname is split on `/`, each
segment normalised and empty ones dropped. If the last segment is `resume` the
slug is `resume`; otherwise, if the second-to-last segment is `resume`, the slug
is the last segment (`/resume/alice` gives `alice`, `/app/resume/alice` too);
any other path, such as `/` or `/resume/alice/extra`, yields nothing.

Query: the `resume` parameter of `search` is read with `URLSearchParams`. If it
is absent or empty it yields nothing. Otherwise it is normalised; if the result
is empty or is `1`, `true` or `shared`, the slug is `resume`, and otherwise the
normalised value is the slug (`?resume=Bob` gives `bob`).
