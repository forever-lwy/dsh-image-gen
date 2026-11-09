const pending = new Map();
const consumers = new Set();
const availabilityListeners = new Set();
let delivering = false;
let generation = 0;
/** History actions must not silently queue into a canvas that is not open. */
export function hasTlLandingConsumer() { return consumers.size > 0; }
export function subscribeTlLandingAvailability(listener) {
    availabilityListeners.add(listener);
    return () => { availabilityListeners.delete(listener); };
}
export function sendTlLandingToOpenCanvas(item) {
    if (!hasTlLandingConsumer())
        return false;
    pushTlLandings([{ ...item, onlyWhileCanvasOpen: true }]);
    return true;
}
/** Invalidates async landings that started before the user cleared the canvas. */
export function getTlLandingGeneration() { return generation; }
export function clearTlLandings() {
    generation += 1;
    pending.clear();
}
/** Queue freshly generated images for the tldraw canvases. Safe to call anywhere. */
export function pushTlLandings(newItems) {
    for (const item of newItems) {
        if (!pending.has(item.galleryId))
            pending.set(item.galleryId, item);
    }
    void deliver();
}
/** Conversation results are admitted only while a canvas is mounted. */
export function pushTlLandingsLive(items) {
    if (consumers.size > 0)
        pushTlLandings(items);
}
/** Register a ready editor. False means it unmounted before committing. */
export function registerTlLandingConsumer(consumer) {
    const wasAvailable = hasTlLandingConsumer();
    consumers.add(consumer);
    if (!wasAvailable)
        for (const listener of availabilityListeners)
            listener();
    void deliver();
    let registered = true;
    return () => {
        if (!registered)
            return;
        registered = false;
        consumers.delete(consumer);
        if (consumers.size === 0) {
            for (const [id, item] of pending) {
                if (item.fromConversation || item.onlyWhileCanvasOpen)
                    pending.delete(id);
            }
            for (const listener of availabilityListeners)
                listener();
        }
    };
}
async function deliver() {
    if (delivering)
        return;
    delivering = true;
    try {
        while (pending.size > 0) {
            const consumer = consumers.values().next().value;
            if (consumer === undefined)
                break;
            const batch = [...pending.values()];
            let completed = true;
            try {
                completed = await consumer(batch);
            }
            catch (error) {
                // A failed batch must not become an infinite retry/replay loop.
                console.warn('[dsh-image-gen] canvas landing failed:', error);
            }
            if (completed) {
                for (const item of batch) {
                    if (pending.get(item.galleryId) === item)
                        pending.delete(item.galleryId);
                }
            }
        }
    }
    finally {
        delivering = false;
    }
}
//# sourceMappingURL=tl-canvas-bridge.js.map