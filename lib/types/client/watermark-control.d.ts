import { type FC } from 'react';
import type { StudioWatermark, StudioWatermarkCapability } from '../shared.js';
/** Keep the control discoverable while clearly distinguishing confirmed and unknown contracts. */
export declare const WatermarkControl: FC<{
    capability: StudioWatermarkCapability;
    value: StudioWatermark;
    onChange(value: StudioWatermark): void;
    lang: 'zh' | 'en';
}>;
