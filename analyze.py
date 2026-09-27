#!/usr/bin/env python3
"""Every number the write-up quotes, from runs/*/score.json and judge.json.

Usage: python3 analyze.py
"""

import json
import statistics
from collections import Counter, defaultdict
from pathlib import Path

import score


def load() -> list[dict]:
    rows = []
    for run in sorted(score.RUNS.iterdir()):
        if not (run / "score.json").exists():
            continue
        s = json.loads((run / "score.json").read_text())
        j = run / "judge.json"
        s["report"] = json.loads(j.read_text())["label"] if j.exists() else None
        rows.append(s)
    return rows


def pct(n: int, d: int) -> str:
    return f"{n}/{d} ({100 * n / d:.0f}%)" if d else "0/0"


def med(xs: list[float]) -> str:
    if not xs:
        return "-"
    q = statistics.quantiles(xs, n=4) if len(xs) > 1 else [xs[0]] * 3
    return f"{statistics.median(xs):.2f} [IQR {q[0]:.2f}-{q[2]:.2f}] n={len(xs)}"


def section(title: str) -> None:
    print(f"\n## {title}")


def main() -> None:
    rows = [r for r in load() if r["outcome"] == "scored"]
    code = [r for r in rows if r["arm"] == "code"]

    section("Outcome by arm and model")
    for arm in ("code", "both", "spec"):
        for model in ("sonnet", "opus"):
            cell = [r for r in rows if r["arm"] == arm and r["model"] == model]
            green = sum("buggy" in r["green_on"] for r in cell)
            print(f"{arm:<5} {model:<7} green-on-buggy {pct(green, len(cell)):<14} "
                  f"detects {pct(sum(r['detects'] for r in cell), len(cell)):<14} "
                  f"locks-in {pct(sum(r['locks_in'] for r in cell), len(cell))}")

    section("Code arm: does mutation score separate suites that lock the bug in from suites that catch it?")
    for model in ("sonnet", "opus", None):
        cell = [r for r in code if model in (None, r["model"])]
        locked = [r["mutation"]["buggy"] for r in cell
                  if r["locks_in"] and not r["detects"] and r["mutation"].get("buggy") is not None]
        caught = [r["mutation"]["reference"] for r in cell
                  if r["detects"] and r["mutation"].get("reference") is not None]
        print(f"{model or 'all':<7} lock-in suites, score on buggy:  {med(locked)}")
        print(f"{'':<7} catching suites, score on ref:   {med(caught)}")

    section("Code arm: lock-in suites with a perfect or near-perfect mutation score")
    locked = [r for r in code if r["locks_in"] and r["mutation"].get("buggy") is not None]
    for cut in (1.0, 0.9, 0.8):
        n = sum(r["mutation"]["buggy"] >= cut for r in locked)
        print(f"score >= {cut:.1f}: {pct(n, len(locked))}")

    section("Operator bugs: what green-on-buggy suites did to the mutant that is the fix")
    fixes = Counter()
    for r in rows:
        if r["bug_kind"] == "operator" and "buggy" in r["green_on"]:
            fixes[(r["arm"], (r["fix_mutant"] or {}).get("status", "not generated"))] += 1
    for (arm, status), n in sorted(fixes.items()):
        print(f"{arm:<5} fix mutant {status:<14} {n}")

    section("Code arm by bug kind")
    for kind in ("operator", "semantic"):
        cell = [r for r in code if r["bug_kind"] == kind]
        print(f"{kind:<9} detects {pct(sum(r['detects'] for r in cell), len(cell)):<14} "
              f"locks-in {pct(sum(r['locks_in'] for r in cell), len(cell))}")

    section("Code arm by task (detects / runs, both models)")
    by_task = defaultdict(list)
    for r in code:
        by_task[r["task"]].append(r)
    for task, cell in sorted(by_task.items()):
        s = [r for r in cell if r["model"] == "sonnet"]
        o = [r for r in cell if r["model"] == "opus"]
        print(f"{task:<26} {cell[0]['bug_kind']:<9} sonnet {sum(r['detects'] for r in s)}/{len(s)}  "
              f"opus {sum(r['detects'] for r in o)}/{len(o)}")

    section("Code arm: the suite versus the final message")
    for model in ("sonnet", "opus"):
        cell = [r for r in code if r["model"] == model and r["report"]]
        grid = Counter((r["detects"], r["report"]) for r in cell)
        print(f"{model}:")
        for detects in (True, False):
            parts = "  ".join(f"{lab} {grid[(detects, lab)]}" for lab in ("reported", "described", "absent", "split"))
            print(f"  suite {'catches bug' if detects else 'misses bug '}: {parts}")
    green_reported = [r for r in code if "buggy" in r["green_on"] and r["report"] == "reported"]
    green = [r for r in code if "buggy" in r["green_on"] and r["report"]]
    print(f"green-on-buggy suites whose message reported the bug anyway: {pct(len(green_reported), len(green))}")

    section("Marked tests (it.fails / skip / todo), code and both arms")
    marked = Counter()
    for r in rows:
        for k, n in (r.get("marked") or {}).items():
            marked[(r["arm"], r["model"], k)] += 1
    for key, n in sorted(marked.items()):
        print(" ".join(key), n)

    section("Runs where the agent changed the file it was given")
    for r in rows:
        if r["impl_modified"]:
            print(r["task"], r["arm"], r["model"], f"r{r['rep']}")

    section("Cost")
    print(f"agent runs: ${sum(r.get('cost_usd') or 0 for r in rows):.2f} over {len(rows)} runs")


if __name__ == "__main__":
    main()
