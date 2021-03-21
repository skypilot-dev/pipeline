/* Return a string representation of date & time of the given value (or the current date & time, if no value is given)
 * in UTC (universal coordinated time, a.k.a. GMT) */
export function toUtcDateTimeText(date: Date = new Date()): string {
  return [
    date.toISOString().replace('T', ' ').slice(0, -5),
    'UTC',
  ].join(' ');
}
