import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { GifFilmstrip } from './gif-filmstrip.js';
import { GifSpeedControl } from './gif-menus.js';
import { useGifPlaying, useGifStatus } from './gif-player.js';
/**
 * The lightbox player: play/pause, the frame strip and the speed. The bar is
 * in place from the first render; frame controls wait for decoded frames,
 * the speed only for the file's bytes, which a speed-named download retimes.
 */
export function GifPlayerBar({ player, t, className, trailing, stripHint, marks }) {
    const status = useGifStatus(player);
    const playing = useGifPlaying(player);
    const playLabel = playing ? t('gifPause') : t('gifPlay');
    return _jsxs("div", { className: className === undefined ? 'dsh-ig-gif-bar' : `dsh-ig-gif-bar ${className}`, role: "toolbar", "aria-label": t('gifControls'), title: status === 'fallback' ? t('gifControlsUnavailable') : undefined, onClick: event => { event.stopPropagation(); }, children: [_jsx("button", { type: "button", className: "dsh-ig-gif-play", "aria-label": playLabel, title: playing ? t('gifPauseTitle') : t('gifPlayTitle'), disabled: status !== 'ready', onClick: () => { player.toggle(); }, children: playing
                    ? _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true", children: [_jsx("rect", { x: "6", y: "4", width: "4", height: "16", rx: "1" }), _jsx("rect", { x: "14", y: "4", width: "4", height: "16", rx: "1" })] })
                    : _jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M7 4.5v15a1 1 0 0 0 1.5.87l13-7.5a1 1 0 0 0 0-1.74l-13-7.5A1 1 0 0 0 7 4.5z" }) }) }), _jsx(GifFilmstrip, { player: player, t: t, hint: stripHint, marks: marks }), _jsx(GifSpeedControl, { player: player, t: t, variant: "bar" }), trailing] });
}
//# sourceMappingURL=gif-controls.js.map