import { coerce, gte, valid } from 'semver';
import { log } from '../log';

/**
 * This method runs different code for different versions (VS Code, KhulnaSoft API, ...).
 *
 * - If the method can't parse the `current` version, it will execute the **then** part.
 * - If the method can't parse the `minimumRequiredVersion`, it will throw an assertion error.
 *
 * @param current the version this extension uses
 * @param minimumRequiredVersion the version where `then` code block can execute safely
 * @param then code to be executed on the the minimumRequiredVersion or higher
 * @param otherwise code to be executed on lower versions
 * @returns
 */
export function ifVersionGte<T>(
  current: string | undefined,
  minimumRequiredVersion: string,
  then: () => T,
  otherwise: () => T,
): T {
  if (!valid(minimumRequiredVersion)) {
    throw new Error(`minimumRequiredVersion argument ${minimumRequiredVersion} isn't valid`);
  }

  const parsedCurrent = coerce(current);
  // FIXME: when the vesrion can't be parsed, "otherwise" branch should be called
  // https://github.com/khulnasoft/khulnasoft-lsp/-/issues/408
  if (!parsedCurrent) {
    log.warn(
      `Could not parse version from "${current}", running logic for the latest KhulnaSoft version`,
    );
    return then();
  }
  if (gte(parsedCurrent, minimumRequiredVersion)) return then();
  return otherwise();
}
