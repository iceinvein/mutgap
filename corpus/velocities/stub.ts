export type Completion = { fr: string; doneAt: string | null }

export type Rate = { value: number | null; basis: string }

export function velocities(completions: Completion[], today: string): { asIs: Rate; active: Rate } {
  throw new Error('not implemented')
}
