const sessions = new Map();
/** The session of one workbench surface, created on first use. */
export function studioSession(key) {
    const existing = sessions.get(key);
    if (existing !== undefined)
        return existing;
    const created = createStudioSession();
    sessions.set(key, created);
    return created;
}
/** A fresh session, exported for tests. */
export function createStudioSession() {
    const listeners = new Set();
    let snapshot = { generating: false, outcome: undefined };
    let controller;
    let view;
    let seq = 0;
    let deliveredSeq = 0;
    const publish = (next) => {
        snapshot = next;
        for (const listener of [...listeners])
            listener();
    };
    return {
        subscribe: listener => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        getSnapshot: () => snapshot,
        view: () => view,
        keepView: next => { view = next; },
        start: next => {
            if (controller !== undefined)
                return false;
            controller = next;
            publish({ ...snapshot, generating: true });
            return true;
        },
        settle: (owner, outcome) => {
            if (controller !== owner)
                return;
            controller = undefined;
            if (outcome?.view !== undefined)
                view = outcome.view;
            publish({
                generating: false,
                outcome: outcome === undefined ? snapshot.outcome : { ...outcome, seq: ++seq },
            });
        },
        cancel: () => {
            const running = controller;
            if (running === undefined)
                return;
            controller = undefined;
            running.abort();
            publish({ ...snapshot, generating: false });
        },
        delivered: outcomeSeq => outcomeSeq <= deliveredSeq,
        markDelivered: outcomeSeq => { deliveredSeq = Math.max(deliveredSeq, outcomeSeq); },
    };
}
//# sourceMappingURL=studio-session.js.map