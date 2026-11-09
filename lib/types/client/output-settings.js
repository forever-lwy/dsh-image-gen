/** Validate all advanced output fields before the settings form starts writing. */
export function parseExtraFields(text, message) {
    if (!text.trim())
        return {};
    let value;
    try {
        value = JSON.parse(text);
    }
    catch {
        throw new Error(message);
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        throw new Error(message);
    return value;
}
export function parseSizeTable(text, message) {
    const value = parseExtraFields(text, message);
    const table = {};
    for (const [ratio, tiers] of Object.entries(value)) {
        if (!/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(ratio) || ratio.split(':').some(part => Number(part) <= 0)
            || typeof tiers !== 'object' || tiers === null || Array.isArray(tiers))
            throw new Error(message);
        const entries = Object.entries(tiers);
        if (entries.length === 0 || entries.some(([tier, size]) => !/^(\d+(?:\.\d+)?)(K?)$/.test(tier) || Number.parseFloat(tier) <= 0 || typeof size !== 'string' || !size.trim()))
            throw new Error(message);
        table[ratio] = Object.fromEntries(entries.map(([tier, size]) => [tier, size.trim()]));
    }
    return table;
}
//# sourceMappingURL=output-settings.js.map