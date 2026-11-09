import { imageResultsFromMeta, imageResultsFromPtcDispatch } from '../image-result-node.js';
import { pushTlLandingsLive } from './tl-canvas-bridge.js';
/** Keep one landing subscription while the optional UI service loads or unloads. */
export function createCanvasSessionSelection() {
    let current;
    const listeners = new Set();
    const notify = () => { for (const listener of listeners)
        listener(); };
    return {
        getSnapshot: () => current?.getSnapshot(),
        subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
        bind(source) {
            current = source;
            const stop = source.subscribe(notify);
            notify();
            return () => {
                stop();
                if (current !== source)
                    return;
                current = undefined;
                notify();
            };
        },
    };
}
function currentSessionId(sessions, selection) {
    const selected = selection?.getSnapshot();
    // A present UI store with no key means no active conversation, not permission
    // to land images from a different retained/background session.
    if (selected !== undefined)
        return selected.key || undefined;
    const snapshot = sessions.list.getSnapshot();
    if (snapshot.current)
        return snapshot.current;
    const mainViews = Object.values(snapshot.byId ?? {}).filter(row => (row.retainedBy?.mainView ?? 0) > 0);
    // Without the UI authority, ambiguous windows must not cross-deliver images.
    return mainViews.length === 1 ? mainViews[0].id : undefined;
}
/** Subscribe to live additions, never to card rendering or history replay. */
export function startConversationLandings(sessions, selection) {
    let source;
    let stopEvents;
    const followCurrent = () => {
        const id = currentSessionId(sessions, selection);
        const next = id === undefined ? undefined : sessions.binding(id)?.eventSource;
        if (next === source)
            return;
        stopEvents?.();
        source = next;
        if (next === undefined)
            return;
        let lastSeq = next.getSnapshot().entries.reduce((seq, entry) => Math.max(seq, entry.event.seq), -1);
        stopEvents = next.subscribe(() => {
            const change = next.getSnapshot().change;
            for (const entry of change.entries ?? []) {
                if (entry.type !== 'event')
                    continue;
                const { event } = entry;
                const isNew = event.seq > lastSeq;
                lastSeq = Math.max(lastSeq, event.seq);
                if (change.kind !== 'append' || !isNew)
                    continue;
                const results = event.type === 'tool/result'
                    ? imageResultsFromMeta(event.data.meta) : imageResultsFromPtcDispatch(event);
                if (results.length === 0)
                    continue;
                pushTlLandingsLive(results.map(result => ({
                    galleryId: String(result.attachment.attachmentId),
                    attachment: result.attachment,
                    fromConversation: true,
                    prompt: result.prompt,
                    provider: result.provider,
                    model: result.model,
                })));
            }
        });
    };
    const stopList = sessions.list.subscribe(followCurrent);
    const stopSelection = selection?.subscribe(followCurrent);
    followCurrent();
    return () => { stopList(); stopSelection?.(); stopEvents?.(); };
}
//# sourceMappingURL=conversation-landings.js.map