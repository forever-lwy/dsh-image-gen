import { type ReactNode } from 'react';
declare const labels: {
    zh: {
        preview: string;
        close: string;
        zoomIn: string;
        zoomOut: string;
        original: string;
        fit: string;
    };
    en: {
        preview: string;
        close: string;
        zoomIn: string;
        zoomOut: string;
        original: string;
        fit: string;
    };
};
type ViewerProps = {
    lang: keyof typeof labels;
    onClose(): void;
    children: ReactNode;
};
/** The modal top layer also covers the viewport in webviews that decline native fullscreen. */
export declare function ImageLightbox({ lang, onClose, children }: ViewerProps): import("react").JSX.Element;
type Size = {
    width: number;
    height: number;
};
type Point = {
    x: number;
    y: number;
};
type View = Point & {
    scale: number | null;
};
/** Pixel coordinates are relative to the viewport centre. Keep the point being inspected under the gesture. */
export declare function moveImageView(view: View, image: Size, viewport: Size, factor: number, from: Point, to: Point): View;
/** A keyed viewport gives each image its own fit, zoom and pan, independent of the modal's lifetime. */
export declare function ImageViewport({ children, size, onInspect, frameClassName }: {
    children: ReactNode;
    size?: Size | undefined;
    onInspect?: (() => void) | undefined;
    frameClassName?: string;
}): import("react").JSX.Element;
export {};
