const formatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});

const DIVISIONS = [
  { amount: 60, name: 'seconds' },
  { amount: 60, name: 'minutes' },
  { amount: 24, name: 'hours' },
  { amount: 7, name: 'days' },
  { amount: 4.34524, name: 'weeks' },
  { amount: 12, name: 'months' },
  { amount: Number.POSITIVE_INFINITY, name: 'years' },
];

/**
 *
 * @param {*} date ISO string to format
 * @returns Formatted date or original date if an error occurs.
 */
export function formatTimeAgo(date) {
  if (typeof date !== 'string') {
    return date;
  }

  const dateToFormat = Math.abs(new Date(date));
  const currentDate = Math.abs(new Date());

  let duration = (dateToFormat - currentDate) / 1000;

  for (let i = 0; i < DIVISIONS.length; i += 1) {
    const division = DIVISIONS[i];
    if (Math.abs(duration) < division.amount) {
      const result = formatter.format(Math.round(duration), division.name);
      return result.replace(/last/, 'Last');
    }
    duration /= division.amount;
  }

  return date;
}
