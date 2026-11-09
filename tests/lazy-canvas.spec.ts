import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadCanvasChunk, setCanvasChunkLoader, setCanvasStyleAnchor, type CanvasChunk } from '../src/client/tl/lazy-studio-canvas.js'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const clientDir = join(root, 'src', 'client')

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? sources(full) : /\.tsx?$/.test(entry) ? [full] : []
  })
}

/** Minimal DOM: style elements that know their parent and support before(). */
function fakeDocument() {
  const head: { children: unknown[]; appendChild(node: FakeStyle): void } = {
    children: [],
    appendChild(node) { node.remove(); head.children.push(node); node.parentNode = head },
  }
  class FakeStyle {
    dataset: Record<string, string> = {}
    textContent = ''
    parentNode: typeof head | null = null
    get isConnected() { return this.parentNode !== null }
    before(node: FakeStyle) { node.remove(); head.children.splice(head.children.indexOf(this), 0, node); node.parentNode = head }
    remove() { const i = head.children.indexOf(this); if (i >= 0) head.children.splice(i, 1); this.parentNode = null }
  }
  return { head, createElement: () => new FakeStyle(), FakeStyle }
}
type FakeDocument = ReturnType<typeof fakeDocument>

afterEach(() => {
  setCanvasStyleAnchor(null)
  setCanvasChunkLoader(undefined)
  vi.unstubAllGlobals()
})

describe('lazy infinite canvas', () => {
  it('keeps tldraw out of the main bundle: only the chunk entry reaches the canvas module', () => {
    for (const file of sources(clientDir)) {
      const text = readFileSync(file, 'utf8')
      const name = relative(clientDir, file)
      const valueImport = /^import (?!type )[^;]*from 'tldraw'/m.test(text)
      if (valueImport) expect(name, `${name} imports tldraw at runtime`).toBe(join('tl', 'studio-tl-canvas.tsx'))
      if (/from '\.\/(?:tl\/)?studio-tl-canvas\.js'/.test(text)) expect(name, `${name} pulls the canvas into the main bundle`).toBe(join('tl', 'canvas-chunk.ts'))
      if (name !== join('tl', 'canvas-chunk.ts') && /from '\.\/(?:tl\/)?tl-css\.js'/.test(text)) throw new Error(`${name} pulls tldraw's stylesheet into the main bundle`)
    }
  })

  it('loads the chunk once and slots tldraw CSS before the theme overrides', async () => {
    const doc: FakeDocument = fakeDocument()
    vi.stubGlobal('document', doc)
    const main = doc.createElement(); const theme = doc.createElement()
    doc.head.appendChild(main); doc.head.appendChild(theme)
    setCanvasStyleAnchor(theme as never)
    const chunk = { StudioTlCanvas: () => null, TL_CSS: '.tl-container{}' } as unknown as CanvasChunk
    const loader = vi.fn(async () => chunk)
    setCanvasChunkLoader(loader)
    const [a, b] = await Promise.all([loadCanvasChunk(), loadCanvasChunk()])
    expect(a).toBe(chunk); expect(b).toBe(chunk)
    expect(loader).toHaveBeenCalledTimes(1)
    expect(doc.head.children).toHaveLength(3)
    expect(doc.head.children[0]).toBe(main)
    expect((doc.head.children[1] as { textContent: string }).textContent).toBe('.tl-container{}')
    expect(doc.head.children[2]).toBe(theme)
    await loadCanvasChunk()
    expect(doc.head.children).toHaveLength(3)
    setCanvasStyleAnchor(null)
    expect(doc.head.children).toEqual([main, theme])
  })

  it('retries after a failed fetch instead of caching the failure', async () => {
    vi.stubGlobal('document', fakeDocument())
    const chunk = { StudioTlCanvas: () => null, TL_CSS: '' } as unknown as CanvasChunk
    const loader = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(chunk)
    setCanvasChunkLoader(loader)
    await expect(loadCanvasChunk()).rejects.toThrow('offline')
    await expect(loadCanvasChunk()).resolves.toBe(chunk)
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('fails clearly on hosts whose module loader has no require.async', async () => {
    await expect(loadCanvasChunk()).rejects.toThrow(/cannot load plugin chunks/)
  })
})
