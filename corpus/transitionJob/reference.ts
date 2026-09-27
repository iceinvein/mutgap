class DomainError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: string,
    message: string,
    details: Readonly<Record<string, unknown>> = {},
  ) {
    super(`${code}: ${message}`);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export type JobStatus =
  | "queued"
  | "loading_model"
  | "planning"
  | "generating"
  | "encoding"
  | "cataloguing"
  | "completed"
  | "failed"
  | "cancelled";

const allowedTransitions: Record<JobStatus, readonly JobStatus[]> = {
  queued: ["loading_model", "cancelled", "failed"],
  loading_model: ["planning", "cancelled", "failed"],
  planning: ["generating", "cancelled", "failed"],
  generating: ["encoding", "cancelled", "failed"],
  encoding: ["cataloguing", "failed"],
  cataloguing: ["completed", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};

export function transitionJob(current: JobStatus, next: JobStatus): JobStatus {
  if (!allowedTransitions[current].includes(next)) {
    throw new DomainError(
      "INVALID_JOB_TRANSITION",
      `Cannot move a job from ${current} to ${next}.`,
      { current, next },
    );
  }

  return next;
}
