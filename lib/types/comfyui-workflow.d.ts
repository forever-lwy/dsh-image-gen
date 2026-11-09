export declare const COMFYUI_PROMPT_PLACEHOLDER = "{{prompt}}";
export declare const COMFYUI_SEED_PLACEHOLDER = "{{seed}}";
export declare const COMFYUI_IMAGE_PLACEHOLDER = "{{image}}";
export declare const COMFYUI_WIDTH_PLACEHOLDER = "{{width}}";
export declare const COMFYUI_HEIGHT_PLACEHOLDER = "{{height}}";
/** Frame size used for {{width}} / {{height}} when a call names no size. */
export declare const COMFYUI_DEFAULT_SIZE: {
    readonly width: 1024;
    readonly height: 1024;
};
export interface ComfyUISize {
    width: number;
    height: number;
}
/**
 * The frame size a call asks for: an exact `WIDTHxHEIGHT`, or an aspect ratio
 * mapped to its bucket. Undefined when the call names neither.
 */
export declare function comfyUIRequestedSize(size: string | undefined, aspectRatio: string | undefined): ComfyUISize | undefined;
/** What a workflow can take from a call: how many source images, and whether a frame size. */
export interface ComfyUIWorkflowSlots {
    images: number;
    size: boolean;
}
/** Inspect the placeholders of an imported workflow without preparing it. */
export declare function comfyUIWorkflowSlots(workflowJson: string): ComfyUIWorkflowSlots;
type JsonRecord = Record<string, unknown>;
/** Validate imported JSON without exposing workflow graph details to callers. */
export declare function validateComfyUIWorkflowJson(workflowJson: string): void;
/**
 * Parse, clone, and inject one prompt plus an optional randomized seed, frame
 * size and source images.
 *
 * Prompt, seed, width and height placeholders are replaced inside any string
 * so existing workflows that embed them in longer text keep working; a value
 * that is exactly the seed, width or height placeholder becomes a number. The
 * image placeholder is stricter: it only matches a dedicated `inputs.image`
 * field whose value is exactly the placeholder. Several may exist (#117); they
 * take the uploaded file names in node order, one each, and their number must
 * match the number of source images.
 */
export declare function prepareComfyUIWorkflow(workflowJson: string, prompt: string, seed?: number, images?: string | readonly string[], size?: ComfyUISize): JsonRecord;
/** The source images a call brings must fill the workflow's {{image}} inputs one to one. */
export declare function assertImageCount(imageInputs: number, sourceImages: number): void;
/** Random seed in the 32-bit range ComfyUI samplers accept. */
export declare function randomSeed(): number;
export {};
