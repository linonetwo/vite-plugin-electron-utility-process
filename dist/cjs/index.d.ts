/**
 * Vite plugin for `?utilityProcess` imports.
 *
 * Similar to electron-vite's `?modulePath`, but emits a factory function
 * that calls `utilityProcess.fork(path)` directly, so callers don't need
 * to import `utilityProcess` themselves.
 *
 * UtilityProcess provides true process-level crash isolation — if a native
 * library (e.g. dugite/libgit2) segfaults, only the utility process dies,
 * not the main Electron process.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { utilityProcessPlugin } from 'vite-plugin-electron-utility-process';
 * export default defineConfig({
 *   plugins: [utilityProcessPlugin()],
 * });
 *
 * // main.ts
 * import forkWorker from './worker?utilityProcess';
 * const child = forkWorker({ serviceName: 'my-worker', stdio: 'pipe' });
 * ```
 *
 * The generated code uses `require('path').resolve(__dirname, ...)` directly
 * (instead of `new URL(..., import.meta.url)`) to avoid the CJS
 * `import.meta.url` → `{}.url` breakage in Electron Forge builds.
 */
import type { Plugin } from 'vite';
export declare function utilityProcessPlugin(): Plugin;
export default utilityProcessPlugin;
