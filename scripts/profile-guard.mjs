/**
 * Lifecycle for the throwaway Chrome profiles the verification scripts create.
 *
 * The first attempt at this deleted the profile in a `finally` and swallowed the
 * error. It worked when the script was run by hand and leaked on every run under
 * the mutation harness — 43 directories in one pass — because:
 *
 *   - `chrome.kill()` only SENDS a signal. Chrome was often still writing to the
 *     profile when the removal ran, so it failed, and the swallowed error made
 *     that invisible.
 *   - a `finally` does not run when the process is signalled, throws at the top
 *     level, or is SIGKILLed by a parent that timed it out — all of which happen
 *     under the harness.
 *
 * So: wait for the process to actually exit, retry the removal, report failure
 * loudly, register the cleanup on every exit path, and sweep anything a previous
 * crashed run left behind.
 */
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Synchronous sleep — exit handlers cannot await. */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Remove profiles an earlier run abandoned.
 *
 * Age-gated so a concurrently running sibling is never touched: a single script
 * run lasts a few minutes at most, so anything older than this belongs to a run
 * that is already over.
 */
const STALE_AFTER_MS = 15 * 60 * 1000;

export function sweepStaleProfiles(prefix) {
  const root = tmpdir();
  let removed = 0;
  let entries;
  try {
    entries = readdirSync(root);
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (!entry.startsWith(prefix)) continue;
    const full = join(root, entry);
    try {
      if (Date.now() - statSync(full).mtimeMs < STALE_AFTER_MS) continue;
      rmSync(full, { recursive: true, force: true });
      removed++;
    } catch {
      /* someone else's, or already gone */
    }
  }
  return removed;
}

/**
 * Create a profile directory and guarantee its removal.
 *
 * Returns the path plus `release(chromeProcess)`, which waits for Chrome to be
 * gone before deleting. The handlers registered here are the safety net for the
 * paths that never reach `release`.
 */
export function createGuardedProfile(prefix) {
  sweepStaleProfiles(prefix);
  const profile = mkdtempSync(join(tmpdir(), prefix));
  let child = null;
  let done = false;

  function removeNow() {
    if (done) return true;
    // Nothing to wait on at this point; make sure Chrome is not coming back.
    if (child) {
      try {
        child.kill('SIGKILL');
      } catch {
        /* already gone */
      }
    }
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        rmSync(profile, { recursive: true, force: true });
        if (!existsSync(profile)) {
          done = true;
          return true;
        }
      } catch {
        /* Chrome may still hold it; try again below */
      }
      sleepSync(150);
    }
    // Loudly, not silently. A leak that reports nothing is how this filled a disk.
    console.error(`  WARNING: could not remove Chrome profile ${profile}`);
    return false;
  }

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
      removeNow();
      process.exit(130);
    });
  }
  process.on('uncaughtException', (error) => {
    removeNow();
    console.error(error);
    process.exit(1);
  });
  process.on('unhandledRejection', (error) => {
    removeNow();
    console.error(error);
    process.exit(1);
  });
  // Covers the ordinary path and any explicit process.exit().
  process.on('exit', () => removeNow());

  return {
    profile,
    track(chromeProcess) {
      child = chromeProcess;
    },
    /** Normal path: wait for Chrome to exit, then remove. */
    async release(chromeProcess = child) {
      if (chromeProcess) {
        const exited = new Promise((resolve) => {
          if (chromeProcess.exitCode !== null || chromeProcess.signalCode) return resolve();
          chromeProcess.once('exit', resolve);
          setTimeout(resolve, 4000);
        });
        try {
          chromeProcess.kill();
        } catch {
          /* already gone */
        }
        await exited;
      }
      return removeNow();
    },
  };
}
