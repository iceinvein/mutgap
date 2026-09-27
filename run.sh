#!/usr/bin/env bash
# One run = (task, arm, model, rep): a fresh headless agent session is asked to
# write a vitest suite for one function, and the suite it leaves behind is kept.
#
# Arms differ only in what the agent is shown:
#   code  the buggy implementation, no spec
#   both  the buggy implementation and the spec
#   spec  the spec and a stub that throws, no implementation
#
# The agent never sees the reference implementation or the oracle tests. Its
# working directory is created outside this repository so that looking around
# the filesystem cannot turn them up either.
#
# --setting-sources project keeps the user's own CLAUDE.md, hooks and plugins
# out of the session: those carry test-writing rules, which is the variable
# being measured. --bare would be stricter but refuses OAuth logins.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNS="${RUNS:-$ROOT/runs}"
TASKS="${TASKS:-$(ls "$ROOT/corpus")}"
ARMS="${ARMS:-code both spec}"
MODELS="${MODELS:-sonnet opus}"
REPS="${REPS:-1}"
BUDGET="${BUDGET:-1.00}"
JOBS="${JOBS:-4}"

mkdir -p "$RUNS"
# Same zone the scorer pins, so a date task means the same thing to the agent.
export TZ=UTC

prompt_for() { # arm name
  local run="\`npx vitest run\` runs them."
  local where="Use vitest and put them in \`src/$2.test.ts\`."
  case "$1" in
    code) echo "Write unit tests for \`$2\` in \`src/$2.ts\`. $where $run" ;;
    both) echo "Write unit tests for \`$2\` in \`src/$2.ts\`. Its intended behaviour is described in \`spec.md\`. $where $run" ;;
    spec) echo "\`src/$2.ts\` is a stub: \`$2\` is not implemented yet and currently throws. Its intended behaviour is described in \`spec.md\`. Write unit tests for it. $where $run" ;;
  esac
}

run_one() { # task arm model rep
  local task=$1 arm=$2 model=$3 rep=$4
  local name id out work given start elapsed
  name=$(jq -r .name "$ROOT/corpus/$task/meta.json")
  id="${task}__${arm}__${model}__r${rep}"
  out="$RUNS/$id"
  [ -s "$out/result.json" ] && { echo "skip  $id"; return; }
  mkdir -p "$out"

  work=$(mktemp -d)
  mkdir -p "$work/src"
  echo '{"type":"module"}' > "$work/package.json"
  ln -s "$ROOT/node_modules" "$work/node_modules"
  given="$ROOT/corpus/$task/buggy.ts"
  [ "$arm" = spec ] && given="$ROOT/corpus/$task/stub.ts"
  cp "$given" "$work/src/$name.ts"
  [ "$arm" != code ] && cp "$ROOT/corpus/$task/spec.md" "$work/spec.md"

  start=$(date +%s)
  ( cd "$work" && claude -p "$(prompt_for "$arm" "$name")" \
      --model "$model" \
      --setting-sources project \
      --output-format stream-json --verbose \
      --allowedTools Read Write Edit Glob Grep Bash \
      --permission-mode bypassPermissions \
      --max-budget-usd "$BUDGET" \
      --no-session-persistence \
  ) >"$out/transcript.jsonl" 2>"$out/stderr.txt" </dev/null
  # </dev/null: claude reads stdin and would otherwise swallow the job list.
  elapsed=$(( $(date +%s) - start ))

  tail -n 1 "$out/transcript.jsonl" | jq --argjson e "$elapsed" --arg a "$arm" \
    --arg t "$task" --arg m "$model" --argjson r "$rep" --arg v "$(claude --version)" \
    '{task: $t, arm: $a, model: $m, rep: $r, wall_s: $e, cli: $v,
      is_error, cost_usd: .total_cost_usd, turns: .num_turns}' >"$out/result.json" 2>/dev/null

  if [ -f "$work/src/$name.test.ts" ]; then
    cp "$work/src/$name.test.ts" "$out/suite.test.ts"
    printf 'ok    %-45s %4ss $%s\n' "$id" "$elapsed" "$(jq -r .cost_usd "$out/result.json")"
  else
    printf 'NO SUITE %-42s %4ss (see %s)\n' "$id" "$elapsed" "$out/stderr.txt"
  fi
  # Kept only when the agent also changed the file it was given, which the
  # scorer reports: the prompt asked for tests, not a fix or an implementation.
  if ! cmp -s "$given" "$work/src/$name.ts"; then
    cp "$work/src/$name.ts" "$out/impl-modified.ts"
  fi
  rm -rf "$work"
}

if [ "${1:-}" = --one ]; then
  shift
  run_one "$@"
  exit
fi

for task in $TASKS; do
  for model in $MODELS; do
    for arm in $ARMS; do
      for rep in $(seq 1 "$REPS"); do
        echo "$task $arm $model $rep"
      done
    done
  done
done | xargs -P "$JOBS" -L 1 bash "$ROOT/run.sh" --one

echo
echo "score with: python3 $ROOT/score.py"
