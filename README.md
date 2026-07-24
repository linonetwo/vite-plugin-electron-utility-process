# vite-plugin-electron-utility-process

Vite plugin for `?utilityProcess` imports — emits Electron `UtilityProcess` entry chunks with a `fork()` factory.

## Why

Electron's `utilityProcess` API provides **true process-level crash isolation** — if a native library (e.g. dugite/libgit2) segfaults, only the utility process dies, not the main Electron process. This is superior to Node.js `worker_threads`, where a native crash takes down the entire process.

This plugin lets you import utility process entry points with a `?utilityProcess` query suffix, similar to how `@fetsorn/vite-node-worker` handles `?nodeWorker` for worker threads, or how `electron-vite` handles `?modulePath`.

## Install

```bash
npm install -D vite-plugin-electron-utility-process
```

## Usage

### `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import { utilityProcessPlugin } from 'vite-plugin-electron-utility-process';

export default defineConfig({
  plugins: [
    utilityProcessPlugin(),
    // ... other plugins
  ],
});
```

### Main process code

```ts
import { utilityProcess } from 'electron';
import forkWorker from './worker?utilityProcess';

// forkWorker is a factory that calls utilityProcess.fork(path, [], options)
const child = forkWorker({
  serviceName: 'my-worker',
  stdio: 'pipe',
  allowLoadingUnsignedLibraries: process.platform === 'darwin',
});

child.stdout?.on('data', (data) => console.log(data.toString()));
child.on('exit', (code) => console.log(`Worker exited with code ${code}`));
```

### Worker code (`worker.ts`)

```ts
import { handleUtilityProcessMessages } from 'electron-ipc-cat/host';

handleUtilityProcessMessages({
  async doSomething(arg: string): Promise<string> {
    return `result: ${arg}`;
  },
});
```

### TypeScript support

Add a type declaration to your project:

```ts
// type.d.ts
declare module '*?utilityProcess' {
  import type { UtilityProcess } from 'electron';
  export default function forkUtilityProcess(
    options?: Parameters<typeof UtilityProcess.prototype.fork>[2],
  ): UtilityProcess;
}
```

## ASAR unpacking

If you use Electron Forge with ASAR, you need to unpack utility process entry files from the ASAR archive, because `utilityProcess.fork()` cannot execute files directly from within ASAR:

```ts
// forge.config.ts
export default {
  packagerConfig: {
    asar: {
      unpack: '**/.webpack/main/*Worker*',
    },
  },
};
```

## How it works

1. When Vite encounters an import like `import fork from './worker?utilityProcess'`, the plugin intercepts it.
2. The plugin emits the worker module as a separate chunk (not bundled into the main entry).
3. The import is replaced with a factory function that calls `utilityProcess.fork(resolvedPath, [], options)`.
4. At build time, the asset reference is resolved to a relative path from the importing chunk to the worker chunk.

## License

MIT
