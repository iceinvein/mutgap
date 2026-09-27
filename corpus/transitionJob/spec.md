# transitionJob

`transitionJob(current, next)` validates a move of a music-generation job from
one status to another. The statuses are `queued`, `loading_model`, `planning`,
`generating`, `encoding`, `cataloguing`, `completed`, `failed` and
`cancelled`. When the move is allowed it returns `next`; otherwise it throws.

The normal path is `queued` to `loading_model` to `planning` to `generating`
to `encoding` to `cataloguing` to `completed`, one step at a time. Any status
that is not yet finished may also move to `failed`. Moving to `cancelled` is
allowed from `queued`, `loading_model`, `planning` and `generating`, but not
from `encoding` or `cataloguing`. `completed`, `failed` and `cancelled` are
terminal and allow no moves at all.

Every other move is rejected, including skipping a step (such as `queued` to
`planning`), moving backwards, and moving from a status to itself. The thrown
value is an `Error` whose `code` is `"INVALID_JOB_TRANSITION"`, whose
`message` is `INVALID_JOB_TRANSITION: Cannot move a job from <current> to <next>.`,
and whose `details` is `{ current, next }`.
