import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { type ImageResultPresentation } from './image-result-node.js';
import { type LocaleService } from './gallery-view.js';
export interface ImageCardFace {
    locale?: LocaleService | undefined;
    promoted: boolean;
}
export type ImageCardProps = PropsRuntime<'tool.call.toolview'> & InjectFace<ImageCardFace> & {
    sessionId?: string | undefined;
};
export interface ImageResultNodeProps {
    node: {
        data: {
            results: readonly ImageResultPresentation[];
        };
    };
    locale?: LocaleService | undefined;
    sessionId?: string | undefined;
    /** The host's file opener, the one reply file links use; hosts that do not pass it get the plain path. */
    openFile?: ((path: string) => void) | undefined;
}
export declare function GeneratedImageCard(props: ImageCardProps): import("react").JSX.Element;
/** Suppress the folded duplicate on modern hosts; render every image on legacy hosts. */
export declare function GeneratedImagesCard(props: ImageCardProps): import("react").JSX.Element;
/** Render modern image artifacts as final conversation output instead of Tool process content. */
export declare function PromotedImageResultNode(props: ImageResultNodeProps): import("react").JSX.Element;
