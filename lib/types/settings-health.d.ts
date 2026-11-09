/** Diagnose the actual host service and schema without reading any settings values. */
import type z from '@deepseek-ai/schemastery';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SettingsHealth } from './shared.js';
export declare function describeSettingsHealth(settings: unknown, schema: z): SettingsHealth;
export declare function serveSettingsHealth(req: IncomingMessage, res: ServerResponse, health: SettingsHealth): void;
