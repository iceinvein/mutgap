# parseEnv

`parseEnv(text)` parses the contents of a `.env` file into an object mapping
each key to its string value.

The text is split into lines on `\n`, and each line is trimmed of surrounding
whitespace. Blank lines are skipped, as are lines whose first character (after
trimming) is `#`. A leading `export ` prefix is removed. A line with no `=` in
it is skipped.

The key is everything before the first `=`, trimmed. The value is everything
after the first `=`, trimmed, so a value may itself contain `=` characters. An
empty value is allowed and yields `""`.

If the value is at least two characters long and both starts and ends with a
double quote, or both starts and ends with a single quote, that one outer pair
of quotes is removed. No other unquoting, escape processing or inline-comment
stripping is done. When a key appears more than once, the last occurrence wins.
