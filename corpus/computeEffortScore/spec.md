# computeEffortScore

`computeEffortScore(files)` rates the review effort of a pull request from 1
(trivial) to 5 (substantial). Each file is `{ path, additions, deletions }`;
only the number of files and the total changed lines count, where total lines
is the sum of every file's additions plus deletions. An empty list scores 1.

The score is the first tier whose file limit and line limit are both met, with
both limits inclusive:

- 1: at most 2 files and at most 50 lines
- 2: at most 5 files and at most 200 lines
- 3: at most 10 files and at most 500 lines
- 4: at most 20 files and at most 1000 lines
- 5: anything larger

Both limits must hold, so a single file with 300 changed lines scores 3, and
six files with one line each score 3.
