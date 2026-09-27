# keyScaleAgreement

`keyScaleAgreement(candidate, key, scale)` checks whether a detected musical
key, given as free text such as `"A minor"` or `"Key: Db major"`, agrees with
a reference key given as a note name (`key`, such as `"C#"`) and a scale
(`scale`, such as `"minor"`). It returns `true` when they agree, `false` when
they disagree, and `undefined` when there is nothing to compare. A missing or
empty `candidate` returns `undefined`.

The candidate text and the reference (the key and scale joined with a space)
are each parsed the same way, case-insensitively, with `♭` read as `b`. The
note is the first letter from A to G, optionally followed by `#` or `b`, that
begins a word and is followed by whitespace or the end of the text. The mode is
minor if the whole word `minor` appears anywhere, otherwise major if the whole
word `major` appears, otherwise there is no mode. Text is unparseable if it has
no mode or no recognised note. Recognised notes are C, D, E, F, G, A and B, the
sharps C#, D#, F#, G#, A# and the flats Db, Eb, Gb, Ab, Bb; spellings such as
Cb, Fb, E# or B# are not recognised.

If either side is unparseable the result is `undefined`. Otherwise the result
is `true` exactly when both sides name the same pitch, counting enharmonic
spellings such as C# and Db as the same, and the same mode.
