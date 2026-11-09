import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { readGifInfo, retimeGif } from '../gif-info.js';
import { vaultUrlFor } from '../shared.js';
import { downloadBlobUrl } from './browser-image-utils.js';
import { GifPlayerBar } from './gif-controls.js';
import { gifT } from './gif-i18n.js';
import { GifDownloadMenu, GifSpeedControl } from './gif-menus.js';
import { GifStage, gifKeyboardAction, speedSuffix, useGifPlayer, useGifSpeed, useGifStatus } from './gif-player.js';
import { copyImageBlob } from './gallery-view.js';
function downloadFile(file, name) {
    const objectUrl = URL.createObjectURL(file);
    downloadBlobUrl(objectUrl, name);
    setTimeout(() => { URL.revokeObjectURL(objectUrl); }, 10_000);
}
/** The GIF as it plays: retimed to the playback speed once its bytes are read. */
function gifAtSpeed(player, speed) {
    const bytes = player.bytes();
    if (bytes === undefined)
        return player.blob;
    return new Blob([(retimeGif(bytes, speed) ?? bytes)], { type: 'image/gif' });
}
/** Save the GIF at its speed, at its original timing, or the frame on display, named after `stem`. */
export function downloadGif(player, kind, speed, stem) {
    if (kind === 'frame') {
        const frame = player.getSnapshot().index + 1;
        void player.captureFrame().then(still => {
            if (still !== undefined)
                downloadFile(still, `${stem}-frame${String(frame)}.png`);
        });
        return;
    }
    if (kind === 'original')
        downloadFile(player.blob, `${stem}.gif`);
    else
        downloadFile(gifAtSpeed(player, speed), `${stem}${speedSuffix(speed)}.gif`);
}
/** The animation behind a conversation card: its raw bytes, the player over them, and what a card does with them. */
export function useGifCard({ lang, original, attachmentMediaType, attachmentBlob, onOriginalGone }) {
    const t = gifT(lang);
    const gifKey = original?.mediaType === 'image/gif' ? original.key : undefined;
    const attachmentIsGif = attachmentMediaType === 'image/gif';
    const [vaultBlob, setVaultBlob] = useState();
    const [vaultGone, setVaultGone] = useState(false);
    /** The vault fetch in flight, for a regeneration that starts before it lands. */
    const vaultBlobRef = useRef();
    const goneRef = useRef(onOriginalGone);
    goneRef.current = onOriginalGone;
    useEffect(() => {
        if (gifKey === undefined) {
            vaultBlobRef.current = undefined;
            return;
        }
        let canceled = false;
        const loading = fetch(vaultUrlFor(gifKey, 'image/gif'), { credentials: 'same-origin' }).then(async (response) => {
            if (response.ok)
                return response.blob();
            // Only the vault saying the file is gone makes this a still card and
            // drops the gallery record's reference; any other failure keeps both
            // and the next mount tries again.
            if (response.status === 404)
                return undefined;
            throw new Error(`Original unavailable (${String(response.status)})`);
        });
        vaultBlobRef.current = loading.catch(() => undefined);
        void loading.then(blob => {
            if (canceled)
                return;
            if (blob !== undefined) {
                setVaultBlob(blob);
                return;
            }
            setVaultGone(true);
            goneRef.current();
        }, () => undefined);
        return () => {
            canceled = true;
            setVaultBlob(undefined);
            setVaultGone(false);
        };
    }, [gifKey]);
    const player = useGifPlayer(gifKey !== undefined ? vaultBlob : attachmentIsGif ? attachmentBlob : undefined);
    const speed = useGifSpeed(player) ?? 1;
    return {
        t,
        animated: (gifKey !== undefined && !vaultGone) || attachmentIsGif,
        player,
        info: async () => {
            if (player !== undefined)
                return player.getSnapshot().info ?? readGifInfo(new Uint8Array(await player.blob.arrayBuffer()));
            const source = gifKey !== undefined ? await vaultBlobRef.current : attachmentIsGif ? attachmentBlob : undefined;
            return source === undefined ? undefined : readGifInfo(new Uint8Array(await source.arrayBuffer()));
        },
        file: () => (player === undefined ? undefined : gifAtSpeed(player, speed)),
        download: kind => {
            if (player !== undefined)
                downloadGif(player, kind, speed, `dsh-image-${String(Date.now())}`);
        },
        // The clipboard takes only still images: a decoded card copies the frame
        // on screen, one without frames yet copies the still first frame.
        copyFrame: async () => {
            if (player === undefined)
                return undefined;
            // Read before encoding: a playing card has moved on by the time the copy lands.
            const { index, frames } = player.getSnapshot();
            const frame = await player.captureFrame();
            const target = frame ?? attachmentBlob;
            if (target === undefined)
                return undefined;
            if (!(await copyImageBlob(target)))
                return t('gifCopyFailed');
            return frame === undefined ? t('gifCopiedFirstFrame') : t('gifCopiedFrame', { current: String(index + 1), total: String(frames.length) });
        },
    };
}
/** The card's speed chip; its panel opens over the image, so the card unclips while it is open. */
export function GifCardOverlay({ gif, onOpenChange }) {
    if (gif.player === undefined)
        return null;
    return _jsx("div", { className: "dsh-ig-gif-chip-slot", children: _jsx(GifSpeedControl, { player: gif.player, t: gif.t, variant: "chip", onOpenChange: onOpenChange }) });
}
/** The card's hover-toolbar download, as a menu of the GIF, its original timing and the frame on screen. */
export function GifToolbarDownload({ gif, onOpenChange }) {
    if (gif.player === undefined)
        return null;
    return _jsx(GifDownloadMenu, { player: gif.player, t: gif.t, variant: "toolbar", onDownload: gif.download, onOpenChange: onOpenChange });
}
const COPY_ICON = _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] });
const CLOSE_ICON = _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }), _jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })] });
/** The GIF lightbox: the stage, the player bar, and copy, download and close at the top right. */
export function GifLightbox({ gif, player, alt, poster, onClose, onDragStart, stageOverlay, barTrailing, footer, wrapClassName, frameMarks }) {
    const t = gif.t;
    const ready = useGifStatus(player) === 'ready';
    const [toast, setToast] = useState();
    const backdropRef = useRef(null);
    const dockRef = useRef(null);
    // The frame makes room for the bars under it, which grow with the edit bar and its messages.
    useEffect(() => {
        const dock = dockRef.current;
        const backdrop = backdropRef.current;
        if (dock === null || backdrop === null || typeof ResizeObserver === 'undefined')
            return;
        const observer = new ResizeObserver(() => { backdrop.style.setProperty('--dsh-ig-gif-dock-h', `${String(dock.offsetHeight)}px`); });
        observer.observe(dock);
        return () => { observer.disconnect(); };
    }, []);
    // Space and the arrows drive the player; a focused control keeps the keys it
    // handles itself, and the frame strip stops the ones it takes.
    useEffect(() => {
        const onKeyDown = (event) => {
            if (player.getSnapshot().status !== 'ready')
                return;
            const action = gifKeyboardAction(event.key, event.target);
            if (action === undefined)
                return;
            event.preventDefault();
            const run = { toggle: () => { player.toggle(); }, previous: () => { player.step(-1); }, next: () => { player.step(1); }, first: () => { player.first(); }, last: () => { player.last(); } };
            run[action]();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => { window.removeEventListener('keydown', onKeyDown); };
    }, [player]);
    // The card has no play button: a pause made here stays here, while the speed carries over.
    useEffect(() => () => { player.play(); }, [player]);
    useEffect(() => {
        if (toast === undefined)
            return;
        const timer = setTimeout(() => { setToast(undefined); }, 3500);
        return () => { clearTimeout(timer); };
    }, [toast]);
    return _jsxs("div", { ref: backdropRef, className: "dsh-ig-lightbox-backdrop", onClick: onClose, children: [_jsxs("div", { className: "dsh-ig-gif-actions", onClick: event => { event.stopPropagation(); }, children: [_jsx("button", { type: "button", className: "dsh-ig-gif-action", title: ready ? t('gifCopyFrame') : t('gifCopyFirstFrame'), "aria-label": ready ? t('gifCopyFrame') : t('gifCopyFirstFrame'), onClick: () => { void gif.copyFrame().then(setToast); }, children: COPY_ICON }), _jsx(GifDownloadMenu, { player: player, t: t, variant: "lightbox", onDownload: gif.download }), _jsx("button", { type: "button", className: "dsh-ig-gif-action", title: t('gifClose'), "aria-label": t('gifClose'), onClick: onClose, children: CLOSE_ICON })] }), toast !== undefined ? _jsx("div", { className: "dsh-ig-gif-toast", role: "status", children: toast }) : null, _jsxs("div", { className: wrapClassName === undefined ? 'dsh-ig-lightbox-img-wrap dsh-ig-gif-wrap' : `dsh-ig-lightbox-img-wrap dsh-ig-gif-wrap ${wrapClassName}`, onClick: event => { event.stopPropagation(); }, children: [_jsx(GifStage, { player: player, stage: "lightbox", className: "dsh-ig-lightbox-img", alt: alt, poster: poster, onDragStart: onDragStart }), stageOverlay] }), _jsxs("div", { ref: dockRef, className: "dsh-ig-gif-dock", onClick: event => { event.stopPropagation(); }, children: [_jsx(GifPlayerBar, { player: player, t: t, trailing: barTrailing, marks: frameMarks }), footer] })] });
}
//# sourceMappingURL=gif-card.js.map