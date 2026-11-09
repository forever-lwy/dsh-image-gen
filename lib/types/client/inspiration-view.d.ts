import { type FC } from 'react';
import type { InspirationCatalog } from '../inspiration.js';
import type { LocaleService } from './gallery-view.js';
export declare const InspirationView: FC<{
    locale?: LocaleService | undefined;
    onUsePrompt(prompt: string): void;
    onUseReference?: ((file: File, prompt: string) => void) | undefined;
}>;
export declare function resolveActiveCatalog(bundled?: InspirationCatalog, cached?: InspirationCatalog): InspirationCatalog | undefined;
