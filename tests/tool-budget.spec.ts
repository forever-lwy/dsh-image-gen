import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/index.js'
import { imageToolContext } from '../src/image-tool-context.js'

/**
 * Tool schemas are re-sent with every model step, so their size is a running
 * cost. These budgets keep the fork's trimmed definitions from creeping back.
 */
function registeredTools() {
  const tools: { name: string; description: string; parameters: { properties: Record<string, unknown> } }[] = []
  const ctx = {
    tools: { register: (tool: never) => { tools.push(tool) } }, effect: (setup: () => unknown) => setup(), credentials: { resolve: vi.fn() },
    inject: vi.fn(), attachments: { imageLimits: { maxImageBytes: 1024, mediaTypes: ['image/png'] }, readImage: vi.fn(), saveImage: vi.fn() }, logger: { warn: vi.fn() },
  } as unknown as Context
  apply(ctx, {} as never)
  return tools
}
const size = (tool: { name: string; description: string; parameters: unknown }) => JSON.stringify({ name: tool.name, description: tool.description, parameters: tool.parameters }).length

describe('model-facing size', () => {
  it('keeps every tool definition within budget', () => {
    const budgets: Record<string, number> = { canvas: 900, generate_image: 2300, generate_images: 2300, edit_image: 3700, find_inspiration: 1400 }
    const tools = registeredTools()
    expect(tools.map(tool => tool.name).sort()).toEqual(Object.keys(budgets).sort())
    for (const tool of tools) expect(size(tool), tool.name).toBeLessThanOrEqual(budgets[tool.name]!)
  })

  it('keeps the same option set on all three image tools', () => {
    const tools = registeredTools()
    const options = (name: string) => Object.keys(tools.find(tool => tool.name === name)!.parameters.properties).filter(key => !/^(prompts?|source.*)$/.test(key)).sort()
    expect(options('generate_images')).toEqual(options('generate_image'))
    expect(options('edit_image')).toEqual(options('generate_image'))
  })

  it('states subscription rules only while a subscription provider is in play', () => {
    expect(imageToolContext({ provider: 'google' } as never, ['google'])).not.toContain('chatgpt-sub accepts')
    expect(imageToolContext({ provider: 'google' } as never, ['google', 'grok-sub'])).toContain('chatgpt-sub accepts')
    expect(imageToolContext({ provider: 'chatgpt-sub' } as never, [])).toContain('NOT image_size')
    expect(imageToolContext({ provider: 'google' } as never)).toContain('chatgpt-sub accepts')
  })
})
