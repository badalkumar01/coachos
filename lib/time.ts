/**
 * Timezone conversion without a date library.
 *
 * `datetime-local` inputs hand back a wall-clock string with no zone attached
 * ("2026-10-21T14:30"). A session booked at 2:30pm means 2:30pm *in the coach's
 * timezone*, so the string has to be resolved against `workspace_config.timezone`
 * rather than whatever zone the server happens to run in.
 */

/** Minutes that `timeZone` is offset from UTC at the given instant. */
function offsetMinutesAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  const hour = read('hour');
  const asUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    hour === 24 ? 0 : hour,
    read('minute'),
    read('second'),
  );

  return (asUtc - instant.getTime()) / 60000;
}

/**
 * Resolves a `datetime-local` value to the UTC instant it names in `timeZone`.
 * Returns null when the string is not a well-formed local date-time.
 *
 * The offset is applied twice because the first guess uses the offset at the
 * wrong instant — which matters on DST boundaries, where the two differ.
 */
export function wallClockToUtc(wallClock: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(wallClock.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const naiveUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? '0'),
  );

  if (Number.isNaN(naiveUtc)) return null;

  const firstPass = naiveUtc - offsetMinutesAt(new Date(naiveUtc), timeZone) * 60000;
  const corrected = naiveUtc - offsetMinutesAt(new Date(firstPass), timeZone) * 60000;

  const result = new Date(corrected);
  return Number.isNaN(result.getTime()) ? null : result;
}

/**
 * The inverse: formats an instant as the `datetime-local` value that shows the
 * same wall-clock time in `timeZone`. Used to populate edit forms.
 */
export function utcToWallClock(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';

  // en-CA renders midnight as "24" in some engines; normalise it.
  const hour = read('hour') === '24' ? '00' : read('hour');

  return `${read('year')}-${read('month')}-${read('day')}T${hour}:${read('minute')}`;
}

/** A sensible default for a new booking: the next whole hour, tomorrow. */
export function defaultSessionStart(timeZone: string): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const wallClock = utcToWallClock(tomorrow, timeZone);
  return `${wallClock.slice(0, 11)}10:00`;
}

/** Common session lengths, in minutes. */
export const DURATION_OPTIONS = [15, 20, 25, 30, 45, 50, 60, 75, 90, 120] as const;
