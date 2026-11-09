/**
 * Versioned, browser-safe inspiration metadata.
 *
 * The bundled source is deliberately treated as a snapshot, not as a runtime
 * dependency on a third-party web page.  Image paths never leave this module:
 * callers select a source and a case ID, and the server resolves the path.
 */
import rawCases from './inspiration/data/awesome-gpt-image-2.json' with { type: 'json' };
import rawHanddrawCases from './inspiration/data/handraw-style.json' with { type: 'json' };
export const INSPIRATION_SOURCE_ID = 'awesome-gpt-image-2';
export const INSPIRATION_SOURCE_VERSION = 'c7d293963b21c60bf338003915438cc5c39dd3ca';
export const INSPIRATION_SOURCE_UPDATED_AT = '2026-08-28T10:24:55Z';
export const INSPIRATION_SOURCE_REPOSITORY = 'https://github.com/freestylefly/awesome-gpt-image-2';
/** Public mirror for the bundled cases' image assets; checked before GitHub. */
export const INSPIRATION_SOURCE_IMAGE_MIRROR = 'https://gpt-image2.canghe.ai';
export const MAX_INSPIRATION_CASES = 2_000;
export const HANDDRAW_SOURCE_ID = 'handraw-style';
export const HANDDRAW_SOURCE_VERSION = '50998b094866e22007001161bca12c892a3796b1';
export const HANDDRAW_SOURCE_UPDATED_AT = '2026-09-27T14:24:28+08:00';
export const HANDDRAW_SOURCE_REPOSITORY = 'https://github.com/yang0/handraw-style';
/**
 * Image revision for the handdraw source. The upstream pin stays fixed while
 * the referenced image paths change (sheet crops → upstream individuals);
 * browsers key their persistent image cache on this value, so bump it
 * whenever the source's images change.
 */
export const HANDDRAW_IMAGE_REVISION = '3';
/** Parse one snapshot document defensively before it becomes application data. */
function parseInspirationSource(value, meta) {
    const document = record(value);
    const cases = Array.isArray(document?.cases) ? document.cases : [];
    if (cases.length === 0 || cases.length > MAX_INSPIRATION_CASES)
        throw new Error('素材索引案例数量无效');
    const seen = new Set();
    const parsedCases = [];
    for (const candidate of cases) {
        const entry = record(candidate);
        const id = String(entry?.id ?? '').trim();
        const title = text(entry?.title, 240);
        const prompt = text(entry?.prompt, 8_000);
        const imagePath = safeImagePath(entry?.image);
        if (!id || !title || !prompt || imagePath === undefined || seen.has(id))
            continue;
        seen.add(id);
        const promptPreview = text(entry?.promptPreview, 600) || prompt.slice(0, 280);
        parsedCases.push({
            id,
            title,
            imageAlt: text(entry?.imageAlt, 320) || title,
            ...(optionalText(entry?.sourceLabel, 240) ? { sourceLabel: optionalText(entry?.sourceLabel, 240) } : {}),
            ...(safeHttpUrl(entry?.sourceUrl) ? { sourceUrl: safeHttpUrl(entry?.sourceUrl) } : {}),
            ...(safeHttpUrl(entry?.githubUrl) ? { githubUrl: safeHttpUrl(entry?.githubUrl) } : {}),
            prompt,
            promptPreview,
            category: text(entry?.category, 120) || 'Other Use Cases',
            styles: strings(entry?.styles, 64, 60),
            scenes: strings(entry?.scenes, 64, 60),
            featured: entry?.featured === true,
            imagePath,
        });
    }
    if (parsedCases.length === 0)
        throw new Error('素材索引不包含可用案例');
    const source = {
        id: meta.id,
        label: meta.label,
        repository: safeHttpUrl(document?.repository) ?? meta.repository,
        version: meta.version,
        updatedAt: optionalText(document?.updatedAt, 60) ?? meta.updatedAt,
        ...(meta.imageRevision !== undefined ? { imageRevision: meta.imageRevision } : {}),
        categories: strings(document?.categories, 80, 120),
        styles: strings(document?.styles, 80, 120),
        scenes: strings(document?.scenes, 80, 120),
        cases: parsedCases,
    };
    return source;
}
/** Parse the upstream snapshot defensively before it becomes application data. */
export function parseInspirationSnapshot(value, version = INSPIRATION_SOURCE_VERSION, updatedAt = INSPIRATION_SOURCE_UPDATED_AT) {
    return {
        schemaVersion: 1,
        sources: [
            parseInspirationSource(value, {
                id: INSPIRATION_SOURCE_ID,
                label: 'GPT Image 2 案例库',
                repository: INSPIRATION_SOURCE_REPOSITORY,
                version,
                updatedAt,
            }),
        ],
    };
}
export function publicInspirationCatalog(catalog) {
    return {
        schemaVersion: 1,
        sources: catalog.sources.map(source => ({
            ...source,
            cases: source.cases.map(({ imagePath: _imagePath, ...caseData }) => caseData),
        })),
    };
}
export function findInspirationCase(catalog, sourceId, caseId) {
    const source = catalog.sources.find(candidate => candidate.id === sourceId);
    return source?.cases.find(candidate => candidate.id === caseId);
}
const DEFAULT_INSPIRATION_SEARCH_HITS = 8;
const MAX_INSPIRATION_SEARCH_HITS = 20;
/** Search a resolved catalog for reusable prompts; bounded hits even with an empty query. */
export function searchInspirationCases(catalog, request) {
    const limit = Math.min(Math.max(request.limit ?? DEFAULT_INSPIRATION_SEARCH_HITS, 1), MAX_INSPIRATION_SEARCH_HITS);
    const query = request.query.trim().toLowerCase();
    const matches = [];
    for (const source of catalog.sources) {
        if (request.sourceId !== undefined && source.id !== request.sourceId)
            continue;
        for (const item of source.cases) {
            if (request.category !== undefined && item.category !== request.category)
                continue;
            if (query !== '' && ![item.title, item.prompt, item.category, ...item.styles, ...item.scenes].some(value => value.toLowerCase().includes(query)))
                continue;
            matches.push({ sourceId: source.id, sourceLabel: source.label, id: item.id, title: item.title, category: item.category, prompt: item.prompt });
        }
    }
    return { total: matches.length, hits: matches.slice(0, limit) };
}
export const BUNDLED_INSPIRATION_CATALOG = {
    schemaVersion: 1,
    sources: [
        parseInspirationSnapshot(rawCases).sources[0],
        parseInspirationSource(rawHanddrawCases, {
            id: HANDDRAW_SOURCE_ID,
            label: '手绘风格图鉴',
            repository: HANDDRAW_SOURCE_REPOSITORY,
            version: HANDDRAW_SOURCE_VERSION,
            updatedAt: HANDDRAW_SOURCE_UPDATED_AT,
            imageRevision: HANDDRAW_IMAGE_REVISION,
        }),
    ],
};
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
}
function text(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}
function optionalText(value, maxLength) {
    const result = text(value, maxLength);
    return result.length > 0 ? result : undefined;
}
function strings(value, maxItems, maxLength) {
    if (!Array.isArray(value))
        return [];
    const result = [];
    const seen = new Set();
    for (const item of value) {
        const normalized = text(item, maxLength);
        if (normalized && !seen.has(normalized)) {
            seen.add(normalized);
            result.push(normalized);
            if (result.length === maxItems)
                break;
        }
    }
    return result;
}
function safeImagePath(value) {
    if (typeof value !== 'string')
        return undefined;
    const path = value.trim();
    return /^\/images\/[a-zA-Z0-9][a-zA-Z0-9._/-]*\.(?:png|jpe?g|webp)$/i.test(path) && !path.includes('..')
        ? path
        : undefined;
}
function safeHttpUrl(value) {
    if (typeof value !== 'string' || value.length > 2_000)
        return undefined;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=inspiration.js.map