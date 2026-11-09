/**
 * Extract the verified durable image attachment from a completed tool result block.
 * Supports legacy rc.2 `resultView.content` and modern DSH `block.content`.
 */
export function imageRef(block) {
    if (!('kind' in block))
        return undefined;
    const fromResultView = block.resultView?.card === 'generic'
        ? block.resultView.content?.find(item => item.type === 'image')
        : undefined;
    if (fromResultView?.type === 'image')
        return fromResultView.attachment;
    const fromBlockContent = Array.isArray(block.content)
        ? block.content.find(item => item.type === 'image')
        : undefined;
    if (fromBlockContent?.type === 'image')
        return fromBlockContent.attachment;
    return undefined;
}
//# sourceMappingURL=image-ref.js.map