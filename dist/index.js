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
import path from 'node:path';
export function utilityProcessPlugin() {
    const queryRE = /[?#].*$/s;
    const cleanUrl = (url) => url.replace(queryRE, '');
    const assetReferenceRE = /__VITE_UTILITY_PROCESS_ASSET__([\w$]+)__/g;
    const parseRequest = (id) => {
        const search = id.match(/\?(.*)$/s)?.[1];
        if (!search)
            return null;
        return Object.fromEntries(new URLSearchParams(search));
    };
    return {
        name: 'vite:utility-process',
        apply: 'build',
        enforce: 'pre',
        resolveId(id, importer) {
            const query = parseRequest(id);
            if (query && query.utilityProcess !== undefined && importer) {
                return `${id}&importer=${importer}`;
            }
        },
        load(id) {
            const query = parseRequest(id);
            if (!query || query.utilityProcess === undefined || !query.importer)
                return;
            const cleanPath = cleanUrl(id);
            const hash = this.emitFile({
                type: 'chunk',
                id: cleanPath,
                importer: query.importer,
            });
            const assetReferenceId = `__VITE_UTILITY_PROCESS_ASSET__${hash}__`;
            return `
        import { utilityProcess } from 'electron';
        const workerPath = require('path').resolve(__dirname, ${assetReferenceId});
        export default function forkUtilityProcess(options) {
          return utilityProcess.fork(workerPath, [], options);
        }`;
        },
        renderChunk(code, chunk) {
            if (!assetReferenceRE.test(code))
                return null;
            assetReferenceRE.lastIndex = 0;
            let match;
            let result = code;
            while ((match = assetReferenceRE.exec(code))) {
                const [full, hash] = match;
                const filename = this.getFileName(hash);
                const relativePath = path.posix.relative(path.dirname(chunk.fileName), filename);
                result = result.replace(full, JSON.stringify(relativePath));
            }
            return { code: result, map: null };
        },
    };
}
export default utilityProcessPlugin;
