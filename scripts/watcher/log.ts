const textColor = '\x1b[36m';
const errorColor = '\x1b[31m';
const successColor = '\x1b[32m';
const warnColor = '\x1b[33m';
const resetColor = '\x1b[0m';

export const log = {
  info: (message: string) => console.log(`${textColor}[watcher] ${message}${resetColor}`),
  warn: (message: string) => console.warn(`${warnColor}[watcher] ${message}${resetColor}`),
  error: (message: string | Error | unknown) =>
    console.error(`${errorColor}[watcher] ${message}${resetColor}`),
  success: (message: string) => console.log(`${successColor}[watcher] ${message}${resetColor}`),
};
