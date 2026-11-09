/** Close plugin datalist popups on deliberate scrolling without stealing new focus. */
type Listener = (event?: {
    key?: string;
    target?: unknown;
}) => void;
interface EventTargetLike {
    addEventListener(type: string, listener: Listener, capture?: boolean): void;
    removeEventListener(type: string, listener: Listener, capture?: boolean): void;
}
export interface FocusableElement {
    tagName: string;
    hasAttribute(name: string): boolean;
    blur(): void;
}
export interface DatalistScrollFixEnvironment {
    window: EventTargetLike & Record<string, unknown>;
    document: EventTargetLike & {
        activeElement: FocusableElement | null;
    };
    /** Return a cancellation callback when the scheduler supports cancellation. */
    schedule?: (callback: Listener) => void | (() => void);
    ownsInput?: (element: FocusableElement) => boolean;
}
export declare function isDatalistInput(element: FocusableElement | null): boolean;
export declare function closeDatalistPopup(element: FocusableElement | null): boolean;
/**
 * Automatic scrolling after Tab/focus or virtual-keyboard resize must not blur
 * the input. Only scrolling preceded by a wheel/touch/scrollbar/key gesture can
 * dismiss the popup, and its original focus must still be current.
 */
export declare function installDatalistScrollFix(environment?: DatalistScrollFixEnvironment): false | (() => void);
export {};
