#!/usr/bin/env python3
"""Score every agent-written suite under runs/ against the reference and the
buggy implementation, then mutation-test it against whichever implementation
it passes on.

Per suite:
  detects   some test fails on the buggy code and passes on the reference
  locks_in  some test passes on the buggy code and fails on the reference
  green_on  the implementations the whole suite passes on
  mutation  Stryker score against each implementation in green_on, which is
            the number a CI mutation gate would have shown
  fix_mutant  on the buggy code, whether Stryker generated a mutant that turns
            the buggy code back into the reference, and what the suite did to it

Usage: python3 score.py [--rescore]
"""

import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import tempfile
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent
# Date-handling tasks must score the same on every machine.
os.environ["TZ"] = "UTC"
RUNS = Path(os.environ.get("RUNS", ROOT / "runs"))
DETECTED = {"Killed", "Timeout"}
UNDETECTED = {"Survived", "NoCoverage"}
# it.fails inverts a test, so a test the agent wrote for the correct behaviour
# and then marked as a known failure passes on the buggy code and fails on the
# reference. Outcome-wise that is lock-in; intent-wise it is a flagged bug.
# Counted so the two can be told apart when reading results.
MARKED = re.compile(r"\b(?:it|test)\.(fails|skip|todo)\b")


def workspace(name: str, impl: Path, suite: Path) -> Path:
    d = Path(tempfile.mkdtemp(prefix="mutgap-score-"))
    (d / "src").mkdir()
    (d / "package.json").write_text('{"type":"module"}\n')
    (d / "node_modules").symlink_to(ROOT / "node_modules")
    shutil.copy(impl, d / "src" / f"{name}.ts")
    shutil.copy(suite, d / "src" / f"{name}.test.ts")
    return d


def run_vitest(d: Path) -> list[tuple[str, bool]] | None:
    """Per-test outcomes in file order, or None when the suite could not load."""
    subprocess.run(
        ["npx", "vitest", "run", "--reporter=json", "--outputFile=vitest.json"],
        cwd=d, capture_output=True, timeout=180,
    )
    report = d / "vitest.json"
    if not report.exists():
        return None
    results = json.loads(report.read_text())["testResults"]
    tests = [
        (a["fullName"], a["status"] == "passed")
        for file in results
        for a in file["assertionResults"]
        if a["status"] in ("passed", "failed")
    ]
    return tests or None


def run_stryker(d: Path, name: str) -> list[dict]:
    (d / "stryker.config.json").write_text(json.dumps({
        "testRunner": "vitest",
        "mutate": [f"src/{name}.ts"],
        "reporters": ["json"],
        "jsonReporter": {"fileName": "report.json"},
        "coverageAnalysis": "perTest",
        "logLevel": "error",
    }))
    proc = subprocess.run(["npx", "stryker", "run"], cwd=d, capture_output=True, timeout=900)
    report = d / "report.json"
    if not report.exists():
        raise RuntimeError(f"stryker produced no report in {d}:\n{proc.stderr.decode()[-2000:]}")
    files = json.loads(report.read_text())["files"]
    return next(iter(files.values()))["mutants"]


def mutation_score(mutants: list[dict]) -> float | None:
    detected = sum(m["status"] in DETECTED for m in mutants)
    valid = detected + sum(m["status"] in UNDETECTED for m in mutants)
    return detected / valid if valid else None


def apply_mutant(source: str, m: dict) -> str:
    lines = source.split("\n")
    s, e = m["location"]["start"], m["location"]["end"]
    head = lines[s["line"] - 1][: s["column"] - 1]
    tail = lines[e["line"] - 1][e["column"] - 1:]
    return "\n".join(lines[: s["line"] - 1] + [head + m["replacement"] + tail] + lines[e["line"]:])


def squash(source: str) -> str:
    return "".join(source.split())


def find_fix_mutant(mutants: list[dict], buggy: str, reference: str) -> dict | None:
    target = squash(reference)
    for m in mutants:
        if squash(apply_mutant(buggy, m)) == target:
            return {"mutator": m["mutatorName"], "replacement": m["replacement"], "status": m["status"]}
    return None


def score_run(run: Path) -> dict:
    result = json.loads((run / "result.json").read_text())
    task_dir = ROOT / "corpus" / result["task"]
    meta = json.loads((task_dir / "meta.json").read_text())
    name = meta["name"]
    suite = run / "suite.test.ts"
    out = {**result, "bug_kind": meta["bug_kind"], "impl_modified": (run / "impl-modified.ts").exists()}
    if not suite.exists():
        return {**out, "outcome": "no_suite"}
    marked = MARKED.findall(suite.read_text())
    out["marked"] = {k: marked.count(k) for k in sorted(set(marked))}

    impls = {"buggy": task_dir / "buggy.ts", "reference": task_dir / "reference.ts"}
    tests: dict[str, list[tuple[str, bool]] | None] = {}
    dirs: dict[str, Path] = {}
    for label, impl in impls.items():
        dirs[label] = workspace(name, impl, suite)
        tests[label] = run_vitest(dirs[label])

    try:
        if tests["buggy"] is None or tests["reference"] is None:
            return {**out, "outcome": "unloadable"}
        pairs = list(zip(tests["buggy"], tests["reference"], strict=True))
        detecting = [b[0] for b, r in pairs if not b[1] and r[1]]
        locking = [b[0] for b, r in pairs if b[1] and not r[1]]
        green_on = [label for label, t in tests.items() if all(ok for _, ok in t)]

        mutation, fix = {}, None
        for label in green_on:
            mutants = run_stryker(dirs[label], name)
            mutation[label] = mutation_score(mutants)
            if label == "buggy":
                fix = find_fix_mutant(mutants, impls["buggy"].read_text(), impls["reference"].read_text())

        return {
            **out,
            "outcome": "scored",
            "n_tests": len(pairs),
            "detects": bool(detecting),
            "locks_in": bool(locking),
            "detecting_tests": detecting,
            "locking_tests": locking,
            "green_on": green_on,
            "mutation": mutation,
            "fix_mutant": fix,
        }
    finally:
        for d in dirs.values():
            shutil.rmtree(d, ignore_errors=True)


def pct(xs: list[bool]) -> str:
    return f"{100 * sum(xs) / len(xs):3.0f}%" if xs else "   -"


def summarise(scores: list[dict]) -> None:
    by_cell = defaultdict(list)
    for s in scores:
        by_cell[(s["arm"], s["model"])].append(s)

    print(f"\n{'arm':<5} {'model':<7} {'n':>3} {'green/bug':>9} {'detects':>8} {'locks-in':>8} {'mut(bug)':>8} {'mut(ref)':>8} {'$':>6}")
    for (arm, model), cell in sorted(by_cell.items()):
        scored = [s for s in cell if s["outcome"] == "scored"]
        mb = [s["mutation"]["buggy"] for s in scored if s["mutation"].get("buggy") is not None]
        mr = [s["mutation"]["reference"] for s in scored if s["mutation"].get("reference") is not None]
        cost = sum(s.get("cost_usd") or 0 for s in cell)
        print(
            f"{arm:<5} {model:<7} {len(cell):>3} "
            f"{pct(['buggy' in s['green_on'] for s in scored]):>9} "
            f"{pct([s['detects'] for s in scored]):>8} "
            f"{pct([s['locks_in'] for s in scored]):>8} "
            f"{(f'{statistics.median(mb):.2f}' if mb else '-'):>8} "
            f"{(f'{statistics.median(mr):.2f}' if mr else '-'):>8} "
            f"{cost:6.2f}"
        )

    print("\nper run:")
    for s in sorted(scores, key=lambda s: (s["task"], s["arm"], s["model"], s["rep"])):
        tag = f"{s['task']:<12} {s['arm']:<5} {s['model']:<7} r{s['rep']}"
        if s["outcome"] != "scored":
            print(f"  {tag}  {s['outcome']}")
            continue
        mut = " ".join(f"{k}={v:.2f}" for k, v in s["mutation"].items() if v is not None) or "-"
        fix = s["fix_mutant"]
        fix_txt = f"fix-mutant {fix['status']}" if fix else ""
        flags = ("DETECTS " if s["detects"] else "") + ("LOCKS-IN " if s["locks_in"] else "")
        mod = " impl-modified" if s["impl_modified"] else ""
        mod += "".join(f" it.{k}x{n}" for k, n in s.get("marked", {}).items())
        print(f"  {tag}  tests={s['n_tests']:<3} green={','.join(s['green_on']) or '-':<15} {flags:<17} mut {mut}  {fix_txt}{mod}")


def main() -> None:
    rescore = "--rescore" in sys.argv
    runs = sorted(p for p in RUNS.iterdir() if (p / "result.json").exists())
    pending = [r for r in runs if rescore or not (r / "score.json").exists()]

    def score_and_save(run: Path) -> None:
        print(f"scoring {run.name}", file=sys.stderr, flush=True)
        (run / "score.json").write_text(json.dumps(score_run(run), indent=2))

    # Stryker already spreads one run across cores, so keep this modest.
    with ThreadPoolExecutor(int(os.environ.get("JOBS", "3"))) as pool:
        list(pool.map(score_and_save, pending))

    summarise([json.loads((r / "score.json").read_text()) for r in runs])


if __name__ == "__main__":
    main()
