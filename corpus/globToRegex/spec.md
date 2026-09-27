# globToRegex

`globToRegex(pattern)` converts a path glob into a `RegExp` that must match a
whole path, anchored at both ends. Paths use `/` as the separator.

A single `*` matches any run of characters that contains no `/`, including an
empty run. `?` matches exactly one character that is not `/`. `**` matches any
run of characters at all, including `/` and including nothing. When `**` is
immediately followed by `/`, that `/` is consumed as part of the `**`, so
`**/yarn.lock` matches both `yarn.lock` at the root and `a/b/yarn.lock`, and
`a/**/b` matches `a/b` as well as `a/x/y/b`.

Every other character matches itself literally, including regex
metacharacters such as `.`, `+`, `(`, `)`, `[`, `]`, `{`, `}`, `|`, `^`, `$`
and `\`. There is no support for brace alternation, character classes or
negation: `{a,b}` matches only the literal text `{a,b}`. Matching is
case-sensitive.
