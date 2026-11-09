/** zh labels shared by the server-side profiles; the client re-localizes. */
export const RATIO_LABELS = {
    auto: '自动',
    '1:1': '1:1 方形',
    '3:2': '3:2 横向',
    '2:3': '2:3 肖像',
    '4:3': '4:3 横向',
    '3:4': '3:4 竖向',
    '4:5': '4:5 肖像',
    '5:4': '5:4 横向',
    '3:1': '3:1 全景',
    '1:3': '1:3 长条',
    '21:9': '21:9 超宽',
    '9:21': '9:21 超高',
};
function ratioOption(value) {
    return { value, label: RATIO_LABELS[value] ?? value };
}
/** 16-divisible pixel sizes for the OpenAI-shape free-size contract. */
const OPENAI_SIZE_TABLE = {
    '1:1': '1024x1024',
    '3:2': '1536x1024',
    '2:3': '1024x1536',
    '4:3': '1152x864',
    '3:4': '864x1152',
    '16:9': '1536x864',
    '9:16': '864x1536',
};
/** Official Seedream 5.0 tier × ratio table (volcengine docs 82379/1824121). */
const SEEDREAM_SIZE_TABLE = {
    '1:1': { '2K': '2048x2048', '3K': '3072x3072', '4K': '4096x4096' },
    '4:3': { '2K': '2304x1728', '3K': '3456x2592', '4K': '4704x3520' },
    '3:4': { '2K': '1728x2304', '3K': '2592x3456', '4K': '3520x4704' },
    '16:9': { '2K': '2848x1600', '3K': '4096x2304', '4K': '5504x3040' },
    '9:16': { '2K': '1600x2848', '3K': '2304x4096', '4K': '3040x5504' },
    '3:2': { '2K': '2496x1664', '3K': '3744x2496', '4K': '4992x3328' },
    '2:3': { '2K': '1664x2496', '3K': '2496x3744', '4K': '3328x4992' },
    '21:9': { '2K': '3136x1344', '3K': '4704x2016', '4K': '6240x2656' },
};
/**
 * Seedream 5.0 pro / flash tier × ratio table (Ark docs, seedream-5-0-pro):
 * these models take 1K / 1.5K / 2K only, within 921600–4624220 pixels.
 */
const SEEDREAM_PRO_SIZE_TABLE = {
    '1:1': { '1K': '1024x1024', '1.5K': '1536x1536', '2K': '2048x2048' },
    '4:3': { '1K': '1152x864', '1.5K': '1792x1344', '2K': '2368x1776' },
    '3:4': { '1K': '864x1152', '1.5K': '1344x1792', '2K': '1776x2368' },
    '16:9': { '1K': '1424x800', '1.5K': '2048x1152', '2K': '2816x1584' },
    '9:16': { '1K': '800x1424', '1.5K': '1152x2048', '2K': '1584x2816' },
    '3:2': { '1K': '1248x832', '1.5K': '1872x1248', '2K': '2496x1664' },
    '2:3': { '1K': '832x1248', '1.5K': '1248x1872', '2K': '1664x2496' },
    '21:9': { '1K': '1568x672', '1.5K': '2352x1008', '2K': '3136x1344' },
};
/** qwen-image-3.0 pixel sizes within the documented 512*512–2048*2048 area. */
const DASHSCOPE_SIZE_TABLE = {
    '1:1': '1024x1024',
    '3:2': '1536x1024',
    '2:3': '1024x1536',
    '4:3': '1152x864',
    '3:4': '864x1152',
    '16:9': '1664x928',
    '9:16': '928x1664',
};
/** glm-image recommended sizes (32-divisible, ≤2^22 px). */
const ZHIPU_SIZE_TABLE = {
    '1:1': '1280x1280',
    '3:2': '1568x1056',
    '2:3': '1056x1568',
    '4:3': '1472x1088',
    '3:4': '1088x1472',
    '16:9': '1728x960',
    '9:16': '960x1728',
};
function capability(ratios, qualities, defaultRatio, defaultQuality, sizeFor) {
    return { ratioOptions: ratios.map(ratioOption), qualityOptions: qualities, defaultRatio, defaultQuality, ...(sizeFor === undefined ? {} : { sizeFor }) };
}
const AUTO = { value: 'auto', label: '自动' };
const STANDARD = { value: 'standard', label: '标准（推荐）' };
export const CLOUD_CAPABILITIES = {
    google: capability(['1:1', '3:2', '2:3', '4:3', '3:4', '4:5', '5:4', '16:9', '9:16', '21:9'], ['1K', '2K', '4K'].map(value => ({ value, label: value })), '1:1', '1K'),
    openai: capability(Object.keys(OPENAI_SIZE_TABLE), [AUTO, ...['low', 'medium', 'high'].map(value => ({ value, label: value }))], '1:1', 'auto', ratio => OPENAI_SIZE_TABLE[ratio] ?? '1024x1024'),
    seedream: capability(['auto', ...Object.keys(SEEDREAM_SIZE_TABLE)], ['2K', '3K', '4K'].map(value => ({ value, label: value })), 'auto', '2K', 
    // `auto` forwards the bare tier and lets the model pick the ratio from the
    // prompt (documented Seedream behavior); an explicit ratio pins pixels.
    (ratio, quality) => ratio === 'auto' ? quality : (SEEDREAM_SIZE_TABLE[ratio]?.[quality] ?? quality)),
    dashscope: capability(Object.keys(DASHSCOPE_SIZE_TABLE), [STANDARD], '1:1', 'standard', ratio => DASHSCOPE_SIZE_TABLE[ratio] ?? '1024x1024'),
    xai: capability(['auto', '1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9'], [{ value: '1k', label: '1K' }, { value: '2k', label: '2K' }], 'auto', '1k'),
    zhipu: capability(Object.keys(ZHIPU_SIZE_TABLE), [{ value: 'hd', label: '高清' }], '1:1', 'hd', ratio => ZHIPU_SIZE_TABLE[ratio] ?? '1280x1280'),
};
/** Seedream 5.0 pro / flash: a different tier set from the earlier Seedream models. */
const SEEDREAM_PRO_CAPABILITY = capability(['auto', ...Object.keys(SEEDREAM_PRO_SIZE_TABLE)], ['1K', '1.5K', '2K'].map(value => ({ value, label: value })), 'auto', '2K', (ratio, quality) => ratio === 'auto' ? quality : (SEEDREAM_PRO_SIZE_TABLE[ratio]?.[quality] ?? quality));
/** The pickers of a cloud row for the model it runs; only Seedream differs by model today. */
export function cloudCapability(provider, model) {
    if (provider === 'seedream' && /seedream-5-0-(?:pro|flash)(?:$|-)/.test(model))
        return SEEDREAM_PRO_CAPABILITY;
    return CLOUD_CAPABILITIES[provider];
}
export const SUBSCRIPTION_CAPABILITIES = {
    'chatgpt-sub': capability(['auto', ...Object.keys(OPENAI_SIZE_TABLE)], [AUTO, ...['low', 'medium', 'high', 'xhigh', 'max'].map(value => ({ value, label: value }))], 'auto', 'auto', ratio => ratio === 'auto' ? undefined : (OPENAI_SIZE_TABLE[ratio] ?? '1024x1024')),
    'grok-sub': capability(['auto', '1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9'], [{ value: '1k', label: '1K' }, { value: '2k', label: '2K' }], 'auto', '1k'),
    'google-sub': capability(['auto', '1:1', '3:2', '2:3', '4:3', '3:4', '4:5', '5:4', '16:9', '9:16', '21:9'], [STANDARD, { value: 'hd', label: '高清（4K）' }], 'auto', 'standard'),
};
//# sourceMappingURL=capabilities.js.map