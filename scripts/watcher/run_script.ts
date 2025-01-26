import { execa } from 'execa';
import { log } from './log';

export async function runScript(script: string, dir?: string, signal?: AbortSignal): Promise<void> {
  const [file, ...args] = script.split(' ');

  try {
    const childProcess = execa(file, args, {
      env: { ...process.env, FORCE_COLOR: 'true' },
      stdio: 'inherit',
      cwd: dir,
      extendEnv: true,
      shell: true,
      cancelSignal: signal,
    });

    const { exitCode } = await childProcess;

    if (exitCode !== 0) {
      throw new Error(`Script ${script} exited with code ${exitCode}`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ExecaError') {
      log.warn(`Script ${script} was cancelled`);
    } else {
      throw error;
    }
  }
}
