import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { CanvasMirror } from '../src/canvas-state.js'
import { parseCanvasStatePush } from '../src/canvas-state-route.js'
import { registerCanvasTools } from '../src/canvas-tools.js'
import { apply } from '../src/index.js'
import type { CanvasStatePush } from '../src/shared.js'

const ref: ImageAttachmentRef = { attachmentId: 'sha256:shot' as ImageAttachmentRef['attachmentId'], mediaType: 'image/png', bytes: 3, width: 1, height: 1, name: 'canvas-selection' }
const push = (count: number) => parseCanvasStatePush({
  clientInstance: 'editor-1', connected: true, nodeCount: 1, nodes: [{ kind: 'draw' }],
  selection: { count, kinds: count ? ['draw'] : [], items: count ? [{ kind: 'draw' }] : [] }, updatedAt: Date.now(),
}) as CanvasStatePush

function setup() {
  const tools: any[] = []
  const mirror = new CanvasMirror()
  const persist = vi.fn(async () => ref)
  registerCanvasTools({ tools: { register: (t: unknown) => tools.push(t) } } as unknown as Context, mirror, { persistSelectionImage: persist })
  return { tool: tools[0], mirror, persist, count: tools.length }
}

describe('canvas tool', () => {
  it('is one tool with a state and a view action', async () => {
    const { tool, count, mirror, persist } = setup()
    expect(count).toBe(1)
    expect(tool.name).toBe('canvas')
    expect(tool.parameters.properties.action.enum).toEqual(['state', 'view'])
    expect(tool.parameters.required).toEqual(['action'])
    const offline = await tool.execute({ action: 'state' })
    expect(offline.connected).toBe(false)
    expect(offline.digest).toContain('not connected')
    mirror.apply(push(1), { data: new Uint8Array([1, 2, 3]), mediaType: 'image/png' })
    const state = await tool.execute({ action: 'state' })
    expect(state).toMatchObject({ connected: true, nodeCount: 1, selectionCount: 1, hasSelectionImage: true })
    expect(state.attachment).toBeUndefined()
    expect(persist).not.toHaveBeenCalled()
    const view = await tool.execute({ action: 'view' })
    expect(view.attachment).toEqual(ref)
    expect(persist).toHaveBeenCalledTimes(1)
    expect(tool.output.render({}, view).map((block: { type: string }) => block.type)).toEqual(['text', 'image'])
    await expect(tool.execute({})).rejects.toThrow(/action/)
  })

  it('views nothing without a selection screenshot and persists nothing', async () => {
    const { tool, mirror, persist } = setup()
    mirror.apply(push(0))
    const view = await tool.execute({ action: 'view' })
    expect(view.attachment).toBeUndefined()
    expect(view.digest).toContain('Selection: none')
    expect(persist).not.toHaveBeenCalled()
  })

  it('keeps the live canvas out of the system prompt', () => {
    const contexts: { name: string }[] = []
    const ctx = {
      tools: { register: vi.fn() }, effect: (setup: () => unknown) => setup(), credentials: { resolve: vi.fn() },
      inject: (services: string[], callback: (owner: unknown) => void) => {
        if (services.includes('systemPrompt')) callback({ effect: (setup: () => unknown) => setup(), systemPrompt: { context: (item: { name: string }) => { contexts.push(item); return () => {} } } })
      },
      attachments: { imageLimits: { maxImageBytes: 1024, mediaTypes: ['image/png'] }, readImage: vi.fn(), saveImage: vi.fn() },
      logger: { warn: vi.fn() },
    } as unknown as Context
    apply(ctx, {} as never)
    expect(contexts.map(item => item.name)).toEqual(['dsh-image-gen:image-defaults'])
  })
})
