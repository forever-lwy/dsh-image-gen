/** Standalone host and browser bundle outputs. */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { UserConfig } from 'tsdown'

/** Browser module id: the DSH client loader identifies plugin bundles by package name. */
const MODULE_ID: string = JSON.parse(readFileSync('package.json', 'utf8')).name

const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
]

const host: UserConfig = {
  name: 'dsh-image-gen',
  entry: ['lib/types/index.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
}

const client: UserConfig = {
  name: 'dsh-image-gen/client',
  entry: { client: 'lib/types/client/index.js' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: false,
  external: CLIENT_EXTERNALS,
  noExternal: (id: string) => CLIENT_EXTERNALS.includes(id) ? undefined : true,
  // The host webview has no `process` global; CJS deps (e.g. zustand via the
  // client runtime) read NODE_ENV at runtime, so bake it in at build time.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    // Baked at build time; the canvas logs it so stale host caches are provable.
    __CANVAS_BUILD_TS__: JSON.stringify(new Date().toISOString()),
  },
  alias: {
    'lucide-react': 'lucide-react/dist/esm/lucide-react.mjs',
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(MODULE_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

/**
 * Stateful client modules the canvas chunk must share with the main bundle
 * instead of bundling a second copy: the chunk resolves its imports of them
 * to the object lazy-studio-canvas.tsx publishes under the same symbol right
 * before it fetches the chunk.
 */
const CANVAS_SHARED: Record<string, string> = {
  [resolve('lib/types/client/image-cache.js')]: 'imageCache',
  [resolve('lib/types/client/tl/tl-canvas-bridge.js')]: 'bridge',
  [resolve('lib/types/client/tl/studio-tl-registry.js')]: 'registry',
}
const SHARED_PREFIX = '\0canvas-host:'

const canvasHostLink = {
  name: 'canvas-host-link',
  resolveId(source: string, importer: string | undefined) {
    if (importer === undefined || !source.startsWith('.')) return null
    const file = resolve(dirname(importer), source)
    return CANVAS_SHARED[file] === undefined ? null : SHARED_PREFIX + file
  },
  load(id: string) {
    if (!id.startsWith(SHARED_PREFIX)) return null
    const file = id.slice(SHARED_PREFIX.length)
    const key = CANVAS_SHARED[file]
    const names = [...readFileSync(file, 'utf8').matchAll(/^export (?:async )?(?:function\*?|const|let|class) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1])
    return [
      `const host = globalThis[Symbol.for('dsh-image-gen.canvas-host')]?.${key}`,
      `if (host === undefined) throw new Error('dsh-image-gen: canvas chunk loaded without its host modules')`,
      ...names.map(name => `export const ${name} = host.${name}`),
    ].join('\n')
  },
}

const canvas: UserConfig = {
  ...client,
  name: 'dsh-image-gen/canvas',
  entry: { 'client.canvas': 'lib/types/client/tl/canvas-chunk.js' },
  plugins: [canvasHostLink],
  outputOptions: {
    ...client.outputOptions,
    entryFileNames: 'client.canvas.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(MODULE_ID)}, chunk: "client.canvas.js", factory: (require) => {`,
  },
}

export default [host, client, canvas]
