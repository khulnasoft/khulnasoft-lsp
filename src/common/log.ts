/* eslint-disable max-classes-per-file */
import dayjs from 'dayjs';
import { Logger, LogContext } from '@khulnasoft/logging';
import { Injectable } from '@khulnasoft/di';
import { LOG_LEVEL, LogLevel } from './log_types';
import { ConfigService, DefaultConfigService } from './config_service';
import { isDetailedError } from './fetch_error';
import { prettyJson } from './utils/json';
import { LsConsoleLog } from './external_interfaces';

const LOG_LEVEL_MAPPING = {
  [LOG_LEVEL.ERROR]: 1,
  [LOG_LEVEL.WARNING]: 2,
  [LOG_LEVEL.INFO]: 3,
  [LOG_LEVEL.DEBUG]: 4,
};

const getNumericMapping = (logLevel: keyof typeof LOG_LEVEL_MAPPING | undefined) => {
  if (logLevel && logLevel in LOG_LEVEL_MAPPING) {
    return LOG_LEVEL_MAPPING[logLevel];
  }
  // Log level could be set as an invalid string by an LS client, or the .
  return LOG_LEVEL_MAPPING[LOG_LEVEL.INFO];
};

// pad subsequent lines by 4 spaces
const PADDING = 4;

const formatError = (e: Error): string =>
  isDetailedError(e) ? prettyJson(e.details) : `${e.stack ?? e.message}`;

const ensureError = (e: unknown): Error | undefined => {
  if (e instanceof Error) {
    return e;
  }
  if (typeof e === 'string') {
    return new Error(e);
  }
  if (e === undefined || e === null) {
    return undefined;
  }

  try {
    return new Error(JSON.stringify(e));
  } catch (_) {
    return undefined;
  }
};

const printCtxNode = (node: LogContext, depth: number = 0): string => {
  const indent = (padding: number) => '  '.repeat(padding);
  let result = `${indent(depth)}- ${node.name}:`;

  if (node.value !== undefined) {
    result += ` ${node.value}`;
  }

  result += '\n';

  if (node.children) {
    for (const child of node.children) {
      result += printCtxNode(child, depth + 1);
    }
  }

  return result;
};

const printCtx = (ctx: LogContext): string => {
  return printCtxNode(ctx).trim();
};

@Injectable(Logger, [LsConsoleLog, ConfigService])
export class DefaultLogger implements Logger {
  #logFn: (message: string) => void;

  #configService: ConfigService;

  #ctx: LogContext | undefined;

  constructor(logFn: LsConsoleLog, configService: ConfigService) {
    this.#logFn = logFn;
    this.#configService = configService;
  }

  /**
   * @param messageOrError can be error (if we don't want to provide any additional info), or a string message
   * @param trailingError is an optional error (if messageOrError was a message)
   *           but we also mention `unknown` type because JS doesn't guarantee that in `catch(e)`,
   *           the `e` is an `Error`, it can be anything.
   * */
  #log(incomingLogLevel: LogLevel, messageOrError: unknown | string, trailingError?: unknown) {
    const configuredLevel = this.#configService.get('client.logLevel');
    const shouldShowLog = getNumericMapping(configuredLevel) >= LOG_LEVEL_MAPPING[incomingLogLevel];
    if (shouldShowLog) {
      this.#logWithLevel(incomingLogLevel, messageOrError, ensureError(trailingError));
    }
  }

  #logWithLevel(level: LogLevel, a1: unknown | string, a2?: Error) {
    const ctxText = this.#ctx ? `\n${printCtx(this.#ctx)}` : '';
    if (typeof a1 === 'string') {
      const errorText = a2 ? `\n${formatError(a2)}` : '';
      this.#multilineLog(`${a1}${errorText}${ctxText}`, level);
    } else {
      const err = ensureError(a1);
      if (!err) return;
      this.#multilineLog(`${formatError(err)}${ctxText}`, level);
    }
  }

  #multilineLog(line: string, level: LogLevel): void {
    const prefix = `${dayjs().format('YYYY-MM-DDTHH:mm:ss:SSS')} [${level}]: `;
    const padNextLines = (text: string) => text.replace(/\n/g, `\n${' '.repeat(PADDING)}`);

    this.#logFn(`${prefix}${padNextLines(line)}`);
  }

  setContext(ctx: LogContext) {
    this.#ctx = ctx;
  }

  debug(messageOrError: unknown | string, trailingError?: unknown) {
    this.#log(LOG_LEVEL.DEBUG, messageOrError, trailingError);
  }

  info(messageOrError: unknown | string, trailingError?: unknown) {
    this.#log(LOG_LEVEL.INFO, messageOrError, trailingError);
  }

  warn(messageOrError: unknown | string, trailingError?: unknown) {
    this.#log(LOG_LEVEL.WARNING, messageOrError, trailingError);
  }

  error(messageOrError: unknown | string, trailingError?: unknown) {
    this.#log(LOG_LEVEL.ERROR, messageOrError, trailingError);
  }

  withContext(ctx: LogContext): Logger {
    const newLog = new DefaultLogger(this.#logFn, this.#configService);
    newLog.setContext(ctx);
    return newLog;
  }
}

class GlobalLog implements Logger {
  #log: Logger;

  constructor() {
    // we can't just use `console.log` without the arrow function because of how test spying works
    this.#log = new DefaultLogger((m) => console.log(m), new DefaultConfigService());
  }

  setup(configService: ConfigService) {
    // we can't just use `console.log` without the arrow function because of how test spying works
    this.#log = new DefaultLogger((m) => console.log(m), configService);
  }

  debug(messageOrError: unknown | string, trailingError?: unknown) {
    this.#log.debug(messageOrError as string, trailingError);
  }

  info(messageOrError: unknown | string, trailingError?: unknown) {
    this.#log.info(messageOrError as string, trailingError);
  }

  warn(messageOrError: unknown | string, trailingError?: unknown) {
    this.#log.warn(messageOrError as string, trailingError);
  }

  error(messageOrError: unknown | string, trailingError?: unknown) {
    this.#log.error(messageOrError as string, trailingError);
  }

  withContext(ctx: LogContext): Logger {
    return this.#log.withContext(ctx);
  }
}

// TODO: rename the export and replace usages of `log` with `Log`.
export const log = new GlobalLog();
