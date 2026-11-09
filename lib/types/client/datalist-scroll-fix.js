const GUARD = '__dshIgDatalistScrollFix';
export function isDatalistInput(element) {
    return element !== null && element.tagName === 'INPUT' && element.hasAttribute('list');
}
export function closeDatalistPopup(element) {
    if (!isDatalistInput(element))
        return false;
    element.blur();
    return true;
}
/**
 * Automatic scrolling after Tab/focus or virtual-keyboard resize must not blur
 * the input. Only scrolling preceded by a wheel/touch/scrollbar/key gesture can
 * dismiss the popup, and its original focus must still be current.
 */
export function installDatalistScrollFix(environment) {
    const env = environment ?? browserEnvironment();
    if (env === undefined || env.window[GUARD] !== undefined)
        return false;
    let disposed = false, queued = false, focusVersion = 0;
    let intent = null;
    let expiry;
    let cancelFrame;
    const focusedInput = () => {
        const input = env.document.activeElement;
        return isDatalistInput(input) && (env.ownsInput === undefined || env.ownsInput(input)) ? input : null;
    };
    const clearIntent = () => {
        intent = null;
        if (expiry !== undefined)
            clearTimeout(expiry);
        expiry = undefined;
    };
    const arm = event => {
        clearIntent();
        if (event?.key !== undefined && !['PageUp', 'PageDown'].includes(event.key))
            return;
        intent = focusedInput();
        if (intent !== null)
            expiry = setTimeout(clearIntent, 250);
    };
    const focusChanged = () => { focusVersion += 1; clearIntent(); };
    const scrolled = event => {
        const input = intent;
        if (input === null)
            return;
        if (event?.target === input) {
            clearIntent();
            return;
        }
        if (input !== focusedInput() || queued)
            return;
        const version = focusVersion;
        clearIntent();
        queued = true;
        const run = () => {
            queued = false;
            cancelFrame = undefined;
            if (!disposed && focusVersion === version && env.document.activeElement === input)
                closeDatalistPopup(input);
        };
        if (env.schedule !== undefined)
            cancelFrame = env.schedule(run) || undefined;
        else {
            const timer = setTimeout(run, 0);
            cancelFrame = () => clearTimeout(timer);
        }
    };
    const registrations = [
        [env.document, 'wheel', arm], [env.document, 'touchmove', arm],
        [env.document, 'pointerdown', arm], [env.document, 'keydown', arm],
        [env.document, 'focusin', focusChanged], [env.document, 'scroll', scrolled],
        [env.window, 'scroll', scrolled], [env.window, 'resize', scrolled],
    ];
    const dispose = () => {
        if (disposed)
            return;
        disposed = true;
        clearIntent();
        cancelFrame?.();
        for (const [target, type, listener] of registrations)
            target.removeEventListener(type, listener, true);
        if (env.window[GUARD] === dispose)
            delete env.window[GUARD];
    };
    env.window[GUARD] = dispose;
    for (const [target, type, listener] of registrations)
        target.addEventListener(type, listener, true);
    return dispose;
}
function browserEnvironment() {
    if (typeof window === 'undefined' || typeof document === 'undefined')
        return undefined;
    return {
        window: window,
        document: document,
        ownsInput: element => element.matches('.dsh-ig-input[list]'),
        ...(typeof requestAnimationFrame !== 'function' ? {} : {
            schedule: (callback) => {
                const frame = requestAnimationFrame(() => callback());
                return () => cancelAnimationFrame(frame);
            },
        }),
    };
}
//# sourceMappingURL=datalist-scroll-fix.js.map