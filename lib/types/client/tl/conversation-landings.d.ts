interface EventEntry {
    readonly type: string;
    readonly event: {
        readonly type: string;
        readonly seq: number;
        readonly data: Record<string, unknown>;
    };
}
interface EventSource {
    getSnapshot(): {
        readonly entries: readonly EventEntry[];
        readonly change: {
            readonly kind: string;
            readonly entries?: readonly EventEntry[];
        };
    };
    subscribe(listener: () => void): () => void;
}
/** Small runtime face: older hosts may not expose the modern session feed. */
export interface CanvasSessions {
    list: {
        getSnapshot(): {
            current?: string | undefined;
            byId?: Readonly<Record<string, {
                id: string;
                retainedBy?: Readonly<Record<string, number>>;
            }>>;
        };
        subscribe(listener: () => void): () => void;
    };
    binding(id: string): {
        eventSource: EventSource;
    } | undefined;
}
/** Runtime face of uiSession.adapter.current; absent on older hosts. */
export interface CanvasSessionSelection {
    getSnapshot(): {
        readonly key?: string | undefined;
    } | undefined;
    subscribe(listener: () => void): () => void;
}
/** Keep one landing subscription while the optional UI service loads or unloads. */
export declare function createCanvasSessionSelection(): CanvasSessionSelection & {
    bind(source: CanvasSessionSelection): () => void;
};
/** Subscribe to live additions, never to card rendering or history replay. */
export declare function startConversationLandings(sessions: CanvasSessions, selection?: CanvasSessionSelection): () => void;
export {};
