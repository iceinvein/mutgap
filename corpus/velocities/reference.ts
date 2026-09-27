export type Completion = { fr: string; doneAt: string | null }

export type Rate = { value: number | null; basis: string }

const DAY_MS = 86_400_000

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.toISOString().slice(0, 10) === value
}

const UNMEASURED = 'not enough dated completions to measure a rate; one point is not a rate'

export function velocities(completions: Completion[], today: string): { asIs: Rate; active: Rate } {
  const dates = completions
    .map((c) => c.doneAt)
    .filter((d): d is string => d !== null && isCalendarDate(d))
    .sort()
  if (dates.length < 2) {
    return { asIs: { value: null, basis: UNMEASURED }, active: { value: null, basis: UNMEASURED } }
  }
  const first = dates[0] as string
  const last = dates[dates.length - 1] as string
  const end = last > today ? last : today
  const eraDays = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / DAY_MS + 1
  const activeDays = new Set(dates).size
  return {
    asIs: {
      value: dates.length / eraDays,
      basis: `${dates.length} dated completion(s) over ${eraDays} calendar day(s) since ${first}, quiet days included`,
    },
    active: {
      value: dates.length / activeDays,
      basis: `${dates.length} dated completion(s) over ${activeDays} day(s) something completed`,
    },
  }
}
