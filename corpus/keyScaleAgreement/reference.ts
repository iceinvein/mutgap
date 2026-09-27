export function keyScaleAgreement(
  candidate: string | undefined,
  key: string,
  scale: string,
): boolean | undefined {
  if (!candidate) return undefined;
  const pitchClasses: Record<string, number> = {
    c: 0,
    "c#": 1,
    db: 1,
    d: 2,
    "d#": 3,
    eb: 3,
    e: 4,
    f: 5,
    "f#": 6,
    gb: 6,
    g: 7,
    "g#": 8,
    ab: 8,
    a: 9,
    "a#": 10,
    bb: 10,
    b: 11,
  };
  const parse = (value: string) => {
    const normalised = value.toLocaleLowerCase("en").replaceAll("♭", "b");
    const match = /\b([a-g](?:#|b)?)(?:\s+|$)/u.exec(normalised);
    const mode = /\bminor\b/u.test(normalised)
      ? "minor"
      : /\bmajor\b/u.test(normalised)
        ? "major"
        : undefined;
    const pitch = match?.[1] ? pitchClasses[match[1]] : undefined;
    return pitch === undefined || !mode ? undefined : { pitch, mode };
  };
  const parsedCandidate = parse(candidate);
  const parsedBaseline = parse(`${key} ${scale}`);
  if (!parsedCandidate || !parsedBaseline) return undefined;
  return (
    parsedCandidate.pitch === parsedBaseline.pitch &&
    parsedCandidate.mode === parsedBaseline.mode
  );
}
