import { type StudioOption, type StudioProvider, type StudioProviderProfile } from '../shared.js';
export interface ComparisonTarget {
    profile: StudioProviderProfile;
    ratio: string;
    quality: string;
    adjusted: boolean;
    resolution?: string;
    generationQuality?: string;
}
/** Map one shared output intent to settings accepted by every target model. */
export declare function buildComparisonTargets(profiles: readonly StudioProviderProfile[], selectedTargets: readonly string[], ratio: string, quality: string, output?: {
    resolution: string;
    generationQuality: string;
}): ComparisonTarget[];
/** Keep pixel tiers separate from upstream quality values in comparison mode. */
export declare function comparisonOutputOptions(profiles: readonly StudioProviderProfile[], ratio: string, kind: 'resolution' | 'generationQuality'): StudioOption[];
/** Start with two models, not every configured API, to avoid surprise spend. */
export declare function initialComparisonProviders(profiles: readonly StudioProviderProfile[], activeProvider: StudioProvider, activeChannel?: string): string[];
/** Union of every configured profile's options, for the shared comparison pickers. */
export declare function comparisonOptionUnion(profiles: readonly StudioProviderProfile[], key: 'ratioOptions' | 'qualityOptions'): StudioOption[];
