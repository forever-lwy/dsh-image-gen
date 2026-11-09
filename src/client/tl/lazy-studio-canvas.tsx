import { memo, useEffect, useState, type FC } from 'react'
import * as imageCache from '../image-cache.js'
import * as bridge from './tl-canvas-bridge.js'
import * as registry from './studio-tl-registry.js'

/**
 * Main-bundle face of the infinite canvas. tldraw and its stylesheet (several
 * MB) live in the `client.canvas.js` chunk, fetched through the DSH module
 * loader's `require.async` the first time a canvas is shown, so pages that
 * never open the canvas never download or parse them.
 *
 * Stateful modules the canvas shares with the main bundle (attachment cache,
 * landing queue, mounted-canvas registry) are handed over through
 * {@link CANVAS_HOST_KEY}; the chunk build resolves its imports of those
 * modules to this object instead of bundling second copies.
 */

type CanvasProps = { lang?: 'zh' | 'en' }
export interface CanvasChunk {
  StudioTlCanvas: FC<CanvasProps>
  TL_CSS: string
}

/** Global slot the chunk reads the shared main-bundle modules from (tsdown.config.ts). */
export const CANVAS_HOST_KEY = Symbol.for('dsh-image-gen.canvas-host')

declare const require: undefined | { async?: (specifier: string) => Promise<unknown> }

function defaultLoader(): Promise<CanvasChunk> {
  const load = typeof require === 'undefined' ? undefined : require.async
  if (typeof load !== 'function') return Promise.reject(new Error('this DSH host cannot load plugin chunks'))
  ;(globalThis as Record<symbol, unknown>)[CANVAS_HOST_KEY] = { imageCache, bridge, registry }
  return load('./client.canvas.js') as Promise<CanvasChunk>
}

let loader: () => Promise<CanvasChunk> = defaultLoader
let pending: Promise<CanvasChunk> | undefined
let loaded: CanvasChunk | undefined
let styleAnchor: Element | null = null
let style: HTMLStyleElement | undefined

/** Test seam: replace how the chunk is fetched, and forget a loaded one. */
export function setCanvasChunkLoader(next: (() => Promise<CanvasChunk>) | undefined): void {
  loader = next ?? defaultLoader
  pending = undefined
  loaded = undefined
}

/**
 * Where tldraw's stylesheet goes once loaded: right before `anchor` (the
 * plugin's canvas theme overrides), keeping the cascade order of the single
 * stylesheet it used to be part of. `null` removes it again.
 */
export function setCanvasStyleAnchor(anchor: Element | null): void {
  styleAnchor = anchor
  if (anchor === null) {
    style?.remove()
    style = undefined
  } else if (loaded !== undefined) {
    installStyle(loaded.TL_CSS)
  }
}

function installStyle(css: string): void {
  if (typeof document === 'undefined') return
  if (style === undefined) {
    style = document.createElement('style')
    style.dataset.plugin = 'dsh-image-gen'
    style.dataset.part = 'tldraw'
    style.textContent = css
  }
  if (styleAnchor?.parentNode) styleAnchor.before(style)
  else if (!style.isConnected) document.head.appendChild(style)
}

/** Fetch the canvas chunk once; a failed fetch can be retried. */
export function loadCanvasChunk(): Promise<CanvasChunk> {
  if (loaded !== undefined) return Promise.resolve(loaded)
  pending ??= loader().then(chunk => {
    installStyle(chunk.TL_CSS)
    loaded = chunk
    return chunk
  }, error => {
    pending = undefined
    throw error
  })
  return pending
}

export const StudioTlCanvas: FC<CanvasProps> = memo(function LazyStudioTlCanvas({ lang = 'zh' }) {
  const [chunk, setChunk] = useState<CanvasChunk | undefined>(loaded)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (chunk !== undefined) return
    let live = true
    setFailed(false)
    loadCanvasChunk().then(
      next => { if (live) setChunk(next) },
      error => {
        console.warn('[dsh-image-gen] canvas chunk failed to load:', error)
        if (live) setFailed(true)
      },
    )
    return () => { live = false }
  }, [chunk, attempt])
  if (chunk !== undefined) return <chunk.StudioTlCanvas lang={lang} />
  const en = lang === 'en'
  return (
    <div className="dsh-ig-tl-canvas">
      <div className="dsh-ig-canvas-sync-status" data-phase={failed ? 'error' : 'loading'} role="status">
        <span>{failed ? (en ? 'The canvas failed to load.' : '画布加载失败。') : (en ? 'Loading canvas…' : '正在加载画布…')}</span>
        {failed && <button type="button" onClick={() => setAttempt(n => n + 1)}>{en ? 'Retry' : '重试'}</button>}
      </div>
    </div>
  )
})

export { clearStudioTlCanvases, deselectStudioTlCanvases } from './studio-tl-registry.js'
