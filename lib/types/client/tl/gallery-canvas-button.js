import { jsx as _jsx } from "react/jsx-runtime";
import { useSyncExternalStore } from 'react';
import { Frame } from 'lucide-react';
import { galleryLanding } from './gallery-image-transfer.js';
import { hasTlLandingConsumer, sendTlLandingToOpenCanvas, subscribeTlLandingAvailability } from './tl-canvas-bridge.js';
/** An explicit alternative to native dragging, including a visible unavailable state. */
export const GalleryCanvasButton = ({ item, lang, disabled, className, onToast }) => {
    const available = useSyncExternalStore(subscribeTlLandingAvailability, hasTlLandingConsumer, () => false);
    const open = lang === 'en' ? 'Open the infinite canvas first' : '请先打开无限画布';
    const title = !available ? open : disabled
        ? lang === 'en' ? 'Wait for the image to load' : '请等待图片加载完成'
        : lang === 'en' ? 'Send to canvas' : '发送到画布';
    return _jsx("button", { type: "button", className: className, title: title, "aria-label": title, disabled: !available || disabled, onClick: event => {
            event.stopPropagation();
            const sent = sendTlLandingToOpenCanvas(galleryLanding(item));
            onToast(sent ? lang === 'en' ? 'Sent to canvas' : '已发送到画布' : open);
        }, children: _jsx(Frame, { size: 14 }) });
};
//# sourceMappingURL=gallery-canvas-button.js.map