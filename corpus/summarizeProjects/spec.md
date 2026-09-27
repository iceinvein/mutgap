# summarizeProjects

`summarizeProjects(events)` rolls usage events up into one summary per project.
Only four fields of each event are read: `project` (the raw project
identifier), `estimatedCostUsd`, `inputTokens` and `outputTokens`. Each summary
is `{ project, displayProject, rawProjects, events, estimatedCostUsd,
totalInputTokens, totalOutputTokens }`, where the numbers are the event count
and the sums of cost, input tokens and output tokens over every event in the
group. An empty input returns `[]`.

Raw identifiers that normalise to the same display name are merged into one
summary. Normalisation: a raw identifier starting with `/` is split on `/`
(empty segments dropped); one starting with `-` is split on `-` (empty pieces
dropped, and if none are left the identifier is kept as it is); anything else
is kept as it is. For split identifiers, the markers `workspace`, `src`,
`projects`, `repos`, `code` are tried in that order, each at its last
occurrence, counting only when it is not the final segment. The first marker
that counts yields the segments after it: a repeated final pair collapses to
one (`/h/code/api/api` gives `api`; for dash identifiers only when exactly two
pieces remain), otherwise they are joined with `/` for paths or `-` for dash
identifiers (`/h/code/acme/web` gives `acme/web`, `-h-projects-my-app` gives
`my-app`). With no counting marker, a path gives its last two segments joined
with `/` (or itself if that is empty), and a dash identifier gives all its
pieces joined with `-`, or the single piece if there are exactly two identical
pieces.

In each summary, `displayProject` is the normalised name, `rawProjects` lists
the distinct raw identifiers merged into it sorted ascending, and `project` is
the raw identifier of that group that appeared first in the input (not
necessarily the first after sorting).

Summaries are ordered by total cost, highest first; ties are broken by event
count, highest first, and remaining ties by `displayProject` in ascending
`localeCompare` order.
