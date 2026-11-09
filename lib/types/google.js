import { guardedFetch, readResponseBody } from './fetch-diagnostics.js';
import { redactSecrets } from './redact.js';
import { detectImageMediaType } from './reference-image.js';
const ERROR_LIMIT = 4096;
const REQUESTED_MEDIA_TYPE = 'image/jpeg';
/** Send one native Google text-to-image request. */
export function generateGoogleImage(input) {
    return requestGoogleImage({
        ...input,
        operation: 'generation',
        interactionInput: input.prompt,
        nativeParts: [{ text: input.prompt }],
    });
}
/** Send one native Google image-editing request using already-resolved bytes. */
export function editGoogleImage(input) {
    const interactionInput = input.native ? [] : input.sourceImages.length === 1
        ? [
            {
                type: 'image',
                mime_type: input.sourceImages[0].mediaType,
                data: Buffer.from(input.sourceImages[0].data).toString('base64'),
            },
            { type: 'text', text: input.prompt },
        ]
        : [
            ...input.sourceImages.flatMap((sourceImage, index) => [
                { type: 'text', text: `图 ${index + 1} (Image ${index + 1}):` },
                {
                    type: 'image',
                    mime_type: sourceImage.mediaType,
                    data: Buffer.from(sourceImage.data).toString('base64'),
                },
            ]),
            { type: 'text', text: input.prompt },
        ];
    return requestGoogleImage({
        ...input,
        operation: 'editing',
        interactionInput,
        nativeParts: input.native ? [
            ...input.sourceImages.map(image => ({ inlineData: { mimeType: image.mediaType, data: Buffer.from(image.data).toString('base64') } })),
            { text: input.prompt },
        ] : [],
    });
}
/** Shared Google request, response parsing, decoding, and size enforcement. */
async function requestGoogleImage(input) {
    const label = `Google image ${input.operation}`;
    const endpoint = input.native ? nativeGoogleUrl(input.endpoint, input.model).toString() : input.endpoint;
    const body = input.native ? {
        contents: [{ role: 'user', parts: input.nativeParts }],
        generationConfig: {
            candidateCount: 1,
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { aspectRatio: input.aspectRatio, imageSize: input.imageSize },
        },
    } : {
        model: input.model,
        input: input.interactionInput,
        response_format: {
            type: 'image', mime_type: REQUESTED_MEDIA_TYPE,
            aspect_ratio: input.aspectRatio, image_size: input.imageSize,
        },
    };
    const response = await guardedFetch(`${label} request`, input.signal, () => fetch(endpoint, {
        method: 'POST',
        redirect: 'error',
        signal: input.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': input.apiKey },
        body: JSON.stringify(body),
    }), input.apiKey);
    const text = await readBoundedText(response, Math.ceil(input.maxBytes * 1.4) + ERROR_LIMIT, label);
    if (!response.ok)
        throw new Error(`${label} failed (${response.status}): ${redactSecrets(text, input.apiKey).slice(0, ERROR_LIMIT)}`);
    let payload;
    try {
        payload = JSON.parse(text);
    }
    catch {
        throw new Error(`${label} returned invalid JSON`);
    }
    const image = input.native ? nativeOutputImage(payload) : outputImage(payload);
    if (image === undefined)
        throw new Error(`${label} returned no image: ${redactSecrets(text, input.apiKey).slice(0, ERROR_LIMIT)}`);
    const data = decodeBase64(image.data, label);
    if (data.byteLength > input.maxBytes)
        throw new Error(`${label} exceeded the ${String(input.maxBytes)} byte image limit`);
    // Bytes are the ground truth: sniff before honoring the declared type so a
    // proxy that drops or lies about mime_type cannot fail the host attachment
    // service with IMAGE_TYPE_MISMATCH (#61).
    const mediaType = detectImageMediaType(data) ?? mediaTypeOf(image.mime_type ?? REQUESTED_MEDIA_TYPE);
    if (mediaType === undefined)
        throw new Error(`${label} returned unsupported media type ${JSON.stringify(image.mime_type)}`);
    return { data, mediaType };
}
/** Accept a versioned base, the existing interactions URL, or a full native URL. */
function nativeGoogleUrl(endpoint, model) {
    let url;
    try {
        url = new URL(endpoint);
    }
    catch {
        throw new Error('Google endpoint must be an absolute URL');
    }
    const base = url.pathname.replace(/\/+$/, '').replace(/\/(?:interactions|models(?:\/[^/]+:generateContent)?)$/, '');
    url.pathname = `${base}/models${model === undefined ? '' : `/${encodeURIComponent(model.replace(/^models\//, ''))}:generateContent`}`;
    return url;
}
/** The settings probe and model picker use the same base as image requests. */
export function googleModelsEndpoint(endpoint, native) {
    if (native)
        return nativeGoogleUrl(endpoint).toString();
    let url;
    try {
        url = new URL(endpoint);
    }
    catch {
        throw new Error('Google endpoint must be an absolute URL');
    }
    const segments = url.pathname.split('/').filter(Boolean);
    segments[segments.length - 1] = 'models';
    url.pathname = `/${segments.join('/')}`;
    return url.toString();
}
function nativeOutputImage(value) {
    const candidates = record(value)?.candidates;
    if (!Array.isArray(candidates))
        return undefined;
    for (const candidate of candidates) {
        const parts = record(record(candidate)?.content)?.parts;
        if (!Array.isArray(parts))
            continue;
        for (const value of parts) {
            const part = record(value);
            if (part?.thought === true)
                continue;
            const image = record(part?.inlineData ?? part?.inline_data);
            if (typeof image?.data === 'string')
                return { data: image.data, mime_type: image.mimeType ?? image.mime_type };
        }
    }
    return undefined;
}
function outputImage(value) {
    const interaction = record(value);
    if (interaction === undefined)
        return undefined;
    const direct = imageContent(interaction.output_image, false);
    if (direct !== undefined)
        return direct;
    if (!Array.isArray(interaction.steps))
        return undefined;
    for (const step of interaction.steps) {
        const modelOutput = record(step);
        if (modelOutput?.type !== 'model_output' || !Array.isArray(modelOutput.content))
            continue;
        for (const content of modelOutput.content) {
            const image = imageContent(content, true);
            if (image !== undefined)
                return image;
        }
    }
    return undefined;
}
function imageContent(value, requiresImageType) {
    const image = record(value);
    if (image === undefined || (requiresImageType && image.type !== 'image') || typeof image.data !== 'string')
        return undefined;
    return { data: image.data, mime_type: image.mime_type };
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
}
function mediaTypeOf(value) {
    return value === 'image/png' || value === 'image/jpeg' || value === 'image/webp' || value === 'image/gif' ? value : undefined;
}
function decodeBase64(data, label) {
    const clean = data.replace(/\s+/g, '');
    if (clean.length === 0)
        throw new Error(`${label} returned invalid base64 image data`);
    const decoded = Buffer.from(clean, 'base64');
    if (decoded.length === 0)
        throw new Error(`${label} returned invalid base64 image data`);
    return new Uint8Array(decoded);
}
async function readBoundedText(response, maxBytes, label) {
    if (response.body === null)
        return '';
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    try {
        for (;;) {
            const next = await readResponseBody(response, () => reader.read());
            if (next.done)
                break;
            bytes += next.value.byteLength;
            if (bytes > maxBytes)
                throw new Error(`${label} response exceeded the ${String(maxBytes)} byte limit`);
            chunks.push(next.value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const joined = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
        joined.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return new TextDecoder().decode(joined);
}
//# sourceMappingURL=google.js.map