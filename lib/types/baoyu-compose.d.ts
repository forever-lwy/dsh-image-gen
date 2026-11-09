/** Pseudo inspiration source id that switches the view into composer mode. */
export declare const BAOYU_COMPOSER_SOURCE_ID = "baoyu-compose";
export interface BaoyuPaletteColor {
    role: string;
    name: string;
    hex: string;
}
export interface BaoyuPalette {
    id: string;
    tagline: string;
    colors: BaoyuPaletteColor[];
    decorativeHints: string[];
    bestFor: string;
    pairs?: {
        name: string;
        a: string;
        b: string;
        feel: string;
    }[];
}
export interface BaoyuRendering {
    id: string;
    tagline: string;
    lines: string[];
    texture: string[];
    depth: string[];
    elements: string[];
}
export interface BaoyuType {
    id: string;
    description: string;
    composition: string;
}
export interface BaoyuMood {
    id: string;
    application: string;
}
export interface BaoyuTextLevel {
    id: string;
    area: string;
}
export interface BaoyuSelection {
    type: string;
    palette: string;
    rendering: string;
    text: string;
    mood: string;
    title: string;
}
export declare const BAOYU_TYPES: BaoyuType[];
export declare const BAOYU_PALETTES: BaoyuPalette[];
export declare const BAOYU_RENDERINGS: BaoyuRendering[];
export declare const BAOYU_TEXT_LEVELS: BaoyuTextLevel[];
export declare const BAOYU_MOODS: BaoyuMood[];
/** Chinese labels for every dimension option id, shown when the UI language is zh. */
export declare const BAOYU_LABELS_ZH: Record<string, string>;
export declare const BAOYU_DEFAULT_SELECTION: BaoyuSelection;
/** Assemble the five-dimension selection into one generate_image-ready prompt. */
export declare function composeBaoyuPrompt(selection: BaoyuSelection): string;
/** Randomize every visual dimension, keeping the current title text. */
export declare function randomBaoyuSelection(current: BaoyuSelection): BaoyuSelection;
