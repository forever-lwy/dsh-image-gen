import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Minus, Plus, X } from 'lucide-react'

const labels = {
  zh: { preview: '图片预览', close: '关闭', zoomIn: '放大', zoomOut: '缩小', original: '原始大小', fit: '适应窗口' },
  en: { preview: 'Image preview', close: 'Close', zoomIn: 'Zoom in', zoomOut: 'Zoom out', original: 'Original size', fit: 'Fit to window' },
}
type ViewerProps = { lang: keyof typeof labels; onClose(): void; children: ReactNode }
const ViewerContext = createContext<Pick<ViewerProps, 'lang' | 'onClose'>>({ lang: 'zh', onClose() {} })

/** The modal top layer also covers the viewport in webviews that decline native fullscreen. */
export function ImageLightbox({ lang, onClose, children }: ViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useLayoutEffect(() => { closeRef.current = onClose }, [onClose])
  useLayoutEffect(() => {
    const dialog = dialogRef.current!
    const surface = surfaceRef.current!
    const opener = document.activeElement
    dialog.showModal()
    let entered = false
    const fullscreenChanged = () => {
      if (document.fullscreenElement === surface) entered = true
      else if (entered) closeRef.current()
    }
    document.addEventListener('fullscreenchange', fullscreenChanged)
    // This layout effect runs with the opening click's activation. A dialog
    // itself is ineligible for requestFullscreen, so promote its contents.
    if (!document.fullscreenElement) void surface.requestFullscreen?.().catch(() => {})
    return () => {
      document.removeEventListener('fullscreenchange', fullscreenChanged)
      const exit = document.fullscreenElement === surface ? document.exitFullscreen() : undefined
      dialog.close()
      // Leaving native fullscreen can move focus back to the body after close().
      const restoreFocus = () => {
        if (document.activeElement === document.body && opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
      }
      restoreFocus()
      void exit?.then(restoreFocus, restoreFocus)
    }
  }, [])
  return <dialog className="dsh-ig-lightbox-dialog" ref={dialogRef} aria-label={labels[lang].preview}
    onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="dsh-ig-lightbox-backdrop" ref={surfaceRef}>
      <button type="button" className="dsh-ig-lightbox-close-btn" title={labels[lang].close} aria-label={labels[lang].close} onClick={onClose}><X size={18} /></button>
      <ViewerContext.Provider value={{ lang, onClose }}>{children}</ViewerContext.Provider>
    </div>
  </dialog>
}

type Size = { width: number; height: number }
type Point = { x: number; y: number }
type View = Point & { scale: number | null }
const fitView: View = { scale: null, x: 0, y: 0 }
const center = { x: 0, y: 0 }
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function panLimit(image: number, viewport: number, scale: number, offset: number): number {
  const limit = (image * scale - viewport) / 2
  return limit > 0 ? clamp(offset, -limit, limit) : 0
}

/** Pixel coordinates are relative to the viewport centre. Keep the point being inspected under the gesture. */
export function moveImageView(view: View, image: Size, viewport: Size, factor: number, from: Point, to: Point): View {
  const fit = Math.min(viewport.width / image.width, viewport.height / image.height)
  const before = view.scale ?? fit
  const scale = clamp(before * factor, Math.min(0.1, fit), Math.max(8, fit * 2))
  const x = panLimit(image.width, viewport.width, before, view.x)
  const y = panLimit(image.height, viewport.height, before, view.y)
  return {
    scale,
    x: panLimit(image.width, viewport.width, scale, to.x + (x - from.x) * scale / before),
    y: panLimit(image.height, viewport.height, scale, to.y + (y - from.y) * scale / before),
  }
}

/** A keyed viewport gives each image its own fit, zoom and pan, independent of the modal's lifetime. */
export function ImageViewport({ children, size, onInspect, frameClassName = '' }: {
  children: ReactNode
  size?: Size | undefined
  onInspect?: (() => void) | undefined
  frameClassName?: string
}) {
  const { lang, onClose } = useContext(ViewerContext)
  const t = labels[lang]
  const viewportRef = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState<Size>({ width: 0, height: 0 })
  const [natural, setNatural] = useState<Size>()
  const [view, setView] = useState(fitView)
  const points = useRef(new Map<number, Point>())
  const backdropTap = useRef(false)
  const image = size?.width && size.height ? size : natural
  const ready = image !== undefined && bounds.width > 0 && bounds.height > 0
  const fit = ready ? Math.min(bounds.width / image.width, bounds.height / image.height) : 1
  const scale = view.scale ?? fit
  const canPan = ready && (image.width * scale > bounds.width + 0.5 || image.height * scale > bounds.height + 0.5)

  useLayoutEffect(() => {
    const viewport = viewportRef.current!
    const measure = () => setBounds({ width: viewport.clientWidth, height: viewport.clientHeight })
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    measure()
    return () => observer.disconnect()
  }, [])

  function change(factor: number, from: Point = center, to: Point = from) {
    if (!ready) return
    if (factor !== 1) onInspect?.()
    setView(previous => moveImageView(previous, image, bounds, factor, from, to))
  }
  function point(clientX: number, clientY: number): Point {
    const rect = viewportRef.current!.getBoundingClientRect()
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 }
  }

  useEffect(() => {
    const viewport = viewportRef.current!
    const wheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return
      event.preventDefault()
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1)
      change(Math.exp(-clamp(pixels, -240, 240) * 0.0025), point(event.clientX, event.clientY))
    }
    viewport.addEventListener('wheel', wheel, { passive: false })
    return () => viewport.removeEventListener('wheel', wheel)
  }, [image, bounds, onInspect])

  const down = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as Element
    backdropTap.current = points.current.size === 0 && target === event.currentTarget
    if (event.button !== 0 || target.closest('button,input,textarea,[role="button"]')) return
    // At fit, a mouse can still drag the original GIF out as a file.
    if (event.pointerType === 'mouse' && !canPan) return
    if (canPan) event.preventDefault()
    points.current.set(event.pointerId, point(event.clientX, event.clientY))
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const previous = points.current.get(event.pointerId)
    if (!previous) return
    const next = point(event.clientX, event.clientY)
    if (previous.x === next.x && previous.y === next.y) return
    backdropTap.current = false
    points.current.set(event.pointerId, next)
    const other = [...points.current.entries()].find(([id]) => id !== event.pointerId)?.[1]
    if (!other) {
      if (canPan) change(1, previous, next)
      return
    }
    const before = Math.hypot(previous.x - other.x, previous.y - other.y)
    const after = Math.hypot(next.x - other.x, next.y - other.y)
    if (before > 0 && after > 0) change(after / before,
      { x: (other.x + previous.x) / 2, y: (other.y + previous.y) / 2 },
      { x: (other.x + next.x) / 2, y: (other.y + next.y) / 2 })
  }
  const end = (event: PointerEvent<HTMLDivElement>) => { points.current.delete(event.pointerId) }
  const originalSize = () => { onInspect?.(); setView({ scale: 1, ...center }) }
  return <>
    <div className="dsh-ig-viewer-tools" role="group" aria-label={t.preview}>
      <button type="button" title={t.zoomOut} aria-label={t.zoomOut} disabled={!ready || scale <= Math.min(0.1, fit)} onClick={() => change(1 / 1.25)}><Minus size={16} /></button>
      <output>{ready ? `${Math.round(scale * 100)}%` : '–'}</output>
      <button type="button" title={t.zoomIn} aria-label={t.zoomIn} disabled={!ready || scale >= Math.max(8, fit * 2)} onClick={() => change(1.25)}><Plus size={16} /></button>
      <button type="button" title={t.original} aria-label={t.original} disabled={!ready} aria-pressed={view.scale === 1} onClick={originalSize}>1:1</button>
      <button type="button" disabled={!ready} aria-pressed={view.scale === null} onClick={() => setView(fitView)}>{t.fit}</button>
    </div>
    <div className="dsh-ig-viewer-viewport" ref={viewportRef} data-pannable={canPan}
      onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      onLostPointerCapture={event => { if (event.target === event.currentTarget && !event.currentTarget.hasPointerCapture(event.pointerId)) end(event) }}
      onDragStartCapture={event => { if (canPan) event.preventDefault() }}
      onClick={event => { if (event.target === event.currentTarget && backdropTap.current) onClose() }}
      onLoadCapture={event => {
        const img = event.target
        if (img instanceof HTMLImageElement && img.naturalWidth && img.naturalHeight) setNatural({ width: img.naturalWidth, height: img.naturalHeight })
      }}>
      <div className={`dsh-ig-viewer-frame ${frameClassName}`} style={ready ? {
        width: image.width * scale, height: image.height * scale,
        left: `calc(50% + ${panLimit(image.width, bounds.width, scale, view.x)}px)`,
        top: `calc(50% + ${panLimit(image.height, bounds.height, scale, view.y)}px)`,
      } : undefined}>{children}</div>
    </div>
  </>
}
