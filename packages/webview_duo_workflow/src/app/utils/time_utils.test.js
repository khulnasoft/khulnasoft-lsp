import { formatTimeAgo } from './time_utils';

describe('formatTimeAgo', () => {
  describe('when provided date is not an ISO string', () => {
    it.each`
      date
      ${{}}
      ${'invalid'}
      ${null}
      ${[]}
      ${{}}
      ${() => {}}
    `('returns the original date when date $date', ({ date }) => {
      expect(formatTimeAgo(date)).toEqual(date);
    });
  });

  describe('when the provided date is an ISO string', () => {
    const second = 1000;
    const minute = 60 * second;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 4.34524 * week;
    const year = 12 * month;

    const currentDate = new Date();

    const createTimeAgo = (time) => new Date(time).toISOString();

    const now = createTimeAgo(currentDate);
    const secondsAgo = createTimeAgo(currentDate - 30 * second);
    const minutesAgo = createTimeAgo(currentDate - minute);
    const hoursAgo = createTimeAgo(currentDate - hour);
    const daysAgo = createTimeAgo(currentDate - day);
    const weeksAgo = createTimeAgo(currentDate - week);
    const monthsAgo = createTimeAgo(currentDate - month);
    const yearsAgo = createTimeAgo(currentDate - year);

    it.each`
      date          | expectedText
      ${now}        | ${'now'}
      ${secondsAgo} | ${'second'}
      ${minutesAgo} | ${'minute'}
      ${hoursAgo}   | ${'hour'}
      ${daysAgo}    | ${'day'}
      ${weeksAgo}   | ${'week'}
      ${monthsAgo}  | ${'month'}
      ${yearsAgo}   | ${'year'}
    `('renders the correct timeago format with $expectedText', ({ date, expectedText }) => {
      expect(formatTimeAgo(date)).toContain(expectedText);
    });

    it.each`
      date         | expectedText
      ${weeksAgo}  | ${'Last week'}
      ${monthsAgo} | ${'Last month'}
      ${yearsAgo}  | ${'Last year'}
    `('renders the correct timeago format with a "Last" prefix', ({ date, expectedText }) => {
      expect(formatTimeAgo(date)).toContain(expectedText);
    });
  });
});
