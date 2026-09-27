#!/usr/bin/env python3
"""Validate corpus entries before any agent is paid to write tests for them.

A task passes when:
  - it has every file the runner and scorer read
  - the oracle passes on the reference and fails on the buggy implementation,
    so the planted bug is observable and the spec's behaviour is pinned
  - the stub loads and exports the function
  - bug_kind matches Stryker: an "operator" bug must have a mutant that turns
    the buggy code back into the reference, a "semantic" bug must not
  - buggy.ts differs from reference.ts in exactly one hunk

Usage: python3 check_corpus.py [task ...]   (default: every task)
"""

import difflib
import json
import shutil
import sys
import tempfile
from pathlib import Path

import score

ROOT = Path(__file__).resolve().parent
FILES = ["reference.ts", "buggy.ts", "stub.ts", "spec.md", "meta.json", "oracle.test.ts"]
META_KEYS = {"name", "source", "bug_kind", "bug"}


def oracle_outcome(name: str, impl: Path, oracle: Path) -> list[tuple[str, bool]] | None:
    d = score.workspace(name, impl, oracle)
    try:
        return score.run_vitest(d)
    finally:
        shutil.rmtree(d, ignore_errors=True)


def hunks(a: str, b: str) -> int:
    ops = difflib.SequenceMatcher(None, a.splitlines(), b.splitlines()).get_opcodes()
    return sum(tag != "equal" for tag, *_ in ops)


def check(task: str) -> list[str]:
    t = ROOT / "corpus" / task
    missing = [f for f in FILES if not (t / f).exists()]
    if missing:
        return [f"missing {', '.join(missing)}"]

    meta = json.loads((t / "meta.json").read_text())
    problems = []
    if not META_KEYS <= meta.keys():
        problems.append(f"meta.json lacks {sorted(META_KEYS - meta.keys())}")
    if meta.get("bug_kind") not in ("operator", "semantic"):
        problems.append(f"bug_kind is {meta.get('bug_kind')!r}")
    name = meta["name"]

    ref, bug = (t / "reference.ts").read_text(), (t / "buggy.ts").read_text()
    if hunks(ref, bug) != 1:
        problems.append(f"buggy.ts differs from reference.ts in {hunks(ref, bug)} hunks, expected 1")

    on_ref = oracle_outcome(name, t / "reference.ts", t / "oracle.test.ts")
    on_bug = oracle_outcome(name, t / "buggy.ts", t / "oracle.test.ts")
    if on_ref is None or not all(ok for _, ok in on_ref):
        problems.append(f"oracle does not pass on reference: {on_ref}")
    if on_bug is None or all(ok for _, ok in on_bug):
        problems.append("oracle does not fail on buggy")

    smoke = Path(tempfile.mkdtemp()) / "smoke.test.ts"
    smoke.write_text(
        f"import {{ expect, test }} from 'vitest'\nimport * as m from './{name}'\n"
        f"test('loads', () => {{ expect(typeof m.{name}).toBe('function') }})\n"
    )
    if not all(ok for _, ok in (oracle_outcome(name, t / "stub.ts", smoke) or [("", False)])):
        problems.append("stub does not load or does not export the function")

    d = score.workspace(name, t / "buggy.ts", smoke)
    try:
        fix = score.find_fix_mutant(score.run_stryker(d, name), bug, ref)
    finally:
        shutil.rmtree(d, ignore_errors=True)
        shutil.rmtree(smoke.parent, ignore_errors=True)
    if meta.get("bug_kind") == "operator" and not fix:
        problems.append("bug_kind is operator but Stryker generates no mutant that reverts it")
    if meta.get("bug_kind") == "semantic" and fix:
        problems.append(f"bug_kind is semantic but Stryker reverts it with {fix['mutator']}")
    return problems


def main() -> None:
    tasks = sys.argv[1:] or sorted(p.name for p in (ROOT / "corpus").iterdir() if p.is_dir())
    failed = False
    for task in tasks:
        problems = check(task)
        failed |= bool(problems)
        print(f"{'FAIL' if problems else 'ok  '} {task}")
        for p in problems:
            print(f"     - {p}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
