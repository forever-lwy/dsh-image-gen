import { type GifOutputRequest, type StudioGenerateRequest, type StudioWatermark } from '../shared.js';
import { type GifInfo } from '../gif-info.js';
export interface RegeneratableImage {
    provider: string;
    channel?: string | undefined;
    model: string;
    output?: string | undefined;
}
/** Build the workbench request that reproduces a conversation image with an edited prompt. */
export declare function conversationRegenerateRequest(image: RegeneratableImage, prompt: string, remembered?: {
    ratio: string;
    quality: string;
    resolution?: string | undefined;
    generationQuality?: string | undefined;
    watermark?: StudioWatermark | undefined;
} | undefined): StudioGenerateRequest;
/**
 * Ask for a GIF again, keeping whichever of the current animation's frame
 * count, frame delay and frame size the provider contract accepts; an imported
 * GIF outside the contract on one of them falls back to the provider default
 * for that field alone.
 */
export declare function gifOutputRequest(info: Pick<GifInfo, 'frames' | 'delaysMs' | 'width' | 'height'> | undefined): GifOutputRequest;
