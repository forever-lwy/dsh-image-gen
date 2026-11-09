/** Multi-provider image-generation Bundle for DeepSeek Harness. */
import type { Context } from '@deepseek-ai/cordis';
import { Config } from './config.js';
export { Config } from './config.js';
export { IMAGE_ROUTE, DELETE_ROUTE, SAVE_WORKSPACE_ROUTE, imageAttachmentFromMeta } from './image-route.js';
export { IMPORT_ROUTE } from './shared.js';
export { STUDIO_ROUTE } from './shared.js';
export { INSPIRATION_ROUTE } from './shared.js';
export { TEST_CONNECTION_ROUTE } from './shared.js';
export { CANVAS_STATE_ROUTE } from './shared.js';
export declare const name = "dsh-image-gen";
export declare const inject: string[];
export declare function apply(ctx: Context, config?: Config): void;
