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

export function transitionJob(current: JobStatus, next: JobStatus): JobStatus {
  throw new Error("not implemented");
}
