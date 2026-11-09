import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { GIF_SPEED_MAX, GIF_SPEED_MIN, GIF_SPEED_STEP, formatSpeed, gifDownloadLabel, useGifReadable, useGifSnapshot, useGifSpeed } from './gif-player.js';
/**
 * Close a popup on a press outside it or on Escape, returning focus to its
 * trigger. Escape is taken in the capture phase and stopped, so the lightbox
 * listening on the window stays open.
 */
function useDismiss(open, close, root, trigger) {
    useEffect(() => {
        if (!open)
            return;
        const onPointerDown = (event) => {
            if (event.target instanceof Node && root.current?.contains(event.target) !== true)
                close();
        };
        const onKeyDown = (event) => {
            if (event.key !== 'Escape')
                return;
            event.preventDefault();
            event.stopPropagation();
            close();
            trigger.current?.focus();
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, [open]);
}
function usePopup(onOpenChange) {
    const [open, setOpen] = useState(false);
    const root = useRef(null);
    const trigger = useRef(null);
    const latest = useRef({ open, onOpenChange });
    latest.current = { open, onOpenChange };
    const change = (next) => {
        setOpen(next);
        onOpenChange?.(next);
    };
    // Unmounted while open (the card turned still): the owner still hears it closed, or it stays pinned open.
    useEffect(() => () => { if (latest.current.open)
        latest.current.onOpenChange?.(false); }, []);
    useDismiss(open, () => { change(false); }, root, trigger);
    return { open, root, trigger, toggle: () => { change(!open); }, close: () => { change(false); } };
}
const FASTER = _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", "aria-hidden": "true", children: [_jsx("path", { d: "M4 17a8 8 0 0 1 16 0" }), _jsx("path", { d: "M12 17l4.5-5" })] });
const SLOWER = _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", "aria-hidden": "true", children: [_jsx("path", { d: "M4 17a8 8 0 0 1 16 0" }), _jsx("path", { d: "M12 17l-4.5-5" })] });
/**
 * The speed slider: a native range for keys and assistive tech, drawn as a
 * vertical track. It carries no numbers; the trigger shows the value.
 */
export function GifSpeedPanel({ speed, t, onChange }) {
    const percent = (value) => `${String((value - GIF_SPEED_MIN) / (GIF_SPEED_MAX - GIF_SPEED_MIN) * 100)}%`;
    const style = { '--dsh-ig-speed-pct': percent(speed), '--dsh-ig-speed-one': percent(GIF_SPEED_MAX + GIF_SPEED_MIN - 1) };
    return _jsxs("div", { className: "dsh-ig-speed-panel", role: "dialog", "aria-label": t('gifSpeed'), onClick: event => { event.stopPropagation(); }, children: [_jsx("span", { className: "dsh-ig-speed-icon", title: t('gifFaster'), children: FASTER }), _jsxs("div", { className: "dsh-ig-speed-track", style: style, children: [_jsx("span", { className: "dsh-ig-speed-rail" }), _jsx("span", { className: "dsh-ig-speed-fill" }), _jsx("span", { className: "dsh-ig-speed-one" }), _jsx("span", { className: "dsh-ig-speed-knob" }), _jsx("input", { className: "dsh-ig-speed-input", type: "range", min: GIF_SPEED_MIN, max: GIF_SPEED_MAX, step: GIF_SPEED_STEP, value: speed, "aria-label": t('gifSpeed'), "aria-valuetext": `${formatSpeed(speed)}×`, title: t('gifSpeedHint'), autoFocus: true, onChange: event => { onChange(Number(event.target.value)); }, onDoubleClick: () => { onChange(1); } })] }), _jsx("span", { className: "dsh-ig-speed-icon", title: t('gifSlower'), children: SLOWER })] });
}
/** The speed trigger and its panel: a chip on the card, a button in the lightbox bar. */
export function GifSpeedControl({ player, t, variant, onOpenChange }) {
    const speed = useGifSpeed(player) ?? 1;
    const readable = useGifReadable(player);
    const popup = usePopup(onOpenChange);
    const label = `${formatSpeed(speed)}×`;
    return _jsxs("div", { ref: popup.root, className: `dsh-ig-speed dsh-ig-speed-${variant}`, children: [_jsx("button", { ref: popup.trigger, type: "button", className: variant === 'chip' ? 'dsh-ig-gif-chip dsh-ig-speed-trigger' : 'dsh-ig-speed-trigger', title: t('gifSpeed'), "aria-label": `${t('gifSpeed')} ${label}`, "aria-haspopup": "dialog", "aria-expanded": popup.open, disabled: !readable, onClick: event => { event.stopPropagation(); popup.toggle(); }, children: label }), popup.open ? _jsx(GifSpeedPanel, { speed: speed, t: t, onChange: value => { player.setSpeed(value); } }) : null] });
}
/** The GIF at the speed it plays, the original timing when that differs, and the frame on screen (one-based). */
export function gifDownloadItems(t, speed, framesReady, frame) {
    return [
        { kind: 'gif', label: gifDownloadLabel(t, speed), hint: speed === 1 ? t('gifDownloadHintOriginal') : t('gifDownloadHintSpeed'), disabled: false },
        ...(speed === 1 ? [] : [{ kind: 'original', label: t('gifDownloadOriginal'), hint: t('gifDownloadOriginalHint'), disabled: false }]),
        { kind: 'frame', label: t('gifDownloadFrame'), hint: t('gifDownloadFrameHint', { frame: String(frame) }), disabled: !framesReady },
    ];
}
const DOWNLOAD_ICON = _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] });
const CARET = _jsx("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: _jsx("polyline", { points: "6 9 12 15 18 9" }) });
const DOWNLOAD_TRIGGER_CLASS = { toolbar: 'dsh-ig-tool-btn', lightbox: 'dsh-ig-gif-action', gallery: 'dsh-ig-lightbox-btn' };
export function GifDownloadMenu({ player, t, variant, onDownload, onOpenChange }) {
    const popup = usePopup(onOpenChange);
    return _jsxs("div", { ref: popup.root, className: `dsh-ig-dl dsh-ig-dl-${variant}`, children: [_jsxs("button", { ref: popup.trigger, type: "button", className: DOWNLOAD_TRIGGER_CLASS[variant], title: t('gifDownloadMenu'), "aria-label": t('gifDownloadMenu'), "aria-haspopup": "menu", "aria-expanded": popup.open, onClick: event => { event.stopPropagation(); popup.toggle(); }, children: [DOWNLOAD_ICON, variant === 'toolbar' ? null : _jsx("span", { children: t('gifDownloadMenu') }), CARET] }), popup.open ? _jsx(GifDownloadList, { player: player, t: t, onPick: kind => { popup.close(); onDownload(kind); } }) : null] });
}
/** The open menu; it alone follows the frame on screen, so a closed trigger never re-renders per frame. */
function GifDownloadList({ player, t, onPick }) {
    const { speed, status, index } = useGifSnapshot(player);
    return _jsx("div", { className: "dsh-ig-dl-menu", role: "menu", "aria-label": t('gifDownloadMenu'), onClick: event => { event.stopPropagation(); }, children: gifDownloadItems(t, speed, status === 'ready', index + 1).map(item => _jsxs("button", { type: "button", role: "menuitem", className: "dsh-ig-dl-item", disabled: item.disabled, onClick: () => { onPick(item.kind); }, children: [_jsx("span", { children: item.label }), _jsx("span", { className: "dsh-ig-dl-hint", children: item.hint })] }, item.kind)) });
}
//# sourceMappingURL=gif-menus.js.map