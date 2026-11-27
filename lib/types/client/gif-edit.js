import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Frame-comment editing of an animated card: the notes of each version, the
 * edit request that redraws the animation from them, and the lightbox that
 * hosts the editor. The card supplies its busy state, its version chain and
 * its regenerate dialog; gif-comments.tsx draws the editor.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { STUDIO_ROUTE } from '../shared.js';
import { blobToDataUrl } from './browser-image-utils.js';
import { GifLightbox } from './gif-card.js';
import { GifCommentBar, GifCommentLayer, GifEditChip, GifEditDoneBar, GifEditOverlay, GifEditToggle, fetchGifEditModel, gifEditAvailability } from './gif-comments.js';
import { composeFallbackPrompt, drawGifSheet, encodeSheetWithinLimit, gifEditRequest, planGifSheet } from './gif-sheet.js';
import { originalFromMeta } from './image-result-node.js';
import { readCanvasImageLimit } from './tl/canvas-selection.js';
const noSubscription = () => () => { };
/**
 * The notes of each image version, by its attachment id: they outlive the card
 * (switching sessions or scrolling it away remounts it) and never mix between
 * images. Memory only; clearing a version's notes drops its entry.
 */
const notesByVersion = new Map();
/** The workbench answered with an error, its own or the provider's; a request that never got an answer throws a plain Error. */
class StudioReplyError extends Error {
}
/** How long the reply waits before the new version is filed, so the bar is seen to fill (it takes .3s in gif-style.ts); the overlay stays until the version is filed. */
export const GIF_EDIT_FINISH_MS = 500;
/** How long the card says how an edit went when it came back unwatched: the user is busy elsewhere and may glance back late. */
export const GIF_EDIT_SENT_TOAST_MS = 8_000;
/** How long filing a new version waits for its picture: a fetch that stalls must not hold the version, or the overlay, back. */
export const GIF_EDIT_PREFETCH_WAIT_MS = 3_000;
/** Settles as `promise` does, or with undefined once `ms` have passed, whichever is first. */
export function waitAtMost(promise, ms) {
    let timer;
    const timeout = new Promise(resolve => { timer = setTimeout(() => { resolve(undefined); }, ms); });
    return Promise.race([promise, timeout]).finally(() => { clearTimeout(timer); });
}
/**
 * The redraw's estimated share after waiting this long. The channel reports
 * no progress, so the estimate rises quickly at first, slows down, and never
 * passes 90%: only the reply fills the bar.
 */
export function gifEditProgressAt(waitedMs) {
    return 0.9 * (1 - Math.exp(-Math.max(0, waitedMs) / 25_000));
}
const IDLE = { phase: undefined, seconds: 0, progress: 0, done: undefined };
/**
 * The card's send in progress and how the last one ended. It lives with the
 * card rather than the lightbox, which remounts when the new version loads,
 * and outside React state, so only the views that show the seconds re-render
 * every second.
 */
export function createGifEditStatus() {
    let snapshot = IDLE;
    const listeners = new Set();
    let current;
    let startedAt = 0;
    let redrawAt = 0;
    let timer;
    const set = (next) => {
        snapshot = { ...snapshot, ...next };
        for (const listener of listeners)
            listener();
    };
    const seconds = () => Math.round((Date.now() - startedAt) / 1000);
    const halt = () => {
        clearInterval(timer);
        timer = undefined;
    };
    const end = () => {
        halt();
        current = undefined;
    };
    return {
        subscribe: listener => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        getSnapshot: () => snapshot,
        start: () => {
            halt();
            const run = {};
            current = run;
            startedAt = Date.now();
            set({ ...IDLE, phase: 'preparing' });
            timer = setInterval(() => {
                set({ seconds: seconds(), progress: snapshot.phase === 'redrawing' ? gifEditProgressAt(Date.now() - redrawAt) : snapshot.progress });
            }, 1000);
            const live = () => current === run;
            return {
                redraw: () => {
                    if (!live())
                        return;
                    redrawAt = Date.now();
                    set({ phase: 'redrawing', progress: 0 });
                },
                finish: () => {
                    if (!live())
                        return;
                    halt();
                    set({ phase: 'finishing', seconds: seconds(), progress: 1 });
                },
                succeed: done => {
                    if (!live())
                        return;
                    end();
                    set({ ...IDLE, done });
                },
                stop: () => {
                    if (!live())
                        return;
                    end();
                    set(IDLE);
                },
            };
        },
        dismiss: () => {
            if (snapshot.done !== undefined)
                set({ done: undefined });
        },
        stop: () => {
            end();
            if (snapshot.phase !== undefined)
                set({ phase: undefined, seconds: 0, progress: 0 });
        },
    };
}
/** The new version an edit reply describes, filed under the animation's own description rather than the sheet instructions. */
function revisionFromReply(payload, request, prompt) {
    const original = originalFromMeta(payload.original);
    return {
        attachment: payload.attachment,
        prompt,
        provider: payload.provider,
        ...(payload.channel === undefined ? {} : { channel: payload.channel }),
        model: payload.model,
        output: payload.output,
        createdAt: payload.createdAt,
        ratio: request.ratio,
        quality: request.quality,
        ...(request.resolution === undefined ? {} : { resolution: request.resolution }),
        ...(request.generationQuality === undefined ? {} : { generationQuality: request.generationQuality }),
        ...(request.watermark === undefined ? {} : { watermark: request.watermark }),
        ...(original === undefined ? {} : { original }),
    };
}
/** The notes of the version on display and the edit request built from them. */
export function useGifEdit({ gif, image, versionKey, busy, addRevision, isPreviewOpen, onSent, onFallback }) {
    const { t, player } = gif;
    const [comments, setCommentsState] = useState(() => (versionKey === undefined ? [] : notesByVersion.get(versionKey) ?? []));
    const [status] = useState(createGifEditStatus);
    const readDone = () => status.getSnapshot().done;
    const done = useSyncExternalStore(status.subscribe, readDone, readDone);
    const readFinishing = () => status.getSnapshot().phase === 'finishing';
    const finishing = useSyncExternalStore(status.subscribe, readFinishing, readFinishing);
    const [error, setError] = useState();
    const [notice, setNotice] = useState();
    const [editRequested, setEditRequested] = useState(false);
    const editorOpen = useRef(false);
    useEffect(() => () => { status.stop(); }, []);
    // Notes point into the frames of one version: the version on display brings its own.
    useEffect(() => {
        setCommentsState(versionKey === undefined ? [] : notesByVersion.get(versionKey) ?? []);
        setError(undefined);
        setNotice(undefined);
    }, [versionKey]);
    // A selector over the player, so the card re-renders when editing becomes possible, not on every frame.
    const readAvailability = () => image === undefined || image.model.trim().length === 0
        ? undefined
        : gifEditAvailability({ provider: image.provider, animated: gif.animated, snapshot: player?.getSnapshot() });
    const availability = useSyncExternalStore(player?.subscribe ?? noSubscription, readAvailability, readAvailability);
    const setComments = (next) => {
        setCommentsState(next);
        if (versionKey === undefined)
            return;
        if (next.length === 0)
            notesByVersion.delete(versionKey);
        else
            notesByVersion.set(versionKey, next);
    };
    const send = (sheet) => {
        if (image === undefined || player === undefined || busy.running || comments.length === 0)
            return;
        const controller = new AbortController();
        busy.controller.current = controller;
        busy.setRunning(true);
        setError(undefined);
        setNotice(undefined);
        const run = status.start();
        // Either cancel, the overlay's or the card's, clears the overlay at once rather than when the step in flight notices.
        controller.signal.addEventListener('abort', run.stop, { once: true });
        void (async () => {
            try {
                const limit = await readCanvasImageLimit(controller.signal).catch(() => 4_000_000);
                controller.signal.throwIfAborted();
                const encoded = await encodeSheetWithinLimit(sheet.canvas, sheet.plan, limit).catch(() => { throw new Error(t('gifSheetTooLarge')); });
                const data = (await blobToDataUrl(encoded.blob)).replace(/^[^,]*,/, '');
                const model = await fetchGifEditModel(image, controller.signal);
                const request = gifEditRequest({ image, model, comments, sheet: { mediaType: encoded.mediaType, data, plan: encoded.plan }, frame: sheet.frame, speed: player.getSnapshot().speed });
                run.redraw();
                const response = await fetch(STUDIO_ROUTE, {
                    method: 'POST',
                    credentials: 'same-origin',
                    signal: controller.signal,
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(request),
                });
                const payload = await response.json().catch(() => null);
                if (!response.ok || payload === null || !('attachment' in payload)) {
                    const reported = payload !== null && 'error' in payload && payload.error ? payload.error : undefined;
                    throw reported === undefined ? new Error(t('gifEditFailed')) : new StudioReplyError(reported);
                }
                run.finish();
                // The reply is paid for: from here a cancel no longer drops it, and the full bar shows before the new version is filed.
                await new Promise(resolve => { setTimeout(resolve, GIF_EDIT_FINISH_MS); });
                const revision = revisionFromReply(payload, request, image.prompt);
                const savedOk = await addRevision(revision);
                if (controller.signal.aborted)
                    return;
                // The channel answered with a still: kept as a version so the result is not lost.
                const still = revision.original?.mediaType !== 'image/gif' && revision.attachment.mediaType !== 'image/gif';
                if (!isPreviewOpen()) {
                    onSent(still ? t('gifEditStill') : savedOk ? t('gifEditDone') : t('gifEditSaveFailed'));
                    return;
                }
                const message = still ? t('gifEditStill') : savedOk ? t('gifEditDoneHere', { seconds: String(status.getSnapshot().seconds) }) : t('gifEditSaveFailed');
                run.succeed({ message, still });
            }
            catch (cause) {
                if (controller.signal.aborted)
                    return;
                const message = (cause instanceof Error ? cause.message : String(cause)).slice(0, 300);
                // Only an answer to the request says something about the channel; a
                // sheet too large to encode or a dropped connection does not.
                const fromChannel = cause instanceof StudioReplyError;
                // The edit bar shows it now or when it is opened again; with no editor on screen the card says it too.
                setError({ message, fromChannel });
                if (!editorOpen.current)
                    setNotice(t('gifEditFailedNotice', { reason: message }));
            }
            finally {
                run.stop();
                if (busy.controller.current === controller) {
                    busy.controller.current = undefined;
                    busy.setRunning(false);
                }
            }
        })();
    };
    return {
        t,
        availability,
        comments,
        setComments,
        busy: busy.running,
        status,
        finishing,
        done,
        dismissDone: () => { status.dismiss(); },
        error,
        notice,
        editRequested,
        requestEdit: () => { setEditRequested(true); },
        takeEditRequest: () => {
            if (!editRequested)
                return false;
            setEditRequested(false);
            return true;
        },
        setEditorOpen: open => { editorOpen.current = open; },
        beginEditing: () => {
            setNotice(undefined);
            status.dismiss();
        },
        send,
        // Frees the card at once, as its own cancel does, rather than when the step in flight notices: the notes can be sent again straight away.
        cancelSend: () => {
            busy.controller.current?.abort();
            busy.controller.current = undefined;
            busy.setRunning(false);
        },
        fallback: total => {
            if (image === undefined)
                return;
            onFallback(composeFallbackPrompt(image.prompt, comments, total), t('gifEditFallbackHint'));
        },
    };
}
/** The card's edit chip, wired to open the lightbox in edit mode. */
export function GifCardEditChip({ edit, onOpen }) {
    return _jsx(GifEditChip, { availability: edit.availability, t: edit.t, disabled: edit.busy, onOpen: () => { edit.requestEdit(); onOpen(); } });
}
/** A failure that came back while no editor was on screen, under the card title. */
export function GifEditNotice({ edit }) {
    return edit.notice === undefined ? null : _jsx("div", { className: "dsh-ig-gif-edit-notice", role: "status", children: edit.notice });
}
/**
 * A finished edit in the plain image preview, which takes over when the new
 * version is a still, and for a moment while a new animation's bytes load.
 */
export function GifEditDoneDock({ edit, onFinish }) {
    if (edit.done === undefined)
        return null;
    return _jsx("div", { className: "dsh-ig-gif-dock is-plain", onClick: event => { event.stopPropagation(); }, children: _jsx(GifEditDoneBar, { done: edit.done, availability: edit.availability, t: edit.t, onFinish: onFinish }) });
}
/**
 * The GIF lightbox with the frame editor: entering edit mode pauses the
 * player and draws the sheet once (the sheet view and the request read it,
 * and it outlives frames the player releases); leaving it keeps the notes.
 * Escape leaves edit mode before it closes the lightbox. While a send runs the
 * picture is covered with its progress; an edit that comes back while the
 * editor is on screen leaves edit mode and shows the new version playing,
 * with its outcome where the edit bar was.
 */
export function GifEditLightbox({ edit, ...props }) {
    const { player, gif } = props;
    const t = gif.t;
    const status = useSyncExternalStore(edit.status.subscribe, edit.status.getSnapshot, edit.status.getSnapshot);
    const [editing, setEditing] = useState(false);
    // The frame counter needs the frame only while editing, when the player is mostly paused.
    const frameIndex = useSyncExternalStore(editing ? player.subscribe : noSubscription, () => (editing ? player.getSnapshot().index : 0), () => 0);
    const [view, setView] = useState('gif');
    // Dropped, not cleared, on leaving: a send still encoding it holds its own reference.
    const [sheet, setSheet] = useState();
    // Editing pauses on a frame; leaving it plays again if it was playing.
    const playedBefore = useRef(false);
    const enter = () => {
        const current = player.getSnapshot();
        const first = current.frames[0];
        if (current.status !== 'ready' || first === undefined)
            return;
        playedBefore.current = current.playing;
        player.pause();
        const plan = planGifSheet(current.frames.length, first.width, first.height);
        setSheet({ canvas: drawGifSheet(current.frames, plan), plan, frame: { width: first.width, height: first.height, delaysMs: [...current.delaysMs] } });
        setView('gif');
        setEditing(true);
        edit.beginEditing();
    };
    const leave = () => {
        setEditing(false);
        setSheet(undefined);
        if (playedBefore.current)
            player.play();
    };
    useEffect(() => {
        if (edit.takeEditRequest())
            enter();
    }, []);
    useEffect(() => {
        edit.setEditorOpen(editing);
        return () => { edit.setEditorOpen(false); };
    }, [editing]);
    // The paused frame and the sheet belonged to the version the edit replaced; the new one plays.
    useEffect(() => {
        if (edit.done === undefined)
            return;
        setEditing(false);
        setSheet(undefined);
    }, [edit.done]);
    useEffect(() => {
        if (!editing)
            return;
        // A note box handles its own Escape first. In the editor, dismiss only editing.
        const onKeyDown = (event) => {
            if (event.key !== 'Escape')
                return;
            event.preventDefault();
            event.stopPropagation();
            leave();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => { document.removeEventListener('keydown', onKeyDown); };
    }, [editing]);
    const clear = () => {
        const count = edit.comments.length;
        if (count === 0 || !window.confirm(t('gifCommentsClearConfirm', { count: String(count) })))
            return;
        edit.setComments([]);
    };
    const frames = new Set(edit.comments.map(comment => comment.frame));
    return _jsx(GifLightbox, { ...props, wrapClassName: editing ? (view === 'sheet' ? 'is-editing is-sheet' : 'is-editing') : undefined, sheetSize: editing && view === 'sheet' ? sheet?.plan : undefined, frameMarks: frames, stageOverlay: _jsxs(_Fragment, { children: [_jsx(GifCommentLayer, { player: player, editing: editing, view: view, sheet: sheet, comments: edit.comments, onChange: edit.setComments, t: t }), status.phase === undefined ? null : _jsx(GifEditOverlay, { phase: status.phase, progress: status.progress, t: t, onCancel: edit.cancelSend })] }), barTrailing: edit.availability === undefined ? null : _jsx(GifEditToggle, { availability: edit.availability, editing: editing, t: t, onToggle: () => { if (editing)
                leave();
            else
                enter(); } }), footer: editing ? _jsx(GifCommentBar, { view: view, current: frameIndex + 1, total: sheet?.plan.frames ?? 0, count: edit.comments.length, phase: status.phase, seconds: status.seconds, error: edit.error?.message, errorHint: edit.error?.fromChannel === true ? t('gifEditFailedHint') : undefined, t: t, onView: setView, onClear: clear, onSend: () => { if (sheet !== undefined)
                edit.send(sheet); }, onFallback: () => { edit.fallback(sheet?.plan.frames ?? player.getSnapshot().frames.length); } }) : edit.done !== undefined ? _jsx(GifEditDoneBar, { done: edit.done, availability: edit.availability, t: t, onContinue: enter, onFinish: props.onClose }) : null });
}
//# sourceMappingURL=gif-edit.js.map