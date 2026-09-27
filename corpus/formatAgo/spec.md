# formatAgo

`formatAgo(unixS, nowS?)` describes how long ago a Unix timestamp (in seconds)
was, as a short human-readable string. `nowS` is the current time in Unix
seconds; when it is omitted (`null` or `undefined`), the current time is read
from the clock and rounded down to a whole second. A `unixS` of `null` or
`undefined` returns the en dash `"–"`.

The elapsed time is `nowS - unixS` seconds, and a timestamp in the future counts
as zero seconds elapsed. Fewer than 5 seconds returns `"just now"`; from 5 up to
59 seconds returns the seconds, as in `"5s ago"` or `"59s ago"`.

From 60 seconds on, the elapsed time is expressed in whole minutes, rounded
down: `"1m ago"` up to `"59m ago"`. From 60 minutes on it is whole hours,
rounded down, `"1h ago"` up to `"23h ago"`, and from 24 hours on it is whole
days, rounded down, such as `"1d ago"` or `"12d ago"`, with no upper unit.
