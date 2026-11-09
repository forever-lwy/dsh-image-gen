/**
 * The batch bar is a fixed overlay at the page root, so it must only render on
 * the grid tabs; leaving them (studio/inspiration) hides it even if manage mode
 * or a selection somehow survives a tab switch.
 */
export function shouldShowBatchBar(activeTab, isManageMode, selectedCount) {
    return (activeTab === 'gallery' || activeTab === 'favorites') && (isManageMode || selectedCount > 0);
}
//# sourceMappingURL=gallery-batch-bar.js.map