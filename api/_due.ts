/** The learner's local hour (0–23) during UTC hour `utcHour`; `tz` as Date#getTimezoneOffset. */
export const localHour = (tz: number, utcHour: number) => Math.floor((((utcHour * 60 - tz) % 1440) + 1440) % 1440 / 60)

/** A reminder is for the devices whose reminder hour (default 20:00) it is now where they are. */
export const dueNow = (r: { tz: number; hour?: number }, utcHour: number) => localHour(r.tz, utcHour) === (r.hour ?? 20)

/** The UTC hours (0–23) at which the record is due: where the hourly cron finds it. */
export const dueHours = (r: { tz: number; hour?: number }): number[] => Array.from({ length: 24 }, (_, h) => h).filter((h) => dueNow(r, h))
