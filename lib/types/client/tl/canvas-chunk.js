/**
 * Entry of the lazily loaded `client.canvas.js` chunk: tldraw, its stylesheet
 * and the canvas component. The main bundle loads it through
 * lazy-studio-canvas.tsx only when an infinite canvas is first shown.
 */
// Must stay first: shims CSS.supports before tldraw's module-scope probe runs.
import './css-supports-shim.js';
export { StudioTlCanvas } from './studio-tl-canvas.js';
export { TL_CSS } from './tl-css.js';
//# sourceMappingURL=canvas-chunk.js.map