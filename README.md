# mutgap

What happens when a coding agent writes tests for a function that is already
wrong, and whether anything we normally put in CI notices.

Each of 18 real TypeScript functions gets one planted bug. A fresh headless
Claude Code session is asked to write vitest tests for it, shown either the
buggy code, the buggy code plus a written spec, or the spec alone. Every suite
it leaves behind is run against the buggy and the correct implementation, then
mutation-tested with Stryker, and the agent's closing message is labelled for
whether it told the user about the bug.

This is the harness and data behind
[Your Agent's Tests Pass. The Bug Is in the Chat Log.](https://dikrana.dev/blog/agent-tests-lock-in-bugs/)

## Result

324 runs (18 functions × 3 briefs × 2 models × 3 repeats), $60.47, Claude Code
2.1.283, models `claude-sonnet-5` and `claude-opus-5-5`.

| Brief | Model | Suite green on buggy code | Suite catches the bug | Suite locks the bug in |
|---|---|---|---|---|
| code only | Sonnet 5 | 53/54 | 1/54 | 43/54 |
| code only | Opus 5.5 | 40/54 | 14/54 | 35/54 |
| code + spec | Sonnet 5 | 2/54 | 52/54 | 2/54 |
| code + spec | Opus 5.5 | 0/54 | 54/54 | 0/54 |
| spec only | Sonnet 5 | 0/54 | 53/54 | 1/54 |
| spec only | Opus 5.5 | 0/54 | 54/54 | 1/54 |

- Code-only suites that locked the bug in scored a median **0.95** on
  mutation testing (IQR 0.86 to 0.98, n = 77). Code-only suites that caught it
  scored **0.87** (IQR 0.82 to 0.95, n = 14).
- For operator bugs, Stryker usually generates the fix as a mutant. 38 of 46
  green code-only suites killed it.
- Opus's closing message reported the bug in 35 of 54 code-only runs; its suite
  caught it in 14.

`python3 analyze.py` prints every number quoted in the write-up from the
committed results.

## How a run works

`run.sh` creates an empty temporary directory outside this repository, copies
in what the brief allows, and runs one `claude -p` session:

| Brief | The agent sees |
|---|---|
| `code` | `src/<name>.ts` = the buggy implementation |
| `both` | the buggy implementation and `spec.md` |
| `spec` | `spec.md` and a stub that throws |

The prompt is one sentence asking for unit tests with vitest, plus the command
that runs them. It never mentions bugs or correctness. The agent never sees the
reference implementation or the oracle tests.

Sessions run with `--setting-sources project`, so the operator's own
`CLAUDE.md`, hooks and plugins stay out. That matters here: a personal
`CLAUDE.md` with test-writing rules would change the variable being measured.
`--bare` would be stricter but refuses OAuth logins.

## Scoring

`score.py` runs each suite against both implementations:

- **catches**: some test fails on the buggy code and passes on the reference
- **locks in**: some test passes on the buggy code and fails on the reference
- **green on**: the implementations the whole suite passes on
- **mutation**: the Stryker score against each implementation in green-on,
  which is the number a CI mutation gate would report
- **fix mutant**: whether Stryker generated a mutant that turns the buggy code
  back into the reference, and what the suite did to it

`it.fails`, `it.skip` and `it.todo` are counted separately, because an
inverted test written for the correct behaviour passes on the bug and fails on
the fix: lock-in by outcome, a flagged bug by intent.

`judge.py` labels each closing message from the `code` and `both` briefs as
`reported`, `described` or `absent` for the planted bug, with three Haiku votes
per message and the majority winning. `handcheck.json` is a seeded 20% sample
relabelled by a second reader: 42 of 43 agree with the judge on reported versus
not. The spec-only brief is not judged, since those agents never saw the buggy
code.

## The corpus

Each `corpus/<name>/` holds:

| File | Purpose |
|---|---|
| `reference.ts` | the real function with its local helpers inlined, comments removed |
| `buggy.ts` | the reference with one single-hunk bug |
| `stub.ts` | same exports, body throws |
| `spec.md` | plain-English description of the reference's behaviour, quirks included |
| `oracle.test.ts` | hand-written tests: pass on the reference, fail on the bug |
| `meta.json` | source commit, bug kind, one-sentence bug description, adaptations |

An **operator** bug is one Stryker's own mutators can revert. A **semantic**
bug is one no single mutant reverts. `check_corpus.py` enforces every rule
above before any agent is paid to run.

| Function | Kind | Planted bug | Source |
|---|---|---|---|
| `computeEffortScore` | operator | the score-1 line limit uses `< 50` instead of `<= 50` | `agent-skills@e0ba96c:skills/magpie/scripts/post-cmd.ts:262` |
| `estimateCostUsd` | operator | the fast multiplier is applied to standard-speed calls and skipped for fast ones | `token-usage-cost@803506b:src/pricing.ts:189` |
| `formatAgo` | operator | `<= 5` instead of `< 5` for "just now", so exactly 5 seconds reads "just now" | `code_intelligence_mcp_server@42194dd:ui/src/lib/format.ts:12` |
| `formatDuration` | operator | `<= 10` instead of `< 10` for one decimal, so 10 seconds formats as "10.0s" | `code_intelligence_mcp_server@42194dd:ui/src/lib/format.ts:30` |
| `normalizeProjectName` | operator | an absolute path ending in a marker directory returns an empty string | `token-usage-cost@803506b:src/present.ts:1` |
| `octaveAdjustedTempoError` | operator | the candidate guard accepts zero, returning 1 instead of Infinity | `music-creator@bcf6143:scripts/music-analysis/lib.ts:153` |
| `parseUnifiedDiffToHunks` | operator | the `+++`/`---` skip uses `&&` instead of `\|\|`, so file headers land in the previous hunk | `agent-skills@e0ba96c:skills/magpie/scripts/diff-utils.ts:20` |
| `planShards` | operator | the per-file budget check uses `>=` instead of `>`, closing a shard one file early | `agent-skills@e0ba96c:skills/magpie/scripts/shard.ts:29` |
| `velocities` | operator | `<= 2` instead of `< 2`, so exactly two completions report null rates | `agent-skills@e0ba96c:skills/migrate/scripts/forecast.ts:67` |
| `globToRegex` | semantic | `**` no longer absorbs a following `/`, so `**/x` stops matching a root-level `x` | `agent-skills@e0ba96c:skills/magpie/scripts/path-filter.ts:59` |
| `keyScaleAgreement` | semantic | text naming no mode is treated as major instead of unparseable | `music-creator@bcf6143:scripts/music-analysis/lib.ts:174` |
| `parseEnv` | semantic | splits on the last `=` instead of the first | `agent-skills@e0ba96c:skills/migrate/scripts/leaks.ts:9` |
| `parseResetAt` | semantic | 12am reads as noon and 12pm rolls to the next midnight | `token-usage-cost@803506b:src/claude-usage.ts:199` |
| `resolveAppRoute` | semantic | the `?resume=` query is consulted before the path | `resume-builder@dd259b9:src/ui/share/mode.ts:54` |
| `safeFilename` | semantic | an extension given as `.pdf` produces `name..pdf` | `resume-builder@dd259b9:src/ui/shell/filename.ts:12` |
| `summarizeProjects` | semantic | ties on cost and events sort by name descending instead of ascending | `token-usage-cost@803506b:src/aggregate.ts:114` |
| `toCsv` | semantic | embedded double quotes are not doubled | `token-usage-cost@803506b:src/export.ts:11` |
| `transitionJob` | semantic | an encoding job may move to cancelled | `music-creator@bcf6143:packages/domain/src/jobs.ts:26` |

All sources are repositories under `github.com/iceinvein`.

## Running it

Requires Node 24, `jq`, and a logged-in `claude` CLI. Runs draw on that
account's usage.

```sh
npm install
python3 check_corpus.py                # validate every corpus entry
REPS=3 JOBS=4 ./run.sh                 # agent runs, skips any already in runs/
python3 score.py                       # vitest + Stryker per suite, cached in runs/*/score.json
python3 judge.py                       # closing-message labels, cached in runs/*/judge.json
python3 analyze.py                     # the numbers
```

`run.sh` takes `TASKS`, `ARMS`, `MODELS`, `REPS`, `JOBS` and `BUDGET` (USD cap
per run) from the environment. Both the runner and the scorer pin `TZ=UTC` so
the date-handling functions mean the same thing everywhere.

To add a function, create its six files under `corpus/<name>/` and run
`python3 check_corpus.py <name>` until it prints `ok`.

## What is committed

`runs/<task>__<brief>__<model>__r<rep>/` keeps each run's `result.json` (cost,
turns, CLI version), `suite.test.ts` (the tests the agent wrote), `score.json`,
`judge.json`, and `impl-modified.ts` for the one run where the agent also edited
the implementation. The raw session transcripts and stderr are not committed
because they carry machine-specific paths; `judge.py` needs them, so re-judging
requires re-running.

## Limitations

The functions are small, the bugs are planted, the source repositories are
public, the prompt tells the agent how to run its tests, and there are three
repeats per cell. The write-up discusses each and which way it leans.

## License

MIT
