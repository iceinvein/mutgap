# formatDuration

`formatDuration(ms)` formats a duration given in milliseconds as a short
human-readable string. `null` or `undefined` returns the en dash `"–"`.

Durations under 1000 ms are written as the number followed by `ms`, exactly as
`String()` would print it: `0` gives `"0ms"`, `999` gives `"999ms"`.

From 1000 ms on, the duration is converted to seconds. Under 10 seconds it is
written with one decimal place (standard rounding), as in `"1.0s"`, `"1.5s"` or
`"9.9s"`. From 10 seconds up to under 60 seconds it is rounded to whole seconds
(halves round up): `10000` gives `"10s"`, `42400` gives `"42s"`. The choice of
format is made on the unrounded value, so 59600 ms is still under a minute and
formats as `"60s"`, and 9960 ms formats as `"10.0s"`.

From 60 seconds on, it is written as whole minutes (rounded down), a space, and
the remaining seconds rounded to a whole number: `60000` gives `"1m 0s"`,
`125000` gives `"2m 5s"`. The remainder is rounded after the minutes are taken,
so 119600 ms formats as `"1m 60s"`.
