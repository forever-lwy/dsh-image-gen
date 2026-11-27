import { describe, expect, it } from 'vitest'
import { moveImageView } from '../src/client/image-lightbox.js'

const image = { width: 2400, height: 1600 }
const viewport = { width: 900, height: 600 }
const center = { x: 0, y: 0 }

describe('fullscreen image inspection', () => {
  it('zooms from the fitted size around the pointer, including a moving pinch centre', () => {
    const from = { x: 200, y: -100 }
    const to = { x: 210, y: -90 }
    expect(moveImageView({ scale: null, ...center }, image, viewport, 2, from, to))
      .toEqual({ scale: 0.75, x: -190, y: 110 })
  })

  it('pans a 1:1 image to either edge and recentres axes that fit', () => {
    const view = { scale: 1, ...center }
    expect(moveImageView(view, image, viewport, 1, center, { x: 2000, y: -2000 }))
      .toEqual({ scale: 1, x: 750, y: -500 })
    expect(moveImageView(view, { width: 400, height: 1000 }, viewport, 1, center, { x: -700, y: 600 }))
      .toEqual({ scale: 1, x: 0, y: 200 })
  })

  it('keeps zooming in the requested direction when a panorama fits below 10% or a small image above 800%', () => {
    const fit = { scale: null, ...center }
    expect(moveImageView(fit, { width: 30000, height: 500 }, viewport, 1.25, center, center).scale).toBeCloseTo(0.0375)
    expect(moveImageView(fit, { width: 30, height: 20 }, viewport, 1.25, center, center).scale).toBe(37.5)
  })
})
