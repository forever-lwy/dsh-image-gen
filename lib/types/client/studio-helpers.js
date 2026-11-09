import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, LoaderCircle, X } from 'lucide-react';
import { thumbUrlFor } from '../shared.js';
import { startGalleryImageDrag } from './tl/gallery-image-transfer.js';
import { GalleryCanvasButton } from './tl/gallery-canvas-button.js';
import { fetchAttachmentBlob } from './image-cache.js';
import { formatRelativeTime } from './browser-image-utils.js';
import { PROVIDER_DEFAULT_QUALITY } from '../openai-output.js';
export const BatchCanvasItem = ({ item, index, badge, isActive, isChecked, onSelect }) => {
    const image = useAttachmentImage(item.attachment, true);
    return (_jsxs("div", { className: `dsh-ig-canvas-item ${isActive ? 'is-active' : ''} ${isChecked ? 'is-checked' : ''}`, onClick: onSelect, children: [_jsx("span", { className: `dsh-ig-canvas-badge ${badge ? 'is-model' : ''}`, title: badge, children: badge ?? `#${index + 1}` }), _jsx("span", { className: "dsh-ig-canvas-check", "aria-hidden": "true", children: isChecked ? _jsx(Check, { size: 14 }) : null }), image.url !== null ? (_jsx("img", { src: image.url, alt: item.prompt, draggable: false })) : image.loading ? (_jsx("div", { className: "dsh-ig-canvas-item-loading", children: _jsx(LoaderCircle, { className: "dsh-ig-spin", size: 24 }) })) : (_jsx("div", { className: "dsh-ig-canvas-item-loading", children: _jsx(ImagePlus, { size: 24 }) }))] }));
};
export function hasSubscriptionRatioMismatch(item) {
    if (item.provider !== 'chatgpt-sub' || item.aspectRatio === 'auto')
        return false;
    const width = item.attachment.width;
    const height = item.attachment.height;
    if (width === undefined || height === undefined || width <= 0 || height <= 0)
        return false;
    const parts = item.aspectRatio?.split(':').map(Number);
    if (parts === undefined || parts.length !== 2 || !(parts[0] > 0) || !(parts[1] > 0))
        return false;
    return Math.abs((width / height) / (parts[0] / parts[1]) - 1) > 0.12;
}
export const FieldSelect = ({ label, value, options, onChange }) => _jsxs("label", { className: "dsh-ig-field-select", children: [_jsx("span", { children: label }), _jsx("select", { value: value, onChange: event => onChange(event.target.value), children: options.map(option => _jsx("option", { value: option.value, children: option.label }, option.value)) })] });
const LOCALIZED_RATIOS = {
    auto: { zh: '自动', en: 'Auto' },
    '1:1': { zh: '1:1 方形', en: '1:1 Square' },
    '3:2': { zh: '3:2 横向', en: '3:2 Landscape' },
    '2:3': { zh: '2:3 肖像', en: '2:3 Portrait' },
    '4:3': { zh: '4:3 横向', en: '4:3 Landscape' },
    '3:4': { zh: '3:4 竖向', en: '3:4 Portrait' },
    '4:5': { zh: '4:5 肖像', en: '4:5 Portrait' },
    '5:4': { zh: '5:4 横向', en: '5:4 Landscape' },
    '16:9': { zh: '16:9 宽屏', en: '16:9 Widescreen' },
    '9:16': { zh: '9:16 竖屏', en: '9:16 Portrait' },
    '21:9': { zh: '21:9 超宽', en: '21:9 Ultrawide' },
};
const LOCALIZED_QUALITIES = {
    standard: { zh: '标准（推荐）', en: 'Standard (Recommended)' },
    auto: { zh: '自动', en: 'Auto' },
    low: { zh: '低（快速）', en: 'Low (Fast)' },
    medium: { zh: '中', en: 'Medium' },
    high: { zh: '高', en: 'High' },
    xhigh: { zh: '超高', en: 'Extra High' },
    max: { zh: '最高', en: 'Max' },
    hd: { zh: '高清', en: 'HD' },
};
export function localizeRatioOptions(options, lang) {
    return options.map(opt => ({
        value: opt.value,
        label: LOCALIZED_RATIOS[opt.value]?.[lang] ?? opt.label,
    }));
}
export function localizeQualityOptions(options, lang) {
    return options.map(opt => ({
        value: opt.value,
        label: opt.value === PROVIDER_DEFAULT_QUALITY ? (lang === 'en' ? 'Provider default (omit)' : '渠道默认（不发送）') : LOCALIZED_QUALITIES[opt.value]?.[lang] ?? opt.label,
    }));
}
export const RecentItem = memo(function RecentItem({ item, active, mode, lang, actions }) {
    const [setRef, inView] = useInView();
    const [hovered, setHovered] = useState(false);
    const [thumbFailed, setThumbFailed] = useState(false);
    const [thumbAttempt, setThumbAttempt] = useState(0);
    // The tile renders the host 320 px variant; the original is fetched only
    // while the pointer is over it, for drag-out and canvas handoff.
    const image = useAttachmentImage(item.attachment, inView && (hovered || active || thumbFailed));
    const thumbSource = thumbUrlFor(item.attachment) + (thumbAttempt === 0 ? '' : '&retry=1');
    const thumbUrl = thumbFailed ? image.url : thumbSource;
    return (_jsxs("div", { className: `dsh-ig-recent-item ${active ? 'is-active' : ''}`, onPointerEnter: () => setHovered(true), onPointerDown: () => setHovered(true), onPointerLeave: () => setHovered(false), children: [_jsx("button", { ref: setRef, type: "button", className: "dsh-ig-recent-select", onClick: () => { if (mode === 'favorite')
                    actions.favorite(item);
                else
                    actions.select(item); }, title: item.prompt, draggable: true, onDragStart: event => { startGalleryImageDrag(event, item, image.blob); }, children: _jsx("div", { className: "dsh-ig-recent-thumb", children: thumbUrl !== null && thumbUrl !== undefined
                        ? _jsx("img", { src: thumbUrl, alt: "", loading: "lazy", decoding: "async", draggable: false, onError: () => { if (thumbAttempt === 0)
                                setThumbAttempt(1);
                            else
                                setThumbFailed(true); } })
                        : _jsx(ImagePlus, { size: 18 }) }) }), _jsx(GalleryCanvasButton, { item: item, lang: lang, className: "dsh-ig-recent-send", onToast: actions.toast })] }));
});
export const FavoriteFolderBar = ({ folders, active, onSelect, onDelete, deleteLabel }) => {
    if (folders.length === 0)
        return null;
    return (_jsx("div", { className: "dsh-ig-fav-folders", children: folders.map(folder => (_jsxs("span", { className: `dsh-ig-fav-folder-chip ${active === folder.id ? 'is-active' : ''}`, children: [_jsx("button", { type: "button", onClick: () => onSelect(folder.id), children: folder.name }), _jsx("button", { type: "button", className: "dsh-ig-fav-folder-del", title: deleteLabel, onClick: () => onDelete(folder.id), children: _jsx(X, { size: 9 }) })] }, folder.id))) }));
};
export function useInView() {
    const [inView, setInView] = useState(false);
    const observerRef = useRef(null);
    useEffect(() => {
        return () => {
            observerRef.current?.disconnect();
        };
    }, []);
    const refCallback = useCallback((el) => {
        observerRef.current?.disconnect();
        if (!el || inView)
            return;
        if (typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }
        const observer = new IntersectionObserver(([entry]) => {
            if (entry?.isIntersecting) {
                setInView(true);
                observer.disconnect();
            }
        }, { rootMargin: '120px' });
        observerRef.current = observer;
        observer.observe(el);
    }, [inView]);
    return [refCallback, inView];
}
export function useAttachmentImage(attachment, shouldLoad = true) {
    const [value, setValue] = useState({ url: null, blob: null, loading: false });
    useEffect(() => {
        if (attachment === undefined || !shouldLoad) {
            setValue({ url: null, blob: null, loading: false });
            return;
        }
        let cancelled = false;
        let objectUrl = null;
        setValue({ url: null, blob: null, loading: true });
        fetchAttachmentBlob(attachment)
            .then(blob => {
            if (cancelled)
                return;
            objectUrl = URL.createObjectURL(blob);
            setValue({ url: objectUrl, blob, loading: false });
        })
            .catch(() => { if (!cancelled)
            setValue({ url: null, blob: null, loading: false }); });
        return () => {
            cancelled = true;
            if (objectUrl !== null)
                URL.revokeObjectURL(objectUrl);
        };
    }, [attachment?.attachmentId, shouldLoad]);
    return value;
}
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const commaIndex = result.indexOf(',');
            resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        };
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file'));
        reader.readAsDataURL(file);
    });
}
export function extension(mediaType) {
    return mediaType === 'image/jpeg' ? 'jpg' : mediaType.split('/')[1] ?? 'png';
}
export function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=studio-helpers.js.map