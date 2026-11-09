export declare const UPSTREAM_TIMEOUT_HINT = "\u4E0A\u6E38\u53EF\u80FD\u5DF2\u6263\u8D39\u6216\u4ECD\u5728\u751F\u6210\uFF0C\u8BF7\u5230\u670D\u52A1\u5546\u540E\u53F0\u786E\u8BA4";
export declare class GenerationTimeoutError extends Error {
    constructor(timeoutMs: number);
}
export declare function withGenerationTimeout<T>(timeoutMs: number, signal: AbortSignal, operation: (signal: AbortSignal) => Promise<T>): Promise<T>;
