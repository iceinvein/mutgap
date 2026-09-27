# velocities

`velocities(completions, today)` measures two delivery rates from a list of
completions. Each completion is `{ fr, doneAt }`, where `doneAt` is a
`YYYY-MM-DD` date string or `null`; `today` is also a `YYYY-MM-DD` string. It
returns `{ asIs, active }`, each a rate `{ value, basis }`.

Only dated completions count. A completion whose `doneAt` is `null`, is not in
`YYYY-MM-DD` form, or does not name a real calendar day (such as `2026-02-31`
or `2026-08-32`) is ignored. If fewer than two dated completions remain, both
rates have `value: null` and the basis
`not enough dated completions to measure a rate; one point is not a rate`.
Two or more dated completions are enough to measure.

The era runs from the earliest dated completion to whichever is later, `today`
or the latest dated completion, and is counted inclusively, so an era starting
and ending on the same day is 1 day. `asIs.value` is the number of dated
completions divided by the era's length in days, with basis
`<n> dated completion(s) over <eraDays> calendar day(s) since <first date>, quiet days included`.
`active.value` is the number of dated completions divided by the number of
distinct dates among them, with basis
`<n> dated completion(s) over <activeDays> day(s) something completed`.
Several completions on the same date all count towards `n`.

For example, completions on `2026-01-01`, `2026-01-01` and `2026-01-03` with
`today` of `2026-01-05` give an era of 5 days: `asIs.value` is `0.6` and
`active.value` is `1.5`.
