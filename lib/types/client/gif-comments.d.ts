import { type StudioConfigResponse } from '../shared.js';
import type { GifT } from './gif-i18n.js';
import { type GifPlayer, type GifPlayerSnapshot } from './gif-player.js';
import { type GifComment, type GifSheetPlan } from './gif-sheet.js';
export type GifEditAvailability = 'ready' | 'frame-count' | 'unsupported' | 'decoding' | 'unloaded';
/**
 * Whether the animation can be edited, and why not: only OpenAI-shaped
 * providers take the edit request, the frames must be decoded (the sheet is
 * built from them) and their number must be one the GIF contract can ask for.
 * Once decoded, the frames themselves are counted, whatever the header says:
 * they are what the sheet and the request use.
 */
export declare function gifEditAvailability(input: {
    provider: string;
    animated: boolean;
    snapshot: Pick<GifPlayerSnapshot, 'status' | 'frames' | 'info'> | undefined;
}): GifEditAvailability | undefined;
/**
 * The model for the edit: the channel's separate editing model when it has
 * one (the server takes nothing else for an edit); otherwise the model that
 * drew this animation while the channel still offers it, else the channel's
 * default; the card's own model when the channel is gone.
 */
export declare function gifEditModel(config: Pick<StudioConfigResponse, 'providers' | 'activeChannel'>, image: {
    provider: string;
    channel?: string | undefined;
    model: string;
}): string;
export declare function fetchGifEditModel(image: {
    provider: string;
    channel?: string | undefined;
    model: string;
}, signal: AbortSignal): Promise<string>;
/** What a key does in a note box: Enter confirms, Escape closes, and an input method still composing keeps every key. */
export declare function commentKeyAction(event: {
    key: string;
    nativeEvent: {
        isComposing: boolean;
    };
}): 'confirm' | 'close' | undefined;
/** The card's edit chip, opposite the speed chip; it opens the lightbox straight in edit mode. */
export declare function GifEditChip({ availability, t, disabled, onOpen }: {
    availability: GifEditAvailability | undefined;
    t: GifT;
    disabled: boolean;
    onOpen(): void;
}): import("react").JSX.Element | null;
/** The player bar's editing switch. */
export declare function GifEditToggle({ availability, editing, t, onToggle }: {
    availability: GifEditAvailability;
    editing: boolean;
    t: GifT;
    onToggle(): void;
}): import("react").JSX.Element;
export interface GifCommentBarProps {
    view: 'gif' | 'sheet';
    /** One-based frame on screen. */
    current: number;
    total: number;
    count: number;
    sending: boolean;
    /** The answer to the request just sent. */
    error?: string | undefined;
    /** What the error most likely means, when it came from the channel. */
    errorHint?: string | undefined;
    t: GifT;
    onView(view: 'gif' | 'sheet'): void;
    onClear(): void;
    onCancel(): void;
    onSend(): void;
    onFallback(): void;
}
/** The edit bar under the player: what to do, the count, the view switch and the actions. */
export declare function GifCommentBar({ view, current, total, count, sending, error, errorHint, t, onView, onClear, onCancel, onSend, onFallback }: GifCommentBarProps): import("react").JSX.Element;
export interface GifCommentLayerProps {
    player: GifPlayer;
    editing: boolean;
    view: 'gif' | 'sheet';
    /** Every frame tiled when editing began; shown scaled in the sheet view. */
    sheet: {
        canvas: HTMLCanvasElement;
        plan: GifSheetPlan;
    } | undefined;
    comments: readonly GifComment[];
    onChange(comments: GifComment[]): void;
    t: GifT;
}
/**
 * Over the frame on screen: in editing, a layer that places a note on the
 * frame (pausing first), and that frame's pins; outside editing, the pins of a
 * paused frame, which open to read. In the sheet view every cell is a click
 * target and every pin is shown in its cell. Keys typed in a box stay in it:
 * Enter posts or saves, Escape closes only the box.
 */
export declare function GifCommentLayer({ player, editing, view, sheet, comments, onChange, t }: GifCommentLayerProps): import("react").JSX.Element;
