import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Native Workspace Gallery & Studio View Component for DSH `conversation.view` slot.
 * Fully i18n-reactive (Chinese & English) with modular tabs, multi-dimensional filters,
 * responsive image grid, and placeholder routes.
 */
import { memo, useCallback, useDeferredValue, useEffect, useLayoutEffect, useState, useMemo, useRef } from 'react';
import { DELETE_ROUTE, IMPORT_ROUTE, STORAGE_STATS_ROUTE, ZIP_CANCEL_ROUTE, ZIP_PROGRESS_ROUTE, ZIP_ROUTE, imageUrlFor, previewUrlFor, thumbUrlFor, vaultUrlFor } from '../shared.js';
import { Image as ImageIcon, SlidersHorizontal, Heart, Search, Copy, Download, FileText, Trash2, X, ChevronLeft, ChevronRight, CheckSquare, Check, AlertTriangle, Sparkles, Upload, HardDrive, } from 'lucide-react';
import { getGalleryItems, subscribeGallery, saveGalleryItem, deleteGalleryItem, bulkDeleteGalleryItems, getGalleryItemsStrict, bulkSetFavoriteGalleryItems, isItemInWorkspace, pruneGalleryThumbs, pruneTombstones, getGalleryThumbStats, } from './gallery-store.js';
import { StudioView } from './studio-view.js';
import { deselectStudioTlCanvases } from './tl/studio-tl-registry.js';
import { InspirationView } from './inspiration-view.js';
import { evictAttachmentCache, fetchAttachmentBlob } from './image-cache.js';
import { shouldShowBatchBar } from './gallery-batch-bar.js';
import { mergeGalleryItems } from './gallery-merge.js';
import { copyImageBlob, createZipBlob, downloadBlobUrl } from './browser-image-utils.js';
import { conversationRegenerateRequest, gifOutputRequest } from './conversation-regenerate.js';
import { readGifInfo } from '../gif-info.js';
import { imageVersionKey, originalFromMeta } from './image-result-node.js';
import { STUDIO_ROUTE } from '../shared.js';
import { DICT } from './gallery-i18n.js';
import { canUseServerZip, deleteVaultOriginals, extensionFor, fetchGalleryItemBlob, formatStorageBytes, galleryDownloadName, imageMediaTypeOf, persistGalleryRecord, postZipDownload, syncVaultRefs, vaultKeysOf, vaultProfileId } from './gallery-media.js';
import { formatCardMeta, formatRelativeTime, getItemRatio } from './gallery-format.js';
import { GalleryCard } from './gallery-card.js';
import { GalleryGifBar, GalleryGifDownload, GalleryGifStage, useGalleryGifPreview } from './gif-gallery.js';
const GALLERY_RENDER_BATCH = 120;
export const GalleryViewTab = (props) => {
    const { locale, sessionId, useSessions, useWorkspaces, credentialEvents, inSidebar, defaultTab, initialCanvasSurface, useTabInfo } = props;
    const [activeTab, setActiveTab] = useState(defaultTab ?? 'gallery');
    const [studioDraft, setStudioDraft] = useState(undefined);
    const [studioReference, setStudioReference] = useState(undefined);
    const [items, setItems] = useState([]);
    const [renderLimit, setRenderLimit] = useState(GALLERY_RENDER_BATCH);
    const gallerySentinelRef = useRef(null);
    const [search, setSearch] = useState('');
    // Keep typing responsive while the full list is re-filtered off the critical path.
    const deferredSearch = useDeferredValue(search);
    const [selectedProvider, setSelectedProvider] = useState('all');
    const [selectedRatio, setSelectedRatio] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [onlyCurrentWorkspace, setOnlyCurrentWorkspace] = useState(() => {
        try {
            const stored = localStorage.getItem('dsh-ig-only-current-workspace');
            return stored === null ? true : stored === 'true';
        }
        catch {
            return true;
        }
    });
    const [serverWorkspaces, setServerWorkspaces] = useState([]);
    const [serverActiveRoot, setServerActiveRoot] = useState(null);
    useEffect(() => {
        try {
            localStorage.setItem('dsh-ig-only-current-workspace', String(onlyCurrentWorkspace));
        }
        catch { /* best effort */ }
    }, [onlyCurrentWorkspace]);
    // Canvas selection is interaction state tied to this surface: leaving the
    // studio page cancels it so a stale selection can neither resurface on
    // return nor linger in the host mirror. Only fires on hosts that inject the
    // sidebar tab hook; the main-area conversation tab passes none.
    const tabVisible = useTabInfo?.().tab?.visible;
    useEffect(() => {
        if (tabVisible === false)
            deselectStudioTlCanvases();
    }, [tabVisible]);
    useEffect(() => {
        let mounted = true;
        fetch(STUDIO_ROUTE)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
            if (!mounted || !data)
                return;
            if (Array.isArray(data.workspaces))
                setServerWorkspaces(data.workspaces);
            if (typeof data.workspaceRoot === 'string')
                setServerActiveRoot(data.workspaceRoot);
        })
            .catch(() => { });
        return () => {
            mounted = false;
        };
    }, []);
    const liveWorkspaces = useWorkspaces ? useWorkspaces((s) => s?.items) : null;
    const liveSessions = useSessions ? useSessions((s) => s) : null;
    const currentSessionId = sessionId || liveSessions?.current;
    const activeWorkspace = useMemo(() => {
        const allWs = Array.isArray(liveWorkspaces) && liveWorkspaces.length > 0
            ? liveWorkspaces
            : serverWorkspaces;
        if (allWs.length > 0) {
            if (currentSessionId) {
                const matched = allWs.find((ws) => Array.isArray(ws.sessionIds) && ws.sessionIds.includes(currentSessionId));
                if (matched)
                    return matched;
            }
            if (serverActiveRoot) {
                const normActive = serverActiveRoot.replace(/\\/g, '/').toLowerCase();
                const matched = allWs.find((ws) => ws.path && ws.path.replace(/\\/g, '/').toLowerCase() === normActive);
                if (matched)
                    return matched;
            }
            return allWs[0];
        }
        if (serverActiveRoot) {
            return { workspaceId: 'default', path: serverActiveRoot, title: 'Workspace', sessionIds: [] };
        }
        return null;
    }, [liveWorkspaces, serverWorkspaces, currentSessionId, serverActiveRoot]);
    const [previewItem, setPreviewItem] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const previewUrlRef = useRef(null);
    /** Identifies the current preview attempt; late fallback fetches are ignored. */
    const previewRequestRef = useRef(0);
    const previewPrefetchRef = useRef([]);
    previewUrlRef.current = previewUrl;
    const [previewBlob, setPreviewBlob] = useState(null);
    // Stable dispatchers keep memoized cards from re-rendering on selection changes.
    const cardActionsRef = useRef(null);
    const cardActions = useMemo(() => ({
        click: (item, index, event) => cardActionsRef.current?.click(item, index, event),
        toggleSelect: (item, index, event) => cardActionsRef.current?.toggleSelect(item, index, event),
        requestDelete: item => cardActionsRef.current?.requestDelete(item),
        preview: (item, blob) => cardActionsRef.current?.preview(item, blob),
        toast: message => cardActionsRef.current?.toast(message),
    }), []);
    const [toast, setToast] = useState(null);
    // In-Gallery Regenerate State
    const [showRegenerateModal, setShowRegenerateModal] = useState(false);
    const [regeneratePrompt, setRegeneratePrompt] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const regenerateControllerRef = useRef(null);
    // Batch Management & Shift-Selection State
    const [isManageMode, setIsManageMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const lastSelectedIndexRef = useRef(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteWorkspaceFiles, setDeleteWorkspaceFiles] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showStorageModal, setShowStorageModal] = useState(false);
    const [isStorageScanning, setIsStorageScanning] = useState(false);
    const [storageStats, setStorageStats] = useState(null);
    // Clear batch selection and shift anchor when switching tabs, searching, or changing filters
    useEffect(() => {
        setSelectedIds(new Set());
        lastSelectedIndexRef.current = null;
    }, [activeTab, search, selectedProvider, selectedRatio, sortBy, onlyCurrentWorkspace]);
    const [lang, setLang] = useState(() => {
        const active = locale?.getSnapshot?.()?.active;
        return active?.startsWith('en') ? 'en' : 'zh';
    });
    useEffect(() => {
        if (!locale?.subscribe)
            return;
        return locale.subscribe(() => {
            const active = locale.getSnapshot?.()?.active;
            setLang(active?.startsWith('en') ? 'en' : 'zh');
        });
    }, [locale]);
    const dict = lang === 'en' ? DICT.en : DICT.zh;
    const gifPreview = useGalleryGifPreview(previewItem, lang);
    // Stable identity: memoized cards only re-render when their own state changes.
    const t = useMemo(() => {
        return (key, params) => {
            let text = dict[key] || DICT.zh[key] || key;
            if (params) {
                for (const [k, v] of Object.entries(params)) {
                    text = text.replace(`{${k}}`, v);
                }
            }
            return text;
        };
    }, [dict]);
    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => {
            setToast(null);
        }, 2000);
    };
    const [importing, setImporting] = useState(false);
    const importInputRef = useRef(null);
    const importImages = async (files) => {
        if (files === null || files.length === 0 || importing)
            return;
        const all = Array.from(files);
        const picked = all
            .map(file => ({ file, mediaType: imageMediaTypeOf(file) }))
            .filter((entry) => entry.mediaType !== undefined)
            .slice(0, 8);
        if (picked.length === 0) {
            showToast(t('importFailed'));
            return;
        }
        setImporting(true);
        try {
            // Upload the picked files directly: the browser streams multipart from
            // disk, so neither the page nor the host has to hold the batch as base64.
            const form = new FormData();
            for (const entry of picked) {
                const name = entry.file.name.length > 0 ? entry.file.name : `image.${extensionFor(entry.mediaType)}`;
                form.append('images', entry.file, name);
            }
            const profileId = vaultProfileId();
            const response = await fetch(IMPORT_ROUTE, {
                method: 'POST',
                credentials: 'same-origin',
                ...(profileId === undefined ? {} : { headers: { 'x-dsh-vault-profile': profileId } }),
                body: form,
            });
            if (!response.ok)
                throw new Error(`HTTP ${String(response.status)}`);
            const payload = await response.json();
            if ((payload.failures ?? []).length > 0)
                console.warn('[dsh-image-gen] import failures', payload.failures);
            const imported = payload.images ?? [];
            let added = 0;
            let writeFailures = 0;
            for (const entry of imported) {
                // The attachment id is content-addressed, so re-importing bytes that
                // already exist must not overwrite or alias the original gallery entry.
                const persisted = await saveGalleryItem({
                    id: `import-${entry.attachment.attachmentId}-${crypto.randomUUID()}`,
                    attachment: entry.attachment,
                    prompt: '',
                    provider: 'import',
                    model: '',
                    createdAt: Date.now(),
                    ...(activeWorkspace?.workspaceId ? { workspaceId: activeWorkspace.workspaceId } : {}),
                    ...(activeWorkspace?.path ? { workspacePath: activeWorkspace.path } : {}),
                    ...(currentSessionId ? { sessionId: currentSessionId } : {}),
                    ...(entry.original === undefined ? {} : { original: entry.original }),
                });
                if (persisted)
                    added += 1;
                else
                    writeFailures += 1;
            }
            if (added > 0) {
                // Import committed new originals; publish the complete profile set so
                // another browser cannot delete a key this profile just adopted.
                await syncVaultRefs(vaultKeysOf(await getGalleryItemsStrict()));
            }
            const failCount = (payload.failures ?? []).length + (all.length - picked.length) + writeFailures;
            if (added === 0) {
                const firstFailure = (payload.failures ?? [])[0];
                const reason = typeof firstFailure?.error === 'string' ? firstFailure.error : undefined;
                showToast(reason === undefined ? t('importFailed') : t('importFailed') + ' · ' + reason);
            }
            else if (failCount > 0)
                showToast(t('importPartial', { count: String(added), fail: String(failCount) }));
            else
                showToast(t('importAdded', { count: String(added) }));
        }
        catch (err) {
            console.warn('[dsh-image-gen] import failed', err);
            showToast(t('importFailed') + (err instanceof Error ? ' · ' + err.message : ''));
        }
        finally {
            setImporting(false);
        }
    };
    const useInspirationPrompt = useCallback((prompt) => {
        setStudioDraft(prompt);
        setActiveTab('studio');
    }, []);
    const useInspirationReference = useCallback((file, prompt) => {
        setStudioDraft(prompt);
        setStudioReference(file);
        setActiveTab('studio');
    }, []);
    const clearStudioDraft = useCallback(() => setStudioDraft(undefined), []);
    const clearStudioReference = useCallback(() => setStudioReference(undefined), []);
    // Hide chat input composer while browsing gallery/studio. Only in the
    // conversation-view variant: the sidebar variant shares the screen with the
    // native conversation, whose composer is the whole point of the split.
    useEffect(() => {
        if (inSidebar)
            return undefined;
        const seat = document.querySelector('[data-composer-seat]');
        if (seat) {
            const prevDisplay = seat.style.display;
            seat.style.display = 'none';
            return () => {
                seat.style.display = prevDisplay;
            };
        }
        return undefined;
    }, [inSidebar]);
    // Load items from IndexedDB
    useEffect(() => {
        let active = true;
        let pruned = false;
        const load = () => {
            // Maintenance (vault gc) only runs after a complete read: a failed read
            // must not look like an empty gallery and delete every original.
            void getGalleryItemsStrict().then((res) => {
                if (!active)
                    return;
                setItems(prev => mergeGalleryItems(prev, res));
                if (!pruned) {
                    // One sweep per mount drops thumbnails left behind by older deletions
                    // and compact old deletion metadata without forgetting deleted IDs.
                    pruned = true;
                    void pruneGalleryThumbs(res.map(item => String(item.attachment.attachmentId)));
                    void pruneTombstones();
                    void syncVaultRefs(vaultKeysOf(res)).catch((err) => {
                        console.warn('[dsh-image-gen] Failed to sync original references:', err);
                    });
                }
            }).catch((err) => {
                console.warn('[dsh-image-gen] Failed to read gallery items:', err);
            });
        };
        load();
        // Batch favourite/delete operations notify once per record; coalesce the
        // full-table re-read so a bulk action does not re-render the grid N times.
        let timer;
        const unsubscribe = subscribeGallery(() => {
            if (timer !== undefined)
                clearTimeout(timer);
            timer = setTimeout(load, 120);
        });
        return () => {
            active = false;
            if (timer !== undefined)
                clearTimeout(timer);
            unsubscribe();
        };
    }, []);
    const [previewLoading, setPreviewLoading] = useState(false);
    // Multi-dimensional filtering and sorting (Provider, Ratio, Search, and Sort)
    const filteredItems = useMemo(() => {
        return items
            .filter((item) => {
            // Tab-level filter (Favorites tab only shows favorited items)
            if (activeTab === 'favorites' && !item.isFavorite) {
                return false;
            }
            // Provider filter
            if (selectedProvider !== 'all' && item.provider !== selectedProvider) {
                return false;
            }
            // Ratio filter
            if (selectedRatio !== 'all') {
                const ratio = getItemRatio(item);
                if (ratio !== selectedRatio) {
                    return false;
                }
            }
            // Search filter (Prompt, model, tags, provider)
            if (deferredSearch.trim().length > 0) {
                const q = deferredSearch.trim().toLowerCase();
                const matchPrompt = item.prompt?.toLowerCase().includes(q);
                const matchModel = item.model?.toLowerCase().includes(q);
                const matchProvider = item.provider?.toLowerCase().includes(q);
                const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
                if (!matchPrompt && !matchModel && !matchProvider && !matchTags) {
                    return false;
                }
            }
            // Workspace filter
            if (onlyCurrentWorkspace && activeWorkspace) {
                if (!isItemInWorkspace(item, activeWorkspace)) {
                    return false;
                }
            }
            return true;
        })
            .sort((a, b) => {
            if (sortBy === 'oldest') {
                return a.createdAt - b.createdAt;
            }
            return b.createdAt - a.createdAt;
        });
    }, [items, activeTab, selectedProvider, selectedRatio, deferredSearch, sortBy, onlyCurrentWorkspace, activeWorkspace]);
    // Render the grid in batches so a very large library does not mount every
    // card on first paint; select-all still works on the full filtered list.
    const galleryFilterKey = [activeTab, selectedProvider, selectedRatio, deferredSearch, sortBy, String(onlyCurrentWorkspace), activeWorkspace?.path ?? ''].join('|');
    useEffect(() => {
        setRenderLimit(GALLERY_RENDER_BATCH);
    }, [galleryFilterKey]);
    useEffect(() => {
        if (filteredItems.length <= renderLimit)
            return;
        const node = gallerySentinelRef.current;
        if (node === null)
            return;
        if (typeof IntersectionObserver === 'undefined') {
            setRenderLimit(filteredItems.length);
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some(entry => entry.isIntersecting)) {
                setRenderLimit(limit => Math.min(filteredItems.length, limit + GALLERY_RENDER_BATCH));
            }
        }, { rootMargin: '800px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [filteredItems.length, renderLimit]);
    // Count of items belonging to the current workspace (before other search/filter criteria)
    const workspaceItemsCount = useMemo(() => {
        if (!activeWorkspace)
            return items.length;
        return items.filter((item) => isItemInWorkspace(item, activeWorkspace)).length;
    }, [items, activeWorkspace]);
    // Current item index in the active filtered sequence
    const currentPreviewIndex = useMemo(() => {
        if (!previewItem)
            return -1;
        return filteredItems.findIndex((i) => i.id === previewItem.id);
    }, [previewItem, filteredItems]);
    const hasPrev = currentPreviewIndex > 0;
    const hasNext = currentPreviewIndex >= 0 && currentPreviewIndex < filteredItems.length - 1;
    // Warm the neighbouring 1600 px variants so left/right navigation paints
    // immediately instead of waiting for a fresh request each time.
    const clearPreviewPrefetch = () => {
        for (const image of previewPrefetchRef.current)
            image.src = '';
        previewPrefetchRef.current = [];
    };
    const prefetchPreviewNeighbors = (item) => {
        clearPreviewPrefetch();
        if (typeof Image === 'undefined')
            return;
        const index = filteredItems.findIndex(entry => entry.id === item.id);
        if (index < 0)
            return;
        for (const neighbor of [filteredItems[index - 1], filteredItems[index + 1]]) {
            if (neighbor === undefined)
                continue;
            const image = new Image();
            image.src = previewUrlFor(neighbor.attachment);
            previewPrefetchRef.current.push(image);
        }
    };
    // Safely open or navigate preview item
    const openPreviewItem = (item, blob) => {
        previewRequestRef.current += 1;
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setPreviewItem(item);
        if (blob) {
            const url = URL.createObjectURL(blob);
            previewUrlRef.current = url;
            setPreviewBlob(blob);
            setPreviewUrl(url);
            setPreviewLoading(false);
            prefetchPreviewNeighbors(item);
            return;
        }
        setPreviewBlob(null);
        // Show a 1600 px variant here; the full-resolution attachment stays for
        // copy/download/drag. The lightbox falls back to the original GET and then
        // to the blob form when a host cannot derive the variant.
        setPreviewLoading(true);
        setPreviewUrl(previewUrlFor(item.attachment));
        prefetchPreviewNeighbors(item);
    };
    // Close preview and revoke object URL
    const handleClosePreview = () => {
        previewRequestRef.current += 1;
        clearPreviewPrefetch();
        if (regenerateControllerRef.current) {
            regenerateControllerRef.current.abort();
            regenerateControllerRef.current = null;
            setIsRegenerating(false);
        }
        setShowRegenerateModal(false);
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setPreviewItem(null);
        setPreviewUrl(null);
        setPreviewBlob(null);
        setPreviewLoading(false);
    };
    const goToPrev = () => {
        if (currentPreviewIndex > 0) {
            const prevItem = filteredItems[currentPreviewIndex - 1];
            if (prevItem)
                openPreviewItem(prevItem);
        }
    };
    const goToNext = () => {
        if (currentPreviewIndex >= 0 && currentPreviewIndex < filteredItems.length - 1) {
            const nextItem = filteredItems[currentPreviewIndex + 1];
            if (nextItem)
                openPreviewItem(nextItem);
        }
    };
    const handleOpenRegenerate = () => {
        if (!previewItem || isRegenerating)
            return;
        setRegeneratePrompt(previewItem.prompt);
        setShowRegenerateModal(true);
    };
    const handleCancelRegeneratePrompt = () => {
        setShowRegenerateModal(false);
    };
    const handleAbortRegenerating = () => {
        regenerateControllerRef.current?.abort();
        regenerateControllerRef.current = null;
        setIsRegenerating(false);
        showToast(t('cancel'));
    };
    const handleConfirmRegenerate = async () => {
        if (!previewItem || isRegenerating || regeneratePrompt.trim().length === 0)
            return;
        setShowRegenerateModal(false);
        setIsRegenerating(true);
        const controller = new AbortController();
        regenerateControllerRef.current = controller;
        try {
            const request = conversationRegenerateRequest(previewItem, regeneratePrompt, previewItem.aspectRatio
                ? { ratio: previewItem.aspectRatio, quality: previewItem.imageSize || 'standard', resolution: previewItem.resolution, generationQuality: previewItem.generationQuality, watermark: previewItem.watermark }
                : undefined);
            if (activeWorkspace?.path) {
                request.workspaceRoot = activeWorkspace.path;
            }
            // An animated item asks for an animation again, with the frame facts of the file it has.
            if (previewItem.original?.mediaType === 'image/gif' || previewItem.attachment.mediaType === 'image/gif') {
                request.output = gifOutputRequest(readGifInfo(new Uint8Array(await (await fetchGalleryItemBlob(previewItem)).arrayBuffer())));
            }
            const response = await fetch(STUDIO_ROUTE, {
                method: 'POST',
                credentials: 'same-origin',
                signal: controller.signal,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(request),
            });
            const payload = (await response.json().catch(() => null));
            if (!response.ok || payload === null || !('attachment' in payload)) {
                throw new Error(payload && 'error' in payload && payload.error ? payload.error : t('regenerateFailed'));
            }
            const original = originalFromMeta(payload.original);
            const newItem = {
                id: imageVersionKey(String(payload.attachment.attachmentId), original),
                attachment: payload.attachment,
                prompt: payload.prompt,
                provider: payload.provider,
                ...(payload.channel === undefined ? {} : { channel: payload.channel }),
                model: payload.model,
                createdAt: payload.createdAt,
                aspectRatio: request.ratio,
                imageSize: request.quality,
                resolution: request.resolution,
                generationQuality: request.generationQuality,
                watermark: request.watermark,
                output: payload.output,
                ...(payload.savedTo ? { savedTo: payload.savedTo } : {}),
                ...(activeWorkspace?.path ? { workspacePath: activeWorkspace.path } : {}),
                ...(activeWorkspace?.workspaceId ? { workspaceId: activeWorkspace.workspaceId } : {}),
                ...(currentSessionId ? { sessionId: currentSessionId } : {}),
                ...(original === undefined ? {} : { original }),
            };
            const savedOk = await persistGalleryRecord(newItem);
            if (activeTab !== 'gallery') {
                setActiveTab('gallery');
            }
            if (search.trim().length > 0) {
                setSearch('');
            }
            // Smoothly update preview to the newly created item and load its image blob
            openPreviewItem(newItem);
            showToast(savedOk ? t('regenerateSuccess') : t('regenerateSaveFailed'));
        }
        catch (err) {
            if (controller.signal.aborted)
                return;
            showToast(err instanceof Error ? err.message : String(err));
        }
        finally {
            setIsRegenerating(false);
            regenerateControllerRef.current = null;
        }
    };
    // Clean up only on component unmount
    useEffect(() => {
        return () => {
            if (regenerateControllerRef.current)
                regenerateControllerRef.current.abort();
            clearPreviewPrefetch();
            closeZipProgress();
            if (previewUrlRef.current)
                URL.revokeObjectURL(previewUrlRef.current);
        };
    }, []);
    // Keyboard navigation: Esc (close modal or preview), ArrowLeft (prev), ArrowRight (next)
    useEffect(() => {
        const onKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
                return;
            }
            if (showRegenerateModal) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowRegenerateModal(false);
                }
                return;
            }
            if (showDeleteModal) {
                if (e.key === 'Escape' && !isDeleting) {
                    e.preventDefault();
                    setShowDeleteModal(false);
                    if (!isManageMode)
                        setSelectedIds(new Set());
                }
                return;
            }
            if (previewItem) {
                if (e.key === 'Escape') {
                    handleClosePreview();
                }
                else if (e.key === 'ArrowLeft' || e.key === 'Left') {
                    e.preventDefault();
                    goToPrev();
                }
                else if (e.key === 'ArrowRight' || e.key === 'Right') {
                    e.preventDefault();
                    goToNext();
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showRegenerateModal, showDeleteModal, isDeleting, isManageMode, previewItem, currentPreviewIndex, filteredItems]);
    // Shift-Click Range Selection & Card Click Handler
    const handleCardClick = (item, index, e) => {
        // If holding Shift, or if currently in manage mode:
        if (e.shiftKey || isManageMode) {
            e.stopPropagation();
            if (!isManageMode) {
                setIsManageMode(true);
            }
            if (e.shiftKey && lastSelectedIndexRef.current !== null) {
                const from = Math.min(lastSelectedIndexRef.current, index);
                const to = Math.max(lastSelectedIndexRef.current, index);
                const rangeItems = filteredItems.slice(from, to + 1);
                setSelectedIds((prev) => {
                    const next = new Set(prev);
                    for (const r of rangeItems) {
                        next.add(r.id);
                    }
                    return next;
                });
            }
            else {
                setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.id)) {
                        next.delete(item.id);
                    }
                    else {
                        next.add(item.id);
                    }
                    return next;
                });
                lastSelectedIndexRef.current = index;
            }
            return;
        }
        // Normal click -> open preview. The lightbox loads its own 1600 px
        // variant; passing a prefetched full-size blob would bypass that path.
        openPreviewItem(item);
    };
    // Toggle selection for a specific card index
    const handleToggleSelect = (id, index, e) => {
        e.stopPropagation();
        if (!isManageMode) {
            setIsManageMode(true);
        }
        if (e.shiftKey && lastSelectedIndexRef.current !== null) {
            const from = Math.min(lastSelectedIndexRef.current, index);
            const to = Math.max(lastSelectedIndexRef.current, index);
            const rangeItems = filteredItems.slice(from, to + 1);
            setSelectedIds((prev) => {
                const next = new Set(prev);
                for (const r of rangeItems) {
                    next.add(r.id);
                }
                return next;
            });
        }
        else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) {
                    next.delete(id);
                }
                else {
                    next.add(id);
                }
                return next;
            });
            lastSelectedIndexRef.current = index;
        }
    };
    const handleSelectAll = () => {
        setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    };
    const handleInvertSelect = () => {
        setSelectedIds((prev) => {
            const next = new Set();
            for (const item of filteredItems) {
                if (!prev.has(item.id)) {
                    next.add(item.id);
                }
            }
            return next;
        });
    };
    const handleClearSelect = () => {
        setSelectedIds(new Set());
        lastSelectedIndexRef.current = null;
    };
    const handleExitManage = () => {
        setIsManageMode(false);
        setSelectedIds(new Set());
        lastSelectedIndexRef.current = null;
    };
    // The batch bar is fixed to the viewport, so leaving the grid tabs must exit
    // manage mode too; otherwise it floats over the workbench/inspiration page.
    useEffect(() => {
        if (activeTab === 'gallery' || activeTab === 'favorites')
            return;
        if (!isManageMode && selectedIds.size === 0)
            return;
        handleExitManage();
    }, [activeTab]);
    // Selected items array
    const selectedItems = useMemo(() => {
        if (selectedIds.size === 0)
            return [];
        return items.filter((item) => selectedIds.has(item.id));
    }, [items, selectedIds]);
    // Whether all selected items are currently favorited
    const allSelectedAreFavorites = useMemo(() => {
        if (selectedItems.length === 0)
            return false;
        return selectedItems.every((item) => Boolean(item.isFavorite));
    }, [selectedItems]);
    // Batch favorite toggle handler (Optimistic UI + atomic IndexedDB transaction)
    const handleBatchToggleFavorite = async () => {
        if (selectedIds.size === 0)
            return;
        const targetFavorite = !allSelectedAreFavorites;
        const targetIds = Array.from(selectedIds);
        // 1. Optimistic UI update
        setItems((prev) => prev.map((item) => (selectedIds.has(item.id) ? { ...item, isFavorite: targetFavorite } : item)));
        // 2. Persist in IndexedDB in one transaction
        try {
            await bulkSetFavoriteGalleryItems(targetIds, targetFavorite);
            showToast(targetFavorite
                ? t('batchFavoritedToast', { count: String(targetIds.length) })
                : t('batchUnfavoritedToast', { count: String(targetIds.length) }));
        }
        catch (err) {
            console.error('[dsh-image-gen] Batch favorite failed:', err);
            void getGalleryItems().then((res) => setItems(prev => mergeGalleryItems(prev, res)));
            showToast(t('batchFavoriteFailed'));
        }
    };
    // Batch download state
    const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);
    const [batchDownloadProgress, setBatchDownloadProgress] = useState(null);
    const [batchDownloadStatus, setBatchDownloadStatus] = useState(null);
    const [isZipDownload, setIsZipDownload] = useState(false);
    const zipEventSourceRef = useRef(null);
    const zipTokenRef = useRef(null);
    const zipWatchdogRef = useRef(null);
    const closeZipProgress = () => {
        if (zipWatchdogRef.current !== null) {
            window.clearTimeout(zipWatchdogRef.current);
            zipWatchdogRef.current = null;
        }
        zipEventSourceRef.current?.close();
        zipEventSourceRef.current = null;
        zipTokenRef.current = null;
        setIsZipDownload(false);
        setBatchDownloadStatus(null);
    };
    /**
     * The iframe path has no error channel of its own: when the host never
     * reports the job (validation failure, blocked download) the button would
     * otherwise stay disabled forever, so reset it after a quiet window.
     */
    const armZipWatchdog = () => {
        if (zipWatchdogRef.current !== null)
            window.clearTimeout(zipWatchdogRef.current);
        zipWatchdogRef.current = window.setTimeout(() => {
            zipWatchdogRef.current = null;
            showToast(t('batchDownloadFailed'));
            setIsDownloadingBatch(false);
            closeZipProgress();
        }, 30_000);
    };
    /**
     * Keep the fast iframe download and still report progress: the host writes
     * one SSE event per archived entry, then a final state event.
     */
    const startZipProgress = (token, total) => {
        const source = new EventSource(ZIP_PROGRESS_ROUTE + '?token=' + encodeURIComponent(token));
        zipEventSourceRef.current = source;
        armZipWatchdog();
        source.addEventListener('progress', event => {
            try {
                const data = JSON.parse(event.data);
                if (typeof data.done === 'number' && typeof data.total === 'number' && data.total > 0) {
                    if (zipWatchdogRef.current !== null) {
                        window.clearTimeout(zipWatchdogRef.current);
                        zipWatchdogRef.current = null;
                    }
                    setBatchDownloadStatus(String(data.done) + '/' + String(data.total));
                }
                if (data.state === 'done') {
                    showToast(t('batchDownloadComplete', { count: String(data.total ?? total) }));
                    setIsDownloadingBatch(false);
                    closeZipProgress();
                }
                else if (data.state === 'cancelled') {
                    showToast(t('cancel'));
                    setIsDownloadingBatch(false);
                    closeZipProgress();
                }
                else if (data.state === 'error') {
                    showToast(t('batchDownloadFailed'));
                    setIsDownloadingBatch(false);
                    closeZipProgress();
                }
            }
            catch {
                // Ignore a malformed event; the next one carries the full state.
            }
        });
        source.onerror = () => {
            if (source.readyState === EventSource.CLOSED) {
                showToast(t('batchDownloadFailed'));
                setIsDownloadingBatch(false);
                closeZipProgress();
            }
        };
    };
    /** Prefer the raw vault copy; the attachment remains the fallback. */
    const fetchOriginalBlob = fetchGalleryItemBlob;
    const cancelZipDownload = async () => {
        const token = zipTokenRef.current;
        if (token === null)
            return;
        try {
            await fetch(ZIP_CANCEL_ROUTE + '?token=' + encodeURIComponent(token), { method: 'POST' });
        }
        catch {
            // The UI still recovers below even if the cancel request failed.
        }
        showToast(t('cancel'));
        setIsDownloadingBatch(false);
        closeZipProgress();
    };
    // Batch download handler (single PNG or bundled zero-compression ZIP)
    const handleBatchDownload = async () => {
        if (selectedIds.size === 0 || isDownloadingBatch)
            return;
        const itemsToDownload = selectedItems;
        if (itemsToDownload.length === 0)
            return;
        setIsDownloadingBatch(true);
        // The iframe path finishes asynchronously: keep the button busy until the
        // SSE stream reports done/cancelled instead of clearing it in finally.
        let awaitingServer = false;
        try {
            // Single image: direct download
            if (itemsToDownload.length === 1) {
                const single = itemsToDownload[0];
                if (!single)
                    return;
                // Resolve the bytes first: a vault file may have been evicted by the
                // size cap, and a direct anchor would save the 404 JSON as an image.
                const blob = await fetchGalleryItemBlob(single);
                const objectUrl = URL.createObjectURL(blob);
                downloadBlobUrl(objectUrl, galleryDownloadName(single, blob));
                URL.revokeObjectURL(objectUrl);
                showToast(t('batchDownloadSingleToast'));
                return;
            }
            // Reject oversized selections here: the host answers 413 inside the
            // hidden iframe, where the user would never see it. Archive size is no
            // longer a limit — the writer emits ZIP64 records past 4 GiB.
            if (itemsToDownload.length > 2000) {
                showToast(t('batchDownloadLimit'));
                return;
            }
            // Multiple images: the host streams the archive, so the renderer never
            // builds or holds the ZIP. Older hosts without the route fall through to
            // the in-page packer below.
            if (await canUseServerZip()) {
                const token = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
                zipTokenRef.current = token;
                setIsZipDownload(true);
                startZipProgress(token, itemsToDownload.length);
                postZipDownload(itemsToDownload, token);
                showToast(t('batchDownloadZipToast', { count: String(itemsToDownload.length) }));
                awaitingServer = true;
                return;
            }
            // Multiple images: bundle into ZIP without multi-file browser download blocks
            const zipFiles = [];
            const usedNames = new Set();
            for (let i = 0; i < itemsToDownload.length; i++) {
                const it = itemsToDownload[i];
                if (!it)
                    continue;
                setBatchDownloadProgress(`${i + 1}/${itemsToDownload.length}`);
                const blob = await fetchAttachmentBlob(it.attachment);
                const arrayBuffer = await blob.arrayBuffer();
                const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
                let baseName = `dsh-${it.provider}-${it.id.slice(0, 8)}.${ext}`;
                let count = 1;
                while (usedNames.has(baseName)) {
                    baseName = `dsh-${it.provider}-${it.id.slice(0, 8)}-${count}.${ext}`;
                    count++;
                }
                usedNames.add(baseName);
                zipFiles.push({
                    name: baseName,
                    data: new Uint8Array(arrayBuffer),
                });
            }
            const zipBlob = createZipBlob(zipFiles);
            const zipUrl = URL.createObjectURL(zipBlob);
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            downloadBlobUrl(zipUrl, `dsh-gallery-${dateStr}.zip`);
            URL.revokeObjectURL(zipUrl);
            showToast(t('batchDownloadZipToast', { count: String(itemsToDownload.length) }));
        }
        catch (err) {
            console.error('[dsh-image-gen] Batch download failed:', err);
            showToast(t('batchDownloadFailed'));
        }
        finally {
            if (!awaitingServer) {
                closeZipProgress();
                setIsDownloadingBatch(false);
                setBatchDownloadProgress(null);
            }
        }
    };
    const openStorageStats = async () => {
        setShowStorageModal(true);
        setIsStorageScanning(true);
        try {
            const attachmentIds = Array.from(new Set(items.map(item => String(item.attachment.attachmentId))));
            const [thumbs, response] = await Promise.all([
                getGalleryThumbStats(),
                fetch(STORAGE_STATS_ROUTE, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ attachmentIds }),
                }),
            ]);
            if (!response.ok)
                throw new Error('storage stats failed (' + response.status + ')');
            const stats = await response.json();
            setStorageStats({ ...stats, thumbs });
        }
        catch (err) {
            console.error('[dsh-image-gen] Storage stats failed:', err);
            showToast(t('storageScanFailed'));
            setShowStorageModal(false);
        }
        finally {
            setIsStorageScanning(false);
        }
    };
    const exportOrphanList = () => {
        if (storageStats === null)
            return;
        const payload = JSON.stringify({
            scannedAt: new Date(storageStats.scannedAt).toISOString(),
            count: storageStats.orphans.count,
            bytes: storageStats.orphans.bytes,
            ids: storageStats.orphans.ids,
        }, null, 2);
        const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'dsh-image-gen-orphans.json';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    };
    // Request single image deletion through the unified modal
    const requestSingleDelete = (item, e) => {
        if (e)
            e.stopPropagation();
        setSelectedIds(new Set([item.id]));
        setShowDeleteModal(true);
    };
    const hasWorkspaceFilesToDelete = useMemo(() => items.some(i => selectedIds.has(i.id) && typeof i.savedTo === 'string' && i.savedTo.trim().length > 0), [items, selectedIds]);
    // Execute batch deletion (IndexedDB single transaction + optional workspace disk unlink)
    const handleConfirmBatchDelete = async () => {
        if (selectedIds.size === 0 || isDeleting)
            return;
        setIsDeleting(true);
        const idsToDelete = Array.from(selectedIds);
        const itemsToDelete = items.filter((i) => selectedIds.has(i.id));
        // 1. Collect exact workspace file paths
        const pathsToDelete = itemsToDelete
            .map((i) => i.savedTo)
            .filter((p) => typeof p === 'string' && p.trim().length > 0);
        let deletedFiles = 0;
        if (deleteWorkspaceFiles && pathsToDelete.length > 0) {
            try {
                const res = await fetch(DELETE_ROUTE, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        paths: pathsToDelete,
                    }),
                });
                if (!res.ok) {
                    setIsDeleting(false);
                    showToast(`工作区文件删除失败 (${res.status})`);
                    return;
                }
                const data = (await res.json().catch(() => null));
                if (!data || data.ok === false || (Array.isArray(data.failedFiles) && data.failedFiles.length > 0)) {
                    setIsDeleting(false);
                    const reason = data?.failedFiles?.[0]?.error || '工作区文件未能删除';
                    showToast(`删除失败：${reason}`);
                    return;
                }
                deletedFiles = data.deletedCount ?? 0;
            }
            catch (err) {
                setIsDeleting(false);
                showToast(err instanceof Error ? err.message : '工作区文件删除网络异常');
                return;
            }
        }
        // 2. Perform IndexedDB deletion with real error handling
        try {
            const deletedVaultKeys = vaultKeysOf(itemsToDelete);
            // `items` is a per-tab snapshot and misses cross-tab imports. Read the
            // remaining keys from IndexedDB so a shared original is not deleted.
            const remainingVaultKeys = vaultKeysOf((await getGalleryItemsStrict()).filter(item => !idsToDelete.includes(item.id)));
            await bulkDeleteGalleryItems(idsToDelete);
            for (const item of itemsToDelete) {
                evictAttachmentCache(item.attachment.attachmentId);
            }
            deleteVaultOriginals(deletedVaultKeys, remainingVaultKeys);
        }
        catch (err) {
            setIsDeleting(false);
            showToast(t('deleteFailedDatabase'));
            return;
        }
        // Close lightbox if preview item was deleted
        if (previewItem && selectedIds.has(previewItem.id)) {
            handleClosePreview();
        }
        setIsDeleting(false);
        setShowDeleteModal(false);
        if (isManageMode) {
            handleExitManage();
        }
        else {
            setSelectedIds(new Set());
            lastSelectedIndexRef.current = null;
        }
        if (deletedFiles > 0) {
            showToast(t('batchDeletedWithFilesToast', { count: String(idsToDelete.length), files: String(deletedFiles) }));
        }
        else {
            showToast(t('batchDeletedToast', { count: String(idsToDelete.length) }));
        }
    };
    // Assign after commit: a discarded or interrupted render must not expose
    // handlers that close over uncommitted selection state.
    useLayoutEffect(() => {
        cardActionsRef.current = {
            click: handleCardClick,
            toggleSelect: (item, index, event) => handleToggleSelect(item.id, index, event),
            requestDelete: item => requestSingleDelete(item),
            preview: (item, blob) => openPreviewItem(item, blob),
            toast: showToast,
        };
    });
    return (_jsxs("div", { className: `dsh-ig-gallery-page${inSidebar ? ' dsh-ig-page-in-sidebar' : ''}`, "data-conversation-composer-overlay": "", children: [_jsxs("header", { className: "dsh-ig-studio-tabs-bar", children: [_jsxs("button", { type: "button", className: `dsh-ig-studio-tab-btn ${activeTab === 'gallery' ? 'is-active' : ''}`, onClick: () => setActiveTab('gallery'), children: [_jsx(ImageIcon, { size: 15 }), _jsx("span", { children: t('tabGallery') })] }), _jsxs("button", { type: "button", className: `dsh-ig-studio-tab-btn ${activeTab === 'studio' ? 'is-active' : ''}`, onClick: () => setActiveTab('studio'), children: [_jsx(SlidersHorizontal, { size: 15 }), _jsx("span", { children: t('tabStudio') })] }), _jsxs("button", { type: "button", className: `dsh-ig-studio-tab-btn ${activeTab === 'inspiration' ? 'is-active' : ''}`, onClick: () => setActiveTab('inspiration'), children: [_jsx(Sparkles, { size: 15 }), _jsx("span", { children: t('tabInspiration') })] }), _jsxs("button", { type: "button", className: `dsh-ig-studio-tab-btn ${activeTab === 'favorites' ? 'is-active' : ''}`, onClick: () => setActiveTab('favorites'), children: [_jsx(Heart, { size: 15 }), _jsx("span", { children: t('tabFavorites') })] })] }), (activeTab === 'gallery' || activeTab === 'favorites') && (_jsxs("div", { className: "dsh-ig-studio-toolbar", children: [_jsxs("div", { className: "dsh-ig-studio-toolbar-left", children: [_jsxs("select", { className: "dsh-ig-studio-select", value: selectedProvider, onChange: (e) => setSelectedProvider(e.target.value), children: [_jsx("option", { value: "all", children: t('filterAllProviders') }), _jsx("option", { value: "google", children: t('filterGoogle') }), _jsx("option", { value: "openai", children: t('filterOpenAI') }), _jsx("option", { value: "openai-compat", children: t('filterOpenAICompat') }), _jsx("option", { value: "seedream", children: t('filterSeedream') }), _jsx("option", { value: "dashscope", children: t('filterDashScope') }), _jsx("option", { value: "xai", children: t('filterXAI') }), _jsx("option", { value: "zhipu", children: t('filterZhipu') }), _jsx("option", { value: "comfyui", children: t('filterComfyUI') }), _jsx("option", { value: "import", children: t('filterImport') })] }), _jsxs("select", { className: "dsh-ig-studio-select", value: selectedRatio, onChange: (e) => setSelectedRatio(e.target.value), children: [_jsx("option", { value: "all", children: t('filterAllRatios') }), _jsx("option", { value: "1:1", children: "1:1" }), _jsx("option", { value: "16:9", children: "16:9" }), _jsx("option", { value: "9:16", children: "9:16" }), _jsx("option", { value: "4:3", children: "4:3" }), _jsx("option", { value: "3:4", children: "3:4" }), _jsx("option", { value: "3:2", children: "3:2" }), _jsx("option", { value: "2:3", children: "2:3" })] }), _jsxs("div", { className: "dsh-ig-studio-search-wrap", children: [_jsx(Search, { className: "dsh-ig-studio-search-icon", size: 14 }), _jsx("input", { type: "text", className: "dsh-ig-studio-search-input", placeholder: t('searchPlaceholder'), value: search, onChange: (e) => setSearch(e.target.value) })] }), _jsxs("label", { className: "dsh-ig-workspace-filter-label", title: t('filterCurrentWorkspaceHint'), children: [_jsx("input", { type: "checkbox", className: "dsh-ig-workspace-checkbox", checked: onlyCurrentWorkspace, onChange: (e) => setOnlyCurrentWorkspace(e.target.checked) }), _jsx("span", { className: "dsh-ig-workspace-filter-text", children: t('filterCurrentWorkspace') }), _jsxs("span", { className: "dsh-ig-workspace-filter-badge", children: [workspaceItemsCount, "/", items.length] })] })] }), _jsxs("div", { className: "dsh-ig-studio-toolbar-right", children: [activeTab === 'gallery' && (_jsxs(_Fragment, { children: [_jsx("input", { ref: importInputRef, type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", multiple: true, style: { display: 'none' }, onChange: event => {
                                            void importImages(event.target.files);
                                            event.target.value = '';
                                        } }), _jsx("button", { type: "button", className: "dsh-ig-studio-btn", disabled: importing, title: t('importPickHint'), "aria-label": t('importImages'), onClick: () => importInputRef.current?.click(), children: _jsx(Upload, { size: 13 }) })] })), _jsx("button", { type: "button", className: "dsh-ig-studio-btn", title: t('storageTitle'), onClick: () => void openStorageStats(), children: _jsx(HardDrive, { size: 13 }) }), _jsxs("select", { className: "dsh-ig-studio-select dsh-ig-studio-select-sort", value: sortBy, onChange: (e) => setSortBy(e.target.value), children: [_jsx("option", { value: "newest", children: t('sortNewest') }), _jsx("option", { value: "oldest", children: t('sortOldest') })] }), _jsxs("button", { type: "button", className: `dsh-ig-studio-btn ${isManageMode ? 'is-active' : ''}`, title: isManageMode ? t('exitManage') : t('manage'), onClick: () => {
                                    if (isManageMode) {
                                        handleExitManage();
                                    }
                                    else {
                                        setIsManageMode(true);
                                    }
                                }, children: [_jsx(CheckSquare, { size: 13 }), _jsx("span", { children: isManageMode ? t('exitManage') : t('manage') })] })] })] })), _jsx("div", { className: `dsh-ig-gallery-page-body ${activeTab === 'studio' ? 'is-workbench' : ''}`, children: activeTab === 'gallery' || activeTab === 'favorites' ? (items.length === 0 ? (_jsxs("div", { className: "dsh-ig-gallery-empty", children: [_jsxs("svg", { className: "dsh-ig-gallery-empty-icon", width: "44", height: "44", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }), _jsx("circle", { cx: "9", cy: "9", r: "2" }), _jsx("path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" })] }), _jsx("div", { className: "dsh-ig-gallery-empty-title", children: t('emptyTitle') }), _jsx("div", { className: "dsh-ig-gallery-empty-desc", children: t('emptyDesc') })] })) : activeTab === 'favorites' && filteredItems.length === 0 && search === '' && selectedProvider === 'all' && selectedRatio === 'all' ? (_jsxs("div", { className: "dsh-ig-gallery-empty", children: [_jsx("svg", { className: "dsh-ig-gallery-empty-icon", width: "44", height: "44", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: _jsx("path", { d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" }) }), _jsx("div", { className: "dsh-ig-gallery-empty-title", children: t('favEmptyTitle') }), _jsx("div", { className: "dsh-ig-gallery-empty-desc", children: t('favEmptyDesc') })] })) : filteredItems.length === 0 ? (_jsxs("div", { className: "dsh-ig-gallery-empty", children: [_jsxs("svg", { className: "dsh-ig-gallery-empty-icon", width: "44", height: "44", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("path", { d: "m21 21-4.3-4.3" })] }), _jsx("div", { className: "dsh-ig-gallery-empty-title", children: t('noMatchTitle') }), _jsx("div", { className: "dsh-ig-gallery-empty-desc", children: t('noMatchDesc') })] })) : (_jsxs("div", { className: "dsh-ig-gallery-grid", children: [filteredItems.slice(0, renderLimit).map((item, idx) => (_jsx(GalleryCard, { lang: lang, item: item, index: idx, isManageMode: isManageMode, isSelected: selectedIds.has(item.id), t: t, actions: cardActions }, item.id))), filteredItems.length > renderLimit && (_jsx("div", { ref: gallerySentinelRef, className: "dsh-ig-gallery-sentinel", "aria-hidden": "true" }))] }))) : activeTab === 'inspiration' ? (_jsx(InspirationView, { locale: locale, onUsePrompt: useInspirationPrompt, onUseReference: useInspirationReference })) : (_jsx(StudioView, { locale: locale, credentialEvents: credentialEvents, workspace: activeWorkspace, initialPrompt: studioDraft, initialReference: studioReference, initialCanvasSurface: initialCanvasSurface, showInfiniteCanvasHint: !inSidebar, onInitialPromptApplied: clearStudioDraft, onInitialReferenceApplied: clearStudioReference, onOpenInspiration: () => setActiveTab('inspiration') })) }), toast && _jsx("div", { className: "dsh-ig-gallery-page-toast", children: toast }), shouldShowBatchBar(activeTab, isManageMode, selectedIds.size) && (_jsxs("div", { className: "dsh-ig-batch-bar", children: [_jsxs("div", { className: "dsh-ig-batch-bar-left", children: [_jsx("span", { className: "dsh-ig-batch-counter", children: t('selectedCount', { n: String(selectedIds.size) }) }), _jsx("button", { type: "button", className: "dsh-ig-batch-btn", onClick: handleSelectAll, children: t('selectAll') }), _jsx("button", { type: "button", className: "dsh-ig-batch-btn", onClick: handleInvertSelect, children: t('invertSelect') }), selectedIds.size > 0 && (_jsx("button", { type: "button", className: "dsh-ig-batch-btn", onClick: handleClearSelect, children: t('clearSelect') }))] }), _jsxs("div", { className: "dsh-ig-batch-bar-right", children: [_jsxs("button", { type: "button", className: `dsh-ig-batch-btn ${allSelectedAreFavorites ? 'is-favorited' : ''}`, disabled: selectedIds.size === 0, onClick: () => void handleBatchToggleFavorite(), title: allSelectedAreFavorites ? t('batchUnfavorite') : t('batchFavorite'), children: [_jsx(Heart, { size: 13, fill: allSelectedAreFavorites ? '#ef4444' : 'none', color: allSelectedAreFavorites ? '#ef4444' : 'currentColor' }), _jsx("span", { children: allSelectedAreFavorites ? t('batchUnfavorite') : t('batchFavorite') })] }), _jsxs("button", { type: "button", className: "dsh-ig-batch-btn dsh-ig-batch-btn-download", disabled: selectedIds.size === 0 || isDownloadingBatch, onClick: () => void handleBatchDownload(), title: t('batchDownload'), children: [_jsx(Download, { size: 13 }), _jsx("span", { children: isDownloadingBatch && batchDownloadStatus
                                            ? batchDownloadStatus
                                            : isDownloadingBatch && batchDownloadProgress
                                                ? t('batchDownloading', {
                                                    current: batchDownloadProgress.split('/')[0] ?? '',
                                                    total: batchDownloadProgress.split('/')[1] ?? '',
                                                })
                                                : t('batchDownload') })] }), isZipDownload && (_jsxs("button", { type: "button", className: "dsh-ig-batch-btn", onClick: () => void cancelZipDownload(), title: t('cancel'), children: [_jsx(X, { size: 13 }), _jsx("span", { children: t('cancel') })] })), _jsx("span", { className: "dsh-ig-batch-divider" }), _jsxs("button", { type: "button", className: "dsh-ig-batch-btn dsh-ig-batch-btn-danger", disabled: selectedIds.size === 0, onClick: () => setShowDeleteModal(true), children: [_jsx(Trash2, { size: 13 }), _jsxs("span", { children: [t('batchDelete'), selectedIds.size > 0 ? ` (${selectedIds.size})` : ''] })] }), _jsx("button", { type: "button", className: "dsh-ig-batch-btn dsh-ig-batch-btn-exit", onClick: handleExitManage, children: t('exitManage') })] })] })), showDeleteModal && (_jsx("div", { className: "dsh-ig-modal-backdrop", onClick: () => {
                    if (!isDeleting) {
                        setShowDeleteModal(false);
                        if (!isManageMode)
                            setSelectedIds(new Set());
                    }
                }, children: _jsxs("div", { className: "dsh-ig-modal-box", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "dsh-ig-modal-header", children: [_jsx("div", { className: "dsh-ig-modal-icon-danger", children: _jsx(AlertTriangle, { size: 20 }) }), _jsx("div", { className: "dsh-ig-modal-title", children: selectedIds.size === 1
                                        ? t('batchDeleteTitleSingle')
                                        : t('batchDeleteTitle', { count: String(selectedIds.size) }) })] }), _jsxs("div", { className: "dsh-ig-modal-body", children: [_jsx("p", { className: "dsh-ig-modal-desc", children: t('batchDeleteDesc') }), hasWorkspaceFilesToDelete && (_jsxs("label", { className: "dsh-ig-modal-checkbox-label", children: [_jsx("input", { type: "checkbox", checked: deleteWorkspaceFiles, onChange: (e) => setDeleteWorkspaceFiles(e.target.checked), disabled: isDeleting }), _jsx("span", { children: t('deleteWorkspaceFilesOpt') })] }))] }), _jsxs("div", { className: "dsh-ig-modal-footer", children: [_jsx("button", { type: "button", className: "dsh-ig-modal-btn dsh-ig-modal-btn-cancel", onClick: () => {
                                        setShowDeleteModal(false);
                                        if (!isManageMode)
                                            setSelectedIds(new Set());
                                    }, disabled: isDeleting, children: t('cancel') }), _jsx("button", { type: "button", className: "dsh-ig-modal-btn dsh-ig-modal-btn-danger", onClick: handleConfirmBatchDelete, disabled: isDeleting, children: isDeleting
                                        ? '...'
                                        : selectedIds.size === 1
                                            ? t('confirmDeleteSingle')
                                            : t('confirmBatchDelete', { count: String(selectedIds.size) }) })] })] }) })), showStorageModal && (_jsx("div", { className: "dsh-ig-modal-backdrop", onClick: () => {
                    if (!isStorageScanning)
                        setShowStorageModal(false);
                }, children: _jsxs("div", { className: "dsh-ig-modal-box", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "dsh-ig-modal-header", children: [_jsx("div", { className: "dsh-ig-regenerate-modal-icon", children: _jsx(HardDrive, { size: 18 }) }), _jsx("div", { className: "dsh-ig-modal-title", children: t('storageTitle') })] }), _jsx("div", { className: "dsh-ig-modal-body", children: isStorageScanning || storageStats === null ? (_jsx("p", { className: "dsh-ig-modal-desc", children: t('storageScanning') })) : (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: '12px' }, children: [_jsx("span", { children: t('storageAttachments') }), _jsxs("span", { children: [t('storageItems', { n: String(storageStats.attachments.count) }), " \u00B7 ", formatStorageBytes(storageStats.attachments.bytes)] })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: '12px' }, children: [_jsx("span", { children: t('storageThumbs') }), _jsxs("span", { children: [t('storageItems', { n: String(storageStats.thumbs.count) }), " \u00B7 ", formatStorageBytes(storageStats.thumbs.bytes)] })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: '12px' }, children: [_jsx("span", { children: t('storageRequestCache') }), _jsxs("span", { children: [t('storageItems', { n: String(storageStats.requestImages.count) }), " \u00B7 ", formatStorageBytes(storageStats.requestImages.bytes)] })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: '12px' }, children: [_jsx("span", { children: t('storageOrphans') }), _jsxs("span", { children: [t('storageItems', { n: String(storageStats.orphans.count) }), " \u00B7 ", formatStorageBytes(storageStats.orphans.bytes)] })] })] }), _jsx("p", { className: "dsh-ig-modal-desc", children: t('storageThumbsHint') }), _jsx("p", { className: "dsh-ig-modal-desc", children: t('storageOrphanHint') }), _jsx("button", { type: "button", className: "dsh-ig-modal-btn", onClick: exportOrphanList, disabled: storageStats.orphans.count === 0, children: t('storageExport') })] })) }), _jsx("div", { className: "dsh-ig-modal-footer", children: _jsx("button", { type: "button", className: "dsh-ig-modal-btn dsh-ig-modal-btn-cancel", onClick: () => setShowStorageModal(false), disabled: isStorageScanning, children: t('storageClose') }) })] }) })), showRegenerateModal && previewItem && (_jsx("div", { className: "dsh-ig-modal-backdrop", onClick: handleCancelRegeneratePrompt, children: _jsxs("div", { className: "dsh-ig-modal-box dsh-ig-regenerate-modal-box", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "dsh-ig-modal-header", children: [_jsx("div", { className: "dsh-ig-regenerate-modal-icon", children: _jsx(Sparkles, { size: 18 }) }), _jsxs("div", { className: "dsh-ig-regenerate-modal-title-wrap", children: [_jsx("div", { className: "dsh-ig-modal-title", children: t('regenerateTitle') }), _jsxs("div", { className: "dsh-ig-regenerate-modal-meta", children: [_jsx("span", { className: "dsh-ig-tag", children: previewItem.provider === 'import' ? t('filterImport') : previewItem.provider }), previewItem.model && _jsx("span", { className: "dsh-ig-tag dsh-ig-tag-model", children: previewItem.model }), _jsx("span", { className: "dsh-ig-tag", children: formatCardMeta(previewItem) })] })] })] }), _jsxs("div", { className: "dsh-ig-modal-body", children: [_jsx("p", { className: "dsh-ig-modal-desc", children: t('regenerateHint') }), _jsx("textarea", { className: "dsh-ig-regenerate-modal-textarea", value: regeneratePrompt, onChange: (e) => setRegeneratePrompt(e.target.value), placeholder: t('prompt'), rows: 4, autoFocus: true })] }), _jsxs("div", { className: "dsh-ig-modal-footer", children: [_jsx("button", { type: "button", className: "dsh-ig-modal-btn dsh-ig-modal-btn-cancel", onClick: handleCancelRegeneratePrompt, children: t('cancel') }), _jsxs("button", { type: "button", className: "dsh-ig-modal-btn dsh-ig-modal-btn-primary", onClick: handleConfirmRegenerate, disabled: regeneratePrompt.trim().length === 0, children: [_jsx(Sparkles, { size: 14 }), _jsx("span", { children: t('confirmRegenerate') })] })] })] }) })), previewItem && (_jsxs("div", { className: "dsh-ig-lightbox-backdrop", onClick: handleClosePreview, children: [_jsxs("div", { className: "dsh-ig-lightbox-topbar", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "dsh-ig-lightbox-meta", children: [_jsx("span", { className: "dsh-ig-tag", children: previewItem.provider === 'import' ? t('filterImport') : previewItem.provider }), previewItem.model ? (_jsx("span", { className: "dsh-ig-tag dsh-ig-tag-model", children: previewItem.model })) : null, currentPreviewIndex >= 0 && (_jsxs("span", { className: "dsh-ig-lightbox-counter", children: [currentPreviewIndex + 1, " / ", filteredItems.length] }))] }), _jsx("button", { type: "button", className: "dsh-ig-lightbox-close-btn", title: t('close'), onClick: handleClosePreview, children: _jsx(X, { size: 18 }) })] }), _jsx("button", { type: "button", className: "dsh-ig-lightbox-nav-btn dsh-ig-lightbox-nav-prev", title: t('prevImage'), disabled: !hasPrev, onClick: (e) => {
                            e.stopPropagation();
                            goToPrev();
                        }, children: _jsx(ChevronLeft, { size: 24 }) }), _jsx("button", { type: "button", className: "dsh-ig-lightbox-nav-btn dsh-ig-lightbox-nav-next", title: t('nextImage'), disabled: !hasNext, onClick: (e) => {
                            e.stopPropagation();
                            goToNext();
                        }, children: _jsx(ChevronRight, { size: 24 }) }), _jsx("div", { className: "dsh-ig-lightbox-img-wrap", onClick: (e) => e.stopPropagation(), children: gifPreview !== undefined ? _jsx(GalleryGifStage, { preview: gifPreview, poster: previewUrl ?? undefined }) : previewUrl ? (_jsx("img", { className: "dsh-ig-lightbox-img", src: previewUrl, alt: previewItem.prompt, decoding: "async", onLoad: () => setPreviewLoading(false), onError: () => {
                                const failedUrl = previewUrl;
                                // A blob URL that cannot be decoded is terminal; retrying
                                // would bounce between the original and a fresh blob forever.
                                if (failedUrl.startsWith('blob:')) {
                                    setPreviewLoading(false);
                                    return;
                                }
                                const original = imageUrlFor(previewItem.attachment);
                                if (failedUrl !== original) {
                                    // The 1600 px variant is unavailable; fall back to the
                                    // original GET before giving up on the route entirely.
                                    if (previewUrlRef.current !== null)
                                        URL.revokeObjectURL(previewUrlRef.current);
                                    previewUrlRef.current = null;
                                    setPreviewBlob(null);
                                    setPreviewUrl(original);
                                    return;
                                }
                                const requestId = previewRequestRef.current;
                                fetchAttachmentBlob(previewItem.attachment)
                                    .then((fetched) => {
                                    if (previewRequestRef.current !== requestId)
                                        return;
                                    if (previewUrlRef.current !== null)
                                        URL.revokeObjectURL(previewUrlRef.current);
                                    const objectUrl = URL.createObjectURL(fetched);
                                    previewUrlRef.current = objectUrl;
                                    setPreviewBlob(fetched);
                                    setPreviewUrl(objectUrl);
                                    setPreviewLoading(false);
                                })
                                    .catch(() => setPreviewLoading(false));
                            } })) : null }), gifPreview !== undefined ? _jsx(GalleryGifBar, { preview: gifPreview }) : null, _jsxs("div", { className: "dsh-ig-lightbox-bottombar", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "dsh-ig-lightbox-prompt-text", title: previewItem.prompt, children: previewItem.prompt }), _jsxs("div", { className: "dsh-ig-lightbox-actions", children: [_jsxs("button", { type: "button", className: "dsh-ig-lightbox-btn", title: t('copyPpt'), onClick: async () => {
                                            await navigator.clipboard.writeText(previewItem.prompt);
                                            showToast(t('copiedPrompt'));
                                        }, children: [_jsx(FileText, { size: 14 }), _jsx("span", { children: t('copyPpt') })] }), _jsxs("button", { type: "button", className: "dsh-ig-lightbox-btn", title: t('copyImg'), onClick: async () => {
                                            try {
                                                const target = previewItem.original !== undefined
                                                    ? await fetchOriginalBlob(previewItem)
                                                    : previewBlob ?? await fetchAttachmentBlob(previewItem.attachment);
                                                const ok = await copyImageBlob(target);
                                                showToast(ok ? t('copiedImage') : t('copyFailed'));
                                            }
                                            catch {
                                                showToast(t('copyFailed'));
                                            }
                                        }, children: [_jsx(Copy, { size: 14 }), _jsx("span", { children: t('copyImg') })] }), gifPreview !== undefined ? _jsx(GalleryGifDownload, { preview: gifPreview }) : _jsxs("button", { type: "button", className: "dsh-ig-lightbox-btn", title: t('download'), onClick: async () => {
                                            // The lightbox shows a 1600 px variant; downloads keep the
                                            // original bytes and fall back to the attachment when the vault
                                            // copy was evicted.
                                            try {
                                                const blob = previewItem.original !== undefined
                                                    ? await fetchOriginalBlob(previewItem)
                                                    : previewBlob ?? await fetchAttachmentBlob(previewItem.attachment);
                                                const objectUrl = URL.createObjectURL(blob);
                                                downloadBlobUrl(objectUrl, galleryDownloadName(previewItem, blob));
                                                URL.revokeObjectURL(objectUrl);
                                            }
                                            catch {
                                                showToast(t('batchDownloadFailed'));
                                            }
                                        }, children: [_jsx(Download, { size: 14 }), _jsx("span", { children: t('download') })] }), _jsxs("button", { type: "button", className: "dsh-ig-lightbox-btn dsh-ig-lightbox-btn-regenerate", title: t('regenerate'), disabled: isRegenerating, onClick: handleOpenRegenerate, children: [_jsx(Sparkles, { size: 14 }), _jsx("span", { children: t('regenerate') })] }), isRegenerating && (_jsxs("div", { className: "dsh-ig-lightbox-generating-indicator", children: [_jsx("div", { className: "dsh-ig-lightbox-spinner-sm" }), _jsx("span", { children: t('regenerating') }), _jsx("button", { type: "button", className: "dsh-ig-lightbox-abort-btn", onClick: handleAbortRegenerating, children: t('cancel') })] })), _jsxs("button", { type: "button", className: "dsh-ig-lightbox-btn dsh-ig-lightbox-btn-danger", title: t('delete'), onClick: () => {
                                            if (previewItem) {
                                                requestSingleDelete(previewItem);
                                            }
                                        }, children: [_jsx(Trash2, { size: 14 }), _jsx("span", { children: t('delete') })] })] })] })] }))] }));
};
const PlaceholderView = ({ icon, title, description, tip, badge, }) => {
    return (_jsx("div", { className: "dsh-ig-placeholder-view", children: _jsxs("div", { className: "dsh-ig-placeholder-card", children: [_jsx("div", { className: "dsh-ig-placeholder-icon", children: icon }), _jsxs("div", { className: "dsh-ig-placeholder-header", children: [_jsx("h2", { className: "dsh-ig-placeholder-title", children: title }), badge && _jsx("span", { className: "dsh-ig-placeholder-badge", children: badge })] }), _jsx("p", { className: "dsh-ig-placeholder-desc", children: description }), tip && _jsx("div", { className: "dsh-ig-placeholder-tip", children: tip })] }) }));
};
export { copyImageBlob } from './browser-image-utils.js';
//# sourceMappingURL=gallery-view.js.map