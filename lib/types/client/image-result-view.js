import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { imageRef } from './image-ref.js';
import { imageResultsFromMeta, imageVersionKey, originalFromMeta } from './image-result-node.js';
import { appendConversationImageRevision, loadConversationImageRevisionChain, selectConversationImageRevision, } from './conversation-image-revisions.js';
import { saveGalleryItem } from './gallery-store.js';
import { persistGalleryRecord } from './gallery-media.js';
import { copyImageBlob } from './gallery-view.js';
import { fetchAttachmentBlob } from './image-cache.js';
import { DICT, usePluginLanguage } from './plugin-i18n.js';
import { CLOUD_IMAGE_PROVIDERS, STUDIO_ROUTE } from '../shared.js';
import { conversationRegenerateRequest, gifOutputRequest } from './conversation-regenerate.js';
import { GifCardOverlay, GifToolbarDownload, useGifCard } from './gif-card.js';
import { GifCardEditChip, GifEditLightbox, GifEditNotice, useGifEdit } from './gif-edit.js';
import { GifStage } from './gif-player.js';
import { startGalleryImageDrag } from './tl/gallery-image-transfer.js';
export function GeneratedImageCard(props) {
    const result = imageResultFromBlock(props.block);
    if (props.promoted && result !== undefined)
        return _jsx(PromotedResultNotice, { locale: props.locale });
    return _jsx(ImageResultCard, { result: result, locale: props.locale, sessionId: props.sessionId, openFile: props.openFile });
}
/** Suppress the folded duplicate on modern hosts; render every image on legacy hosts. */
export function GeneratedImagesCard(props) {
    const block = props.block;
    let results = imageResultsFromMeta(block.meta ?? block.resultView?.meta);
    if (results.length === 0 && 'kind' in block) {
        const content = block.resultView?.card === 'generic' ? block.resultView.content : block.content;
        results = (content ?? []).flatMap(item => item.type === 'image' && item.attachment !== undefined
            ? [{ attachment: item.attachment, prompt: 'Generated Image', provider: '', model: '', output: '' }]
            : []);
    }
    if (props.promoted && results.length > 0)
        return _jsx(PromotedResultNotice, { locale: props.locale });
    if (results.length === 0) {
        if (!('kind' in block))
            return _jsx(ImageResultCard, { locale: props.locale });
        const content = block.content ?? block.resultView?.content ?? [];
        return _jsx("div", { children: content.filter(item => item.type === 'text').map((item, index) => _jsx("p", { children: item.text }, index)) });
    }
    return _jsx("div", { className: "dsh-ig-promoted-results", children: results.map((result, index) => _jsx(ImageResultCard, { result: result, locale: props.locale, sessionId: props.sessionId, openFile: props.openFile }, `${result.attachment.attachmentId}:${index}`)) });
}
/** Render modern image artifacts as final conversation output instead of Tool process content. */
export function PromotedImageResultNode(props) {
    return _jsx("div", { className: "dsh-ig-promoted-results", children: props.node.data.results.map((result, index) => _jsx(ImageResultCard, { result: result, locale: props.locale, sessionId: props.sessionId, openFile: props.openFile }, `${result.attachment.attachmentId}:${index}`)) });
}
function PromotedResultNotice({ locale }) {
    const lang = usePluginLanguage(locale);
    return _jsx("div", { className: "dsh-ig-loading", children: DICT[lang].resultShown });
}
function ImageResultCard({ result, locale, sessionId, openFile, }) {
    const attachment = result?.attachment;
    const originId = attachment?.attachmentId;
    const [revisionChain, setRevisionChain] = useState(() => loadConversationImageRevisionChain(String(originId ?? '')));
    const selectedRevision = revisionChain.revisions[revisionChain.currentIndex - 1];
    const activeAttachment = selectedRevision?.attachment ?? attachment;
    // The animation follows the version on display: a still revision of a GIF
    // card must not borrow the base animation.
    const activeOriginal = selectedRevision === undefined ? result?.original : selectedRevision.original;
    const activeResult = selectedRevision !== undefined ? {
        prompt: selectedRevision.prompt,
        provider: selectedRevision.provider,
        ...(selectedRevision.channel === undefined ? {} : { channel: selectedRevision.channel }),
        model: selectedRevision.model,
        output: selectedRevision.output,
        createdAt: selectedRevision.createdAt,
        ...(result?.sourceAttachmentIds !== undefined && result.sourceAttachmentIds.length > 0
            ? { sourceAttachmentIds: result.sourceAttachmentIds }
            : {}),
    } : result;
    const savedTo = result?.savedTo;
    const [url, setUrl] = useState();
    const [blob, setBlob] = useState();
    const [error, setError] = useState();
    const [previewOpen, setPreviewOpen] = useState(false);
    const [toast, setToast] = useState();
    const [regenerateOpen, setRegenerateOpen] = useState(false);
    const [regeneratePrompt, setRegeneratePrompt] = useState('');
    const [regenerateError, setRegenerateError] = useState();
    // Set when the dialog regenerates from frame notes instead of the plain prompt.
    const [regenerateHint, setRegenerateHint] = useState();
    const [isRegenerating, setIsRegenerating] = useState(false);
    const regenerateControllerRef = useRef();
    const regenerateTextareaRef = useRef(null);
    const lang = usePluginLanguage(locale);
    const t = (keyName, params) => {
        const dict = lang === 'en' ? DICT.en : DICT.zh;
        let text = dict[keyName] || DICT.zh[keyName] || keyName;
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                text = text.replace(`{${k}}`, v);
            }
        }
        return text;
    };
    const baseGalleryRecord = (presentation) => ({
        id: imageVersionKey(String(presentation.attachment.attachmentId), presentation.original),
        attachment: presentation.attachment,
        prompt: presentation.prompt,
        provider: presentation.provider,
        ...(presentation.channel === undefined ? {} : { channel: presentation.channel }),
        model: presentation.model,
        output: presentation.output,
        ...(presentation.savedTo ? { savedTo: presentation.savedTo } : {}),
        ...(presentation.seed !== undefined ? { seed: presentation.seed } : {}),
        ...(presentation.sourceAttachmentIds !== undefined && presentation.sourceAttachmentIds.length > 0
            ? { sourceAttachmentIds: [...presentation.sourceAttachmentIds] }
            : {}),
        ...(sessionId ? { sessionId } : {}),
        ...(presentation.original === undefined ? {} : { original: presentation.original }),
    });
    const revisionGalleryRecord = (revision) => ({
        id: imageVersionKey(String(revision.attachment.attachmentId), revision.original),
        attachment: revision.attachment,
        prompt: revision.prompt,
        provider: revision.provider,
        ...(revision.channel === undefined ? {} : { channel: revision.channel }),
        model: revision.model,
        createdAt: revision.createdAt,
        aspectRatio: revision.ratio,
        imageSize: revision.quality,
        resolution: revision.resolution,
        generationQuality: revision.generationQuality,
        watermark: revision.watermark,
        output: revision.output,
        ...(savedTo ? { savedTo } : {}),
        ...(sessionId ? { sessionId } : {}),
        ...(revision.original === undefined ? {} : { original: revision.original }),
    });
    const currentGalleryRecord = () => selectedRevision !== undefined ? revisionGalleryRecord(selectedRevision) : result === undefined ? undefined : baseGalleryRecord(result);
    const [gifPopupOpen, setGifPopupOpen] = useState(false);
    const gif = useGifCard({
        lang,
        original: activeOriginal,
        attachmentMediaType: activeAttachment?.mediaType,
        attachmentBlob: blob,
        onOriginalGone: () => {
            const record = currentGalleryRecord();
            if (record !== undefined)
                void saveGalleryItem({ ...record, original: undefined });
        },
    });
    const edit = useGifEdit({
        gif,
        image: originId ? activeResult : undefined,
        versionKey: activeAttachment === undefined ? undefined : imageVersionKey(String(activeAttachment.attachmentId), activeOriginal),
        busy: { running: isRegenerating, setRunning: setIsRegenerating, controller: regenerateControllerRef },
        addRevision: async (revision) => {
            const savedOk = await persistGalleryRecord(revisionGalleryRecord(revision));
            setRevisionChain(appendConversationImageRevision(String(originId), revision));
            return savedOk;
        },
        onSent: message => {
            setPreviewOpen(false);
            setToast(message);
            setTimeout(() => { setToast(undefined); }, 3500);
        },
        onFallback: (prompt, hint) => {
            setPreviewOpen(false);
            setRegeneratePrompt(prompt);
            setRegenerateError(undefined);
            setRegenerateHint(hint);
            setRegenerateOpen(true);
        },
    });
    // Historical cards still populate the gallery. Canvas delivery subscribes
    // to live session events instead, so mounting old cards cannot replay images.
    useEffect(() => {
        if (result === undefined)
            return;
        void persistGalleryRecord(baseGalleryRecord(result));
    }, [result?.attachment.attachmentId]);
    useEffect(() => {
        if (!originId)
            return;
        regenerateControllerRef.current?.abort();
        regenerateControllerRef.current = undefined;
        setIsRegenerating(false);
        setRegenerateOpen(false);
        setRevisionChain(loadConversationImageRevisionChain(String(originId)));
    }, [originId]);
    useEffect(() => () => { regenerateControllerRef.current?.abort(); }, []);
    useEffect(() => {
        if (!regenerateOpen || isRegenerating)
            return;
        const frame = requestAnimationFrame(() => {
            regenerateTextareaRef.current?.focus();
            regenerateTextareaRef.current?.select();
        });
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                setRegenerateOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [regenerateOpen, isRegenerating]);
    useEffect(() => {
        if (!previewOpen)
            return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape')
                setPreviewOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => { window.removeEventListener('keydown', onKeyDown); };
    }, [previewOpen]);
    const currentUrlRef = useRef();
    useEffect(() => {
        return () => {
            if (currentUrlRef.current !== undefined) {
                URL.revokeObjectURL(currentUrlRef.current);
                currentUrlRef.current = undefined;
            }
        };
    }, []);
    useEffect(() => {
        if (activeAttachment === undefined)
            return;
        let canceled = false;
        void fetchAttachmentBlob(activeAttachment).then(resBlob => {
            if (canceled)
                return;
            setBlob(resBlob);
            setError(undefined);
            const nextUrl = URL.createObjectURL(resBlob);
            if (currentUrlRef.current !== undefined) {
                URL.revokeObjectURL(currentUrlRef.current);
            }
            currentUrlRef.current = nextUrl;
            setUrl(nextUrl);
        }).catch(cause => {
            if (canceled)
                return;
            setError(cause instanceof Error ? cause.message : String(cause));
        });
        return () => {
            canceled = true;
        };
    }, [activeAttachment?.attachmentId]);
    const copy = async (e) => {
        e.stopPropagation();
        if (gif.player !== undefined) {
            const message = await gif.copyFrame();
            if (message === undefined)
                return;
            setToast(message);
            setTimeout(() => { setToast(undefined); }, 3500);
            return;
        }
        if (!blob)
            return;
        const ok = await copyImageBlob(blob);
        setToast(ok ? t('copiedImage') : t('copyFailed'));
        setTimeout(() => { setToast(undefined); }, 2000);
    };
    const download = (e) => {
        e.stopPropagation();
        if (!url)
            return;
        const a = document.createElement('a');
        a.href = url;
        a.download = activeAttachment?.name || `dsh-image-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    // A host that opens files shows the saved one in its sidebar, and cannot open a new tab; only the conversation image has a saved file.
    const opensSavedFile = openFile !== undefined && savedTo !== undefined && selectedRevision === undefined;
    const openNewTab = (e) => {
        e.stopPropagation();
        if (opensSavedFile) {
            openFile(savedTo);
            return;
        }
        const target = gif.player?.url ?? url;
        if (!target)
            return;
        window.open(target, '_blank', 'noopener,noreferrer');
    };
    /** Drag the GIF out as a file, the same bytes a download would give. */
    const onDragStart = (event) => {
        const record = currentGalleryRecord();
        if (record === undefined)
            return;
        startGalleryImageDrag(event, { createdAt: 0, ...record }, gif.file());
    };
    const openRegenerate = (event) => {
        event.stopPropagation();
        if (activeResult === undefined || isRegenerating)
            return;
        setRegeneratePrompt(activeResult.prompt);
        setRegenerateError(undefined);
        setRegenerateHint(undefined);
        setRegenerateOpen(true);
    };
    const cancelRegenerate = () => {
        regenerateControllerRef.current?.abort();
        regenerateControllerRef.current = undefined;
        setIsRegenerating(false);
        setRegenerateOpen(false);
        setRegenerateError(undefined);
    };
    const regenerate = async () => {
        if (activeResult === undefined || !originId || isRegenerating || regeneratePrompt.trim().length === 0)
            return;
        setIsRegenerating(true);
        setRegenerateError(undefined);
        // Non-blocking: close dialog immediately so user can continue chatting/scrolling!
        setRegenerateOpen(false);
        const controller = new AbortController();
        regenerateControllerRef.current = controller;
        try {
            const base = conversationRegenerateRequest(activeResult, regeneratePrompt, selectedRevision === undefined ? undefined : { ratio: selectedRevision.ratio, quality: selectedRevision.quality, resolution: selectedRevision.resolution, generationQuality: selectedRevision.generationQuality, watermark: selectedRevision.watermark });
            // An animated card asks for an animation again, with the frames and frame size it has.
            const request = gif.animated ? { ...base, output: gifOutputRequest(await gif.info()) } : base;
            const response = await fetch(STUDIO_ROUTE, {
                method: 'POST',
                credentials: 'same-origin',
                signal: controller.signal,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(request),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || payload === null || !('attachment' in payload)) {
                throw new Error(payload && 'error' in payload && payload.error ? payload.error : t('regenerateFailed'));
            }
            const original = originalFromMeta(payload.original);
            const revision = {
                attachment: payload.attachment,
                prompt: payload.prompt,
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
            const savedOk = await persistGalleryRecord(revisionGalleryRecord(revision));
            const next = appendConversationImageRevision(String(originId), revision);
            setRevisionChain(next);
            setToast(savedOk ? t('regenerate') : t('regenerateSaveFailed'));
            setTimeout(() => { setToast(undefined); }, 2000);
        }
        catch (cause) {
            if (!controller.signal.aborted) {
                const errMsg = cause instanceof Error ? cause.message : String(cause);
                setError(errMsg);
                setToast(errMsg);
                setTimeout(() => { setToast(undefined); }, 3500);
            }
        }
        finally {
            if (regenerateControllerRef.current === controller) {
                regenerateControllerRef.current = undefined;
                setIsRegenerating(false);
            }
        }
    };
    const selectVersion = (index) => {
        if (!originId || isRegenerating)
            return;
        setRevisionChain(selectConversationImageRevision(String(originId), index));
    };
    const canRegenerate = activeResult !== undefined
        && CLOUD_IMAGE_PROVIDERS.includes(activeResult.provider)
        && activeResult.model.trim().length > 0;
    const versionTotal = revisionChain.revisions.length + 1;
    const versionCurrent = revisionChain.currentIndex + 1;
    if (attachment === undefined)
        return _jsx("div", { className: "dsh-ig-loading", children: t('generating') });
    return _jsxs("section", { className: "dsh-ig-result", "aria-label": t('generatedTitle'), children: [_jsxs("div", { className: "dsh-ig-result-title", children: [t('generatedTitle'), gif.animated ? _jsx("span", { className: "dsh-ig-tag dsh-ig-gif-badge", title: gif.t('gifBadge'), children: "GIF" }) : null] }), savedTo !== undefined ? _jsxs("div", { className: "dsh-ig-savedto", children: [t('savedToPath'), ": ", openFile === undefined ? savedTo : _jsx("button", { type: "button", className: "dsh-ig-savedto-open", title: savedTo, onClick: () => { openFile(savedTo); }, children: savedTo })] }) : null, error !== undefined ? _jsx("div", { className: "dsh-ig-error", children: error }) : null, _jsx(GifEditNotice, { edit: edit }), url === undefined && error === undefined ? _jsx("div", { className: "dsh-ig-loading", children: t('loading') }) : null, url !== undefined ? _jsxs("div", { className: gifPopupOpen ? 'dsh-ig-container is-gif-open' : 'dsh-ig-container', children: [gif.player !== undefined
                        ? _jsx(GifStage, { player: gif.player, stage: "card", className: "dsh-ig-image", alt: activeAttachment?.name ?? 'Generated image', poster: url, onClick: () => { if (!isRegenerating)
                                setPreviewOpen(true); }, onDragStart: onDragStart })
                        : _jsx("img", { className: "dsh-ig-image", src: url, alt: activeAttachment?.name ?? 'Generated image', onClick: () => { if (!isRegenerating)
                                setPreviewOpen(true); } }), _jsx(GifCardOverlay, { gif: gif, onOpenChange: setGifPopupOpen }), _jsx(GifCardEditChip, { edit: edit, onOpen: () => { if (!isRegenerating)
                            setPreviewOpen(true); } }), isRegenerating ? (_jsxs("div", { className: "dsh-ig-regenerate-overlay", children: [_jsx("div", { className: "dsh-ig-regenerate-spinner" }), _jsx("span", { className: "dsh-ig-regenerate-overlay-text", children: t('regenerating') }), _jsx("button", { type: "button", className: "dsh-ig-regenerate-overlay-cancel", onClick: cancelRegenerate, children: t('cancel') })] })) : null, _jsxs("div", { className: gifPopupOpen || toast !== undefined ? 'dsh-ig-toolbar is-pinned' : 'dsh-ig-toolbar', children: [canRegenerate ? _jsx("button", { type: "button", className: "dsh-ig-tool-btn", disabled: isRegenerating, title: isRegenerating ? t('regenerating') : t('regenerate'), onClick: openRegenerate, children: _jsxs("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5" }), _jsx("path", { d: "M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" })] }) }) : null, _jsx("button", { type: "button", className: "dsh-ig-tool-btn", title: gif.player !== undefined ? gif.t('gifCopyFrame') : t('copyImg'), onClick: (e) => { void copy(e); }, children: _jsxs("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }) }), gif.player !== undefined ? _jsx(GifToolbarDownload, { gif: gif, onOpenChange: setGifPopupOpen }) : _jsx("button", { type: "button", className: "dsh-ig-tool-btn", title: t('download'), onClick: download, children: _jsxs("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }) }), _jsx("button", { type: "button", className: "dsh-ig-tool-btn", title: opensSavedFile ? gif.t('openInSidebar') : openFile !== undefined ? gif.t('notSavedVersion') : t('openNewTab'), disabled: openFile !== undefined && !opensSavedFile, onClick: openNewTab, children: _jsxs("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }), _jsx("polyline", { points: "15 3 21 3 21 9" }), _jsx("line", { x1: "10", y1: "14", x2: "21", y2: "3" })] }) }), toast ? _jsx("div", { className: "dsh-ig-toast", children: toast }) : null] }), versionTotal > 1 ? _jsxs("div", { className: "dsh-ig-version-nav", "aria-label": t('versionLabel', { current: String(versionCurrent), total: String(versionTotal) }), children: [_jsx("button", { type: "button", title: t('versionPrevious'), disabled: revisionChain.currentIndex === 0 || isRegenerating, onClick: (event) => { event.stopPropagation(); selectVersion(revisionChain.currentIndex - 1); }, children: "\u2039" }), _jsxs("span", { className: "dsh-ig-version-count", children: [versionCurrent, "/", versionTotal] }), _jsx("button", { type: "button", title: t('versionNext'), disabled: revisionChain.currentIndex >= revisionChain.revisions.length || isRegenerating, onClick: (event) => { event.stopPropagation(); selectVersion(revisionChain.currentIndex + 1); }, children: "\u203A" })] }) : null] }) : null, previewOpen && url !== undefined && gif.player !== undefined
                ? _jsx(GifEditLightbox, { edit: edit, gif: gif, player: gif.player, alt: activeAttachment?.name ?? 'Generated image preview', poster: url, onClose: () => { setPreviewOpen(false); }, onDragStart: onDragStart })
                : null, previewOpen && url !== undefined && gif.player === undefined ? _jsx("div", { className: "dsh-ig-lightbox-backdrop", onClick: () => { setPreviewOpen(false); }, children: _jsx("div", { className: "dsh-ig-lightbox-img-wrap", onClick: (e) => { e.stopPropagation(); }, children: _jsx("img", { className: "dsh-ig-lightbox-img", src: url, alt: activeAttachment?.name ?? 'Generated image preview' }) }) }) : null, regenerateOpen && activeResult !== undefined ? _jsx("div", { className: "dsh-ig-regenerate-backdrop", onMouseDown: (event) => {
                    if (event.target === event.currentTarget && !isRegenerating)
                        setRegenerateOpen(false);
                }, children: _jsxs("div", { className: "dsh-ig-regenerate-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": `dsh-ig-regenerate-${String(originId)}`, children: [_jsx("h3", { id: `dsh-ig-regenerate-${String(originId)}`, children: t('regenerateTitle') }), _jsx("p", { children: regenerateHint ?? t('regenerateHint') }), _jsxs("label", { children: [_jsx("span", { children: t('prompt') }), _jsx("textarea", { ref: regenerateTextareaRef, value: regeneratePrompt, disabled: isRegenerating, onChange: (event) => setRegeneratePrompt(event.target.value), onKeyDown: (event) => {
                                        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                                            event.preventDefault();
                                            void regenerate();
                                        }
                                    } })] }), regenerateError ? _jsx("p", { className: "dsh-ig-regenerate-error", role: "alert", children: regenerateError }) : null, _jsxs("div", { className: "dsh-ig-regenerate-actions", children: [_jsx("button", { type: "button", className: "dsh-ig-regenerate-cancel", onClick: cancelRegenerate, children: t('cancel') }), _jsx("button", { type: "button", className: "dsh-ig-regenerate-confirm", disabled: isRegenerating || regeneratePrompt.trim().length === 0, onClick: () => { void regenerate(); }, children: t('confirmRegenerate') })] })] }) }) : null] });
}
function imageResultFromBlock(block) {
    const attachment = imageRef(block);
    if (attachment === undefined)
        return undefined;
    const blockValue = block;
    const meta = blockValue.meta ?? blockValue.resultView?.meta;
    const sourceIds = Array.isArray(blockValue.call?.args?.source_attachment_ids)
        ? blockValue.call?.args?.source_attachment_ids
        : typeof blockValue.call?.args?.source_attachment_id === 'string'
            ? [blockValue.call?.args?.source_attachment_id]
            : undefined;
    const original = originalFromMeta(meta?.original);
    return {
        attachment,
        prompt: typeof meta?.prompt === 'string' ? meta.prompt : blockValue.call?.args?.prompt ?? 'Generated Image',
        provider: typeof meta?.provider === 'string' ? meta.provider : 'google',
        model: typeof meta?.model === 'string' ? meta.model : '',
        output: typeof meta?.output === 'string' ? meta.output : '',
        ...(typeof meta?.savedTo === 'string' ? { savedTo: meta.savedTo } : {}),
        ...(typeof meta?.seed === 'number' ? { seed: meta.seed } : {}),
        ...(sourceIds !== undefined && sourceIds.length > 0 ? { sourceAttachmentIds: sourceIds } : {}),
        ...(original === undefined ? {} : { original }),
    };
}
//# sourceMappingURL=image-result-view.js.map