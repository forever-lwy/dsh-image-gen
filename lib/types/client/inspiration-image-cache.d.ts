export declare function fetchInspirationImage(sourceId: string, caseId: string, rev?: string): Promise<Blob>;
export declare function evictInspirationImage(sourceId: string, caseId: string, rev?: string): Promise<void>;
export declare function clearInspirationImageCache(): Promise<void>;
