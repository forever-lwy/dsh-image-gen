import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Clipboard, ExternalLink, ImageIcon, ImagePlus, LoaderCircle, Maximize2, Search, Shuffle, Sparkles, Star, Trash2, X } from 'lucide-react';
import { INSPIRATION_ROUTE } from '../shared.js';
import { clearInspirationImageCache, evictInspirationImage, fetchInspirationImage } from './inspiration-image-cache.js';
import { loadCachedInspirationCatalog, saveCachedInspirationCatalog } from './inspiration-catalog-cache.js';
import { BAOYU_COMPOSER_SOURCE_ID, BAOYU_DEFAULT_SELECTION, BAOYU_LABELS_ZH, BAOYU_MOODS, BAOYU_PALETTES, BAOYU_RENDERINGS, BAOYU_TEXT_LEVELS, BAOYU_TYPES, composeBaoyuPrompt, randomBaoyuSelection, } from '../baoyu-compose.js';
const FAVORITES_STORAGE_KEY = 'dsh-ig-inspiration-favorites';
function loadInspirationFavorites() {
    if (typeof localStorage === 'undefined')
        return new Set();
    try {
        const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed))
                return new Set(parsed);
        }
    }
    catch { /* best effort */ }
    return new Set();
}
function saveInspirationFavorites(favorites) {
    if (typeof localStorage === 'undefined')
        return;
    try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favorites)));
    }
    catch { /* best effort */ }
}
const TAG_MAP_ZH = {
    // ── 全部分类 (Categories) ──────────────────────────
    'Architecture & Spaces': '建筑空间',
    'Brand & Logos': '品牌 Logo',
    'Characters & People': '角色人物',
    'Charts & Infographics': '图表信息图',
    'Documents & Publishing': '文档出版',
    'History & Classical Themes': '历史古典',
    'Illustration & Art': '插画艺术',
    'Other Use Cases': '其他案例',
    'Photography & Realism': '摄影写真',
    'Posters & Typography': '海报排版',
    'Products & E-commerce': '产品电商',
    'Scenes & Storytelling': '场景故事',
    'UI & Interfaces': 'UI 界面',
    // ── 全部风格 (Styles) ──────────────────────────────
    '3D': '3D 渲染',
    'Architecture': '建筑空间',
    'Brand': '品牌视觉',
    'Character': '角色人物',
    'Characters': '人物群像',
    'Charts': '图表图解',
    'Classical': '古典艺术',
    'Documents': '文档出版',
    'History': '历史人文',
    'Illustration': '插画手绘',
    'Infographic': '信息图表',
    'Photography': '摄影写真',
    'Poster': '海报封面',
    'Product': '产品设计',
    'Products': '商业产品',
    'Realistic': '写实逼真',
    'Scenes': '场景概念',
    'UI': 'UI 界面',
    // ── 全部场景 (Scenes) ──────────────────────────────
    'Commerce': '商业电商',
    'Creative': '创意设计',
    'Education': '教育科普',
    'Fashion': '时尚潮流',
    'Food': '美食餐饮',
    'Social': '社媒传播',
    'Story': '故事剧情',
    'Tech': '科技未来',
    'Travel': '旅游出行',
    // ── 兼顾其他常见标签与测试用例 ────────────────────────
    'Art': '艺术创作',
    'Minimalist': '极简主义',
    'Vintage': '复古胶片',
    'Cyberpunk': '赛博朋克',
    'Anime': '二次元日系',
    'Watercolor': '水彩手绘',
    'Oil Painting': '油画质感',
};
function translateTag(name, lang) {
    if (lang !== 'zh')
        return name;
    return TAG_MAP_ZH[name] ?? name;
}
const COPY = {
    zh: {
        kicker: 'Prompt inspiration', title: '灵感素材', subtitle: '从公开案例中找构图、质感和文字处理，再带回工作台继续调整。',
        refresh: '检查更新', refreshing: '正在更新…', clearCache: '清理缓存', clearingCache: '正在清理…', cacheCleared: '已清空本地图片缓存', cacheClearFailed: '清理缓存失败', clearCacheRestart: '后端未就绪，请重启 DSH 后生效',
        clearModalTitle: '清理本地图片缓存？', clearModalDesc: '将删除本地保存的灵感素材图片以释放磁盘空间。案例列表、Prompt 和您的收藏夹不会受到任何影响，后续浏览时会自动重新拉取。', cancel: '取消', confirmClear: '确认清理',
        allCategories: '全部分类', allStyles: '全部风格', allScenes: '全部场景', categoryNav: '分类导航',
        search: '搜索案例、Prompt、风格…', results: '找到 {count} 个案例', noResults: '没有匹配的素材，换个关键词或筛选条件试试。',
        selectHint: '选择一张素材，查看完整 Prompt 并带回工作台。', prompt: '完整 Prompt', copy: '复制 Prompt', copied: '已复制', use: '使用这个 Prompt', source: '查看原来源',
        useReference: '提示词 + 参考图', referenceLoading: '获取参考图中…', referenceFailed: '参考图获取失败，请重试',
        loading: '正在读取素材库…', loadFailed: '素材库读取失败，请稍后重试。', copyFailed: '复制失败', retry: '重新加载', imageFailed: '图片暂时无法读取', featured: '精选', updated: '素材已更新（{count} 条）', updateFailed: '更新失败，仍在使用当前内置素材。',
        allLoaded: '已展示全部 {count} 个案例', onlyFavorites: '仅看收藏', noFavorites: '暂无收藏的灵感案例，浏览时点击星标即可收藏。',
        favorite: '收藏', favorited: '已收藏', zoomHint: '点击放大查看', close: '关闭',
        composeTab: '宝玉维度组合',
        composeHint: '五个维度自由拼接封面 Prompt，数据源自宝玉封图 skill（JimLiu/baoyu-skills，MIT）。',
        composeType: '类型', composePalette: '色板', composeRendering: '渲染', composeText: '文字', composeMood: '情绪',
        composeTitleLabel: '标题文字', composeTitlePlaceholder: '输入封面标题（文字层级含标题时必填）', composeTitleRequired: '该文字层级需要先填写标题。',
        composeRandomize: '随机组合', composeUse: '用此 Prompt 去生成', composeCombos: '共 {count} 种组合', composePreview: '拼接结果预览',
    },
    en: {
        kicker: 'Prompt inspiration', title: 'Inspiration', subtitle: 'Explore public examples, then bring a prompt back to Studio to make it your own.',
        refresh: 'Check updates', refreshing: 'Updating…', clearCache: 'Clear cache', clearingCache: 'Clearing…', cacheCleared: 'Local image cache cleared', cacheClearFailed: 'Failed to clear cache', clearCacheRestart: 'Backend not ready, please restart DSH',
        clearModalTitle: 'Clear local image cache?', clearModalDesc: 'This will delete locally cached inspiration images to free up disk space. The catalog, prompts, and your bookmarks will remain intact. Images will be re-fetched on demand.', cancel: 'Cancel', confirmClear: 'Clear Cache',
        allCategories: 'All categories', allStyles: 'All styles', allScenes: 'All scenes', categoryNav: 'Categories',
        search: 'Search examples, prompts, styles…', results: '{count} examples', noResults: 'No matching examples. Try another keyword or filter.',
        selectHint: 'Choose an example to read its full prompt and use it in Studio.', prompt: 'Full prompt', copy: 'Copy prompt', copied: 'Copied', use: 'Use this prompt', source: 'View source',
        useReference: 'Prompt + reference', referenceLoading: 'Fetching image…', referenceFailed: 'Failed to load the reference image',
        loading: 'Loading inspiration…', loadFailed: 'Could not load the inspiration library.', copyFailed: 'Failed to copy', retry: 'Retry', imageFailed: 'Image is temporarily unavailable', featured: 'Featured', updated: 'Updated ({count} examples)', updateFailed: 'Update failed. The current bundled library is still available.',
        allLoaded: 'All {count} examples displayed', onlyFavorites: 'Favorites only', noFavorites: 'No favorited examples yet. Click the star icon on any card to save.',
        favorite: 'Favorite', favorited: 'Favorited', zoomHint: 'Click to zoom in', close: 'Close',
        composeTab: 'Baoyu Composer',
        composeHint: 'Stitch a cover prompt from five dimensions, based on the baoyu cover-image skill (JimLiu/baoyu-skills, MIT).',
        composeType: 'Type', composePalette: 'Palette', composeRendering: 'Rendering', composeText: 'Text', composeMood: 'Mood',
        composeTitleLabel: 'Title text', composeTitlePlaceholder: 'Cover title (required when the text level includes a title)', composeTitleRequired: 'This text level needs a title first.',
        composeRandomize: 'Randomize', composeUse: 'Generate with this prompt', composeCombos: '{count} combinations', composePreview: 'Composed prompt preview',
    },
};
export const InspirationView = ({ locale, onUsePrompt, onUseReference }) => {
    const [language, setLanguage] = useState(() => locale?.getSnapshot?.().active?.startsWith('en') ? 'en' : 'zh');
    const [catalog, setCatalog] = useState(null);
    const [activeSourceId, setActiveSourceId] = useState('');
    const [baoyuSelection, setBaoyuSelection] = useState(BAOYU_DEFAULT_SELECTION);
    const [catalogError, setCatalogError] = useState(false);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [style, setStyle] = useState('');
    const [scene, setScene] = useState('');
    const [visibleLimit, setVisibleLimit] = useState(60);
    const [selected, setSelected] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [confirmClearOpen, setConfirmClearOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [favorites, setFavorites] = useState(() => loadInspirationFavorites());
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    const [lightboxCase, setLightboxCase] = useState(null);
    const [toast, setToast] = useState(null);
    const [referenceBusy, setReferenceBusy] = useState(false);
    const [pendingJump, setPendingJump] = useState('');
    const [activeCategory, setActiveCategory] = useState('');
    const toastTimerRef = useRef(null);
    const sentinelRef = useRef(null);
    const listRef = useRef(null);
    useEffect(() => {
        if (!locale?.subscribe)
            return;
        return locale.subscribe(() => setLanguage(locale.getSnapshot?.().active?.startsWith('en') ? 'en' : 'zh'));
    }, [locale]);
    const t = (key, values) => {
        let value = COPY[language][key] ?? COPY.zh[key];
        for (const [name, replacement] of Object.entries(values ?? {}))
            value = value.replace(`{${name}}`, replacement);
        return value;
    };
    const showToast = (text, isError = false) => {
        if (toastTimerRef.current !== null)
            window.clearTimeout(toastTimerRef.current);
        setToast({ text, isError });
        toastTimerRef.current = window.setTimeout(() => {
            setToast(null);
            toastTimerRef.current = null;
        }, 2400);
    };
    const toggleFavorite = (id) => {
        setFavorites(prev => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            saveInspirationFavorites(next);
            return next;
        });
    };
    const loadCatalog = async (method = 'GET') => {
        const response = await fetch(`${INSPIRATION_ROUTE}/${method === 'GET' ? 'catalog' : 'refresh'}`, {
            method,
            credentials: 'same-origin',
        });
        const payload = (await response.json().catch(() => null));
        if (!response.ok || payload === null || !('schemaVersion' in payload) || payload.schemaVersion !== 1) {
            throw new Error(payload && 'error' in payload && payload.error ? payload.error : t('loadFailed'));
        }
        return payload;
    };
    const retryCatalog = async () => {
        setCatalogError(false);
        try {
            const data = await loadCatalog('GET');
            setCatalog(data);
            setSelected(previous => previous === null ? data.sources[0]?.cases.find(item => item.featured) ?? data.sources[0]?.cases[0] ?? null : previous);
        }
        catch {
            setCatalogError(true);
            showToast(t('loadFailed'), true);
        }
    };
    useEffect(() => {
        let mounted = true;
        setCatalogError(false);
        void Promise.allSettled([loadCatalog(), loadCachedInspirationCatalog()]).then(([server, cache]) => {
            if (!mounted)
                return;
            const cached = cache.status === 'fulfilled' ? cache.value : undefined;
            const bundled = server.status === 'fulfilled' ? server.value : undefined;
            const next = resolveActiveCatalog(bundled, cached);
            if (next === undefined) {
                setCatalogError(true);
                showToast(t('loadFailed'), true);
                return;
            }
            setCatalogError(false);
            setCatalog(next);
            setSelected(previous => previous === null ? next.sources[0]?.cases.find(item => item.featured) ?? next.sources[0]?.cases[0] ?? null : previous);
        });
        return () => { mounted = false; };
    }, []);
    const source = catalog?.sources.find(candidate => candidate.id === activeSourceId) ?? catalog?.sources[0] ?? null;
    const composerActive = activeSourceId === BAOYU_COMPOSER_SOURCE_ID;
    /** Switch the active library; each source owns its own category/style/scene vocabularies. */
    const switchSource = (id) => {
        if (id === activeSourceId)
            return;
        setActiveSourceId(id);
        setCategory('');
        setStyle('');
        setScene('');
        setOnlyFavorites(false);
        setSelected(null);
        setPendingJump('');
        setActiveCategory('');
    };
    const useSelectedReference = async () => {
        if (selected === null || source === null || onUseReference === undefined)
            return;
        setReferenceBusy(true);
        try {
            const blob = await fetchInspirationImage(source.id, selected.id, source.imageRevision ?? source.version);
            const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'png';
            onUseReference(new File([blob], `inspiration-${selected.id}.${ext}`, { type: blob.type.startsWith('image/') ? blob.type : 'image/webp' }), selected.prompt);
        }
        catch {
            showToast(t('referenceFailed'), true);
        }
        finally {
            setReferenceBusy(false);
        }
    };
    const matchingCases = useMemo(() => {
        if (source === null)
            return [];
        const query = search.trim().toLowerCase();
        return source.cases.filter(item => {
            if (onlyFavorites && !favorites.has(item.id))
                return false;
            if (category && item.category !== category)
                return false;
            if (style && !item.styles.includes(style))
                return false;
            if (scene && !item.scenes.includes(scene))
                return false;
            if (!query)
                return true;
            const translatedCat = translateTag(item.category, language);
            const translatedStyles = item.styles.map(s => translateTag(s, language));
            const translatedScenes = item.scenes.map(s => translateTag(s, language));
            return [item.title, item.prompt, item.category, translatedCat, ...item.styles, ...translatedStyles, ...item.scenes, ...translatedScenes].some(value => value.toLowerCase().includes(query));
        });
    }, [source, search, category, style, scene, onlyFavorites, favorites, language]);
    useEffect(() => setVisibleLimit(60), [search, category, style, scene, onlyFavorites]);
    const visibleCases = matchingCases.slice(0, visibleLimit);
    // 每个分类在当前筛选下的命中数：驱动导航芯片的计数与可用性
    const categoryCounts = useMemo(() => {
        const counts = new Map();
        for (const item of matchingCases)
            counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
        return counts;
    }, [matchingCases]);
    // 可见案例按分类分组（沿用素材库的分类顺序），渲染成带粘性标题的“样例区”
    const visibleGroups = useMemo(() => {
        if (source === null)
            return [];
        const byCategory = new Map();
        for (const item of visibleCases) {
            const bucket = byCategory.get(item.category);
            if (bucket !== undefined)
                bucket.push(item);
            else
                byCategory.set(item.category, [item]);
        }
        return source.categories.flatMap(name => {
            const items = byCategory.get(name);
            return items !== undefined ? [{ name, items }] : [];
        });
    }, [source, visibleCases]);
    const visibleGroupSignature = visibleGroups.map(group => group.name).join('\u0000');
    // 点击导航：清掉单分类下拉（保证目标区可见），等待筛选与虚拟列表补齐后平滑滚动
    const jumpToCategory = (name) => {
        if (category !== '')
            setCategory('');
        setPendingJump(name);
    };
    useEffect(() => {
        if (pendingJump === '')
            return;
        const index = matchingCases.findIndex(item => item.category === pendingJump);
        if (index < 0)
            return;
        if (index >= visibleLimit) {
            setVisibleLimit(index + 60);
            return;
        }
        const raf = requestAnimationFrame(() => {
            document.getElementById(`dsh-ig-cat-${encodeURIComponent(pendingJump)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setPendingJump('');
        });
        return () => cancelAnimationFrame(raf);
    }, [pendingJump, matchingCases, visibleLimit]);
    // 滚动监听：当前停留在视口上部的样例区即为导航高亮项
    useEffect(() => {
        const root = listRef.current;
        if (root === null)
            return;
        const headers = Array.from(root.querySelectorAll('.dsh-ig-inspiration-group-head'));
        if (headers.length === 0)
            return;
        const categoryByTarget = new Map();
        for (const header of headers)
            categoryByTarget.set(header, header.dataset.category ?? '');
        const observer = new IntersectionObserver(entries => {
            const visible = entries.find(entry => entry.isIntersecting);
            if (visible !== undefined)
                setActiveCategory(categoryByTarget.get(visible.target) ?? '');
        }, { rootMargin: '0px 0px -75% 0px' });
        for (const header of headers)
            observer.observe(header);
        return () => observer.disconnect();
    }, [visibleGroupSignature]);
    // 现代感应式无限滚动：滑近底部时自动追加批次
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el)
            return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(e => e.isIntersecting)) {
                setVisibleLimit(limit => Math.min(limit + 48, matchingCases.length));
            }
        }, { rootMargin: '360px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, [matchingCases.length, visibleCases.length]);
    // ESC 关闭大图预览
    useEffect(() => {
        if (lightboxCase === null)
            return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape')
                setLightboxCase(null);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [lightboxCase]);
    const refresh = async () => {
        if (refreshing)
            return;
        setRefreshing(true);
        try {
            const next = await loadCatalog('POST');
            setCatalog(next);
            void saveCachedInspirationCatalog(next);
            setSelected(previous => previous === null ? next.sources[0]?.cases[0] ?? null : next.sources[0]?.cases.find(item => item.id === previous.id) ?? next.sources[0]?.cases[0] ?? null);
            showToast(t('updated', { count: String(next.sources[0]?.cases.length ?? 0) }));
        }
        catch {
            showToast(t('updateFailed'), true);
        }
        finally {
            setRefreshing(false);
        }
    };
    const clearCache = async () => {
        if (clearingCache)
            return;
        setClearingCache(true);
        setConfirmClearOpen(false);
        try {
            await clearInspirationImageCache();
            const res = await fetch(`${INSPIRATION_ROUTE}/cache/clear`, { method: 'POST', credentials: 'same-origin' });
            if (!res.ok) {
                if (res.status === 404)
                    throw new Error(t('clearCacheRestart'));
                throw new Error(`HTTP ${res.status}`);
            }
            showToast(t('cacheCleared'));
        }
        catch (err) {
            const msg = err instanceof Error && err.message ? err.message : t('cacheClearFailed');
            showToast(msg, true);
        }
        finally {
            setClearingCache(false);
        }
    };
    const copyPrompt = async () => {
        if (selected === null)
            return;
        try {
            await copyText(selected.prompt);
            setCopied(true);
            showToast(t('copied'));
            window.setTimeout(() => setCopied(false), 1_800);
        }
        catch {
            showToast(t('copyFailed'), true);
        }
    };
    return _jsxs("section", { className: "dsh-ig-inspiration", "aria-label": t('title'), children: [_jsxs("header", { className: "dsh-ig-inspiration-head", children: [_jsxs("div", { children: [_jsx("p", { className: "dsh-ig-inspiration-kicker", children: t('kicker') }), _jsx("h1", { children: t('title') }), _jsx("p", { className: "dsh-ig-inspiration-subtitle", children: t('subtitle') })] }), _jsxs("div", { className: "dsh-ig-inspiration-head-actions", children: [_jsxs("button", { type: "button", className: "dsh-ig-inspiration-clear-cache", onClick: () => setConfirmClearOpen(true), disabled: clearingCache, title: t('clearCache'), children: [clearingCache ? _jsx(LoaderCircle, { className: "dsh-ig-spin", size: 13 }) : _jsx(Trash2, { size: 13 }), clearingCache ? t('clearingCache') : t('clearCache')] }), _jsxs("button", { type: "button", className: "dsh-ig-inspiration-refresh", onClick: () => void refresh(), disabled: refreshing, title: t('refresh'), children: [refreshing ? _jsx(LoaderCircle, { className: "dsh-ig-spin", size: 13 }) : _jsx(Sparkles, { size: 13 }), refreshing ? t('refreshing') : t('refresh')] })] })] }), catalogError ? (_jsxs("div", { className: "dsh-ig-inspiration-empty is-catalog-error", children: [_jsx(AlertTriangle, { size: 28 }), _jsx("p", { children: t('loadFailed') }), _jsx("button", { type: "button", className: "dsh-ig-inspiration-retry-btn", onClick: () => void retryCatalog(), children: t('retry') })] })) : source === null ? (_jsxs("div", { className: "dsh-ig-inspiration-empty", children: [_jsx(LoaderCircle, { className: "dsh-ig-spin", size: 23 }), _jsx("span", { children: t('loading') })] })) : _jsxs(_Fragment, { children: [catalog !== null ? (_jsxs("div", { className: "dsh-ig-inspiration-sources", role: "tablist", children: [catalog.sources.map(item => (_jsx("button", { type: "button", role: "tab", "aria-selected": !composerActive && item.id === source?.id, className: `dsh-ig-inspiration-source-chip ${!composerActive && item.id === source?.id ? 'is-active' : ''}`, onClick: () => switchSource(item.id), children: item.label }, item.id))), _jsxs("button", { type: "button", role: "tab", "aria-selected": composerActive, className: `dsh-ig-inspiration-source-chip ${composerActive ? 'is-active' : ''}`, onClick: () => switchSource(BAOYU_COMPOSER_SOURCE_ID), children: [_jsx(Sparkles, { size: 11 }), t('composeTab')] })] })) : null, composerActive ? (_jsx(BaoyuComposerPanel, { language: language, selection: baoyuSelection, onChange: setBaoyuSelection, onUsePrompt: onUsePrompt })) : _jsxs(_Fragment, { children: [_jsxs("div", { className: "dsh-ig-inspiration-toolbar", children: [_jsxs("label", { className: "dsh-ig-inspiration-search", children: [_jsx(Search, { size: 15 }), _jsx("input", { value: search, onChange: event => setSearch(event.target.value), placeholder: t('search') })] }), _jsxs("button", { type: "button", className: `dsh-ig-inspiration-fav-filter ${onlyFavorites ? 'is-active' : ''}`, onClick: () => setOnlyFavorites(prev => !prev), title: t('onlyFavorites'), children: [_jsx(Star, { size: 14, className: onlyFavorites ? 'fill-star' : '' }), _jsxs("span", { children: [t('onlyFavorites'), favorites.size > 0 ? ` (${favorites.size})` : ''] })] }), _jsxs("select", { value: category, onChange: event => setCategory(event.target.value), "aria-label": t('allCategories'), children: [_jsx("option", { value: "", children: t('allCategories') }), source.categories.map(item => _jsx("option", { value: item, children: translateTag(item, language) }, item))] }), _jsxs("select", { value: style, onChange: event => setStyle(event.target.value), "aria-label": t('allStyles'), children: [_jsx("option", { value: "", children: t('allStyles') }), source.styles.map(item => _jsx("option", { value: item, children: translateTag(item, language) }, item))] }), _jsxs("select", { value: scene, onChange: event => setScene(event.target.value), "aria-label": t('allScenes'), children: [_jsx("option", { value: "", children: t('allScenes') }), source.scenes.map(item => _jsx("option", { value: item, children: translateTag(item, language) }, item))] })] }), _jsxs("nav", { className: "dsh-ig-inspiration-catnav", "aria-label": t('categoryNav'), children: [_jsxs("button", { type: "button", className: `dsh-ig-inspiration-catnav-chip ${category === '' && activeCategory === '' ? 'is-active' : ''}`, onClick: () => {
                                            if (category !== '')
                                                setCategory('');
                                            listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }, children: [_jsx("span", { children: t('allCategories') }), _jsx("em", { children: matchingCases.length })] }), source.categories.map(name => {
                                        const count = categoryCounts.get(name) ?? 0;
                                        const isActive = category === name || (category === '' && activeCategory === name);
                                        return (_jsxs("button", { type: "button", disabled: count === 0, "aria-current": isActive || undefined, className: `dsh-ig-inspiration-catnav-chip ${isActive ? 'is-active' : ''}`, onClick: () => jumpToCategory(name), children: [_jsx("span", { children: translateTag(name, language) }), _jsx("em", { children: count })] }, name));
                                    })] }), _jsxs("div", { className: "dsh-ig-inspiration-layout", children: [_jsxs("div", { children: [_jsxs("div", { className: "dsh-ig-inspiration-summary", children: [_jsx("strong", { children: t('results', { count: String(matchingCases.length) }) }), _jsx("span", { children: source.version.slice(0, 8) })] }), matchingCases.length === 0 ? (_jsx("div", { className: "dsh-ig-inspiration-empty", children: onlyFavorites ? t('noFavorites') : t('noResults') })) : (_jsxs(_Fragment, { children: [_jsx("div", { ref: listRef, className: "dsh-ig-inspiration-list", children: visibleGroups.map(group => (_jsxs("section", { className: "dsh-ig-inspiration-group", children: [_jsxs("h3", { id: `dsh-ig-cat-${encodeURIComponent(group.name)}`, "data-category": group.name, className: "dsh-ig-inspiration-group-head", children: [_jsx("span", { children: translateTag(group.name, language) }), _jsx("em", { children: categoryCounts.get(group.name) ?? group.items.length })] }), _jsx("div", { className: "dsh-ig-inspiration-grid", children: group.items.map(item => (_jsx(InspirationCard, { item: item, sourceId: source.id, sourceRevision: source.imageRevision ?? source.version, selected: selected?.id === item.id, isFavorited: favorites.has(item.id), language: language, featuredLabel: t('featured'), retryLabel: t('retry'), onSelect: () => { setSelected(item); setCopied(false); }, onToggleFavorite: () => toggleFavorite(item.id) }, item.id))) })] }, group.name))) }), visibleCases.length < matchingCases.length ? (_jsx("div", { ref: sentinelRef, style: { height: 32, margin: '16px 0' } })) : (_jsx("div", { className: "dsh-ig-inspiration-end-hint", children: t('allLoaded', { count: String(matchingCases.length) }) }))] }))] }), _jsx("aside", { className: "dsh-ig-inspiration-inspector", children: selected === null ? (_jsxs("div", { className: "dsh-ig-inspiration-inspector-empty", children: [_jsx(ImageIcon, { size: 28 }), _jsx("span", { children: t('selectHint') })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dsh-ig-inspiration-inspector-image", onClick: () => setLightboxCase({ sourceId: source.id, caseId: selected.id, revision: source.imageRevision ?? source.version, title: selected.title, alt: selected.imageAlt }), title: t('zoomHint'), children: [_jsx(InspirationImage, { sourceId: source.id, caseId: selected.id, revision: source.imageRevision ?? source.version, alt: selected.imageAlt, retryLabel: t('retry') }), _jsxs("span", { className: "dsh-ig-inspiration-inspector-zoom-hint", children: [_jsx(Maximize2, { size: 11 }), t('zoomHint')] })] }), _jsxs("div", { className: "dsh-ig-inspiration-inspector-body", children: [_jsxs("div", { className: "dsh-ig-inspiration-inspector-head", children: [_jsx("h2", { children: selected.title }), _jsx("button", { type: "button", className: `dsh-ig-inspiration-inspector-fav ${favorites.has(selected.id) ? 'is-favorited' : ''}`, onClick: () => toggleFavorite(selected.id), title: favorites.has(selected.id) ? t('favorited') : t('favorite'), children: _jsx(Star, { size: 15, className: favorites.has(selected.id) ? 'fill-star' : '' }) })] }), selected.sourceLabel && _jsx("p", { className: "dsh-ig-inspiration-origin", children: selected.sourceLabel }), _jsxs("div", { className: "dsh-ig-inspiration-tags", children: [_jsx("span", { children: translateTag(selected.category, language) }), selected.styles.slice(0, 3).map(item => _jsx("span", { children: translateTag(item, language) }, item))] }), _jsxs("div", { className: "dsh-ig-inspiration-prompt-label", children: [_jsx("span", { children: t('prompt') }), _jsx("span", { children: selected.prompt.length })] }), _jsx("p", { className: "dsh-ig-inspiration-prompt", children: selected.prompt }), _jsxs("div", { className: "dsh-ig-inspiration-actions", children: [_jsxs("button", { type: "button", onClick: () => void copyPrompt(), children: [copied ? _jsx(Check, { size: 14 }) : _jsx(Clipboard, { size: 14 }), copied ? t('copied') : t('copy')] }), selected.sourceUrl ?? selected.githubUrl ? _jsxs("a", { className: "dsh-ig-inspiration-source-link", href: selected.sourceUrl ?? selected.githubUrl, target: "_blank", rel: "noreferrer", children: [_jsx(ExternalLink, { size: 14 }), t('source')] }) : _jsx("span", {}), _jsxs("button", { type: "button", className: "dsh-ig-inspiration-use", onClick: () => onUsePrompt(selected.prompt), children: [_jsx(Sparkles, { size: 14 }), t('use')] }), onUseReference !== undefined ? (_jsxs("button", { type: "button", className: "dsh-ig-inspiration-use is-secondary", disabled: referenceBusy, onClick: () => { void useSelectedReference(); }, children: [_jsx(ImagePlus, { size: 14 }), referenceBusy ? t('referenceLoading') : t('useReference')] })) : null] })] })] })) })] })] })] }), lightboxCase !== null && (_jsx("div", { className: "dsh-ig-inspiration-lightbox", onClick: () => setLightboxCase(null), children: _jsxs("div", { className: "dsh-ig-inspiration-lightbox-content", onClick: e => e.stopPropagation(), children: [_jsx("button", { type: "button", className: "dsh-ig-inspiration-lightbox-close", onClick: () => setLightboxCase(null), "aria-label": t('close'), children: _jsx(X, { size: 18 }) }), _jsx("div", { className: "dsh-ig-inspiration-lightbox-img-wrap", children: _jsx(InspirationImage, { sourceId: lightboxCase.sourceId, caseId: lightboxCase.caseId, revision: lightboxCase.revision, alt: lightboxCase.alt, retryLabel: t('retry') }) }), _jsx("div", { className: "dsh-ig-inspiration-lightbox-caption", children: lightboxCase.title })] }) })), confirmClearOpen && (_jsx("div", { className: "dsh-ig-inspiration-modal-backdrop", onClick: () => setConfirmClearOpen(false), children: _jsxs("div", { className: "dsh-ig-inspiration-modal", onClick: e => e.stopPropagation(), role: "dialog", "aria-modal": "true", children: [_jsx("h3", { children: t('clearModalTitle') }), _jsx("p", { children: t('clearModalDesc') }), _jsxs("div", { className: "dsh-ig-inspiration-modal-actions", children: [_jsx("button", { type: "button", className: "dsh-ig-inspiration-modal-btn", onClick: () => setConfirmClearOpen(false), disabled: clearingCache, children: t('cancel') }), _jsxs("button", { type: "button", className: "dsh-ig-inspiration-modal-btn is-danger", onClick: () => void clearCache(), disabled: clearingCache, children: [clearingCache ? _jsx(LoaderCircle, { className: "dsh-ig-spin", size: 13 }) : null, t('confirmClear')] })] })] }) })), toast !== null && (_jsxs("div", { className: `dsh-ig-inspiration-toast ${toast.isError ? 'is-error' : 'is-success'}`, role: "status", children: [toast.isError ? _jsx(X, { size: 14 }) : _jsx(Check, { size: 14 }), _jsx("span", { children: toast.text })] }))] });
};
const BaoyuComposerPanel = ({ language, selection, onChange, onUsePrompt }) => {
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);
    const tr = (key, params) => {
        let text = COPY[language][key] ?? COPY.zh[key];
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                text = text.replace(`{${k}}`, v);
            }
        }
        return text;
    };
    const label = (id) => (language === 'zh' ? BAOYU_LABELS_ZH[id] ?? id : id);
    const needsTitle = selection.text !== 'none';
    const titleReady = !needsTitle || selection.title.trim() !== '';
    let prompt = '';
    if (titleReady) {
        try {
            prompt = composeBaoyuPrompt(selection);
        }
        catch {
            prompt = '';
        }
    }
    const combos = BAOYU_TYPES.length * BAOYU_PALETTES.length * BAOYU_RENDERINGS.length * BAOYU_TEXT_LEVELS.length * BAOYU_MOODS.length;
    const dimension = (name, key, options) => (_jsxs("div", { className: "dsh-ig-baoyu-dim", children: [_jsx("div", { className: "dsh-ig-baoyu-dim-head", children: name }), _jsx("div", { className: "dsh-ig-baoyu-chips", children: options.map(option => {
                    const palette = key === 'palette' ? BAOYU_PALETTES.find(item => item.id === option.id) : undefined;
                    return (_jsxs("button", { type: "button", className: `dsh-ig-baoyu-chip ${selection[key] === option.id ? 'is-active' : ''}`, onClick: () => {
                            onChange({ ...selection, [key]: option.id });
                            setCopied(false);
                        }, title: language === 'zh' ? (palette?.tagline ?? option.id) : option.id, children: [_jsx("span", { children: label(option.id) }), palette !== undefined ? (_jsx("span", { className: "dsh-ig-baoyu-swatch", children: [palette.colors[0], palette.colors.find(color => color.role === 'Background'), palette.colors.find(color => color.role === 'Accent 1')].map((color, index) => color === undefined ? null : _jsx("i", { style: { background: color.hex } }, index)) })) : null] }, option.id));
                }) })] }, name));
    const copyPrompt = async () => {
        if (prompt === '')
            return;
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            setCopyFailed(false);
        }
        catch {
            setCopyFailed(true);
        }
    };
    return (_jsxs("div", { className: "dsh-ig-baoyu-panel", children: [_jsxs("div", { className: "dsh-ig-baoyu-intro", children: [_jsx("strong", { className: "dsh-ig-baoyu-combos", children: tr('composeCombos', { count: String(combos) }) }), _jsx("span", { className: "dsh-ig-baoyu-hint", children: tr('composeHint') })] }), dimension(tr('composeType'), 'type', BAOYU_TYPES), dimension(tr('composePalette'), 'palette', BAOYU_PALETTES), dimension(tr('composeRendering'), 'rendering', BAOYU_RENDERINGS), dimension(tr('composeText'), 'text', BAOYU_TEXT_LEVELS), dimension(tr('composeMood'), 'mood', BAOYU_MOODS), _jsxs("div", { className: "dsh-ig-baoyu-dim", children: [_jsx("div", { className: "dsh-ig-baoyu-dim-head", children: tr('composeTitleLabel') }), _jsx("input", { className: "dsh-ig-baoyu-title-input", value: selection.title, placeholder: tr('composeTitlePlaceholder'), disabled: selection.text === 'none', onChange: event => {
                            onChange({ ...selection, title: event.target.value });
                            setCopied(false);
                        } }), needsTitle && !titleReady ? _jsx("div", { className: "dsh-ig-baoyu-required", children: tr('composeTitleRequired') }) : null] }), _jsxs("div", { className: "dsh-ig-baoyu-actions", children: [_jsxs("button", { type: "button", className: "dsh-ig-baoyu-btn", onClick: () => onChange(randomBaoyuSelection(selection)), children: [_jsx(Shuffle, { size: 13 }), _jsx("span", { children: tr('composeRandomize') })] }), _jsxs("button", { type: "button", className: "dsh-ig-baoyu-btn", disabled: prompt === '', onClick: () => { void copyPrompt(); }, children: [copied ? _jsx(Check, { size: 13 }) : _jsx(Clipboard, { size: 13 }), _jsx("span", { children: copied ? tr('copied') : tr('copy') })] }), _jsxs("button", { type: "button", className: "dsh-ig-baoyu-btn is-primary", disabled: prompt === '', onClick: () => onUsePrompt(prompt), children: [_jsx(Sparkles, { size: 13 }), _jsx("span", { children: tr('composeUse') })] }), copyFailed ? _jsx("span", { className: "dsh-ig-baoyu-required", children: tr('copyFailed') }) : null] }), prompt !== '' ? (_jsxs("div", { className: "dsh-ig-baoyu-preview-block", children: [_jsx("div", { className: "dsh-ig-baoyu-preview-head", children: tr('composePreview') }), _jsx("pre", { className: "dsh-ig-baoyu-preview", children: prompt })] })) : null] }));
};
const InspirationCard = ({ item, sourceId, sourceRevision, selected, isFavorited, language, featuredLabel, retryLabel, onSelect, onToggleFavorite }) => (_jsxs("button", { type: "button", className: `dsh-ig-inspiration-card ${selected ? 'is-selected' : ''}`, onClick: onSelect, children: [_jsxs("div", { className: "dsh-ig-inspiration-visual", children: [item.featured && _jsxs("span", { className: "dsh-ig-inspiration-featured", children: [_jsx(Sparkles, { size: 10 }), featuredLabel] }), _jsx("button", { type: "button", className: `dsh-ig-inspiration-card-star ${isFavorited ? 'is-favorited' : ''}`, onClick: e => {
                        e.stopPropagation();
                        onToggleFavorite();
                    }, "aria-label": "\u6536\u85CF", children: _jsx(Star, { size: 13, className: isFavorited ? 'fill-star' : '' }) }), _jsx(InspirationImage, { sourceId: sourceId, caseId: item.id, revision: sourceRevision, alt: item.imageAlt, retryLabel: retryLabel })] }), _jsxs("div", { className: "dsh-ig-inspiration-card-copy", children: [_jsx("strong", { children: item.title }), _jsx("span", { children: translateTag(item.category, language) })] })] }));
const InspirationImage = ({ sourceId, caseId, revision, alt, retryLabel = 'Retry' }) => {
    const [node, setNode] = useState(null);
    const [visible, setVisible] = useState(false);
    const [url, setUrl] = useState(null);
    const [failed, setFailed] = useState(false);
    const urlRef = useRef(null);
    useEffect(() => {
        if (node === null)
            return;
        const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)), { rootMargin: '320px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [node]);
    useEffect(() => {
        if (!visible)
            return;
        let active = true;
        setFailed(false);
        if (urlRef.current !== null) {
            URL.revokeObjectURL(urlRef.current);
            urlRef.current = null;
        }
        setUrl(null);
        void fetchInspirationImage(sourceId, caseId, revision).then(blob => {
            if (!active)
                return;
            const next = URL.createObjectURL(blob);
            if (urlRef.current !== null) {
                URL.revokeObjectURL(urlRef.current);
            }
            urlRef.current = next;
            setUrl(next);
        }).catch(() => { if (active)
            setFailed(true); });
        return () => {
            active = false;
        };
    }, [visible, sourceId, caseId, revision]);
    useEffect(() => {
        return () => {
            if (urlRef.current !== null) {
                URL.revokeObjectURL(urlRef.current);
                urlRef.current = null;
            }
        };
    }, []);
    return (_jsx("div", { ref: setNode, style: { width: '100%', height: '100%' }, children: url !== null && !failed ? (_jsx("img", { src: url, alt: alt, loading: "lazy", onError: () => {
                setFailed(true);
                void evictInspirationImage(sourceId, caseId);
            } })) : (_jsx("div", { className: `dsh-ig-inspiration-image-placeholder ${failed ? 'is-error' : ''}`, children: failed ? (_jsx("button", { type: "button", className: "dsh-ig-inspiration-retry-btn", onClick: e => {
                    e.stopPropagation();
                    setFailed(false);
                    if (urlRef.current !== null) {
                        URL.revokeObjectURL(urlRef.current);
                        urlRef.current = null;
                    }
                    setUrl(null);
                    void evictInspirationImage(sourceId, caseId, revision)
                        .then(() => fetchInspirationImage(sourceId, caseId, revision))
                        .then(blob => {
                        const next = URL.createObjectURL(blob);
                        if (urlRef.current !== null) {
                            URL.revokeObjectURL(urlRef.current);
                        }
                        urlRef.current = next;
                        setUrl(next);
                    })
                        .catch(() => setFailed(true));
                }, children: retryLabel })) : (_jsx(LoaderCircle, { className: "dsh-ig-spin", size: 18 })) })) }));
};
async function copyText(value) {
    if (navigator.clipboard?.writeText)
        return navigator.clipboard.writeText(value);
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied)
        throw new Error('copy-failed');
}
export function resolveActiveCatalog(bundled, cached) {
    if (!bundled)
        return cached;
    if (!cached)
        return bundled;
    const bundledSource = bundled.sources[0];
    const cachedSource = cached.sources[0];
    if (!bundledSource)
        return cached;
    if (!cachedSource)
        return bundled;
    // 1. 版本一致时优先 bundled（包内静态对象）
    if (bundledSource.version === cachedSource.version) {
        return bundled;
    }
    // 2. 有更新时间戳时，取较新的那个（例如发新版插件时 bundled 较新；用户手动刷新成功时 cached 较新）
    const bundledTime = bundledSource.updatedAt ? Date.parse(bundledSource.updatedAt) : NaN;
    const cachedTime = cachedSource.updatedAt ? Date.parse(cachedSource.updatedAt) : NaN;
    if (Number.isFinite(bundledTime) && Number.isFinite(cachedTime)) {
        return cachedTime > bundledTime ? cached : bundled;
    }
    // 3. 缺少有效时间戳时：若缓存的案例数更多，说明是用户手动拉取的新快照，保留缓存；否则优先随插件发版的 bundled
    return cachedSource.cases.length > bundledSource.cases.length ? cached : bundled;
}
//# sourceMappingURL=inspiration-view.js.map