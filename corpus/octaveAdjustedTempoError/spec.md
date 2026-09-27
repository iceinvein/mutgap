# octaveAdjustedTempoError

`octaveAdjustedTempoError(candidate, baseline)` measures how far a detected
tempo (`candidate`, in BPM) is from a reference tempo (`baseline`, in BPM), as a
fraction of the baseline, while forgiving octave errors: a detector that
reports double or half the true tempo is not penalised for it.

The error is the smallest of three absolute differences, divided by
`baseline`: the candidate against the baseline, half the candidate against the
baseline, and double the candidate against the baseline. So a candidate of 130
against a baseline of 120 gives 10 / 120, and candidates of 60, 120 and 240
against a baseline of 120 all give 0.

Both inputs must be positive numbers. If either `candidate` or `baseline` is
zero, negative, or `NaN`, the result is `Infinity` (positive infinity).
