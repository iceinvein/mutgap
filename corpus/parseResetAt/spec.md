# parseResetAt

`parseResetAt(resetText, fetchedAt)` turns the reset text shown by Claude's
usage screen (such as `Resets 3pm (Europe/London)` or `Resets in 2h30m`) into a
local timestamp string `YYYY-MM-DDTHH:MM:SS` with no zone suffix. `fetchedAt`
is the ISO timestamp at which the text was read. All dates and times are
interpreted and printed in the local time zone. It returns `undefined` when
`resetText` is `undefined` or empty, or when the text matches none of the
forms below.

The text is first cleaned: a leading `Resets` followed by whitespace is
removed (case-insensitive), a trailing parenthesised group such as
`(Europe/London)` is removed, and the result is trimmed.

A duration, optionally preceded by `in `, is added to `fetchedAt`, keeping its
seconds. Two duration spellings are accepted, case-insensitive: compact, with
no spaces, as hours then minutes (`2h`, `45m`, `2h30m`); and verbose, with
units `hr`, `hour` or `hours` and `min`, `minute` or `minutes`, spaces
optional (`3 hours`, `1 hr 5 min`). A mixed form like `2h 30m` is not a
duration.

A month and day followed by `at` and a time (`Mar 12 at 9:30am`,
`Mar 12 at 3pm`, `Mar 12 at 15:00`) is that date in the year of `fetchedAt`,
with no rollover into the next year, seconds zero. A bare 12-hour time
(`3pm`, `9:30am`, `9:30 am`; all whitespace is ignored) is placed on the local
date of `fetchedAt` with seconds zero; 12am is midnight and 12pm is noon. If
that moment is more than 15 minutes before `fetchedAt`, it moves to the same
time on the next day; a time up to 15 minutes in the past stays on the same
day.
