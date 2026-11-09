window.__ModuleLoader__.load({
	id: "@forever-lwy/dsh-image-gen",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __defProp = Object.defineProperty;
		var __exportAll = (all, no_symbols) => {
			let target = {};
			for (var name in all) __defProp(target, name, {
				get: all[name],
				enumerable: true
			});
			if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
			return target;
		};
		//#endregion
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region lib/types/client/tl/css-supports-shim.js
		/**
		* CSS.supports shim for tldraw's module-scope environment probe (#40).
		*
		* @tldraw/editor's tlenv initialization runs at import time and calls
		* CSS.supports("color", "color(display-p3 1 1 1)") guarded only by
		* `typeof CSS !== "undefined"`. Environments that expose a `CSS` global
		* without the `supports` method (embedded webviews with partial globals,
		* browsers predating the API) therefore throw "CSS.supports is not a
		* function" while DSH imports the client entry, which aborts the whole
		* plugin load - the image tools and gallery die together with the canvas.
		*
		* This module must be the first import of the client entry so it evaluates
		* before any tldraw code. It installs a conservative `supports()` returning
		* false only when the method is genuinely missing; modern browsers are
		* untouched (the probe already treats false as "no P3 / no backdrop filter",
		* which only downgrades the canvas color space, not the plugin).
		*/
		/** Install a fallback `supports` on a CSS-like object when the method is missing. */
		function ensureCssSupports(cssLike) {
			if (typeof cssLike.supports !== "function") cssLike.supports = () => false;
		}
		if (typeof CSS !== "undefined") ensureCssSupports(CSS);
		//#endregion
		//#region lib/types/client/datalist-scroll-fix.js
		const GUARD = "__dshIgDatalistScrollFix";
		function isDatalistInput(element) {
			return element !== null && element.tagName === "INPUT" && element.hasAttribute("list");
		}
		function closeDatalistPopup(element) {
			if (!isDatalistInput(element)) return false;
			element.blur();
			return true;
		}
		/**
		* Automatic scrolling after Tab/focus or virtual-keyboard resize must not blur
		* the input. Only scrolling preceded by a wheel/touch/scrollbar/key gesture can
		* dismiss the popup, and its original focus must still be current.
		*/
		function installDatalistScrollFix(environment) {
			const env = environment ?? browserEnvironment();
			if (env === void 0 || env.window[GUARD] !== void 0) return false;
			let disposed = false, queued = false, focusVersion = 0;
			let intent = null;
			let expiry;
			let cancelFrame;
			const focusedInput = () => {
				const input = env.document.activeElement;
				return isDatalistInput(input) && (env.ownsInput === void 0 || env.ownsInput(input)) ? input : null;
			};
			const clearIntent = () => {
				intent = null;
				if (expiry !== void 0) clearTimeout(expiry);
				expiry = void 0;
			};
			const arm = (event) => {
				clearIntent();
				if (event?.key !== void 0 && !["PageUp", "PageDown"].includes(event.key)) return;
				intent = focusedInput();
				if (intent !== null) expiry = setTimeout(clearIntent, 250);
			};
			const focusChanged = () => {
				focusVersion += 1;
				clearIntent();
			};
			const scrolled = (event) => {
				const input = intent;
				if (input === null) return;
				if (event?.target === input) {
					clearIntent();
					return;
				}
				if (input !== focusedInput() || queued) return;
				const version = focusVersion;
				clearIntent();
				queued = true;
				const run = () => {
					queued = false;
					cancelFrame = void 0;
					if (!disposed && focusVersion === version && env.document.activeElement === input) closeDatalistPopup(input);
				};
				if (env.schedule !== void 0) cancelFrame = env.schedule(run) || void 0;
				else {
					const timer = setTimeout(run, 0);
					cancelFrame = () => clearTimeout(timer);
				}
			};
			const registrations = [
				[
					env.document,
					"wheel",
					arm
				],
				[
					env.document,
					"touchmove",
					arm
				],
				[
					env.document,
					"pointerdown",
					arm
				],
				[
					env.document,
					"keydown",
					arm
				],
				[
					env.document,
					"focusin",
					focusChanged
				],
				[
					env.document,
					"scroll",
					scrolled
				],
				[
					env.window,
					"scroll",
					scrolled
				],
				[
					env.window,
					"resize",
					scrolled
				]
			];
			const dispose = () => {
				if (disposed) return;
				disposed = true;
				clearIntent();
				cancelFrame?.();
				for (const [target, type, listener] of registrations) target.removeEventListener(type, listener, true);
				if (env.window[GUARD] === dispose) delete env.window[GUARD];
			};
			env.window[GUARD] = dispose;
			for (const [target, type, listener] of registrations) target.addEventListener(type, listener, true);
			return dispose;
		}
		function browserEnvironment() {
			if (typeof window === "undefined" || typeof document === "undefined") return void 0;
			return {
				window,
				document,
				ownsInput: (element) => element.matches(".dsh-ig-input[list]"),
				...typeof requestAnimationFrame !== "function" ? {} : { schedule: (callback) => {
					const frame = requestAnimationFrame(() => callback());
					return () => cancelAnimationFrame(frame);
				} }
			};
		}
		//#endregion
		//#region lib/types/watermark.js
		/** Model names alone do not establish the protocol of an unknown relay. */
		function officialContract(config, mode) {
			const model = (mode === "generate" ? config.openaiCompatExtraBody : config.openaiCompatEditExtra)?.model ?? (mode === "edit" ? config.openaiCompatEditModel?.trim() || config.openaiCompatModel : config.openaiCompatModel);
			if (typeof model !== "string") return void 0;
			try {
				const url = new URL(config.openaiCompatBaseURL ?? "");
				if (url.protocol !== "https:" || url.port || url.search || url.hash) return void 0;
				const path = url.pathname.replace(/\/+$/, "");
				if (url.hostname === "token.sensenova.cn" && path === "/v1" && model === "sensenova-u1.5-lite") return "sensenova";
				if (/^[a-z0-9-]+\.(?:cn-beijing|ap-southeast-1|us-east-1|eu-central-1|ap-northeast-1|cn-hongkong)\.maas\.aliyuncs\.com$/.test(url.hostname) && path === "/compatible-mode/v1" && /^qwen-image-(?:3\.0(?:-pro)?|2\.1-(?:pro|turbo))$/.test(model)) return "qwen";
			} catch {}
		}
		/** Known official edit contracts take precedence over relay-specific format settings. */
		function compatEditFormat(config) {
			try {
				const url = new URL(config.openaiCompatBaseURL ?? "");
				if (url.protocol === "https:" && !url.port && !url.search && !url.hash && (url.hostname === "api.siliconflow.cn" || url.hostname === "api.siliconflow.com") && url.pathname.replace(/\/+$/, "") === "/v1") return "siliconflowJson";
			} catch {}
			const contract = officialContract(config, "edit");
			if (contract === "sensenova") return "jsonImageUrlArray";
			if (contract === "qwen") return "qwenJson";
			return config.openaiCompatEditFormat ?? "multipart";
		}
		//#endregion
		//#region lib/types/shared.js
		/** Browser route used by the generated-image card. */
		const IMAGE_ROUTE = "/plugins/dsh-image-gen/image";
		/** Encode a durable image reference for the cacheable GET form of IMAGE_ROUTE. */
		function encodeImageRef(ref) {
			const bytes = new TextEncoder().encode(JSON.stringify(ref));
			let binary = "";
			for (const byte of bytes) binary += String.fromCharCode(byte);
			return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
		}
		/** Same-origin GET URL for one attachment; safe to put in an <img src>. */
		function imageUrlFor(ref) {
			return "/plugins/dsh-image-gen/image?ref=" + encodeImageRef(ref);
		}
		/** Same-origin GET URL for a host-rendered thumbnail of one attachment. */
		function thumbUrlFor(ref, width = 320) {
			return THUMB_ROUTE + "?w=" + String(width) + "&ref=" + encodeImageRef(ref);
		}
		/** Mid-size preview used by the lightbox; originals stay for copy/download/drag. */
		function previewUrlFor(ref) {
			return PREVIEW_ROUTE + "?ref=" + encodeImageRef(ref);
		}
		/** Content-addressed vault key: the sha256 of the original bytes, validated on both faces. */
		const VAULT_KEY_PATTERN = /^[a-f0-9]{64}$/;
		/** Content-addressed raw copy, served when the attachment layer normalized an import or a generated GIF. */
		function vaultUrlFor(key, mediaType) {
			const base = VAULT_ROUTE + "?key=" + encodeURIComponent(key);
			return mediaType === void 0 ? base : base + "&mediaType=" + encodeURIComponent(mediaType);
		}
		/** Browser route that uploads user-picked images as DSH attachments. */
		const IMPORT_ROUTE = "/plugins/dsh-image-gen/import";
		/** Browser route used for deleting generated images and workspace files. */
		const DELETE_ROUTE = "/plugins/dsh-image-gen/delete";
		/** Same-origin route used by the browser image workbench. */
		const STUDIO_ROUTE = "/plugins/dsh-image-gen/studio";
		/** Same-origin route for built-in prompt inspiration metadata and images. */
		const INSPIRATION_ROUTE = "/plugins/dsh-image-gen/inspiration";
		/** Browser route used for saving generated images to workspace on demand. */
		const SAVE_WORKSPACE_ROUTE = "/plugins/dsh-image-gen/save-workspace";
		/** Browser route that streams a ZIP export of the selected gallery images. */
		const ZIP_ROUTE = "/plugins/dsh-image-gen/zip";
		/** Browser route that serves host-rendered gallery thumbnails. */
		const THUMB_ROUTE = "/plugins/dsh-image-gen/thumb";
		const PREVIEW_ROUTE = "/plugins/dsh-image-gen/preview";
		const VAULT_ROUTE = "/plugins/dsh-image-gen/vault";
		const VAULT_REFS_ROUTE = "/plugins/dsh-image-gen/vault-refs";
		const VAULT_DELETE_ROUTE = "/plugins/dsh-image-gen/vault-delete";
		const STORAGE_STATS_ROUTE = "/plugins/dsh-image-gen/storage-stats";
		/** Browser route the settings card probes provider connectivity through. */
		const TEST_CONNECTION_ROUTE = "/plugins/dsh-image-gen/test";
		/** Non-secret settings capability probe, available even when the host cannot serve a form. */
		const SETTINGS_HEALTH_ROUTE = "/plugins/dsh-image-gen/settings-health";
		/** Upload a selected canvas original to the host attachment store. */
		const CANVAS_ASSET_ROUTE = "/plugins/dsh-image-gen/canvas-asset";
		const SUBSCRIPTION_LOGIN_ROUTE = "/plugins/dsh-image-gen/subscription-login";
		const SUBSCRIPTION_STATUS_ROUTE = "/plugins/dsh-image-gen/subscription-status";
		/** Namespace persisted through DSH Settings. */
		const IMAGE_GENERATION_NAMESPACE = "image-generation";
		/** Supported providers. */
		const IMAGE_PROVIDERS = [
			"google",
			"openai",
			"openai-compat",
			"seedream",
			"dashscope",
			"xai",
			"zhipu",
			"comfyui",
			"chatgpt-sub",
			"grok-sub",
			"google-sub"
		];
		/**
		* Providers that generate through a logged-in subscription account instead
		* of an API key. They use no credential reference and never join the
		* cloud/BYOK sets.
		*/
		const SUBSCRIPTION_PROVIDERS = [
			"chatgpt-sub",
			"grok-sub",
			"google-sub"
		];
		/** True when the provider generates through a logged-in subscription account. */
		function isSubscriptionProvider(provider) {
			return SUBSCRIPTION_PROVIDERS.includes(provider);
		}
		/** Providers supported by the first browser workbench release. */
		const CLOUD_IMAGE_PROVIDERS = [
			"google",
			"openai",
			"openai-compat",
			"seedream",
			"dashscope",
			"xai",
			"zhipu"
		];
		/** Normalize the relay model list while keeping the legacy default model selectable. */
		function resolveOpenAICompatModels(config) {
			const defaultModel = config.openaiCompatModel?.trim() ?? "";
			const models = [...new Set((config.openaiCompatModels ?? []).map((model) => model.trim()).filter(Boolean))];
			if (defaultModel.length > 0 && !models.includes(defaultModel)) models.unshift(defaultModel);
			return models;
		}
		const DEFAULT_OPENAI_COMPAT_CHANNEL_ID = "default";
		function openAICompatKeyRef(channelId) {
			return channelId === "default" ? OPENAI_COMPAT_API_KEY_ENV : `${OPENAI_COMPAT_API_KEY_ENV}_${channelId.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}`;
		}
		/** The legacy flat fields remain the first channel; additional entries are fully independent. */
		function resolveOpenAICompatChannels(source) {
			const legacy = {
				id: DEFAULT_OPENAI_COMPAT_CHANNEL_ID,
				label: source.openaiCompatLabel?.trim() || "OpenAI 兼容",
				keyRef: OPENAI_COMPAT_API_KEY_ENV,
				baseURL: source.openaiCompatBaseURL ?? "",
				model: source.openaiCompatModel ?? "",
				models: [...source.openaiCompatModels ?? []],
				editModel: source.openaiCompatEditModel ?? "",
				quality: source.openaiCompatQuality ?? "",
				qualityOptions: [...source.openaiCompatQualityOptions ?? []],
				extraBody: source.openaiCompatExtraBody ?? {},
				editSizeMode: source.openaiCompatEditSizeMode ?? "auto",
				editFormat: source.openaiCompatEditFormat ?? "multipart",
				editExtra: source.openaiCompatEditExtra ?? {},
				sizes: source.openaiCompatSizes ?? {}
			};
			const channels = [legacy];
			const seen = /* @__PURE__ */ new Set([legacy.id]);
			for (const [index, entry] of (source.openaiCompatChannels ?? []).entries()) {
				const id = typeof entry?.id === "string" ? entry.id.trim() : "";
				if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id) || seen.has(id)) continue;
				seen.add(id);
				const storedKeyRef = typeof entry.keyRef === "string" ? entry.keyRef.trim() : "";
				channels.push({
					id,
					label: typeof entry.label === "string" && entry.label.trim().length > 0 ? entry.label.trim() : `OpenAI 兼容 ${index + 2}`,
					keyRef: /^DSH_IMAGE_GEN_OPENAI_COMPAT_KEY_[A-Z0-9_]+$/.test(storedKeyRef) ? storedKeyRef : openAICompatKeyRef(id),
					baseURL: typeof entry.baseURL === "string" ? entry.baseURL : "",
					model: typeof entry.model === "string" ? entry.model : "",
					models: Array.isArray(entry.models) ? entry.models.filter((model) => typeof model === "string") : [],
					editModel: typeof entry.editModel === "string" ? entry.editModel : "",
					quality: typeof entry.quality === "string" ? entry.quality : "",
					qualityOptions: Array.isArray(entry.qualityOptions) ? entry.qualityOptions.filter((quality) => typeof quality === "string") : [],
					extraBody: entry.extraBody ?? {},
					editSizeMode: entry.editSizeMode === "selected" ? "selected" : "auto",
					editFormat: entry.editFormat ?? "multipart",
					editExtra: entry.editExtra ?? {},
					sizes: entry.sizes ?? {}
				});
			}
			return channels;
		}
		function resolveOpenAICompatChannel(source, channelId) {
			const channels = resolveOpenAICompatChannels(source);
			const explicit = channelId?.trim() ?? "";
			if (explicit.length > 0) {
				const selected = channels.find((channel) => channel.id === explicit);
				if (selected === void 0) throw new Error(`Unknown OpenAI-compatible channel "${explicit}". Available channels: ${channels.map((channel) => channel.id).join(", ")}.`);
				return selected;
			}
			const active = source.openaiCompatActiveChannel?.trim() ?? "";
			return channels.find((channel) => channel.id === active) ?? channels[0];
		}
		/**
		* Providers the browser workbench can drive: the BYOK cloud set plus the
		* logged-in subscription channels. ComfyUI stays out; it has its own workflow
		* pipeline and no shared request shape.
		*/
		const STUDIO_PROVIDERS = [...CLOUD_IMAGE_PROVIDERS, ...SUBSCRIPTION_PROVIDERS];
		function studioTargetKey(provider, channel) {
			return channel === void 0 ? provider : `${provider}:${channel}`;
		}
		const GIF_FRAME_DURATION_MS_MAX = 2e3;
		const GIF_SHEET_MAX_EDGE = 3840;
		/**
		* Credential references resolved through the DSH Credentials service (BYOK).
		* These are POSIX-style reference names, not environment variables: the host
		* layers the process environment and its managed store behind them, so a name
		* like OPENAI_API_KEY is shared with any other plugin resolving the same ref.
		*/
		const GOOGLE_API_KEY_ENV = "GEMINI_API_KEY";
		/** OpenAI Platform credential reference. */
		const OPENAI_API_KEY_ENV = "OPENAI_API_KEY";
		/**
		* OpenAI-compatible relay credential reference. Deliberately distinct from
		* OPENAI_API_KEY so an official key and a relay key can coexist without
		* overwriting each other.
		*/
		const OPENAI_COMPAT_API_KEY_ENV = "DSH_IMAGE_GEN_OPENAI_COMPAT_KEY";
		/** The credential reference each cloud provider's API key is stored under. */
		const CLOUD_CREDENTIAL_REFS = {
			google: GOOGLE_API_KEY_ENV,
			openai: OPENAI_API_KEY_ENV,
			"openai-compat": OPENAI_COMPAT_API_KEY_ENV,
			seedream: "ARK_API_KEY",
			dashscope: "DASHSCOPE_API_KEY",
			xai: "XAI_API_KEY",
			zhipu: "ZHIPUAI_API_KEY"
		};
		/** The credential reference storing this provider's API key, when it uses one. */
		function cloudCredentialRef(provider) {
			return CLOUD_IMAGE_PROVIDERS.includes(provider) ? CLOUD_CREDENTIAL_REFS[provider] : void 0;
		}
		const STUDIO_WATERMARK_VALUES = [
			"default",
			"off",
			"on"
		];
		/** A model picker/request must use the same operation-specific default. */
		function studioModelForMode(profile, mode) {
			return mode === "edit" ? profile.editModel ?? profile.model : profile.model;
		}
		function studioModelOptionsForMode(profile, mode) {
			if (mode === "edit" && profile.editModel !== void 0) return [{
				value: profile.editModel,
				label: profile.editModel
			}];
			return profile.modelOptions ?? [{
				value: profile.model,
				label: profile.model
			}];
		}
		function studioWatermarkCapability(profile, mode) {
			return profile?.watermarkCapabilities?.[mode] ?? (mode === "generate" && profile?.watermarkOptions?.length ? { status: "supported" } : {
				status: "unknown",
				reason: "channel-unconfirmed"
			});
		}
		/** Default endpoints and base URLs. */
		const DEFAULT_GOOGLE_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
		const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
		const DEFAULT_SEEDREAM_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
		const DEFAULT_DASHSCOPE_ENDPOINT = "https://dashscope.aliyuncs.com/api/v1";
		const DEFAULT_XAI_BASE_URL = "https://api.x.ai/v1";
		const DEFAULT_ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
		const DEFAULT_COMFYUI_BASE_URL = "http://127.0.0.1:8188";
		const DEFAULT_COMFYUI_TIMEOUT_MS = 3e5;
		const DEFAULT_COMFYUI_WORKFLOW_LABEL = "API workflow";
		/** Default model names. */
		const DEFAULT_GOOGLE_MODEL = "gemini-3.1-flash-image";
		const DEFAULT_OPENAI_MODEL = "gpt-image-2.6-flare";
		const DEFAULT_SEEDREAM_MODEL = "doubao-seedream-5-0-pro-260628";
		/**
		* Seedream models Volcano Ark retires on 2026-11-24 (batch 10), mapped to the
		* model that takes their requests. A saved settings value naming one of them
		* (the plugin's own former default among them) would start failing that day.
		*/
		const RETIRED_SEEDREAM_MODELS = {
			"doubao-seedream-5-0-260128": DEFAULT_SEEDREAM_MODEL,
			"doubao-seedream-5-0-lite-260128": DEFAULT_SEEDREAM_MODEL,
			"doubao-seedream-4-5-251128": DEFAULT_SEEDREAM_MODEL
		};
		/** The Seedream model a request should use: a retired one is replaced, anything else is kept. */
		function currentSeedreamModel(model) {
			const trimmed = model?.trim();
			if (trimmed === void 0 || trimmed.length === 0) return DEFAULT_SEEDREAM_MODEL;
			return RETIRED_SEEDREAM_MODELS[trimmed] ?? trimmed;
		}
		const DEFAULT_DASHSCOPE_MODEL = "qwen-image-3.0";
		const DEFAULT_XAI_MODEL = "grok-imagine-image-2.0";
		const DEFAULT_ZHIPU_MODEL = "glm-image";
		/** Named workflows, falling back to the legacy single-workflow fields when the list is empty. */
		function resolveComfyUIWorkflows(source) {
			const named = [];
			for (const entry of source.comfyuiWorkflows ?? []) {
				const name = typeof entry?.name === "string" ? entry.name.trim() : "";
				const json = typeof entry?.json === "string" ? entry.json : "";
				if (name.length > 0 && json.trim().length > 0) {
					const presetPrompt = typeof entry.presetPrompt === "string" ? entry.presetPrompt.trim() : "";
					named.push(presetPrompt.length > 0 ? {
						name,
						json,
						presetPrompt
					} : {
						name,
						json
					});
				}
			}
			if (named.length > 0) return named;
			const legacyJson = typeof source.comfyuiWorkflowJson === "string" ? source.comfyuiWorkflowJson : "";
			if (legacyJson.trim().length === 0) return [];
			const legacyName = typeof source.comfyuiWorkflowName === "string" ? source.comfyuiWorkflowName.trim() : "";
			return [{
				name: legacyName.length > 0 ? legacyName : DEFAULT_COMFYUI_WORKFLOW_LABEL,
				json: legacyJson
			}];
		}
		/** The workflow ComfyUI calls use by default: the configured active name, else the first entry. */
		function activeComfyUIWorkflow(source) {
			const workflows = resolveComfyUIWorkflows(source);
			if (workflows.length === 0) return void 0;
			const activeName = typeof source.comfyuiActiveWorkflow === "string" ? source.comfyuiActiveWorkflow.trim() : "";
			return workflows.find((workflow) => workflow.name === activeName) ?? workflows[0];
		}
		/** Derive a workflow label that does not collide with the given existing names. */
		function uniqueComfyUIWorkflowName(name, existing) {
			const base = name.trim().length > 0 ? name.trim() : DEFAULT_COMFYUI_WORKFLOW_LABEL;
			if (!existing.includes(base)) return base;
			for (let index = 2;; index += 1) {
				const candidate = `${base} (${index})`;
				if (!existing.includes(candidate)) return candidate;
			}
		}
		/** Default models for the subscription channels; fixed by the bridge protocol. */
		const DEFAULT_SUBSCRIPTION_MODELS = {
			"chatgpt-sub": "gpt-image-2.6-flare",
			"grok-sub": "grok-imagine-image-2.0",
			"google-sub": "gemini-3.1-flash-image"
		};
		const DEFAULT_MODELS = {
			google: DEFAULT_GOOGLE_MODEL,
			openai: DEFAULT_OPENAI_MODEL,
			"openai-compat": "",
			seedream: DEFAULT_SEEDREAM_MODEL,
			dashscope: DEFAULT_DASHSCOPE_MODEL,
			xai: DEFAULT_XAI_MODEL,
			zhipu: DEFAULT_ZHIPU_MODEL,
			comfyui: DEFAULT_COMFYUI_WORKFLOW_LABEL,
			"chatgpt-sub": DEFAULT_SUBSCRIPTION_MODELS["chatgpt-sub"],
			"grok-sub": DEFAULT_SUBSCRIPTION_MODELS["grok-sub"],
			"google-sub": DEFAULT_SUBSCRIPTION_MODELS["google-sub"]
		};
		/**
		* Official consoles where each API-key provider issues keys, linked next to
		* the key field (#109). Relays (openai-compat), ComfyUI and the subscription
		* channels have no single place to get one.
		*/
		const API_KEY_CONSOLE_URLS = {
			google: "https://aistudio.google.com/apikey",
			openai: "https://platform.openai.com/api-keys",
			seedream: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
			dashscope: "https://bailian.console.aliyun.com/",
			xai: "https://console.x.ai/team/default/api-keys",
			zhipu: "https://bigmodel.cn/usercenter/proj-mgmt/apikeys"
		};
		const DEFAULT_BASE_URLS = {
			google: DEFAULT_GOOGLE_ENDPOINT,
			openai: DEFAULT_OPENAI_BASE_URL,
			"openai-compat": "",
			seedream: DEFAULT_SEEDREAM_BASE_URL,
			dashscope: DEFAULT_DASHSCOPE_ENDPOINT,
			xai: DEFAULT_XAI_BASE_URL,
			zhipu: DEFAULT_ZHIPU_BASE_URL,
			comfyui: DEFAULT_COMFYUI_BASE_URL,
			"chatgpt-sub": "",
			"grok-sub": "",
			"google-sub": ""
		};
		//#endregion
		//#region lib/types/client/settings-state.js
		/** Preserve modern form states while accepting legacy scopes without status/mode. */
		function settingsState(snapshot, health) {
			if (snapshot.mode === "memory") return "remote";
			if (health?.settings === "live" && !health.liveSchema) return "incompatible";
			if (snapshot.status === "loading") return "loading";
			if (snapshot.status === "unavailable") return "unavailable";
			return snapshot.writable ? "ready" : "readOnly";
		}
		/** A failed probe cannot identify the cause; keep the host's own form state. */
		async function fetchSettingsHealth(signal) {
			try {
				const response = await fetch(SETTINGS_HEALTH_ROUTE, {
					cache: "no-store",
					signal
				});
				if (!response.ok) return void 0;
				const health = await response.json();
				if (health === null || typeof health.liveSchema !== "boolean" || ![
					"live",
					"legacy",
					"unavailable"
				].includes(health.settings ?? "")) return void 0;
				return {
					settings: health.settings,
					liveSchema: health.liveSchema
				};
			} catch {
				return;
			}
		}
		//#endregion
		//#region lib/types/comfyui-workflow.js
		/** Pure ComfyUI API-workflow validation and placeholder injection. */
		const COMFYUI_PROMPT_PLACEHOLDER = "{{prompt}}";
		/** Legacy single-percent placeholders from early releases, still accepted. */
		const LEGACY_PROMPT_PLACEHOLDER = "%prompt%";
		/** Validate imported JSON without exposing workflow graph details to callers. */
		function validateComfyUIWorkflowJson(workflowJson) {
			parseWorkflow(workflowJson);
		}
		function parseWorkflow(workflowJson) {
			if (workflowJson.trim().length === 0) throw new Error("Import a ComfyUI API workflow JSON file in Settings before generating");
			if (new TextEncoder().encode(workflowJson).byteLength > 5242880) throw new Error("ComfyUI workflow file must be no larger than 5 MB");
			let value;
			try {
				value = JSON.parse(workflowJson);
			} catch {
				throw new Error("ComfyUI workflow file is not valid JSON");
			}
			if (!isRecord(value) || Object.keys(value).length === 0) throw new Error("ComfyUI workflow must be a non-empty API-format JSON object");
			if (!Object.values(value).some((node) => {
				const inputs = record$1(node)?.inputs;
				return inputs !== void 0 && containsPromptPlaceholder(inputs);
			})) throw new Error(`ComfyUI workflow must contain ${COMFYUI_PROMPT_PLACEHOLDER} (or ${LEGACY_PROMPT_PLACEHOLDER}) in a text input`);
			return value;
		}
		function containsPromptPlaceholder(value) {
			if (typeof value === "string") return value.includes("{{prompt}}") || value.includes(LEGACY_PROMPT_PLACEHOLDER);
			if (Array.isArray(value)) return value.some(containsPromptPlaceholder);
			return isRecord(value) && Object.values(value).some(containsPromptPlaceholder);
		}
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		function record$1(value) {
			return isRecord(value) ? value : void 0;
		}
		//#endregion
		//#region lib/types/client/gallery-thumbs.js
		/** Disposable IndexedDB cache for grid thumbnails. */
		const GALLERY_THUMB_MAX_BYTES = 268435456;
		const GALLERY_THUMB_MAX_AGE_MS = 7776e6;
		const THUMB_DB_NAME = "dsh_image_gen_thumbs";
		const THUMB_DB_VERSION = 1;
		const THUMB_STORE = "thumbs";
		/** Cache key for one attachment thumbnail. */
		function galleryThumbKey(attachmentId, width = 320) {
			return `${attachmentId}@${width}`;
		}
		let thumbDbPromise = null;
		function getThumbDB() {
			if (thumbDbPromise) return thumbDbPromise;
			thumbDbPromise = new Promise((resolve, reject) => {
				if (typeof indexedDB === "undefined") {
					reject(/* @__PURE__ */ new Error("IndexedDB is not supported in this environment."));
					return;
				}
				const request = indexedDB.open(THUMB_DB_NAME, THUMB_DB_VERSION);
				request.onupgradeneeded = () => {
					const db = request.result;
					if (!db.objectStoreNames.contains(THUMB_STORE)) db.createObjectStore(THUMB_STORE, { keyPath: "key" });
				};
				request.onsuccess = () => {
					const db = request.result;
					db.onversionchange = () => {
						db.close();
						thumbDbPromise = null;
					};
					resolve(db);
				};
				request.onerror = () => {
					thumbDbPromise = null;
					reject(request.error);
				};
			});
			return thumbDbPromise;
		}
		/** Read a cached thumbnail; resolves undefined when it was never generated. */
		async function getGalleryThumb(key) {
			try {
				const db = await getThumbDB();
				return await new Promise((resolve) => {
					const req = db.transaction(THUMB_STORE, "readonly").objectStore(THUMB_STORE).get(key);
					req.onsuccess = () => resolve(req.result?.blob);
					req.onerror = () => resolve(void 0);
				});
			} catch {
				return;
			}
		}
		/** Persist a generated thumbnail. Failures are non-fatal: the grid falls back to the original. */
		async function putGalleryThumb(key, blob) {
			try {
				const db = await getThumbDB();
				await new Promise((resolve, reject) => {
					const tx = db.transaction(THUMB_STORE, "readwrite");
					tx.objectStore(THUMB_STORE).put({
						key,
						blob,
						bytes: blob.size,
						createdAt: Date.now()
					});
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
				});
			} catch (err) {
				console.warn("[dsh-image-gen] Failed to cache gallery thumbnail:", err);
			}
		}
		/** Aggregate size of the disposable thumbnail cache (storage panel). */
		async function getGalleryThumbStats() {
			try {
				const db = await getThumbDB();
				const records = await new Promise((resolve, reject) => {
					const req = db.transaction(THUMB_STORE, "readonly").objectStore(THUMB_STORE).getAll();
					req.onsuccess = () => resolve(req.result ?? []);
					req.onerror = () => reject(req.error);
				});
				return {
					count: records.length,
					bytes: records.reduce((sum, record) => sum + (typeof record.bytes === "number" ? record.bytes : 0), 0)
				};
			} catch {
				return {
					count: 0,
					bytes: 0
				};
			}
		}
		/** Drop cached thumbnails for deleted records. Best-effort: the cache is disposable. */
		async function deleteGalleryThumbs(ids) {
			if (ids.length === 0) return;
			try {
				const db = await getThumbDB();
				await new Promise((resolve, reject) => {
					const tx = db.transaction(THUMB_STORE, "readwrite");
					const store = tx.objectStore(THUMB_STORE);
					for (const id of ids) store.delete(galleryThumbKey(id));
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
				});
			} catch {}
		}
		/**
		* Drop cached thumbnails whose attachment is no longer in the gallery.
		* Returns how many entries were removed.
		*/
		async function pruneGalleryThumbs(validAttachmentIds, maxBytes = GALLERY_THUMB_MAX_BYTES, maxAgeMs = GALLERY_THUMB_MAX_AGE_MS) {
			try {
				const db = await getThumbDB();
				const valid = new Set(Array.from(validAttachmentIds, String));
				const stale = (await new Promise((resolve, reject) => {
					const req = db.transaction(THUMB_STORE, "readonly").objectStore(THUMB_STORE).getAllKeys();
					req.onsuccess = () => resolve(req.result.map(String));
					req.onerror = () => reject(req.error);
				})).filter((key) => {
					const at = key.lastIndexOf("@");
					return !valid.has(at > 0 ? key.slice(0, at) : key);
				});
				let removed = 0;
				if (stale.length > 0) {
					await new Promise((resolve, reject) => {
						const tx = db.transaction(THUMB_STORE, "readwrite");
						const store = tx.objectStore(THUMB_STORE);
						for (const key of stale) store.delete(key);
						tx.oncomplete = () => resolve();
						tx.onerror = () => reject(tx.error);
					});
					removed += stale.length;
				}
				const records = await new Promise((resolve, reject) => {
					const req = db.transaction(THUMB_STORE, "readonly").objectStore(THUMB_STORE).getAll();
					req.onsuccess = () => resolve(req.result ?? []);
					req.onerror = () => reject(req.error);
				});
				const cutoff = Date.now() - maxAgeMs;
				const expired = maxAgeMs > 0 ? records.filter((record) => typeof record.createdAt === "number" && record.createdAt < cutoff) : [];
				if (expired.length > 0) {
					const expiredKeys = new Set(expired.map((record) => String(record.key)));
					await new Promise((resolve, reject) => {
						const tx = db.transaction(THUMB_STORE, "readwrite");
						const store = tx.objectStore(THUMB_STORE);
						for (const key of expiredKeys) store.delete(key);
						tx.oncomplete = () => resolve();
						tx.onerror = () => reject(tx.error);
					});
					removed += expired.length;
					for (let i = records.length - 1; i >= 0; i -= 1) if (expiredKeys.has(String(records[i]?.key))) records.splice(i, 1);
				}
				let total = records.reduce((sum, record) => sum + (typeof record.bytes === "number" ? record.bytes : 0), 0);
				if (total > maxBytes) {
					const oldestFirst = [...records].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
					const doomed = [];
					for (const record of oldestFirst) {
						if (total <= maxBytes) break;
						doomed.push(String(record.key));
						total -= typeof record.bytes === "number" ? record.bytes : 0;
					}
					if (doomed.length > 0) {
						await new Promise((resolve, reject) => {
							const tx = db.transaction(THUMB_STORE, "readwrite");
							const store = tx.objectStore(THUMB_STORE);
							for (const key of doomed) store.delete(key);
							tx.oncomplete = () => resolve();
							tx.onerror = () => reject(tx.error);
						});
						removed += doomed.length;
					}
				}
				return removed;
			} catch {
				return 0;
			}
		}
		//#endregion
		//#region lib/types/client/gallery-store.js
		const DB_NAME$2 = "dsh_image_gen_db";
		const DB_VERSION = 4;
		const STORE_NAME = "gallery_history";
		const TOMBSTONE_STORE = "gallery_tombstones";
		const FAV_PROMPT_STORE = "favorite_prompts";
		const FAV_FOLDER_STORE = "favorite_folders";
		let dbPromise = null;
		let tombstonesCache = null;
		function getDB() {
			if (dbPromise) return dbPromise;
			dbPromise = new Promise((resolve, reject) => {
				if (typeof indexedDB === "undefined") {
					reject(/* @__PURE__ */ new Error("IndexedDB is not supported in this environment."));
					return;
				}
				const request = indexedDB.open(DB_NAME$2, DB_VERSION);
				request.onupgradeneeded = (event) => {
					const db = event.target.result;
					if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" }).createIndex("createdAt", "createdAt", { unique: false });
					if (!db.objectStoreNames.contains(TOMBSTONE_STORE)) db.createObjectStore(TOMBSTONE_STORE, { keyPath: "id" });
					if (!db.objectStoreNames.contains(FAV_PROMPT_STORE)) db.createObjectStore(FAV_PROMPT_STORE, { keyPath: "id" });
					if (!db.objectStoreNames.contains(FAV_FOLDER_STORE)) db.createObjectStore(FAV_FOLDER_STORE, { keyPath: "id" });
				};
				request.onsuccess = () => {
					const db = request.result;
					db.onversionchange = () => {
						db.close();
						dbPromise = null;
					};
					resolve(db);
				};
				request.onerror = () => {
					dbPromise = null;
					reject(request.error);
				};
				request.onblocked = () => {
					dbPromise = null;
					reject(/* @__PURE__ */ new Error("IndexedDB upgrade blocked. Close other open Studio tabs and retry."));
				};
			});
			return dbPromise;
		}
		async function loadTombstones(db) {
			if (tombstonesCache) return tombstonesCache;
			return new Promise((resolve) => {
				if (!db.objectStoreNames.contains(TOMBSTONE_STORE)) {
					tombstonesCache = /* @__PURE__ */ new Set();
					resolve(tombstonesCache);
					return;
				}
				try {
					const req = db.transaction(TOMBSTONE_STORE, "readonly").objectStore(TOMBSTONE_STORE).getAllKeys();
					req.onsuccess = () => {
						tombstonesCache = new Set(req.result.map(String));
						resolve(tombstonesCache);
					};
					req.onerror = () => {
						tombstonesCache = /* @__PURE__ */ new Set();
						resolve(tombstonesCache);
					};
				} catch {
					tombstonesCache = /* @__PURE__ */ new Set();
					resolve(tombstonesCache);
				}
			});
		}
		/** Age at which timestamp metadata can be compacted; deleted IDs never expire. */
		const TOMBSTONE_TTL_MS = 2592e6;
		/**
		* Compact old tombstones to permanent IDs. Removing an ID would let an old
		* conversation silently reinsert a deleted image. No IDs are removed.
		*/
		async function pruneTombstones(maxAgeMs = TOMBSTONE_TTL_MS) {
			try {
				const db = await getDB();
				if (!db.objectStoreNames.contains(TOMBSTONE_STORE)) return 0;
				const records = await new Promise((resolve, reject) => {
					const req = db.transaction(TOMBSTONE_STORE, "readonly").objectStore(TOMBSTONE_STORE).getAll();
					req.onsuccess = () => resolve(req.result ?? []);
					req.onerror = () => reject(req.error);
				});
				const cutoff = Date.now() - maxAgeMs;
				const doomed = records.filter((record) => typeof record.deletedAt === "number" && record.deletedAt < cutoff);
				if (doomed.length === 0) return 0;
				await new Promise((resolve, reject) => {
					const tx = db.transaction(TOMBSTONE_STORE, "readwrite");
					const store = tx.objectStore(TOMBSTONE_STORE);
					for (const record of doomed) store.put({ id: String(record.id) });
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
				});
				tombstonesCache = null;
				return 0;
			} catch {
				return 0;
			}
		}
		const listeners = /* @__PURE__ */ new Set();
		function notifyListeners() {
			for (const listener of listeners) try {
				listener();
			} catch (err) {
				console.error("[dsh-image-gen] Gallery listener error:", err);
			}
		}
		/**
		* Subscribe to gallery mutations (insert/delete/clear).
		*/
		function subscribeGallery(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
		/**
		* Save or update a gallery record by attachmentId.
		* Skipped if the item was previously deleted (tombstoned).
		* Preserves existing isFavorite, tags, and original createdAt on re-renders.
		* Returns false when the record was not persisted (e.g. IndexedDB unavailable)
		* so callers can surface the failure and let the user retry.
		*/
		async function saveGalleryItem(item) {
			try {
				const db = await getDB();
				const tombstones = await loadTombstones(db);
				if (tombstones.has(item.id)) return true;
				await new Promise((resolve, reject) => {
					const tx = db.transaction([STORE_NAME, TOMBSTONE_STORE], "readwrite");
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
					tx.onabort = () => reject(tx.error ?? /* @__PURE__ */ new Error("IndexedDB transaction aborted"));
					const store = tx.objectStore(STORE_NAME);
					const check = tx.objectStore(TOMBSTONE_STORE).get(item.id);
					check.onerror = () => reject(check.error);
					check.onsuccess = () => {
						if (check.result !== void 0) {
							tombstones.add(item.id);
							return;
						}
						const getReq = store.get(item.id);
						getReq.onsuccess = () => {
							const existing = getReq.result;
							const fav = item.isFavorite !== void 0 ? item.isFavorite : existing?.isFavorite;
							const userTags = item.tags !== void 0 ? item.tags : existing?.tags;
							const savedPath = item.savedTo !== void 0 ? item.savedTo : existing?.savedTo;
							const record = {
								...existing,
								...item,
								createdAt: existing?.createdAt ?? item.createdAt ?? Date.now(),
								...fav !== void 0 ? { isFavorite: fav } : {},
								...userTags !== void 0 ? { tags: userTags } : {},
								...savedPath !== void 0 ? { savedTo: savedPath } : {}
							};
							const putReq = store.put(record);
							putReq.onerror = () => reject(putReq.error);
						};
						getReq.onerror = () => reject(getReq.error);
					};
				});
				notifyListeners();
				return true;
			} catch (err) {
				console.warn("[dsh-image-gen] Failed to save gallery item to IndexedDB:", err);
				return false;
			}
		}
		/** Whether this id was deleted from the gallery, so a re-rendered card must not resurrect what the record referenced either. */
		async function isGalleryItemTombstoned(id) {
			try {
				return (await loadTombstones(await getDB())).has(id);
			} catch {
				return false;
			}
		}
		async function readGalleryItems() {
			const db = await getDB();
			return await new Promise((resolve, reject) => {
				const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).index("createdAt").openCursor(null, "prev");
				const items = [];
				req.onsuccess = (event) => {
					const cursor = event.target.result;
					if (cursor) {
						items.push(cursor.value);
						cursor.continue();
					} else resolve(items);
				};
				req.onerror = () => reject(req.error);
			});
		}
		/**
		* Retrieve all gallery records sorted by createdAt descending.
		*/
		async function getGalleryItems() {
			try {
				return await readGalleryItems();
			} catch (err) {
				console.warn("[dsh-image-gen] Failed to read gallery items from IndexedDB:", err);
				return [];
			}
		}
		/**
		* Like getGalleryItems, but rejects when IndexedDB is unavailable. Maintenance
		* callers must not treat a read failure as an empty gallery (that would make
		* vault gc delete every original).
		*/
		async function getGalleryItemsStrict() {
			return readGalleryItems();
		}
		/**
		* Toggle favorite status of a gallery item.
		* Returns the new favorite status (true if favorited, false if unfavorited).
		*/
		async function toggleFavoriteGalleryItem(id) {
			try {
				const db = await getDB();
				const newStatus = await new Promise((resolve, reject) => {
					const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
					const getReq = store.get(id);
					getReq.onsuccess = () => {
						const item = getReq.result;
						if (!item) {
							resolve(false);
							return;
						}
						const nextFavorite = !item.isFavorite;
						item.isFavorite = nextFavorite;
						const putReq = store.put(item);
						putReq.onsuccess = () => resolve(nextFavorite);
						putReq.onerror = () => reject(putReq.error);
					};
					getReq.onerror = () => reject(getReq.error);
				});
				notifyListeners();
				return newStatus;
			} catch (err) {
				console.warn("[dsh-image-gen] Failed to toggle favorite item in IndexedDB:", err);
				return false;
			}
		}
		/**
		* Resolve the attachment ids behind gallery record ids. Imported records carry a
		* synthetic `import-<attachmentId>-<uuid>` id, so the record id is not always
		* the thumbnail key.
		*/
		async function attachmentIdsFor(db, ids) {
			if (ids.length === 0) return [];
			return new Promise((resolve) => {
				const found = [];
				try {
					const tx = db.transaction(STORE_NAME, "readonly");
					const store = tx.objectStore(STORE_NAME);
					for (const id of ids) {
						const req = store.get(id);
						req.onsuccess = () => {
							const attachmentId = req.result?.attachment?.attachmentId;
							if (typeof attachmentId === "string") found.push(attachmentId);
						};
					}
					tx.oncomplete = () => resolve(found);
					tx.onerror = () => resolve(found);
				} catch {
					resolve(found);
				}
			});
		}
		/**
		* Delete a single gallery record by ID and record a tombstone.
		*/
		async function deleteGalleryItem(id) {
			const db = await getDB();
			const tombstones = await loadTombstones(db);
			const attachmentIds = await attachmentIdsFor(db, [id]);
			await new Promise((resolve, reject) => {
				const tx = db.transaction([STORE_NAME, TOMBSTONE_STORE], "readwrite");
				const store = tx.objectStore(STORE_NAME);
				const tombstoneStore = tx.objectStore(TOMBSTONE_STORE);
				store.delete(id);
				tombstoneStore.put({
					id,
					deletedAt: Date.now()
				});
				tx.oncomplete = () => {
					tombstones.add(id);
					resolve();
				};
				tx.onerror = () => reject(tx.error);
			});
			deleteGalleryThumbs([id, ...attachmentIds]);
			notifyListeners();
		}
		/**
		* Bulk delete multiple gallery records by IDs and record tombstones in a single transaction.
		*/
		async function bulkDeleteGalleryItems(ids) {
			if (ids.length === 0) return;
			const db = await getDB();
			const tombstones = await loadTombstones(db);
			const attachmentIds = await attachmentIdsFor(db, ids);
			const now = Date.now();
			await new Promise((resolve, reject) => {
				const tx = db.transaction([STORE_NAME, TOMBSTONE_STORE], "readwrite");
				const store = tx.objectStore(STORE_NAME);
				const tombstoneStore = tx.objectStore(TOMBSTONE_STORE);
				for (const id of ids) {
					store.delete(id);
					tombstoneStore.put({
						id,
						deletedAt: now
					});
				}
				tx.oncomplete = () => {
					for (const id of ids) tombstones.add(id);
					resolve();
				};
				tx.onerror = () => reject(tx.error ?? /* @__PURE__ */ new Error("IndexedDB transaction failed"));
				tx.onabort = () => reject(tx.error ?? /* @__PURE__ */ new Error("IndexedDB transaction aborted"));
			});
			deleteGalleryThumbs([...ids, ...attachmentIds]);
			notifyListeners();
		}
		/**
		* Bulk update favorite status for multiple gallery records in a single transaction.
		*/
		async function bulkSetFavoriteGalleryItems(ids, isFavorite) {
			if (ids.length === 0) return;
			const db = await getDB();
			await new Promise((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, "readwrite");
				const store = tx.objectStore(STORE_NAME);
				for (const id of ids) {
					const getReq = store.get(id);
					getReq.onsuccess = () => {
						const item = getReq.result;
						if (item && item.isFavorite !== isFavorite) {
							item.isFavorite = isFavorite;
							store.put(item);
						}
					};
				}
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error ?? /* @__PURE__ */ new Error("IndexedDB transaction failed"));
				tx.onabort = () => reject(tx.error ?? /* @__PURE__ */ new Error("IndexedDB transaction aborted"));
			});
			notifyListeners();
		}
		/**
		* Standardize path format across Windows and POSIX (lowercase, forward slashes, no trailing slash).
		*/
		function normalizeWorkspacePath(rawPath) {
			return rawPath.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "");
		}
		/**
		* Determine if a gallery item belongs to the given workspace context.
		* Compares workspaceId, sessionId membership, workspacePath, and savedTo file path prefix.
		*/
		function isItemInWorkspace(item, workspace) {
			if (!workspace || !workspace.workspaceId && !workspace.path && (!workspace.sessionIds || workspace.sessionIds.length === 0)) return true;
			if (!item.workspaceId && !item.sessionId && !item.workspacePath && !item.savedTo) return true;
			if (item.workspaceId && workspace.workspaceId && item.workspaceId === workspace.workspaceId) return true;
			if (item.sessionId && Array.isArray(workspace.sessionIds) && workspace.sessionIds.includes(item.sessionId)) return true;
			if (item.workspacePath && workspace.path) {
				if (normalizeWorkspacePath(item.workspacePath) === normalizeWorkspacePath(workspace.path)) return true;
			}
			if (item.savedTo && workspace.path) {
				const normSaved = normalizeWorkspacePath(item.savedTo);
				const normWs = normalizeWorkspacePath(workspace.path);
				if (normSaved === normWs || normSaved.startsWith(normWs + "/")) return true;
			}
			return false;
		}
		const favoriteListeners = /* @__PURE__ */ new Set();
		function notifyFavorites() {
			for (const listener of favoriteListeners) try {
				listener();
			} catch (err) {
				console.error("[dsh-image-gen] Favorites listener error:", err);
			}
		}
		/** Subscribe to favorites mutations (insert/delete). */
		function subscribeFavorites(listener) {
			favoriteListeners.add(listener);
			return () => {
				favoriteListeners.delete(listener);
			};
		}
		/** Stable base36 id for a favorite prompt; identical trimmed text dedupes. */
		function promptIdOf(text) {
			let hash = 5381;
			for (let i = 0; i < text.length; i++) hash = (hash << 5) + hash + text.charCodeAt(i) | 0;
			return `p${(hash >>> 0).toString(36)}-${text.length.toString(36)}`;
		}
		/**
		* Collision-free prompt id. Distinct texts can share the djb2 hash and the
		* length, which would silently overwrite an unrelated saved prompt; suffix
		* until the id is free or already owned by the same text.
		*/
		async function uniquePromptId(db, text) {
			const rows = await readAll(db, FAV_PROMPT_STORE);
			const byId = new Map(rows.map((row) => [row.id, row]));
			const base = promptIdOf(text);
			let candidate = base;
			let suffix = 1;
			while (byId.has(candidate) && byId.get(candidate)?.text !== text) {
				suffix++;
				candidate = `${base}-${suffix}`;
			}
			return candidate;
		}
		function readAll(db, storeName) {
			return new Promise((resolve, reject) => {
				const req = db.transaction(storeName, "readonly").objectStore(storeName).openCursor();
				const rows = [];
				req.onsuccess = (event) => {
					const cursor = event.target.result;
					if (cursor) {
						rows.push(cursor.value);
						cursor.continue();
					} else resolve(rows);
				};
				req.onerror = () => reject(req.error);
			});
		}
		/**
		* Keep one prompt in the favorites rail; identical trimmed text overwrites
		* (one record per distinct prompt).
		* @returns false when the write failed.
		*/
		async function saveFavoritePrompt(text) {
			const trimmed = text.trim();
			if (trimmed.length === 0) return false;
			try {
				const db = await getDB();
				const id = await uniquePromptId(db, trimmed);
				await new Promise((resolve, reject) => {
					const req = db.transaction(FAV_PROMPT_STORE, "readwrite").objectStore(FAV_PROMPT_STORE).put({
						id,
						text: trimmed,
						addedAt: Date.now()
					});
					req.onsuccess = () => resolve();
					req.onerror = () => reject(req.error);
				});
				notifyFavorites();
				return true;
			} catch (err) {
				console.warn("[dsh-image-gen] Failed to save favorite prompt:", err);
				return false;
			}
		}
		/** Prompt favorites, newest first. */
		async function getFavoritePrompts() {
			try {
				return (await readAll(await getDB(), FAV_PROMPT_STORE)).sort((a, b) => b.addedAt - a.addedAt);
			} catch (err) {
				console.warn("[dsh-image-gen] Failed to read favorite prompts:", err);
				return [];
			}
		}
		/** Drop one prompt favorite. */
		async function deleteFavoritePrompt(id) {
			try {
				const db = await getDB();
				await new Promise((resolve, reject) => {
					const req = db.transaction(FAV_PROMPT_STORE, "readwrite").objectStore(FAV_PROMPT_STORE).delete(id);
					req.onsuccess = () => resolve();
					req.onerror = () => reject(req.error);
				});
				notifyFavorites();
			} catch (err) {
				console.warn("[dsh-image-gen] Failed to delete favorite prompt:", err);
			}
		}
		function folderIdOf(kind, name) {
			return `f-${kind}-${name.trim().toLowerCase().replace(/\s+/g, "-")}-${name.length.toString(36)}`;
		}
		/** Create a favorites folder; returns null when the name is empty or already used for the kind. */
		async function addFavoriteFolder(kind, name) {
			const trimmed = name.trim();
			if (trimmed === "") return null;
			try {
				const db = await getDB();
				if ((await readAll(db, FAV_FOLDER_STORE)).some((folder) => folder.kind === kind && folder.name === trimmed)) return null;
				const folder = {
					id: folderIdOf(kind, trimmed),
					kind,
					name: trimmed,
					addedAt: Date.now()
				};
				await new Promise((resolve, reject) => {
					const req = db.transaction(FAV_FOLDER_STORE, "readwrite").objectStore(FAV_FOLDER_STORE).put(folder);
					req.onsuccess = () => resolve();
					req.onerror = () => reject(req.error);
				});
				notifyFavorites();
				return folder;
			} catch (err) {
				console.warn("[dsh-image-gen] Failed to add favorite folder:", err);
				return null;
			}
		}
		/** List all favorite folders. */
		async function getFavoriteFolders() {
			try {
				return (await readAll(await getDB(), FAV_FOLDER_STORE)).sort((a, b) => a.addedAt - b.addedAt);
			} catch (err) {
				console.warn("[dsh-image-gen] Failed to read favorite folders:", err);
				return [];
			}
		}
		/** Delete a folder; member favorites survive and become unfiled. */
		async function deleteFavoriteFolder(id) {
			try {
				const db = await getDB();
				await new Promise((resolve, reject) => {
					const tx = db.transaction(FAV_PROMPT_STORE, "readwrite");
					const req = tx.objectStore(FAV_PROMPT_STORE).openCursor();
					req.onsuccess = (event) => {
						const cursor = event.target.result;
						if (cursor) {
							const row = cursor.value;
							if (row.folderId === id) {
								delete row.folderId;
								cursor.update(row);
							}
							cursor.continue();
						}
					};
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
				});
				await new Promise((resolve, reject) => {
					const req = db.transaction(FAV_FOLDER_STORE, "readwrite").objectStore(FAV_FOLDER_STORE).delete(id);
					req.onsuccess = () => resolve();
					req.onerror = () => reject(req.error);
				});
				notifyFavorites();
			} catch (err) {
				console.warn("[dsh-image-gen] Failed to delete favorite folder:", err);
			}
		}
		async function moveFavorite(storeName, id, folderId) {
			try {
				const db = await getDB();
				const ok = await new Promise((resolve, reject) => {
					const tx = db.transaction(storeName, "readwrite");
					const req = tx.objectStore(storeName).get(id);
					req.onsuccess = () => {
						const row = req.result;
						if (row === void 0) {
							resolve(false);
							return;
						}
						if (folderId === void 0) delete row.folderId;
						else row.folderId = folderId;
						tx.objectStore(storeName).put(row);
						resolve(true);
					};
					tx.onerror = () => reject(tx.error);
				});
				if (ok) notifyFavorites();
				return ok;
			} catch (err) {
				console.warn("[dsh-image-gen] Failed to move favorite:", err);
				return false;
			}
		}
		/** File a favorite prompt into a folder (undefined unfiles it). */
		function moveFavoritePrompt(id, folderId) {
			return moveFavorite(FAV_PROMPT_STORE, id, folderId);
		}
		/** Rewrite a favorite prompt's text in place, keeping its id stable. */
		async function updateFavoritePrompt(id, text) {
			const trimmed = text.trim();
			if (trimmed === "") return false;
			try {
				const db = await getDB();
				const ok = await new Promise((resolve, reject) => {
					const tx = db.transaction(FAV_PROMPT_STORE, "readwrite");
					const req = tx.objectStore(FAV_PROMPT_STORE).get(id);
					req.onsuccess = () => {
						const row = req.result;
						if (row === void 0) {
							resolve(false);
							return;
						}
						row.text = trimmed;
						tx.objectStore(FAV_PROMPT_STORE).put(row);
						resolve(true);
					};
					tx.onerror = () => reject(tx.error);
				});
				if (ok) notifyFavorites();
				return ok;
			} catch (err) {
				console.warn("[dsh-image-gen] Failed to update favorite prompt:", err);
				return false;
			}
		}
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.38.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const mergeClasses = (...classes) => classes.filter((className, index, array) => {
			return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
		}).join(" ").trim();
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.38.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.38.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const toCamelCase = (string) => string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase());
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.38.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const toPascalCase = (string) => {
			const camelCase = toCamelCase(string);
			return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
		};
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.38.0_react@18.3.1/node_modules/lucide-react/dist/esm/defaultAttributes.mjs
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		var defaultAttributes = {
			xmlns: "http://www.w3.org/2000/svg",
			width: 24,
			height: 24,
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 2,
			strokeLinecap: "round",
			strokeLinejoin: "round"
		};
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.38.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const hasA11yProp = (props) => {
			for (const prop in props) if (prop.startsWith("aria-") || prop === "role" || prop === "title") return true;
			return false;
		};
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.38.0_react@18.3.1/node_modules/lucide-react/dist/esm/context.mjs
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const LucideContext = (0, react.createContext)({});
		const useLucideContext = () => (0, react.useContext)(LucideContext);
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.38.0_react@18.3.1/node_modules/lucide-react/dist/esm/Icon.mjs
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Icon = (0, react.forwardRef)(({ color, size, strokeWidth, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref) => {
			const { size: contextSize = 24, strokeWidth: contextStrokeWidth = 2, absoluteStrokeWidth: contextAbsoluteStrokeWidth = false, color: contextColor = "currentColor", className: contextClass = "" } = useLucideContext() ?? {};
			const calculatedStrokeWidth = absoluteStrokeWidth ?? contextAbsoluteStrokeWidth ? Number(strokeWidth ?? contextStrokeWidth) * 24 / Number(size ?? contextSize) : strokeWidth ?? contextStrokeWidth;
			return (0, react.createElement)("svg", {
				ref,
				...defaultAttributes,
				width: size ?? contextSize ?? defaultAttributes.width,
				height: size ?? contextSize ?? defaultAttributes.height,
				stroke: color ?? contextColor,
				strokeWidth: calculatedStrokeWidth,
				className: mergeClasses("lucide", contextClass, className),
				...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
				...rest
			}, [...iconNode.map(([tag, attrs]) => (0, react.createElement)(tag, attrs)), ...Array.isArray(children) ? children : [children]]);
		});
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.38.0_react@18.3.1/node_modules/lucide-react/dist/esm/createLucideIcon.mjs
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const createLucideIcon = (iconName, iconNode) => {
			const Component = (0, react.forwardRef)(({ className, ...props }, ref) => (0, react.createElement)(Icon, {
				ref,
				iconNode,
				className: mergeClasses(`lucide-${toKebabCase(toPascalCase(iconName))}`, `lucide-${iconName}`, className),
				...props
			}));
			Component.displayName = toPascalCase(iconName);
			return Component;
		};
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const BookmarkPlus = createLucideIcon("bookmark-plus", [
			["path", {
				d: "M12 7v6",
				key: "lw1j43"
			}],
			["path", {
				d: "M15 10H9",
				key: "o6yqo3"
			}],
			["path", {
				d: "M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z",
				key: "oz39mx"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Check = createLucideIcon("check", [["path", {
			d: "M20 6 9 17l-5-5",
			key: "1gmf2c"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ChevronDown = createLucideIcon("chevron-down", [["path", {
			d: "m6 9 6 6 6-6",
			key: "qrunsl"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ChevronLeft = createLucideIcon("chevron-left", [["path", {
			d: "m15 18-6-6 6-6",
			key: "1wnfg3"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ChevronRight = createLucideIcon("chevron-right", [["path", {
			d: "m9 18 6-6-6-6",
			key: "mthhwq"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Clipboard = createLucideIcon("clipboard", [["rect", {
			width: "8",
			height: "4",
			x: "8",
			y: "2",
			rx: "1",
			ry: "1",
			key: "tgr4d6"
		}], ["path", {
			d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
			key: "116196"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Copy = createLucideIcon("copy", [["rect", {
			width: "14",
			height: "14",
			x: "8",
			y: "8",
			rx: "2",
			ry: "2",
			key: "17jyea"
		}], ["path", {
			d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
			key: "zix9uf"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Download = createLucideIcon("download", [
			["path", {
				d: "M12 15V3",
				key: "m9g1x1"
			}],
			["path", {
				d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
				key: "ih7n3h"
			}],
			["path", {
				d: "m7 10 5 5 5-5",
				key: "brsn70"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Expand = createLucideIcon("expand", [
			["path", {
				d: "m15 15 6 6",
				key: "1s409w"
			}],
			["path", {
				d: "m15 9 6-6",
				key: "ko1vev"
			}],
			["path", {
				d: "M21 16v5h-5",
				key: "1ck2sf"
			}],
			["path", {
				d: "M21 8V3h-5",
				key: "1qoq8a"
			}],
			["path", {
				d: "M3 16v5h5",
				key: "1t08am"
			}],
			["path", {
				d: "m3 21 6-6",
				key: "wwnumi"
			}],
			["path", {
				d: "M3 8V3h5",
				key: "1ln10m"
			}],
			["path", {
				d: "M9 9 3 3",
				key: "v551iv"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ExternalLink = createLucideIcon("external-link", [
			["path", {
				d: "M15 3h6v6",
				key: "1q9fwt"
			}],
			["path", {
				d: "M10 14 21 3",
				key: "gplh6r"
			}],
			["path", {
				d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
				key: "a6xqqp"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const FileText = createLucideIcon("file-text", [
			["path", {
				d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
				key: "1oefj6"
			}],
			["path", {
				d: "M14 2v5a1 1 0 0 0 1 1h5",
				key: "wfsgrz"
			}],
			["path", {
				d: "M10 9H8",
				key: "b1mrlr"
			}],
			["path", {
				d: "M16 13H8",
				key: "t4e002"
			}],
			["path", {
				d: "M16 17H8",
				key: "z1uh3a"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Frame = createLucideIcon("frame", [
			["line", {
				x1: "22",
				x2: "2",
				y1: "6",
				y2: "6",
				key: "15w7dq"
			}],
			["line", {
				x1: "22",
				x2: "2",
				y1: "18",
				y2: "18",
				key: "1ip48p"
			}],
			["line", {
				x1: "6",
				x2: "6",
				y1: "2",
				y2: "22",
				key: "a2lnyx"
			}],
			["line", {
				x1: "18",
				x2: "18",
				y1: "2",
				y2: "22",
				key: "8vb6jd"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const HardDrive = createLucideIcon("hard-drive", [
			["path", {
				d: "M10 16h.01",
				key: "1bzywj"
			}],
			["path", {
				d: "M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
				key: "18tbho"
			}],
			["path", {
				d: "M21.946 12.013H2.054",
				key: "zqlbp7"
			}],
			["path", {
				d: "M6 16h.01",
				key: "1pmjb7"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Heart = createLucideIcon("heart", [["path", {
			d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",
			key: "mvr1a0"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ImagePlus = createLucideIcon("image-plus", [
			["path", {
				d: "M16 5h6",
				key: "1vod17"
			}],
			["path", {
				d: "M19 2v6",
				key: "4bpg5p"
			}],
			["path", {
				d: "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5",
				key: "1ue2ih"
			}],
			["path", {
				d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
				key: "1xmnt7"
			}],
			["circle", {
				cx: "9",
				cy: "9",
				r: "2",
				key: "af1f0g"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Image$1 = createLucideIcon("image", [
			["rect", {
				width: "18",
				height: "18",
				x: "3",
				y: "3",
				rx: "2",
				ry: "2",
				key: "1m3agn"
			}],
			["circle", {
				cx: "9",
				cy: "9",
				r: "2",
				key: "af1f0g"
			}],
			["path", {
				d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
				key: "1xmnt7"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Info = createLucideIcon("info", [
			["circle", {
				cx: "12",
				cy: "12",
				r: "10",
				key: "1mglay"
			}],
			["path", {
				d: "M12 16v-4",
				key: "1dtifu"
			}],
			["path", {
				d: "M12 8h.01",
				key: "e9boi3"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const LoaderCircle = createLucideIcon("loader-circle", [["path", {
			d: "M21 12a9 9 0 1 1-6.219-8.56",
			key: "13zald"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Maximize2 = createLucideIcon("maximize-2", [
			["path", {
				d: "M15 3h6v6",
				key: "1q9fwt"
			}],
			["path", {
				d: "m21 3-7 7",
				key: "1l2asr"
			}],
			["path", {
				d: "m3 21 7-7",
				key: "tjx5ai"
			}],
			["path", {
				d: "M9 21H3v-6",
				key: "wtvkvv"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const PanelLeftClose = createLucideIcon("panel-left-close", [
			["rect", {
				width: "18",
				height: "18",
				x: "3",
				y: "3",
				rx: "2",
				key: "afitv7"
			}],
			["path", {
				d: "M9 3v18",
				key: "fh3hqa"
			}],
			["path", {
				d: "m16 15-3-3 3-3",
				key: "14y99z"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const PanelLeft = createLucideIcon("panel-left", [["rect", {
			width: "18",
			height: "18",
			x: "3",
			y: "3",
			rx: "2",
			key: "afitv7"
		}], ["path", {
			d: "M9 3v18",
			key: "fh3hqa"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const PanelRightClose = createLucideIcon("panel-right-close", [
			["rect", {
				width: "18",
				height: "18",
				x: "3",
				y: "3",
				rx: "2",
				key: "afitv7"
			}],
			["path", {
				d: "M15 3v18",
				key: "14nvp0"
			}],
			["path", {
				d: "m8 9 3 3-3 3",
				key: "12hl5m"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const PanelRight = createLucideIcon("panel-right", [["rect", {
			width: "18",
			height: "18",
			x: "3",
			y: "3",
			rx: "2",
			key: "afitv7"
		}], ["path", {
			d: "M15 3v18",
			key: "14nvp0"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const PencilLine = createLucideIcon("pencil-line", [
			["path", {
				d: "M13 21h8",
				key: "1jsn5i"
			}],
			["path", {
				d: "m15 5 4 4",
				key: "1mk7zo"
			}],
			["path", {
				d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
				key: "1a8usu"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Plus = createLucideIcon("plus", [["path", {
			d: "M5 12h14",
			key: "1ays0h"
		}], ["path", {
			d: "M12 5v14",
			key: "s699le"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const RefreshCw = createLucideIcon("refresh-cw", [
			["path", {
				d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
				key: "v9h5vc"
			}],
			["path", {
				d: "M21 3v5h-5",
				key: "1q7to0"
			}],
			["path", {
				d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
				key: "3uifl3"
			}],
			["path", {
				d: "M8 16H3v5",
				key: "1cv678"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Search = createLucideIcon("search", [["path", {
			d: "m21 21-4.34-4.34",
			key: "14j7rj"
		}], ["circle", {
			cx: "11",
			cy: "11",
			r: "8",
			key: "4ej97u"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Shuffle = createLucideIcon("shuffle", [
			["path", {
				d: "m18 14 4 4-4 4",
				key: "10pe0f"
			}],
			["path", {
				d: "m18 2 4 4-4 4",
				key: "pucp1d"
			}],
			["path", {
				d: "M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22",
				key: "1ailkh"
			}],
			["path", {
				d: "M2 6h1.972a4 4 0 0 1 3.6 2.2",
				key: "km57vx"
			}],
			["path", {
				d: "M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45",
				key: "os18l9"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const SlidersHorizontal = createLucideIcon("sliders-horizontal", [
			["path", {
				d: "M10 5H3",
				key: "1qgfaw"
			}],
			["path", {
				d: "M12 19H3",
				key: "yhmn1j"
			}],
			["path", {
				d: "M14 3v4",
				key: "1sua03"
			}],
			["path", {
				d: "M16 17v4",
				key: "1q0r14"
			}],
			["path", {
				d: "M21 12h-9",
				key: "1o4lsq"
			}],
			["path", {
				d: "M21 19h-5",
				key: "1rlt1p"
			}],
			["path", {
				d: "M21 5h-7",
				key: "1oszz2"
			}],
			["path", {
				d: "M8 10v4",
				key: "tgpxqk"
			}],
			["path", {
				d: "M8 12H3",
				key: "a7s4jb"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Sparkles = createLucideIcon("sparkles", [
			["path", {
				d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
				key: "1s2grr"
			}],
			["path", {
				d: "M20 2v4",
				key: "1rf3ol"
			}],
			["path", {
				d: "M22 4h-4",
				key: "gwowj6"
			}],
			["circle", {
				cx: "4",
				cy: "20",
				r: "2",
				key: "6kqj1y"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const SquareCheckBig = createLucideIcon("square-check-big", [["path", {
			d: "M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344",
			key: "2acyp4"
		}], ["path", {
			d: "m9 11 3 3L22 4",
			key: "1pflzl"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Star = createLucideIcon("star", [["path", {
			d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
			key: "r04s7s"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Trash2 = createLucideIcon("trash-2", [
			["path", {
				d: "M10 11v6",
				key: "nco0om"
			}],
			["path", {
				d: "M14 11v6",
				key: "outv1u"
			}],
			["path", {
				d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
				key: "miytrc"
			}],
			["path", {
				d: "M3 6h18",
				key: "d0wm0j"
			}],
			["path", {
				d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
				key: "e791ji"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const TriangleAlert = createLucideIcon("triangle-alert", [
			["path", {
				d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
				key: "wmoenq"
			}],
			["path", {
				d: "M12 9v4",
				key: "juzpu7"
			}],
			["path", {
				d: "M12 17h.01",
				key: "p32p05"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Upload = createLucideIcon("upload", [
			["path", {
				d: "M12 3v12",
				key: "1x0j5s"
			}],
			["path", {
				d: "m17 8-5-5-5 5",
				key: "7q97r8"
			}],
			["path", {
				d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
				key: "ih7n3h"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const X = createLucideIcon("x", [["path", {
			d: "M18 6 6 18",
			key: "1bl5f8"
		}], ["path", {
			d: "m6 6 12 12",
			key: "d8bk6v"
		}]]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ZoomIn = createLucideIcon("zoom-in", [
			["circle", {
				cx: "11",
				cy: "11",
				r: "8",
				key: "4ej97u"
			}],
			["line", {
				x1: "21",
				x2: "16.65",
				y1: "21",
				y2: "16.65",
				key: "13gj7c"
			}],
			["line", {
				x1: "11",
				x2: "11",
				y1: "8",
				y2: "14",
				key: "1vmskp"
			}],
			["line", {
				x1: "8",
				x2: "14",
				y1: "11",
				y2: "11",
				key: "durymu"
			}]
		]);
		/**
		* @license lucide-react v1.38.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ZoomOut = createLucideIcon("zoom-out", [
			["circle", {
				cx: "11",
				cy: "11",
				r: "8",
				key: "4ej97u"
			}],
			["line", {
				x1: "21",
				x2: "16.65",
				y1: "21",
				y2: "16.65",
				key: "13gj7c"
			}],
			["line", {
				x1: "8",
				x2: "14",
				y1: "11",
				y2: "11",
				key: "durymu"
			}]
		]);
		//#endregion
		//#region lib/types/client/image-cache.js
		var image_cache_exports = /* @__PURE__ */ __exportAll({
			MAX_CACHE_BYTES: () => MAX_CACHE_BYTES,
			MAX_CACHE_COUNT: () => 30,
			clearAttachmentCache: () => clearAttachmentCache,
			evictAttachmentCache: () => evictAttachmentCache,
			fetchAttachmentBlob: () => fetchAttachmentBlob,
			getCacheMetrics: () => getCacheMetrics,
			getCachedAttachmentBlob: () => getCachedAttachmentBlob
		});
		const MAX_CACHE_BYTES = 134217728;
		let currentCacheBytes = 0;
		const cache = /* @__PURE__ */ new Map();
		/**
		* Fetch or reuse an image Blob by attachment ID.
		* Refreshes LRU recency on hit and enforces count/byte limits on arrival.
		*/
		function fetchAttachmentBlob(attachment) {
			const key = String(attachment.attachmentId);
			const existing = cache.get(key);
			if (existing !== void 0) {
				cache.delete(key);
				cache.set(key, existing);
				return existing.promise;
			}
			const entry = {
				promise: Promise.resolve().then(async () => {
					try {
						let response = await fetch(imageUrlFor(attachment), {
							credentials: "same-origin",
							cache: "force-cache"
						});
						if (response.status === 405) response = await fetch(IMAGE_ROUTE, {
							method: "POST",
							credentials: "same-origin",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ attachment })
						});
						if (!response.ok) throw new Error(`Image unavailable (${response.status})`);
						const blob = await response.blob();
						if (cache.get(key) === entry) {
							entry.bytes = blob.size;
							currentCacheBytes += blob.size;
							enforceLimits();
						}
						return blob;
					} catch (err) {
						if (cache.get(key) === entry) cache.delete(key);
						throw err;
					}
				}),
				bytes: 0
			};
			cache.set(key, entry);
			enforceLimits();
			return entry.promise;
		}
		/** Check if an attachment Blob is already cached in memory. */
		function getCachedAttachmentBlob(attachmentId) {
			return cache.get(String(attachmentId))?.promise;
		}
		/** Evict one item from memory cache (e.g. when deleted from gallery). */
		function evictAttachmentCache(attachmentId) {
			const key = String(attachmentId);
			const entry = cache.get(key);
			if (entry !== void 0) {
				currentCacheBytes = Math.max(0, currentCacheBytes - entry.bytes);
				cache.delete(key);
			}
		}
		/** Clear all in-memory image caches. */
		function clearAttachmentCache() {
			cache.clear();
			currentCacheBytes = 0;
		}
		/** Get current cache size metrics (useful for assertions and health monitoring). */
		function getCacheMetrics() {
			return {
				count: cache.size,
				bytes: currentCacheBytes
			};
		}
		function enforceLimits() {
			while (cache.size > 30 || currentCacheBytes > 134217728) {
				const oldestKey = cache.keys().next().value;
				if (oldestKey === void 0) break;
				const oldest = cache.get(oldestKey);
				if (oldest !== void 0) currentCacheBytes = Math.max(0, currentCacheBytes - oldest.bytes);
				cache.delete(oldestKey);
			}
		}
		//#endregion
		//#region lib/types/client/gallery-media.js
		/** Hover prefetch stops pulling raw originals above this size; drag-out then uses the attachment. */
		const GALLERY_PREFETCH_ORIGINAL_MAX_BYTES = 4194304;
		/** A GIF original is the only copy that animates, so it is worth prefetching further than a still. */
		const GALLERY_PREFETCH_GIF_MAX_BYTES = 16777216;
		function shouldPrefetchOriginal(original) {
			if (original === void 0) return false;
			return original.bytes <= (original.mediaType === "image/gif" ? GALLERY_PREFETCH_GIF_MAX_BYTES : GALLERY_PREFETCH_ORIGINAL_MAX_BYTES);
		}
		/** Drop vault files the gallery no longer references; failures are non-fatal. */
		const VAULT_PROFILE_KEY = "dsh-ig-vault-profile-v1";
		/** Stable per-browser-profile identity; the vault registry unions all profiles. */
		function vaultProfileId() {
			try {
				const existing = localStorage.getItem(VAULT_PROFILE_KEY);
				if (existing !== null && /^[A-Za-z0-9_-]{8,128}$/.test(existing)) return existing;
				const created = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "profile-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
				localStorage.setItem(VAULT_PROFILE_KEY, created);
				return created;
			} catch {
				return;
			}
		}
		/** Sync this profile's references; the server never deletes originals here. */
		function syncVaultRefs(keys) {
			const profileId = vaultProfileId();
			if (profileId === void 0) return keys.length === 0 ? Promise.resolve() : Promise.reject(/* @__PURE__ */ new Error("Original reference storage unavailable"));
			return fetch(VAULT_REFS_ROUTE, {
				method: "POST",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					profileId,
					keys
				})
			}).then((response) => {
				if (!response.ok) throw Object.assign(/* @__PURE__ */ new Error("Original reference sync failed (HTTP " + String(response.status) + ")"), { status: response.status });
			});
		}
		/** Manual gallery deletion: remove originals only after the server checks every profile. */
		function deleteVaultOriginals(deleteKeys, remainingKeys) {
			if (deleteKeys.length === 0) return;
			const profileId = vaultProfileId();
			if (profileId === void 0) return;
			fetch(VAULT_DELETE_ROUTE, {
				method: "POST",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					profileId,
					keys: remainingKeys,
					deleteKeys: Array.from(new Set(deleteKeys)),
					confirm: true
				})
			}).catch(() => void 0);
		}
		/**
		* Persist a gallery record and, when it carries an animated original, claim
		* that original for this browser profile at once. Every profile that renders
		* the card writes the record; without an immediate claim another profile
		* could delete the file first and leave this one syncing a dangling key (410)
		* until the record is removed. A deleted (tombstoned) record is neither
		* written nor claimed, or re-opening the conversation would keep the file
		* alive after every gallery dropped it. Only a vault that says the file is
		* gone (410) drops the reference from the record; a registry it cannot write
		* (409) or a transient failure keeps it, and the next mount claims again.
		*/
		async function persistGalleryRecord(record) {
			const saved = await saveGalleryItem(record);
			if (!saved || record.original === void 0 || await isGalleryItemTombstoned(record.id)) return saved;
			try {
				await syncVaultRefs([record.original.key]);
			} catch (error) {
				if (error.status === 410) await saveGalleryItem({
					...record,
					original: void 0
				});
			}
			return saved;
		}
		function vaultKeysOf(items) {
			return items.flatMap((item) => item.original === void 0 ? [] : [item.original.key]);
		}
		/** Full bytes for copy/download/drag: raw vault first, normalized attachment fallback. */
		async function fetchGalleryItemBlob(item) {
			if (item.original !== void 0) try {
				const response = await fetch(vaultUrlFor(item.original.key, item.original.mediaType), { credentials: "same-origin" });
				if (response.ok) return await response.blob();
			} catch {}
			return fetchAttachmentBlob(item.attachment);
		}
		function formatStorageBytes(bytes) {
			if (bytes < 1024) return bytes + " B";
			if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
			if (bytes < 1024 ** 3) return (bytes / 1048576).toFixed(1) + " MB";
			return (bytes / 1024 ** 3).toFixed(2) + " GB";
		}
		const IMAGE_MIME_BY_EXTENSION = {
			png: "image/png",
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			webp: "image/webp",
			gif: "image/gif"
		};
		/** Desktop pickers can omit `File.type` for UNC/temp paths; fall back to the extension. */
		function imageMediaTypeOf(file) {
			if (file.type.startsWith("image/")) return file.type;
			const extension = file.name.toLowerCase().split(".").pop() ?? "";
			return IMAGE_MIME_BY_EXTENSION[extension];
		}
		let zipRouteProbe;
		/** Probe once whether this host can stream ZIP exports (older hosts 404 the route). */
		function canUseServerZip() {
			zipRouteProbe ??= fetch(ZIP_ROUTE, {
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: ""
			}).then((response) => response.status !== 404).catch(() => false);
			return zipRouteProbe;
		}
		function extensionFor(mediaType) {
			if (mediaType === "image/jpeg") return "jpg";
			if (mediaType === "image/webp") return "webp";
			if (mediaType === "image/gif") return "gif";
			return "png";
		}
		/** Download names must follow the resolved bytes, including vault fallbacks. */
		function galleryDownloadName(item, blob) {
			return `dsh-${item.provider}-${item.id}.${extensionFor(blob.type || item.attachment.mediaType)}`;
		}
		/**
		* Ask the host to stream the archive through a hidden form post.
		* A real form navigation would replace the SPA, so the response lands in an
		* off-screen iframe and the browser download manager owns the transfer.
		*/
		function postZipDownload(items, token) {
			const payload = items.map((item) => ({
				name: `dsh-${item.provider}-${item.id.slice(0, 8)}.${extensionFor(item.original?.mediaType ?? item.attachment.mediaType)}`,
				attachment: {
					attachmentId: item.attachment.attachmentId,
					mediaType: item.attachment.mediaType,
					bytes: item.attachment.bytes,
					width: item.attachment.width,
					height: item.attachment.height
				},
				...item.original === void 0 ? {} : {
					originalKey: item.original.key,
					originalMediaType: item.original.mediaType
				}
			}));
			const sink = document.createElement("iframe");
			sink.name = "dsh-ig-zip-sink-" + String(Date.now());
			sink.hidden = true;
			document.body.appendChild(sink);
			const form = document.createElement("form");
			form.method = "POST";
			form.action = ZIP_ROUTE + (token === "" ? "" : "?token=" + encodeURIComponent(token));
			form.target = sink.name;
			form.style.display = "none";
			const field = document.createElement("input");
			field.type = "hidden";
			field.name = "items";
			field.value = JSON.stringify(payload);
			form.appendChild(field);
			if (token !== "") {
				const tokenField = document.createElement("input");
				tokenField.type = "hidden";
				tokenField.name = "token";
				tokenField.value = token;
				form.appendChild(tokenField);
			}
			document.body.appendChild(form);
			form.submit();
			form.remove();
			window.setTimeout(() => sink.remove(), 18e5);
		}
		//#endregion
		//#region lib/types/client/image-result-node.js
		const IMAGE_RESULT_NODE_KIND = "dsh-image-result";
		/**
		* Give each image Tool result its own Chat row at the event that produced it.
		* PTC (run_code) sub-calls already have their own stable sub-call identity.
		*/
		function createImageResultDefinition() {
			return {
				kind: IMAGE_RESULT_NODE_KIND,
				target: "chat",
				match: (event) => {
					if (event.type === "tool/ptc-dispatch") {
						const subCallId = event.data.subCallId;
						if (typeof subCallId !== "string" || subCallId === "") return null;
						return imageResultsFromPtcDispatch(event).length === 0 ? null : {
							id: `ptc:${subCallId}`,
							role: "start"
						};
					}
					if (event.type === "tool/result" && eventTurn(event) !== void 0 && imageResultsFromMeta(event.data.meta).length > 0) return {
						id: `result:${event.seq}`,
						role: "start"
					};
					return null;
				},
				start: (_context, match) => {
					if (match.event.type === "tool/ptc-dispatch") {
						const results = imageResultsFromPtcDispatch(match.event);
						if (results.length === 0) throw new Error("dsh-image-result start requires a plugin image dispatch");
						return { results: results.map((result) => ({
							...result,
							seq: match.event.seq
						})) };
					}
					const turn = eventTurn(match.event);
					const results = match.event.type === "tool/result" ? imageResultsFromMeta(match.event.data.meta) : [];
					if (turn === void 0 || results.length === 0) throw new Error("dsh-image-result start requires an image Tool result");
					return {
						turn,
						results: results.map((result) => ({
							...result,
							seq: match.event.seq
						}))
					};
				},
				update: (context, match) => {
					if (match.event.type !== "tool/ptc-dispatch") return context.state;
					return imageResultsFromPtcDispatch(match.event).reduce((state, result) => appendResult(state, result, match.event.seq), context.state);
				},
				buildViewNode: (context) => {
					const state = context.state;
					const first = state?.results[0];
					if (state === void 0 || first === void 0) return null;
					return {
						key: context.key,
						kind: IMAGE_RESULT_NODE_KIND,
						id: context.id,
						target: "chat",
						anchorSeq: first.seq,
						location: { kind: "session" },
						visibility: "visible",
						data: {
							...state.turn !== void 0 ? { turn: state.turn } : {},
							results: state.results.map(({ seq: _seq, ...result }) => result)
						}
					};
				}
			};
		}
		/** Append a parsed result unless its attachment is already collected. */
		function appendResult(state, result, seq) {
			if (state.results.some((candidate) => candidate.attachment.attachmentId === result.attachment.attachmentId)) return state;
			return {
				...state,
				results: [...state.results, {
					...result,
					seq
				}]
			};
		}
		/** Parse the plugin-owned durable presentation metadata from a Tool result event. */
		function imageResultFromMeta(value) {
			const meta = record(value);
			if (meta?.kind !== "dsh-image-gen") return void 0;
			const attachment = imageAttachment(meta.attachment);
			if (attachment === void 0) return void 0;
			const original = originalFromMeta(meta.original);
			return {
				attachment,
				prompt: stringValue(meta.prompt, "Generated Image"),
				provider: stringValue(meta.provider, "google"),
				...typeof meta.channel === "string" ? { channel: meta.channel } : {},
				model: stringValue(meta.model, ""),
				output: stringValue(meta.output, ""),
				...typeof meta.savedTo === "string" ? { savedTo: meta.savedTo } : {},
				...typeof meta.seed === "number" ? { seed: meta.seed } : {},
				...original === void 0 ? {} : { original }
			};
		}
		/** Parse all successful images from either a single or batch Tool result. */
		function imageResultsFromMeta(value) {
			const meta = record(value);
			if (meta?.kind === "dsh-image-gen-batch" && Array.isArray(meta.images)) return meta.images.flatMap((image) => {
				const result = imageResultFromMeta(image);
				return result === void 0 ? [] : [result];
			});
			const result = imageResultFromMeta(value);
			return result === void 0 ? [] : [result];
		}
		function eventTurn(event) {
			const turn = event.data.turn;
			return typeof turn === "number" && Number.isSafeInteger(turn) && turn >= 0 ? turn : void 0;
		}
		/** Plugin tools whose PTC (run_code) dispatch results are image results. */
		const PTC_IMAGE_TOOL_NAMES = /* @__PURE__ */ new Set([
			"generate_image",
			"generate_images",
			"edit_image"
		]);
		/**
		* Fixed summary text rendered by the tools' imageOutput(). PTC dispatch events
		* carry no presentationMeta, so provider/model/output are recovered from this
		* template rather than parsed out of natural language.
		*/
		const PTC_SUMMARY_PATTERN = /^(?:Generated|Edited) one image with ([^/\s]+)\/(\S+) \((.+)\)\. Attachment ID: /;
		/** The vault reference the tools append for an animated result (index.ts originalNote). */
		const ORIGINAL_NOTE_PATTERN = / Original animation \(for the result card only\): vault ([a-f0-9]{64}), (\d+) bytes, (image\/[a-z]+)\./;
		const PTC_SAVED_TO_PATTERN = / It was also saved to the workspace as (.+)\. (?:(?:Saving it to the workspace failed)|(?:It has no local file path)|(?:Respond to the user))/;
		/** Pair each rendered image with its own summary, including batches with failed items. */
		function imageResultsFromPtcDispatch(event) {
			if (event.type !== "tool/ptc-dispatch") return [];
			const data = event.data;
			if (data.isError === true) return [];
			if (typeof data.name !== "string" || !PTC_IMAGE_TOOL_NAMES.has(data.name)) return [];
			const content = Array.isArray(data.content) ? data.content : [];
			const results = [];
			let summaryText = "";
			const args = record(data.arguments);
			const sourceIds = sourceAttachmentIds(args);
			for (const block of content) {
				const candidate = record(block);
				if (candidate === void 0) continue;
				if (candidate.type === "text" && typeof candidate.text === "string") {
					summaryText = candidate.text;
					continue;
				}
				if (candidate.type !== "image") continue;
				const attachment = imageAttachment(candidate.attachment);
				if (attachment === void 0) continue;
				const summary = PTC_SUMMARY_PATTERN.exec(summaryText);
				const savedTo = PTC_SAVED_TO_PATTERN.exec(summaryText)?.[1];
				const originalMatch = ORIGINAL_NOTE_PATTERN.exec(summaryText);
				const original = originalMatch === null ? void 0 : originalFromMeta({
					key: originalMatch[1],
					bytes: Number(originalMatch[2]),
					mediaType: originalMatch[3]
				});
				const promptAt = data.name === "generate_images" ? summaryText.indexOf("\nImage prompt: ") : -1;
				results.push({
					attachment,
					prompt: promptAt < 0 ? stringValue(args?.prompt, "Generated Image") : summaryText.slice(promptAt + 15),
					provider: summary?.[1] ?? "",
					model: summary?.[2] ?? "",
					output: summary?.[3] ?? "",
					...savedTo !== void 0 ? { savedTo } : {},
					...sourceIds !== void 0 ? { sourceAttachmentIds: sourceIds } : {},
					...original === void 0 ? {} : { original }
				});
			}
			return results;
		}
		/** Collect edit_image source attachment ids (single or list form) from dispatch arguments. */
		function sourceAttachmentIds(args) {
			if (args === void 0) return void 0;
			const single = typeof args.source_attachment_id === "string" ? [args.source_attachment_id] : void 0;
			const list = Array.isArray(args.source_attachment_ids) ? args.source_attachment_ids.filter((id) => typeof id === "string") : void 0;
			const ids = single ?? list;
			return ids !== void 0 && ids.length > 0 ? ids : void 0;
		}
		function imageAttachment(value) {
			const candidate = record(value);
			if (candidate === void 0 || typeof candidate.attachmentId !== "string" || !isImageMediaType(candidate.mediaType) || !positiveInteger(candidate.bytes) || !positiveInteger(candidate.width) || !positiveInteger(candidate.height)) return void 0;
			const original = record(candidate.originalDimensions);
			if (candidate.originalDimensions !== void 0 && (original === void 0 || !positiveInteger(original.width) || !positiveInteger(original.height))) return void 0;
			return {
				attachmentId: candidate.attachmentId,
				mediaType: candidate.mediaType,
				bytes: candidate.bytes,
				width: candidate.width,
				height: candidate.height,
				...typeof candidate.name === "string" ? { name: candidate.name } : {},
				...original === void 0 ? {} : { originalDimensions: {
					width: original.width,
					height: original.height
				} }
			};
		}
		function isImageMediaType(value) {
			return value === "image/png" || value === "image/jpeg" || value === "image/webp" || value === "image/gif";
		}
		function positiveInteger(value) {
			return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
		}
		function stringValue(value, fallback) {
			return typeof value === "string" ? value : fallback;
		}
		/**
		* The identity of one image version. A still is its attachment; an animated
		* result is also its vault original, because the host normalizes a GIF to a
		* still of its first frame and two animations that differ only after that
		* frame share one attachment. Keying versions, gallery records and frame notes
		* by the attachment alone would merge such animations into one.
		*/
		function imageVersionKey(attachmentId, original) {
			return original === void 0 ? attachmentId : `${attachmentId}#gif:${original.key}`;
		}
		/** Parse a vault reference; anything malformed drops the reference, never the image that carries it. */
		function originalFromMeta(value) {
			const candidate = record(value);
			if (candidate === void 0 || typeof candidate.key !== "string" || !VAULT_KEY_PATTERN.test(candidate.key) || !positiveInteger(candidate.bytes) || !isImageMediaType(candidate.mediaType)) return void 0;
			return {
				key: candidate.key,
				bytes: candidate.bytes,
				mediaType: candidate.mediaType
			};
		}
		function record(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
		}
		//#endregion
		//#region lib/types/client/studio-session.js
		const sessions = /* @__PURE__ */ new Map();
		/** The session of one workbench surface, created on first use. */
		function studioSession(key) {
			const existing = sessions.get(key);
			if (existing !== void 0) return existing;
			const created = createStudioSession();
			sessions.set(key, created);
			return created;
		}
		/** A fresh session, exported for tests. */
		function createStudioSession() {
			const listeners = /* @__PURE__ */ new Set();
			let snapshot = {
				generating: false,
				outcome: void 0
			};
			let controller;
			let view;
			let seq = 0;
			let deliveredSeq = 0;
			const publish = (next) => {
				snapshot = next;
				for (const listener of [...listeners]) listener();
			};
			return {
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				getSnapshot: () => snapshot,
				view: () => view,
				keepView: (next) => {
					view = next;
				},
				start: (next) => {
					if (controller !== void 0) return false;
					controller = next;
					publish({
						...snapshot,
						generating: true
					});
					return true;
				},
				settle: (owner, outcome) => {
					if (controller !== owner) return;
					controller = void 0;
					if (outcome?.view !== void 0) view = outcome.view;
					publish({
						generating: false,
						outcome: outcome === void 0 ? snapshot.outcome : {
							...outcome,
							seq: ++seq
						}
					});
				},
				cancel: () => {
					const running = controller;
					if (running === void 0) return;
					controller = void 0;
					running.abort();
					publish({
						...snapshot,
						generating: false
					});
				},
				delivered: (outcomeSeq) => outcomeSeq <= deliveredSeq,
				markDelivered: (outcomeSeq) => {
					deliveredSeq = Math.max(deliveredSeq, outcomeSeq);
				}
			};
		}
		//#endregion
		//#region lib/types/client/browser-image-utils.js
		/**
		* Shared browser image and DOM helpers for client views.
		* Completely decoupled from gallery-view and studio-view to prevent circular dependencies.
		*/
		/** Convert a Blob to a data URL. Used for tldraw image assets, which need a
		*  self-contained src; the session canvas keeps them in memory only (no
		*  persistenceKey, nothing touches disk). */
		function blobToDataUrl(blob) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result));
				reader.onerror = () => reject(reader.error ?? /* @__PURE__ */ new Error("blobToDataUrl failed"));
				reader.readAsDataURL(blob);
			});
		}
		/** Copy an image Blob to the OS clipboard, converting to PNG if required by the browser. */
		async function copyImageBlob(blob) {
			try {
				if (blob.type === "image/png") {
					await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
					return true;
				}
				if (typeof createImageBitmap === "function") {
					const bitmap = await createImageBitmap(blob);
					try {
						const canvas = document.createElement("canvas");
						canvas.width = bitmap.width;
						canvas.height = bitmap.height;
						const ctx = canvas.getContext("2d");
						if (!ctx) return false;
						ctx.drawImage(bitmap, 0, 0);
						const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
						if (!pngBlob) return false;
						await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
						return true;
					} finally {
						bitmap.close();
					}
				}
				const img = new Image();
				const url = URL.createObjectURL(blob);
				try {
					await new Promise((resolve, reject) => {
						img.onload = () => resolve();
						img.onerror = () => reject(/* @__PURE__ */ new Error("Image decode failed"));
						img.src = url;
					});
					const canvas = document.createElement("canvas");
					canvas.width = img.naturalWidth;
					canvas.height = img.naturalHeight;
					const ctx = canvas.getContext("2d");
					if (!ctx) return false;
					ctx.drawImage(img, 0, 0);
					const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
					if (!pngBlob) return false;
					await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
					return true;
				} finally {
					URL.revokeObjectURL(url);
				}
			} catch {
				return false;
			}
		}
		/** Safely trigger a browser file download by mounting an anchor element into the DOM. */
		function downloadBlobUrl(url, filename) {
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			try {
				link.click();
			} finally {
				document.body.removeChild(link);
			}
		}
		/** Human-readable relative time formatter supporting zh and en. */
		function formatRelativeTime$1(timestamp, lang) {
			const diff = Math.max(0, Date.now() - timestamp);
			if (lang === "zh") {
				if (diff < 6e4) return "刚刚";
				if (diff < 36e5) return `${Math.floor(diff / 6e4)} 分钟前`;
				if (diff < 864e5) return `${Math.floor(diff / 36e5)} 小时前`;
				if (diff < 2592e6) return `${Math.floor(diff / 864e5)} 天前`;
				const d = new Date(timestamp);
				return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
			}
			if (diff < 6e4) return "Just now";
			if (diff < 36e5) return `${Math.floor(diff / 6e4)}m ago`;
			if (diff < 864e5) return `${Math.floor(diff / 36e5)}h ago`;
			if (diff < 2592e6) return `${Math.floor(diff / 864e5)}d ago`;
			const d = new Date(timestamp);
			return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
		}
		const CRC_TABLE = /* @__PURE__ */ new Uint32Array(256);
		for (let i = 0; i < 256; i++) {
			let c = i;
			for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
			CRC_TABLE[i] = c;
		}
		function crc32(buf) {
			let crc = 4294967295;
			for (let i = 0; i < buf.length; i++) {
				const byte = buf[i] ?? 0;
				crc = (CRC_TABLE[(crc ^ byte) & 255] ?? 0) ^ crc >>> 8;
			}
			return (crc ^ 4294967295) >>> 0;
		}
		/**
		* Create a standard zero-compression (Store mode 0) PKZip Blob from an array of files.
		* Zero external dependencies, pure browser ArrayBuffer/Blob, fast and universally compatible with OS extractors.
		*/
		function createZipBlob(files) {
			const parts = [];
			const centralRecords = [];
			let offset = 0;
			const encoder = new TextEncoder();
			for (const file of files) {
				const nameBytes = encoder.encode(file.name);
				const data = file.data;
				const crc = crc32(data);
				const size = data.length;
				const localHeader = /* @__PURE__ */ new Uint8Array(30);
				const lv = new DataView(localHeader.buffer);
				lv.setUint32(0, 67324752, true);
				lv.setUint16(4, 20, true);
				lv.setUint16(6, 0, true);
				lv.setUint16(8, 0, true);
				lv.setUint16(10, 0, true);
				lv.setUint16(12, 0, true);
				lv.setUint32(14, crc, true);
				lv.setUint32(18, size, true);
				lv.setUint32(22, size, true);
				lv.setUint16(26, nameBytes.length, true);
				lv.setUint16(28, 0, true);
				parts.push(localHeader, nameBytes, data);
				const cdRecord = /* @__PURE__ */ new Uint8Array(46);
				const cv = new DataView(cdRecord.buffer);
				cv.setUint32(0, 33639248, true);
				cv.setUint16(4, 20, true);
				cv.setUint16(6, 20, true);
				cv.setUint16(8, 0, true);
				cv.setUint16(10, 0, true);
				cv.setUint16(12, 0, true);
				cv.setUint16(14, 0, true);
				cv.setUint32(16, crc, true);
				cv.setUint32(20, size, true);
				cv.setUint32(24, size, true);
				cv.setUint16(28, nameBytes.length, true);
				cv.setUint16(30, 0, true);
				cv.setUint16(32, 0, true);
				cv.setUint16(34, 0, true);
				cv.setUint16(36, 0, true);
				cv.setUint32(38, 0, true);
				cv.setUint32(42, offset, true);
				centralRecords.push(cdRecord, nameBytes);
				offset += localHeader.length + nameBytes.length + data.length;
			}
			const cdOffset = offset;
			let cdSize = 0;
			for (const part of centralRecords) cdSize += part.byteLength;
			const eocd = /* @__PURE__ */ new Uint8Array(22);
			const ev = new DataView(eocd.buffer);
			ev.setUint32(0, 101010256, true);
			ev.setUint16(4, 0, true);
			ev.setUint16(6, 0, true);
			ev.setUint16(8, files.length, true);
			ev.setUint16(10, files.length, true);
			ev.setUint32(12, cdSize, true);
			ev.setUint32(16, cdOffset, true);
			ev.setUint16(20, 0, true);
			return new Blob([
				...parts,
				...centralRecords,
				eocd
			], { type: "application/zip" });
		}
		/**
		* Downscale an image for the gallery grid.
		* Returns the source blob when the browser lacks the needed canvas APIs, so
		* callers can always render something without extra capability branches.
		*/
		async function createImageThumbnail(source, width) {
			if (typeof createImageBitmap !== "function") return source;
			try {
				const bitmap = await createImageBitmap(source, {
					resizeWidth: width,
					resizeQuality: "high"
				});
				try {
					const canvas = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(bitmap.width, bitmap.height) : Object.assign(document.createElement("canvas"), {
						width: bitmap.width,
						height: bitmap.height
					});
					const context = canvas.getContext("2d");
					if (!context) return source;
					context.drawImage(bitmap, 0, 0);
					if (typeof OffscreenCanvas === "function" && canvas instanceof OffscreenCanvas) return await canvas.convertToBlob({
						type: "image/webp",
						quality: .82
					});
					return await new Promise((resolve, reject) => {
						canvas.toBlob((blob) => blob ? resolve(blob) : reject(/* @__PURE__ */ new Error("thumbnail encode failed")), "image/webp", .82);
					});
				} finally {
					bitmap.close?.();
				}
			} catch {
				return source;
			}
		}
		//#endregion
		//#region lib/types/openai-output.js
		const PROVIDER_DEFAULT_QUALITY = "__default__";
		const DEFAULT_COMPAT_QUALITIES = [
			"auto",
			"low",
			"medium",
			"high"
		];
		const LEGACY_SIZES = [
			"1024x1024",
			"1536x1024",
			"1024x1536"
		];
		const OPENAI_SIZES = {
			"1:1": {
				"1K": "1024x1024",
				"2K": "2048x2048"
			},
			"3:2": {
				"1K": "1536x1024",
				"2K": "2304x1536"
			},
			"2:3": {
				"1K": "1024x1536",
				"2K": "1536x2304"
			},
			"4:3": {
				"1K": "1152x864",
				"2K": "2048x1536"
			},
			"3:4": {
				"1K": "864x1152",
				"2K": "1536x2048"
			},
			"16:9": {
				"1K": "1536x864",
				"2K": "2048x1152",
				"4K": "3840x2160"
			},
			"9:16": {
				"1K": "864x1536",
				"2K": "1152x2048",
				"4K": "2160x3840"
			}
		};
		function flexibleSizeModel(model) {
			return /^gpt-image-2(?:$|[-.])/.test(model);
		}
		function officialSizeTable(config, model) {
			if (config.openaiSizes && Object.keys(config.openaiSizes).length > 0) return config.openaiSizes;
			if (flexibleSizeModel(model)) return OPENAI_SIZES;
			return {
				"1:1": { "1K": LEGACY_SIZES[0] },
				"3:2": { "1K": LEGACY_SIZES[1] },
				"2:3": { "1K": LEGACY_SIZES[2] }
			};
		}
		/** Check the official model contract before spending a request. Relays own their size contract. */
		function validateOfficialSize(model, size) {
			if (size === "auto") return;
			if (!flexibleSizeModel(model)) {
				if (!LEGACY_SIZES.includes(size)) throw new Error(`模型 ${model} 不支持尺寸 ${size}；请使用 1024x1024、1536x1024 或 1024x1536`);
				return;
			}
			const match = /^(\d+)x(\d+)$/.exec(size);
			const width = Number(match?.[1]);
			const height = Number(match?.[2]);
			const pixels = width * height;
			if (!match || width % 16 !== 0 || height % 16 !== 0 || Math.max(width, height) > 3840 || pixels < 655360 || pixels > 8294400 || Math.max(width, height) > 3 * Math.min(width, height)) throw new Error(`OpenAI 尺寸 ${size} 无效：边长须为 16 的倍数且不超过 3840，比例在 1:3 到 3:1，像素数在 655360 到 8294400`);
		}
		//#endregion
		//#region lib/types/client/multi-model-compare.js
		/** Map one shared output intent to settings accepted by every target model. */
		function buildComparisonTargets(profiles, selectedTargets, ratio, quality, output) {
			const selected = new Set(selectedTargets);
			return profiles.filter((profile) => profile.configured && selected.has(studioTargetKey(profile.provider, profile.channel))).map((profile) => {
				const targetRatio = profile.ratioOptions.some((option) => option.value === ratio) ? ratio : profile.defaultRatio;
				const generationOptions = generationQualityOptions(profile);
				const qualityIntent = output === void 0 ? quality : profile.provider === "openai" || profile.provider === "chatgpt-sub" || profile.provider === "zhipu" ? output.generationQuality : output.resolution;
				const targetQuality = profile.qualityOptions.some((option) => option.value === qualityIntent) ? qualityIntent : profile.defaultQuality;
				const resolutions = profile.resolutionOptions?.[targetRatio];
				const targetResolution = output && resolutions ? resolutions.some((option) => option.value === output.resolution) ? output.resolution : resolutions[0]?.value : void 0;
				const targetGenerationQuality = output && profile.provider === "openai-compat" ? generationOptions.some((option) => option.value === output.generationQuality) ? output.generationQuality : profile.defaultGenerationQuality ?? "__default__" : void 0;
				return {
					profile,
					ratio: targetRatio,
					quality: profile.provider === "openai-compat" ? targetResolution ?? targetQuality : targetQuality,
					adjusted: targetRatio !== ratio || targetQuality !== qualityIntent || targetResolution !== void 0 && targetResolution !== output?.resolution || targetGenerationQuality !== void 0 && targetGenerationQuality !== output?.generationQuality,
					...targetResolution === void 0 ? {} : { resolution: targetResolution },
					...targetGenerationQuality === void 0 ? {} : { generationQuality: targetGenerationQuality }
				};
			});
		}
		function generationQualityOptions(profile) {
			return profile.generationQualityOptions ?? ([
				"openai",
				"chatgpt-sub",
				"zhipu"
			].includes(profile.provider) ? profile.qualityOptions : []);
		}
		/** Keep pixel tiers separate from upstream quality values in comparison mode. */
		function comparisonOutputOptions(profiles, ratio, kind) {
			const options = /* @__PURE__ */ new Map();
			for (const profile of profiles) {
				if (!profile.configured) continue;
				const entries = kind === "generationQuality" ? generationQualityOptions(profile) : profile.resolutionOptions ? profile.resolutionOptions[ratio] ?? profile.resolutionOptions[profile.defaultRatio] ?? [] : ["chatgpt-sub", "zhipu"].includes(profile.provider) ? [] : profile.qualityOptions;
				for (const entry of entries) if (!options.has(entry.value)) options.set(entry.value, {
					value: entry.value,
					label: entry.value === "__default__" ? entry.label : entry.value
				});
			}
			return [...options.values()];
		}
		/** Start with two models, not every configured API, to avoid surprise spend. */
		function initialComparisonProviders(profiles, activeProvider, activeChannel) {
			const configured = profiles.filter((profile) => profile.configured);
			const active = configured.find((profile) => studioTargetKey(profile.provider, profile.channel) === studioTargetKey(activeProvider, activeChannel)) ?? configured.find((profile) => profile.provider === activeProvider);
			const activeKey = active === void 0 ? void 0 : studioTargetKey(active.provider, active.channel);
			return (active === void 0 ? configured : [active, ...configured.filter((profile) => studioTargetKey(profile.provider, profile.channel) !== activeKey)]).slice(0, 2).map((profile) => studioTargetKey(profile.provider, profile.channel));
		}
		const RATIO_SORT_ORDER = [
			"auto",
			"1:1",
			"3:2",
			"2:3",
			"4:3",
			"3:4",
			"4:5",
			"5:4",
			"16:9",
			"9:16",
			"21:9"
		];
		const QUALITY_SORT_ORDER = [
			"auto",
			"standard",
			"1k",
			"1K",
			"1.5K",
			"2k",
			"2K",
			"3K",
			"4K",
			"low",
			"medium",
			"high",
			"xhigh",
			"max",
			"hd"
		];
		/** Union of every configured profile's options, for the shared comparison pickers. */
		function comparisonOptionUnion(profiles, key) {
			const sortOrder = key === "ratioOptions" ? RATIO_SORT_ORDER : QUALITY_SORT_ORDER;
			const seen = /* @__PURE__ */ new Map();
			for (const profile of profiles) {
				if (!profile.configured) continue;
				for (const option of profile[key]) if (!seen.has(option.value)) seen.set(option.value, option);
			}
			const rank = (value) => {
				const index = sortOrder.indexOf(value);
				return index === -1 ? sortOrder.length : index;
			};
			return [...seen.values()].sort((a, b) => rank(a.value) - rank(b.value));
		}
		//#endregion
		//#region lib/types/client/watermark-control.js
		const REASONS = {
			"channel-unconfirmed": {
				zh: "此渠道尚未确认水印支持，可按接口文档配置对应操作的水印字段。",
				en: "Watermark support is unconfirmed. Configure the matching operation using the channel documentation."
			},
			"model-unconfirmed": {
				zh: "当前模型尚未确认水印支持。",
				en: "Watermark support is unconfirmed for this model."
			},
			"account-unconfirmed": {
				zh: "此接口的水印参数和账号开通条件尚未确认。",
				en: "The watermark parameter and account requirements are unconfirmed for this API."
			},
			"edit-format": {
				zh: "当前图生图请求格式不支持已配置的水印字段。",
				en: "The configured watermark field is unavailable in this editing format."
			},
			"no-api-control": {
				zh: "此接口没有已确认的可见水印开关。",
				en: "No visible-watermark control has been confirmed for this API."
			}
		};
		/** Keep the control discoverable while clearly distinguishing confirmed and unknown contracts. */
		const WatermarkControl = ({ capability, value, onChange, lang }) => {
			const noteId = (0, react.useId)();
			const supported = capability.status === "supported";
			const reason = REASONS[capability.reason ?? "channel-unconfirmed"][lang];
			return (0, react_jsx_runtime.jsxs)("label", {
				className: "dsh-ig-field-select",
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						id: `${noteId}-label`,
						children: lang === "en" ? "Visible watermark" : "可见水印"
					}),
					(0, react_jsx_runtime.jsx)("select", {
						value: supported ? value : "default",
						disabled: !supported,
						"aria-labelledby": `${noteId}-label`,
						"aria-describedby": supported ? void 0 : noteId,
						title: supported ? lang === "en" ? "Controls the visible watermark added during generation." : "控制生成图片时添加的可见水印。" : reason,
						onChange: (event) => onChange(event.target.value),
						children: supported ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							(0, react_jsx_runtime.jsx)("option", {
								value: "default",
								children: lang === "en" ? "Channel default" : "渠道默认"
							}),
							(0, react_jsx_runtime.jsx)("option", {
								value: "off",
								children: lang === "en" ? "Off" : "关闭"
							}),
							(0, react_jsx_runtime.jsx)("option", {
								value: "on",
								children: lang === "en" ? "On" : "开启"
							})
						] }) : (0, react_jsx_runtime.jsx)("option", {
							value: "default",
							children: capability.status === "unknown" ? lang === "en" ? "Support unconfirmed" : "支持未确认" : lang === "en" ? "No confirmed control" : "无已确认开关"
						})
					}),
					!supported ? (0, react_jsx_runtime.jsx)("small", {
						id: noteId,
						className: "dsh-ig-inline-note",
						children: reason
					}) : null
				]
			});
		};
		//#endregion
		//#region lib/types/client/tl/tl-canvas-bridge.js
		var tl_canvas_bridge_exports = /* @__PURE__ */ __exportAll({
			clearTlLandings: () => clearTlLandings,
			getTlLandingGeneration: () => getTlLandingGeneration,
			hasTlLandingConsumer: () => hasTlLandingConsumer,
			pushTlLandings: () => pushTlLandings,
			pushTlLandingsLive: () => pushTlLandingsLive,
			registerTlLandingConsumer: () => registerTlLandingConsumer,
			sendTlLandingToOpenCanvas: () => sendTlLandingToOpenCanvas,
			subscribeTlLandingAvailability: () => subscribeTlLandingAvailability
		});
		const pending$2 = /* @__PURE__ */ new Map();
		const consumers = /* @__PURE__ */ new Set();
		const availabilityListeners = /* @__PURE__ */ new Set();
		let delivering = false;
		let generation = 0;
		/** History actions must not silently queue into a canvas that is not open. */
		function hasTlLandingConsumer() {
			return consumers.size > 0;
		}
		function subscribeTlLandingAvailability(listener) {
			availabilityListeners.add(listener);
			return () => {
				availabilityListeners.delete(listener);
			};
		}
		function sendTlLandingToOpenCanvas(item) {
			if (!hasTlLandingConsumer()) return false;
			pushTlLandings([{
				...item,
				onlyWhileCanvasOpen: true
			}]);
			return true;
		}
		/** Invalidates async landings that started before the user cleared the canvas. */
		function getTlLandingGeneration() {
			return generation;
		}
		function clearTlLandings() {
			generation += 1;
			pending$2.clear();
		}
		/** Queue freshly generated images for the tldraw canvases. Safe to call anywhere. */
		function pushTlLandings(newItems) {
			for (const item of newItems) if (!pending$2.has(item.galleryId)) pending$2.set(item.galleryId, item);
			deliver();
		}
		/** Conversation results are admitted only while a canvas is mounted. */
		function pushTlLandingsLive(items) {
			if (consumers.size > 0) pushTlLandings(items);
		}
		/** Register a ready editor. False means it unmounted before committing. */
		function registerTlLandingConsumer(consumer) {
			const wasAvailable = hasTlLandingConsumer();
			consumers.add(consumer);
			if (!wasAvailable) for (const listener of availabilityListeners) listener();
			deliver();
			let registered = true;
			return () => {
				if (!registered) return;
				registered = false;
				consumers.delete(consumer);
				if (consumers.size === 0) {
					for (const [id, item] of pending$2) if (item.fromConversation || item.onlyWhileCanvasOpen) pending$2.delete(id);
					for (const listener of availabilityListeners) listener();
				}
			};
		}
		async function deliver() {
			if (delivering) return;
			delivering = true;
			try {
				while (pending$2.size > 0) {
					const consumer = consumers.values().next().value;
					if (consumer === void 0) break;
					const batch = [...pending$2.values()];
					let completed = true;
					try {
						completed = await consumer(batch);
					} catch (error) {
						console.warn("[dsh-image-gen] canvas landing failed:", error);
					}
					if (completed) {
						for (const item of batch) if (pending$2.get(item.galleryId) === item) pending$2.delete(item.galleryId);
					}
				}
			} finally {
				delivering = false;
			}
		}
		//#endregion
		//#region lib/types/client/tl/studio-tl-registry.js
		var studio_tl_registry_exports = /* @__PURE__ */ __exportAll({
			clearStudioTlCanvases: () => clearStudioTlCanvases,
			deselectStudioTlCanvases: () => deselectStudioTlCanvases,
			mountedCanvases: () => mountedCanvases,
			mountedEditors: () => mountedEditors
		});
		/**
		* Mounted infinite-canvas surfaces, kept outside the tldraw chunk.
		*
		* The canvas component ships in the lazily loaded `client.canvas.js` chunk,
		* but the studio and gallery views (main bundle) clear and deselect canvases
		* without loading tldraw. Both bundles share this module's single instance:
		* the chunk build links it back to the main bundle (see tsdown.config.ts).
		*/
		const mountedCanvases = /* @__PURE__ */ new Set();
		const mountedEditors = /* @__PURE__ */ new Set();
		/** Reset canvas-owned data only. Gallery records and host attachments are untouched. */
		function clearStudioTlCanvases() {
			if (mountedCanvases.size === 0) return false;
			clearTlLandings();
			for (const clear of mountedCanvases) clear();
			clearAttachmentCache();
			return true;
		}
		/**
		* Cancel in-editor selection on every mounted canvas, keeping shapes and sync
		* untouched. Selection is interaction state tied to the surface: leaving the
		* studio page cancels it so a stale selection can neither resurface on return
		* nor linger in the host mirror.
		*/
		function deselectStudioTlCanvases() {
			if (mountedEditors.size === 0) return false;
			for (const editor of mountedEditors) editor.run(() => editor.selectNone());
			return true;
		}
		//#endregion
		//#region lib/types/client/tl/lazy-studio-canvas.js
		/** Global slot the chunk reads the shared main-bundle modules from (tsdown.config.ts). */
		const CANVAS_HOST_KEY = Symbol.for("dsh-image-gen.canvas-host");
		function defaultLoader() {
			const load = typeof require === "undefined" ? void 0 : require.async;
			if (typeof load !== "function") return Promise.reject(/* @__PURE__ */ new Error("this DSH host cannot load plugin chunks"));
			globalThis[CANVAS_HOST_KEY] = {
				imageCache: image_cache_exports,
				bridge: tl_canvas_bridge_exports,
				registry: studio_tl_registry_exports
			};
			return load("./client.canvas.js");
		}
		let loader = defaultLoader;
		let pending$1;
		let loaded;
		let styleAnchor = null;
		let style;
		/**
		* Where tldraw's stylesheet goes once loaded: right before `anchor` (the
		* plugin's canvas theme overrides), keeping the cascade order of the single
		* stylesheet it used to be part of. `null` removes it again.
		*/
		function setCanvasStyleAnchor(anchor) {
			styleAnchor = anchor;
			if (anchor === null) {
				style?.remove();
				style = void 0;
			} else if (loaded !== void 0) installStyle(loaded.TL_CSS);
		}
		function installStyle(css) {
			if (typeof document === "undefined") return;
			if (style === void 0) {
				style = document.createElement("style");
				style.dataset.plugin = "dsh-image-gen";
				style.dataset.part = "tldraw";
				style.textContent = css;
			}
			if (styleAnchor?.parentNode) styleAnchor.before(style);
			else if (!style.isConnected) document.head.appendChild(style);
		}
		/** Fetch the canvas chunk once; a failed fetch can be retried. */
		function loadCanvasChunk() {
			if (loaded !== void 0) return Promise.resolve(loaded);
			pending$1 ??= loader().then((chunk) => {
				installStyle(chunk.TL_CSS);
				loaded = chunk;
				return chunk;
			}, (error) => {
				pending$1 = void 0;
				throw error;
			});
			return pending$1;
		}
		const StudioTlCanvas = (0, react.memo)(function LazyStudioTlCanvas({ lang = "zh" }) {
			const [chunk, setChunk] = (0, react.useState)(loaded);
			const [failed, setFailed] = (0, react.useState)(false);
			const [attempt, setAttempt] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				if (chunk !== void 0) return;
				let live = true;
				setFailed(false);
				loadCanvasChunk().then((next) => {
					if (live) setChunk(next);
				}, (error) => {
					console.warn("[dsh-image-gen] canvas chunk failed to load:", error);
					if (live) setFailed(true);
				});
				return () => {
					live = false;
				};
			}, [chunk, attempt]);
			if (chunk !== void 0) return (0, react_jsx_runtime.jsx)(chunk.StudioTlCanvas, { lang });
			const en = lang === "en";
			return (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-ig-tl-canvas",
				children: (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ig-canvas-sync-status",
					"data-phase": failed ? "error" : "loading",
					role: "status",
					children: [(0, react_jsx_runtime.jsx)("span", { children: failed ? en ? "The canvas failed to load." : "画布加载失败。" : en ? "Loading canvas…" : "正在加载画布…" }), failed && (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setAttempt((n) => n + 1),
						children: en ? "Retry" : "重试"
					})]
				})
			});
		});
		//#endregion
		//#region lib/types/client/tl/gallery-image-transfer.js
		const GALLERY_IMAGE_MIME = "application/x-dsh-image-gen-gallery-image";
		const EXTENSIONS = /* @__PURE__ */ new Map([
			["image/png", "png"],
			["image/jpeg", "jpg"],
			["image/webp", "webp"],
			["image/gif", "gif"]
		]);
		function galleryLanding(item) {
			return {
				galleryId: item.id,
				attachment: item.attachment,
				prompt: item.prompt.slice(0, 120),
				provider: item.provider,
				model: item.model
			};
		}
		/** Internal drops resolve the attachment after landing; loaded blobs also support file drag-out. */
		function startGalleryImageDrag(event, item, blob) {
			const transfer = event.dataTransfer;
			const mediaType = blob?.type || item.attachment.mediaType;
			const extension = EXTENSIONS.get(mediaType);
			if (!transfer || !extension) {
				event.preventDefault();
				return false;
			}
			try {
				transfer.items.clear();
				transfer.effectAllowed = "copy";
				let supported = false;
				if (blob?.size) try {
					const name = item.id.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100) || "image";
					const file = new File([blob], `${name}.${extension}`, { type: mediaType });
					supported = transfer.items.add(file) !== null;
				} catch {}
				try {
					transfer.setData(GALLERY_IMAGE_MIME, JSON.stringify(galleryLanding(item)));
					supported = true;
				} catch {}
				if (supported) return true;
			} catch {}
			event.preventDefault();
			return false;
		}
		//#endregion
		//#region lib/types/client/tl/gallery-canvas-button.js
		/** An explicit alternative to native dragging, including a visible unavailable state. */
		const GalleryCanvasButton = ({ item, lang, disabled, className, onToast }) => {
			const available = (0, react.useSyncExternalStore)(subscribeTlLandingAvailability, hasTlLandingConsumer, () => false);
			const open = lang === "en" ? "Open the infinite canvas first" : "请先打开无限画布";
			const title = !available ? open : disabled ? lang === "en" ? "Wait for the image to load" : "请等待图片加载完成" : lang === "en" ? "Send to canvas" : "发送到画布";
			return (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className,
				title,
				"aria-label": title,
				disabled: !available || disabled,
				onClick: (event) => {
					event.stopPropagation();
					onToast(sendTlLandingToOpenCanvas(galleryLanding(item)) ? lang === "en" ? "Sent to canvas" : "已发送到画布" : open);
				},
				children: (0, react_jsx_runtime.jsx)(Frame, { size: 14 })
			});
		};
		//#endregion
		//#region lib/types/client/studio-helpers.js
		const BatchCanvasItem = ({ item, index, badge, isActive, isChecked, onSelect }) => {
			const image = useAttachmentImage(item.attachment, true);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: `dsh-ig-canvas-item ${isActive ? "is-active" : ""} ${isChecked ? "is-checked" : ""}`,
				onClick: onSelect,
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						className: `dsh-ig-canvas-badge ${badge ? "is-model" : ""}`,
						title: badge,
						children: badge ?? `#${index + 1}`
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: "dsh-ig-canvas-check",
						"aria-hidden": "true",
						children: isChecked ? (0, react_jsx_runtime.jsx)(Check, { size: 14 }) : null
					}),
					image.url !== null ? (0, react_jsx_runtime.jsx)("img", {
						src: image.url,
						alt: item.prompt,
						draggable: false
					}) : image.loading ? (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-canvas-item-loading",
						children: (0, react_jsx_runtime.jsx)(LoaderCircle, {
							className: "dsh-ig-spin",
							size: 24
						})
					}) : (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-canvas-item-loading",
						children: (0, react_jsx_runtime.jsx)(ImagePlus, { size: 24 })
					})
				]
			});
		};
		function hasSubscriptionRatioMismatch(item) {
			if (item.provider !== "chatgpt-sub" || item.aspectRatio === "auto") return false;
			const width = item.attachment.width;
			const height = item.attachment.height;
			if (width === void 0 || height === void 0 || width <= 0 || height <= 0) return false;
			const parts = item.aspectRatio?.split(":").map(Number);
			if (parts === void 0 || parts.length !== 2 || !(parts[0] > 0) || !(parts[1] > 0)) return false;
			return Math.abs(width / height / (parts[0] / parts[1]) - 1) > .12;
		}
		const FieldSelect = ({ label, value, options, onChange }) => (0, react_jsx_runtime.jsxs)("label", {
			className: "dsh-ig-field-select",
			children: [(0, react_jsx_runtime.jsx)("span", { children: label }), (0, react_jsx_runtime.jsx)("select", {
				value,
				onChange: (event) => onChange(event.target.value),
				children: options.map((option) => (0, react_jsx_runtime.jsx)("option", {
					value: option.value,
					children: option.label
				}, option.value))
			})]
		});
		const LOCALIZED_RATIOS = {
			auto: {
				zh: "自动",
				en: "Auto"
			},
			"1:1": {
				zh: "1:1 方形",
				en: "1:1 Square"
			},
			"3:2": {
				zh: "3:2 横向",
				en: "3:2 Landscape"
			},
			"2:3": {
				zh: "2:3 肖像",
				en: "2:3 Portrait"
			},
			"4:3": {
				zh: "4:3 横向",
				en: "4:3 Landscape"
			},
			"3:4": {
				zh: "3:4 竖向",
				en: "3:4 Portrait"
			},
			"4:5": {
				zh: "4:5 肖像",
				en: "4:5 Portrait"
			},
			"5:4": {
				zh: "5:4 横向",
				en: "5:4 Landscape"
			},
			"16:9": {
				zh: "16:9 宽屏",
				en: "16:9 Widescreen"
			},
			"9:16": {
				zh: "9:16 竖屏",
				en: "9:16 Portrait"
			},
			"21:9": {
				zh: "21:9 超宽",
				en: "21:9 Ultrawide"
			}
		};
		const LOCALIZED_QUALITIES = {
			standard: {
				zh: "标准（推荐）",
				en: "Standard (Recommended)"
			},
			auto: {
				zh: "自动",
				en: "Auto"
			},
			low: {
				zh: "低（快速）",
				en: "Low (Fast)"
			},
			medium: {
				zh: "中",
				en: "Medium"
			},
			high: {
				zh: "高",
				en: "High"
			},
			xhigh: {
				zh: "超高",
				en: "Extra High"
			},
			max: {
				zh: "最高",
				en: "Max"
			},
			hd: {
				zh: "高清",
				en: "HD"
			}
		};
		function localizeRatioOptions(options, lang) {
			return options.map((opt) => ({
				value: opt.value,
				label: LOCALIZED_RATIOS[opt.value]?.[lang] ?? opt.label
			}));
		}
		function localizeQualityOptions(options, lang) {
			return options.map((opt) => ({
				value: opt.value,
				label: opt.value === "__default__" ? lang === "en" ? "Provider default (omit)" : "渠道默认（不发送）" : LOCALIZED_QUALITIES[opt.value]?.[lang] ?? opt.label
			}));
		}
		const RecentItem = (0, react.memo)(function RecentItem({ item, active, mode, lang, actions }) {
			const [setRef, inView] = useInView();
			const [hovered, setHovered] = (0, react.useState)(false);
			const [thumbFailed, setThumbFailed] = (0, react.useState)(false);
			const [thumbAttempt, setThumbAttempt] = (0, react.useState)(0);
			const image = useAttachmentImage(item.attachment, inView && (hovered || active || thumbFailed));
			const thumbSource = thumbUrlFor(item.attachment) + (thumbAttempt === 0 ? "" : "&retry=1");
			const thumbUrl = thumbFailed ? image.url : thumbSource;
			return (0, react_jsx_runtime.jsxs)("div", {
				className: `dsh-ig-recent-item ${active ? "is-active" : ""}`,
				onPointerEnter: () => setHovered(true),
				onPointerDown: () => setHovered(true),
				onPointerLeave: () => setHovered(false),
				children: [(0, react_jsx_runtime.jsx)("button", {
					ref: setRef,
					type: "button",
					className: "dsh-ig-recent-select",
					onClick: () => {
						if (mode === "favorite") actions.favorite(item);
						else actions.select(item);
					},
					title: item.prompt,
					draggable: true,
					onDragStart: (event) => {
						startGalleryImageDrag(event, item, image.blob);
					},
					children: (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-recent-thumb",
						children: thumbUrl !== null && thumbUrl !== void 0 ? (0, react_jsx_runtime.jsx)("img", {
							src: thumbUrl,
							alt: "",
							loading: "lazy",
							decoding: "async",
							draggable: false,
							onError: () => {
								if (thumbAttempt === 0) setThumbAttempt(1);
								else setThumbFailed(true);
							}
						}) : (0, react_jsx_runtime.jsx)(ImagePlus, { size: 18 })
					})
				}), (0, react_jsx_runtime.jsx)(GalleryCanvasButton, {
					item,
					lang,
					className: "dsh-ig-recent-send",
					onToast: actions.toast
				})]
			});
		});
		const FavoriteFolderBar = ({ folders, active, onSelect, onDelete, deleteLabel }) => {
			if (folders.length === 0) return null;
			return (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-ig-fav-folders",
				children: folders.map((folder) => (0, react_jsx_runtime.jsxs)("span", {
					className: `dsh-ig-fav-folder-chip ${active === folder.id ? "is-active" : ""}`,
					children: [(0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => onSelect(folder.id),
						children: folder.name
					}), (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-ig-fav-folder-del",
						title: deleteLabel,
						onClick: () => onDelete(folder.id),
						children: (0, react_jsx_runtime.jsx)(X, { size: 9 })
					})]
				}, folder.id))
			});
		};
		function useInView() {
			const [inView, setInView] = (0, react.useState)(false);
			const observerRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				return () => {
					observerRef.current?.disconnect();
				};
			}, []);
			return [(0, react.useCallback)((el) => {
				observerRef.current?.disconnect();
				if (!el || inView) return;
				if (typeof IntersectionObserver === "undefined") {
					setInView(true);
					return;
				}
				const observer = new IntersectionObserver(([entry]) => {
					if (entry?.isIntersecting) {
						setInView(true);
						observer.disconnect();
					}
				}, { rootMargin: "120px" });
				observerRef.current = observer;
				observer.observe(el);
			}, [inView]), inView];
		}
		function useAttachmentImage(attachment, shouldLoad = true) {
			const [value, setValue] = (0, react.useState)({
				url: null,
				blob: null,
				loading: false
			});
			(0, react.useEffect)(() => {
				if (attachment === void 0 || !shouldLoad) {
					setValue({
						url: null,
						blob: null,
						loading: false
					});
					return;
				}
				let cancelled = false;
				let objectUrl = null;
				setValue({
					url: null,
					blob: null,
					loading: true
				});
				fetchAttachmentBlob(attachment).then((blob) => {
					if (cancelled) return;
					objectUrl = URL.createObjectURL(blob);
					setValue({
						url: objectUrl,
						blob,
						loading: false
					});
				}).catch(() => {
					if (!cancelled) setValue({
						url: null,
						blob: null,
						loading: false
					});
				});
				return () => {
					cancelled = true;
					if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
				};
			}, [attachment?.attachmentId, shouldLoad]);
			return value;
		}
		function fileToBase64(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					const result = reader.result;
					const commaIndex = result.indexOf(",");
					resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
				};
				reader.onerror = () => reject(reader.error ?? /* @__PURE__ */ new Error("Failed to read image file"));
				reader.readAsDataURL(file);
			});
		}
		function extension(mediaType) {
			return mediaType === "image/jpeg" ? "jpg" : mediaType.split("/")[1] ?? "png";
		}
		function messageOf(error) {
			return error instanceof Error ? error.message : String(error);
		}
		//#endregion
		//#region lib/types/client/studio-view.js
		/** Below this workbench width the recent-generations rail folds automatically. */
		const WORKBENCH_NARROW_WIDTH = 560;
		const COPY$1 = {
			zh: {
				title: "云端生图工作台",
				configured: "API 已配置",
				unconfigured: "未配置",
				recent: "最近生成",
				empty: "暂无生成历史",
				railTabRecent: "最新生成",
				railTabFavorites: "收藏",
				favImages: "收藏图片",
				favPrompts: "收藏提示词",
				favNewFolder: "新建文件夹",
				favFolderPlaceholder: "文件夹名称",
				favCreate: "创建",
				favCancel: "取消",
				favMoveTo: "移动到文件夹",
				favNoFolder: "未分组",
				favMove: "移动",
				favDeleteFolder: "删除文件夹",
				favEditPrompt: "编辑提示词",
				favUse: "使用",
				favSave: "保存",
				favEditPromptPlaceholder: "输入提示词内容…",
				favFolder: "所属文件夹",
				favEmptyImages: "在图片操作区点「收藏」后，图片会显示在这里",
				favEmptyPrompts: "点提示词输入框旁的「☆ 收藏」后，提示词会显示在这里",
				favoritePrompt: "收藏提示词",
				favActionShort: "收藏",
				favPromptSaved: "已收藏提示词",
				favPromptApplied: "已填入提示词",
				favRefApplied: "已加入参考图",
				favSaveFailed: "收藏失败，请重试",
				generate: "文生图",
				edit: "图生图",
				reference: "参考图",
				optional: "选填",
				upload: "点击或拖拽图片到此处",
				uploadHint: "支持 JPG / PNG / WebP / GIF，最大 10MB（最多 5 张）",
				prompt: "提示词 Prompt",
				clear: "清空",
				promptPlaceholder: "描述主体、构图、风格、光线与需要出现的文字…（支持 Ctrl+Enter 快捷生成）",
				provider: "Provider",
				model: "Model",
				ratio: "比例",
				quality: "清晰度",
				subscriptionParameterHint: "所选比例会自动补充到生成提示词中；实际尺寸和清晰度仍由 ChatGPT 决定，请以生成结果为准。",
				subscriptionRatioMismatch: "ChatGPT 订阅未按所选比例出图，请查看实际尺寸。",
				start: "开始生成",
				generating: "正在生成…",
				cancelGenerate: "取消生成",
				count: "生成数量",
				countUnit: "{n} 张",
				partialSuccess: "已生成 {success} 张图片，{failed} 张失败",
				generatingCount: "正在生成（共 {count} 张）…",
				batchResult: "本次生成（共 {count} 张）",
				singleModel: "单模型",
				compareModels: "多模型对比",
				compareHint: "相同提示词，同时交给多个模型",
				compareSelect: "选择模型",
				compareSelected: "已选 {count} 个模型",
				compareNeedTwo: "请至少选择两个已配置模型",
				compareParameterHint: "不支持所选参数的模型会自动使用默认值",
				compareAdjusted: "已适配",
				comparePartial: "{success} 个模型生成成功，{failed} 个失败",
				comparing: "正在对比（共 {count} 个模型）…",
				compareStart: "开始对比",
				saveToGallery: "保存",
				saveSelected: "保存({count})",
				savedToGallery: "已保存到画廊",
				savedSelected: "已保存 {count} 张图片",
				inGallery: "已保存",
				needSelectResult: "请先勾选要保存的图片",
				retry: "重新加载",
				configLoadFailed: "工作台配置加载失败，请检查服务后重试。",
				noProvider: "请先在设置中配置至少一个云端图像 Provider 的 API Key。",
				selectConfigured: "该 Provider 尚未配置，请先到设置中配置 API Key。",
				needPrompt: "请输入提示词",
				needReference: "请先添加至少一张参考图",
				result: "本次结果",
				continueEdit: "继续编辑（垫图）",
				regenerate: "再次生成",
				copy: "复制",
				copied: "已复制到剪贴板",
				copyFailed: "复制失败",
				download: "下载",
				remove: "删除",
				fit: "适应窗口",
				infiniteCanvas: "无限画布",
				loading: "正在读取图片…",
				generationFailed: "生成失败",
				gatewayTimeout: "请求被反向代理中断（超时）：请重试；反复出现需调大代理超时或换直连网络",
				requestFailed: "请求失败（HTTP {status}）",
				selectHistory: "从左侧选择一张图片，或在右侧开始新的生成。",
				created: "生成时间",
				elapsed: "耗时",
				dimensions: "尺寸",
				output: "输出参数",
				closeReference: "移除参考图",
				uploadInvalid: "请选择有效的图片文件（最大 10MB）",
				uploadUnreadable: "部分图片读取失败，请重新选择后再试",
				imageLoadFailed: "图片读取失败",
				fullscreen: "大图全屏",
				close: "关闭",
				copyPpt: "复制 Prompt",
				copiedPrompt: "已复制 Prompt",
				copiedImage: "已复制图片",
				favorite: "收藏",
				favorited: "已收藏",
				favoriteAdded: "已添加到收藏",
				favoriteRemoved: "已取消收藏",
				gallerySaveFailed: "保存到图库失败，请重试",
				loadMore: "加载更多 ({n})",
				deleteModalTitle: "从图库删除",
				deleteModalDesc: "确定从图库中删除这张图片吗？（原聊天记录不会受影响）",
				deleteWorkspaceFilesLabel: "同时删除工作区本地文件",
				confirm: "确定删除",
				cancel: "取消",
				deletedToast: "已从图库删除",
				referencesCount: "参考图 ({current}/{max})",
				addMoreRef: "+ 添加",
				maxReferencesExceeded: "最多支持添加 {max} 张参考图",
				newGeneration: "新建生成",
				new: "新建",
				configuredCount: "API 已配置 · {count}",
				unconfiguredStatus: "API 未配置",
				providerStatus: "云端提供商与模型状态",
				configuredSplit: "API {api} · 订阅 {sub}",
				subSignedIn: "已登录",
				subSignedOut: "未登录",
				collapseSidebar: "折叠最近生成",
				expandSidebar: "展开最近生成",
				collapseGenerate: "折叠生成面板",
				expandGenerate: "展开生成面板",
				generatePanel: "生成面板",
				findInspiration: "找灵感",
				infiniteCanvasHint: "无限画布与侧边栏会话联动，才是完整功能。打开 DSH 右侧边栏的「图像工作台」即可解锁。",
				clearCanvas: "清空画布",
				clearCanvasDescription: "将永久清空所有画布页面的内容、图片资产和撤销历史。画廊已保存的卡片及原图不受影响，此操作无法撤销。",
				canvasCleared: "画布已清空，画廊不受影响"
			},
			en: {
				title: "Cloud Image Studio",
				configured: "API configured",
				unconfigured: "Not configured",
				recent: "Recent generations",
				empty: "No generated images yet",
				railTabRecent: "Latest",
				railTabFavorites: "Favorites",
				favImages: "Favorite images",
				favPrompts: "Favorite prompts",
				favNewFolder: "New folder",
				favFolderPlaceholder: "Folder name",
				favCreate: "Create",
				favCancel: "Cancel",
				favMoveTo: "Move to folder",
				favNoFolder: "Unfiled",
				favMove: "Move",
				favDeleteFolder: "Delete folder",
				favEditPrompt: "Edit prompt",
				favUse: "Use",
				favSave: "Save",
				favEditPromptPlaceholder: "Prompt text…",
				favFolder: "Folder",
				favEmptyImages: "Click Favorite on an image; favorited images appear here",
				favEmptyPrompts: "Click ☆ Save beside the prompt box",
				favoritePrompt: "Save prompt",
				favActionShort: "Save",
				favPromptSaved: "Prompt saved",
				favPromptApplied: "Prompt applied",
				favRefApplied: "Reference added",
				favSaveFailed: "Could not save; please retry",
				generate: "Text to image",
				edit: "Image to image",
				reference: "Reference image",
				optional: "optional",
				upload: "Click or drop images here",
				uploadHint: "JPG / PNG / WebP / GIF, up to 10MB (max 5)",
				prompt: "Prompt",
				clear: "Clear",
				promptPlaceholder: "Describe the subject, composition, style, lighting, and exact text… (Ctrl+Enter to generate)",
				provider: "Provider",
				model: "Model",
				ratio: "Aspect ratio",
				quality: "Quality",
				subscriptionParameterHint: "The selected aspect ratio is automatically added to the generation prompt. ChatGPT still determines the final dimensions and quality; check the generated result.",
				subscriptionRatioMismatch: "ChatGPT subscription returned a different aspect ratio. Check the actual dimensions.",
				start: "Generate",
				generating: "Generating…",
				cancelGenerate: "Cancel",
				count: "Number of images",
				countUnit: "{n}",
				partialSuccess: "Generated {success} images, {failed} failed",
				generatingCount: "Generating ({count} images)…",
				batchResult: "Generated {count} images",
				singleModel: "Single model",
				compareModels: "Compare models",
				compareHint: "Send the same prompt to multiple models",
				compareSelect: "Choose models",
				compareSelected: "{count} models selected",
				compareNeedTwo: "Select at least two configured models",
				compareParameterHint: "Unsupported settings use each model’s default",
				compareAdjusted: "Adjusted",
				comparePartial: "{success} models succeeded, {failed} failed",
				comparing: "Comparing {count} models…",
				compareStart: "Compare models",
				saveToGallery: "Save to Gallery",
				saveSelected: "Save selected ({count})",
				savedToGallery: "Saved to Gallery",
				savedSelected: "Saved {count} images",
				inGallery: "In Gallery",
				needSelectResult: "Select images to save first",
				retry: "Retry",
				configLoadFailed: "Failed to load studio configuration.",
				noProvider: "Configure an API key for at least one cloud image provider in Settings.",
				selectConfigured: "This provider is not configured. Add its API key in Settings first.",
				needPrompt: "Enter a prompt",
				needReference: "Add at least one reference image first",
				result: "Current result",
				continueEdit: "Continue editing",
				regenerate: "Generate again",
				copy: "Copy",
				copied: "Copied to clipboard",
				copyFailed: "Copy failed",
				download: "Download",
				remove: "Delete",
				fit: "Fit",
				infiniteCanvas: "Infinite canvas",
				loading: "Loading image…",
				generationFailed: "Generation failed",
				gatewayTimeout: "The reverse proxy cut the request (timeout): retry; if it repeats, raise the proxy timeout or use a direct network.",
				requestFailed: "Request failed (HTTP {status})",
				selectHistory: "Select an image on the left, or start a new generation on the right.",
				created: "Created",
				elapsed: "Elapsed",
				dimensions: "Dimensions",
				output: "Output",
				closeReference: "Remove reference",
				uploadInvalid: "Choose a valid image file up to 10MB.",
				uploadUnreadable: "Some images could not be read; pick them again.",
				imageLoadFailed: "Could not load image",
				fullscreen: "Fullscreen",
				close: "Close",
				copyPpt: "Copy Prompt",
				copiedPrompt: "Prompt copied",
				copiedImage: "Image copied",
				favorite: "Favorite",
				favorited: "Favorited",
				favoriteAdded: "Added to favorites",
				favoriteRemoved: "Removed from favorites",
				gallerySaveFailed: "Failed to save to the gallery, please retry",
				loadMore: "Load more ({n})",
				deleteModalTitle: "Delete from gallery",
				deleteModalDesc: "Remove this image from the local gallery? (Chat history remains unaffected)",
				deleteWorkspaceFilesLabel: "Also delete local workspace files",
				confirm: "Delete",
				cancel: "Cancel",
				deletedToast: "Deleted from gallery",
				referencesCount: "References ({current}/{max})",
				addMoreRef: "+ Add",
				maxReferencesExceeded: "Up to {max} reference images allowed",
				newGeneration: "New generation",
				new: "New",
				configuredCount: "API configured · {count}",
				unconfiguredStatus: "Not configured",
				providerStatus: "Provider & Model Status",
				configuredSplit: "API {api} · Sub {sub}",
				subSignedIn: "Signed in",
				subSignedOut: "Signed out",
				collapseSidebar: "Collapse sidebar",
				expandSidebar: "Expand recent list",
				collapseGenerate: "Collapse generate panel",
				expandGenerate: "Expand generate panel",
				generatePanel: "Generate",
				findInspiration: "Find inspiration",
				infiniteCanvasHint: "The infinite canvas is at its best when linked with the sidebar conversation. Open Image Studio from the DSH right sidebar to unlock the full experience.",
				clearCanvas: "Clear canvas",
				clearCanvasDescription: "Permanently clear all canvas pages, image assets, and undo history. Saved gallery cards and original images are unaffected. This cannot be undone.",
				canvasCleared: "Canvas cleared. Gallery unchanged."
			}
		};
		/** localStorage flag remembering that the one-time infinite-canvas hint was dismissed. */
		const INFINITE_CANVAS_HINT_KEY = "dsh-ig-infinite-canvas-hint-dismissed";
		/**
		* The selection after the gallery reloaded: the fresh record of a saved item,
		* null for a saved item that was deleted, and an unsaved result unchanged.
		*/
		function keepSelection(current, next, previousIds) {
			const fresh = next.find((item) => item.id === current.id);
			if (fresh !== void 0) return fresh;
			return previousIds?.has(current.id) === true ? null : current;
		}
		const StudioView = ({ locale, credentialEvents, workspace, initialPrompt, initialReference, initialCanvasSurface, showInfiniteCanvasHint, onInitialPromptApplied, onInitialReferenceApplied, onOpenInspiration }) => {
			const [lang, setLang] = (0, react.useState)(() => locale?.getSnapshot?.().active?.startsWith("en") ? "en" : "zh");
			const [config, setConfig] = (0, react.useState)(null);
			const [configLoading, setConfigLoading] = (0, react.useState)(true);
			const [configError, setConfigError] = (0, react.useState)(null);
			const [items, setItems] = (0, react.useState)([]);
			/** Which rail tab is showing: generation history or the favorites rail. */
			const [railTab, setRailTab] = (0, react.useState)("recent");
			const [favPrompts, setFavPrompts] = (0, react.useState)([]);
			const [favFolders, setFavFolders] = (0, react.useState)([]);
			const [activePromptFolder, setActivePromptFolder] = (0, react.useState)("");
			const [folderDraft, setFolderDraft] = (0, react.useState)(null);
			const [folderDraftName, setFolderDraftName] = (0, react.useState)("");
			const [editingPrompt, setEditingPrompt] = (0, react.useState)(null);
			const [editPromptText, setEditPromptText] = (0, react.useState)("");
			const [editPromptFolder, setEditPromptFolder] = (0, react.useState)("");
			const [movingFav, setMovingFav] = (0, react.useState)(null);
			const [sidebarCollapsed, setSidebarCollapsed] = (0, react.useState)(false);
			/** Manual-only collapse for the right generate form; the form stays put in
			*  narrow seats because it is the primary generation surface. Starts folded
			*  when the studio opens straight into the infinite canvas. */
			const [generateCollapsed, setGenerateCollapsed] = (0, react.useState)(initialCanvasSurface === "infinite" && initialPrompt === void 0);
			/** Workbench root, observed so a narrow column (right sidebar) can fold the recent rail. */
			const workbenchRootRef = (0, react.useRef)(null);
			/** Set once the user toggles the rail by hand; auto-folding then stands down for this mount. */
			const railToggledByUserRef = (0, react.useRef)(false);
			const [visibleLimit, setVisibleLimit] = (0, react.useState)(30);
			const [favoriteLimit, setFavoriteLimit] = (0, react.useState)(60);
			const railActionsRef = (0, react.useRef)(null);
			const railActions = (0, react.useMemo)(() => ({
				select: (item) => railActionsRef.current?.select(item),
				favorite: (item) => railActionsRef.current?.favorite(item),
				toast: (message) => railActionsRef.current?.toast(message)
			}), []);
			const session = (0, react.useMemo)(() => studioSession(initialCanvasSurface ?? "preview"), [initialCanvasSurface]);
			const sessionState = (0, react.useSyncExternalStore)(session.subscribe, session.getSnapshot);
			const restoredView = (0, react.useMemo)(() => session.view(), [session]);
			const [selected, setSelected] = (0, react.useState)(() => restoredView?.selected ?? null);
			const [mode, setMode] = (0, react.useState)("generate");
			const [provider, setProvider] = (0, react.useState)("google");
			const [channel, setChannel] = (0, react.useState)(void 0);
			const [model, setModel] = (0, react.useState)("");
			const [ratio, setRatio] = (0, react.useState)("1:1");
			const [quality, setQuality] = (0, react.useState)("1K");
			const [resolution, setResolution] = (0, react.useState)("1K");
			const [generationQuality, setGenerationQuality] = (0, react.useState)(PROVIDER_DEFAULT_QUALITY);
			const [watermark, setWatermark] = (0, react.useState)("default");
			const [prompt, setPrompt] = (0, react.useState)("");
			const [references, setReferences] = (0, react.useState)([]);
			const [count, setCount] = (0, react.useState)(1);
			const [currentBatch, setCurrentBatch] = (0, react.useState)(() => restoredView?.currentBatch ?? null);
			const [selectedBatchIds, setSelectedBatchIds] = (0, react.useState)(() => restoredView?.selectedBatchIds ?? []);
			const [batchKind, setBatchKind] = (0, react.useState)(() => restoredView?.batchKind ?? null);
			const [comparisonEnabled, setComparisonEnabled] = (0, react.useState)(false);
			const [comparisonProviderKeys, setComparisonProviderKeys] = (0, react.useState)([]);
			const isGenerating = sessionState.generating;
			const [error, setError] = (0, react.useState)(null);
			const [notice, setNotice] = (0, react.useState)(null);
			const [zoom, setZoom] = (0, react.useState)(100);
			const [fit, setFit] = (0, react.useState)(true);
			const [offset, setOffset] = (0, react.useState)({
				x: 0,
				y: 0
			});
			const [isDragging, setIsDragging] = (0, react.useState)(false);
			const dragStartRef = (0, react.useRef)(null);
			const hasDraggedRef = (0, react.useRef)(false);
			const [canvasSurface, setCanvasSurface] = (0, react.useState)(initialCanvasSurface ?? "preview");
			const [showClearCanvasModal, setShowClearCanvasModal] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!showClearCanvasModal) return;
				const close = (event) => {
					if (event.key === "Escape") setShowClearCanvasModal(false);
				};
				window.addEventListener("keydown", close);
				return () => window.removeEventListener("keydown", close);
			}, [showClearCanvasModal]);
			/** Generate-panel state from before the infinite canvas was opened, so the
			*  panel is restored (not just forced open) when returning to preview. */
			const generatePanelBeforeInfiniteRef = (0, react.useRef)(false);
			/** Mirrors `canvasSurface` for async reads: a generation started on the
			*  infinite canvas must land there even if the user flips back to preview
			*  while the request is in flight. */
			const canvasSurfaceRef = (0, react.useRef)(canvasSurface);
			canvasSurfaceRef.current = canvasSurface;
			/** One-time infinite-canvas entry hint, dismissed per-install (localStorage)
			*  so it educates once instead of nagging on every visit. */
			const [canvasHintDismissed, setCanvasHintDismissed] = (0, react.useState)(() => {
				try {
					return localStorage.getItem(INFINITE_CANVAS_HINT_KEY) === "true";
				} catch {
					return false;
				}
			});
			const dismissCanvasHint = (0, react.useCallback)(() => {
				setCanvasHintDismissed(true);
				try {
					localStorage.setItem(INFINITE_CANVAS_HINT_KEY, "true");
				} catch {}
			}, []);
			const [dragging, setDragging] = (0, react.useState)(false);
			const [lightboxOpen, setLightboxOpen] = (0, react.useState)(false);
			const [showDeleteModal, setShowDeleteModal] = (0, react.useState)(false);
			const [deleteWorkspaceFiles, setDeleteWorkspaceFiles] = (0, react.useState)(true);
			const canvasRef = (0, react.useRef)(null);
			const fileInputRef = (0, react.useRef)(null);
			const image = useAttachmentImage(selected?.attachment);
			(0, react.useEffect)(() => {
				if (initialPrompt === void 0) return;
				setMode("generate");
				setPrompt(initialPrompt);
				onInitialPromptApplied?.();
			}, [initialPrompt, onInitialPromptApplied]);
			(0, react.useEffect)(() => {
				const root = workbenchRootRef.current;
				if (root === null || typeof ResizeObserver === "undefined") return;
				const observer = new ResizeObserver((entries) => {
					if (railToggledByUserRef.current) return;
					for (const entry of entries) {
						const narrow = entry.contentRect.width < WORKBENCH_NARROW_WIDTH;
						setSidebarCollapsed((prev) => prev === narrow ? prev : narrow);
					}
				});
				observer.observe(root);
				return () => {
					observer.disconnect();
				};
			}, []);
			const maxReferences = comparisonEnabled ? comparisonProviderKeys.includes("dashscope") ? 3 : 5 : provider === "dashscope" ? 3 : 5;
			const referencesRef = (0, react.useRef)(references);
			referencesRef.current = references;
			const t = (key, values) => {
				let text = COPY$1[lang][key];
				for (const [name, value] of Object.entries(values ?? {})) text = text.replace(`{${name}}`, value);
				return text;
			};
			/** Parse a studio response body; a gateway HTML error page (502/504 from a
			*  reverse proxy) must surface as a readable message, not a JSON SyntaxError. */
			const readStudioBody = async (response) => {
				try {
					return await response.json();
				} catch {
					return { error: response.status === 502 || response.status === 504 ? t("gatewayTimeout") : t("requestFailed", { status: String(response.status) }) };
				}
			};
			(0, react.useEffect)(() => locale?.subscribe?.(() => setLang(locale.getSnapshot().active?.startsWith("en") ? "en" : "zh")), [locale]);
			const formStateRef = (0, react.useRef)({
				provider,
				channel,
				model
			});
			formStateRef.current = {
				provider,
				channel,
				model
			};
			const loadConfig = (0, react.useCallback)(async (options) => {
				const silent = options?.silent === true;
				if (!silent) {
					setConfigLoading(true);
					setConfigError(null);
				}
				const controller = new AbortController();
				try {
					const response = await fetch(STUDIO_ROUTE, {
						signal: controller.signal,
						credentials: "same-origin"
					});
					const payload = await readStudioBody(response);
					if (!response.ok || !("providers" in payload)) throw new Error("error" in payload && payload.error ? payload.error : "Studio unavailable");
					setConfig(payload);
					if (silent) {
						const { provider: currentProvider, channel: currentChannel, model: currentModel } = formStateRef.current;
						const activeProfile = payload.providers.find((item) => item.provider === currentProvider && item.channel === currentChannel);
						if (activeProfile === void 0) {
							const fallback = payload.providers.find((item) => item.provider === payload.activeProvider && item.channel === payload.activeChannel) ?? payload.providers[0];
							if (fallback !== void 0) applyProvider(fallback);
						} else if (!studioModelOptionsForMode(activeProfile, "generate").some((option) => option.value === currentModel)) setModel(activeProfile.model);
						setComparisonProviderKeys((current) => current.filter((selectedKey) => payload.providers.some((item) => studioTargetKey(item.provider, item.channel) === selectedKey && item.configured)));
						return;
					}
					const initial = payload.providers.find((item) => item.provider === payload.activeProvider && item.channel === payload.activeChannel) ?? payload.providers.find((item) => item.provider === payload.activeProvider) ?? payload.providers[0];
					if (initial !== void 0) {
						applyProvider(initial);
						setComparisonProviderKeys(initialComparisonProviders(payload.providers, initial.provider, initial.channel));
					}
				} catch (fetchError) {
					if (!silent && !controller.signal.aborted) setConfigError(messageOf(fetchError));
				} finally {
					if (!silent) setConfigLoading(false);
				}
			}, []);
			(0, react.useEffect)(() => {
				loadConfig();
			}, [loadConfig]);
			(0, react.useEffect)(() => {
				if (credentialEvents === void 0) return;
				return credentialEvents.listen(() => {
					window.setTimeout(() => {
						loadConfig({ silent: true });
					}, 1e3);
				});
			}, [credentialEvents, loadConfig]);
			(0, react.useEffect)(() => {
				let mounted = true;
				let known;
				const load = () => void getGalleryItems().then((next) => {
					if (!mounted) return;
					const previous = known;
					known = new Set(next.map((item) => item.id));
					setItems(next);
					setSelected((current) => current === null ? null : keepSelection(current, next, previous));
				});
				load();
				const unsubscribe = subscribeGallery(load);
				return () => {
					mounted = false;
					unsubscribe();
				};
			}, []);
			(0, react.useEffect)(() => {
				let mounted = true;
				const load = () => void Promise.all([getFavoritePrompts(), getFavoriteFolders()]).then(([prompts, folders]) => {
					if (!mounted) return;
					setFavPrompts(prompts);
					setFavFolders(folders);
				});
				load();
				const unsubscribe = subscribeFavorites(load);
				return () => {
					mounted = false;
					unsubscribe();
				};
			}, []);
			const viewRef = (0, react.useRef)({
				selected,
				currentBatch,
				selectedBatchIds,
				batchKind
			});
			viewRef.current = {
				selected,
				currentBatch,
				selectedBatchIds,
				batchKind
			};
			(0, react.useEffect)(() => () => {
				session.keepView(viewRef.current);
			}, [session]);
			(0, react.useEffect)(() => {
				return () => {
					for (const item of referencesRef.current) if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
				};
			}, []);
			(0, react.useEffect)(() => {
				const handleKeyDown = (e) => {
					if (e.key === "Escape" && lightboxOpen) setLightboxOpen(false);
				};
				window.addEventListener("keydown", handleKeyDown);
				return () => window.removeEventListener("keydown", handleKeyDown);
			}, [lightboxOpen]);
			(0, react.useEffect)(() => {
				const canvasEl = canvasRef.current;
				if (!canvasEl) return;
				const onWheel = (e) => {
					if (selected === null && (!currentBatch || currentBatch.length === 0)) return;
					e.preventDefault();
					const delta = e.deltaY < 0 ? 15 : -15;
					setFit(false);
					setZoom((prev) => Math.min(500, Math.max(25, prev + delta)));
				};
				canvasEl.addEventListener("wheel", onWheel, { passive: false });
				return () => canvasEl.removeEventListener("wheel", onWheel);
			}, [selected, currentBatch]);
			(0, react.useEffect)(() => {
				const handleMouseMove = (e) => {
					if (!dragStartRef.current) return;
					const dx = e.clientX - dragStartRef.current.x;
					const dy = e.clientY - dragStartRef.current.y;
					if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
						hasDraggedRef.current = true;
						setFit(false);
					}
					setOffset({
						x: dragStartRef.current.startX + dx,
						y: dragStartRef.current.startY + dy
					});
				};
				const handleMouseUp = () => {
					dragStartRef.current = null;
					setIsDragging(false);
				};
				window.addEventListener("mousemove", handleMouseMove);
				window.addEventListener("mouseup", handleMouseUp);
				return () => {
					window.removeEventListener("mousemove", handleMouseMove);
					window.removeEventListener("mouseup", handleMouseUp);
				};
			}, []);
			const activeProfile = (0, react.useMemo)(() => config?.providers.find((item) => item.provider === provider && item.channel === channel), [
				config,
				provider,
				channel
			]);
			const requestModel = mode === "edit" && activeProfile?.editModel ? studioModelForMode(activeProfile, mode) : model;
			const configuredCount = config?.providers.filter((item) => item.configured).length ?? 0;
			const apiConfiguredCount = config?.providers.filter((item) => item.configured && !isSubscriptionProvider(item.provider)).length ?? 0;
			const subscriptionSignedInCount = config?.providers.filter((item) => item.configured && isSubscriptionProvider(item.provider)).length ?? 0;
			const displayItems = (0, react.useMemo)(() => items.slice(0, visibleLimit), [items, visibleLimit]);
			const comparisonProfiles = (0, react.useMemo)(() => (config?.providers ?? []).filter((item) => item.configured && (mode === "generate" || item.supportsEditing)), [config, mode]);
			const selectedComparisonProfiles = (0, react.useMemo)(() => comparisonProfiles.filter((profile) => comparisonProviderKeys.includes(studioTargetKey(profile.provider, profile.channel))), [comparisonProfiles, comparisonProviderKeys]);
			const comparisonResolutionOpts = (0, react.useMemo)(() => comparisonOutputOptions(selectedComparisonProfiles, ratio, "resolution"), [selectedComparisonProfiles, ratio]);
			const comparisonGenerationQualityOpts = (0, react.useMemo)(() => localizeQualityOptions(comparisonOutputOptions(selectedComparisonProfiles, ratio, "generationQuality"), lang), [
				selectedComparisonProfiles,
				ratio,
				lang
			]);
			const comparisonResolution = comparisonResolutionOpts.some((option) => option.value === resolution) ? resolution : comparisonResolutionOpts[0]?.value ?? "standard";
			const comparisonGenerationQuality = comparisonGenerationQualityOpts.some((option) => option.value === generationQuality) ? generationQuality : comparisonGenerationQualityOpts[0]?.value ?? "__default__";
			const comparisonTargets = (0, react.useMemo)(() => buildComparisonTargets(comparisonProfiles, comparisonProviderKeys, ratio, quality, {
				resolution: comparisonResolution,
				generationQuality: comparisonGenerationQuality
			}), [
				comparisonProfiles,
				comparisonProviderKeys,
				ratio,
				quality,
				comparisonResolution,
				comparisonGenerationQuality
			]);
			const resolutionOpts = provider === "openai" ? activeProfile?.resolutionOptions?.[ratio] ?? [] : [];
			const singleQualityOpts = provider === "openai-compat" ? activeProfile?.resolutionOptions?.[ratio] ?? activeProfile?.qualityOptions ?? [] : activeProfile?.qualityOptions ?? [];
			const selectedQuality = singleQualityOpts.some((option) => option.value === quality) ? quality : singleQualityOpts[0]?.value ?? quality;
			const selectedResolution = resolutionOpts.some((option) => option.value === resolution) ? resolution : resolutionOpts[0]?.value;
			const selectedGenerationQuality = activeProfile?.generationQualityOptions?.some((option) => option.value === generationQuality) ? generationQuality : activeProfile?.defaultGenerationQuality ?? "__default__";
			const watermarkCapability = studioWatermarkCapability(activeProfile, mode);
			const comparisonWatermarkCapabilities = selectedComparisonProfiles.map((profile) => studioWatermarkCapability(profile, mode));
			const comparisonWatermarkCapability = comparisonWatermarkCapabilities.find((capability) => capability.status === "supported") ?? comparisonWatermarkCapabilities.find((capability) => capability.status === "unknown") ?? studioWatermarkCapability(selectedComparisonProfiles[0], mode);
			const comparisonRatioOpts = (0, react.useMemo)(() => localizeRatioOptions(comparisonOptionUnion(comparisonProfiles, "ratioOptions"), lang), [comparisonProfiles, lang]);
			const applyProvider = (profile) => {
				setProvider(profile.provider);
				setChannel(profile.channel);
				setModel(profile.model);
				setRatio(profile.defaultRatio);
				setQuality(profile.defaultQuality);
				setResolution(profile.defaultResolution ?? profile.defaultQuality);
				setGenerationQuality(profile.defaultGenerationQuality ?? profile.defaultQuality);
				setWatermark("default");
				setError(null);
			};
			const changeProvider = (value, channelId) => {
				const profile = config?.providers.find((item) => item.provider === value && (channelId === void 0 || item.channel === channelId));
				if (profile !== void 0) {
					applyProvider(profile);
					const providerMax = value === "dashscope" ? 3 : 5;
					if (referencesRef.current.length > providerMax) {
						const keep = referencesRef.current.slice(0, providerMax);
						const overflow = referencesRef.current.slice(providerMax);
						for (const item of overflow) if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
						setReferences(keep);
						referencesRef.current = keep;
						setError(t("maxReferencesExceeded", { max: String(providerMax) }));
					}
				}
			};
			const changeProfile = (value) => {
				const profile = config?.providers.find((item) => studioTargetKey(item.provider, item.channel) === value);
				if (profile !== void 0) changeProvider(profile.provider, profile.channel);
			};
			const resetFit = () => {
				setFit(true);
				setZoom(100);
				setOffset({
					x: 0,
					y: 0
				});
			};
			const selectItem = (item) => {
				setCurrentBatch(null);
				setSelectedBatchIds([]);
				setBatchKind(null);
				setSelected(item);
				resetFit();
			};
			const startNew = () => {
				setCurrentBatch(null);
				setSelectedBatchIds([]);
				setBatchKind(null);
				setSelected(null);
				resetFit();
			};
			const prepareRegeneration = (item) => {
				setMode("generate");
				setComparisonEnabled(false);
				setPrompt(item.prompt);
				const profile = config?.providers.find((entry) => entry.provider === item.provider && (item.channel === void 0 || entry.channel === item.channel));
				if (!profile) return;
				applyProvider(profile);
				if (studioModelOptionsForMode(profile, "generate").some((option) => option.value === item.model)) setModel(item.model);
				const nextRatio = profile.ratioOptions.some((option) => option.value === item.aspectRatio) ? item.aspectRatio : profile.defaultRatio;
				setRatio(nextRatio);
				if (profile.qualityOptions.some((option) => option.value === item.imageSize)) {
					setQuality(item.imageSize);
					if (profile.provider === "openai") setGenerationQuality(item.imageSize);
				}
				if (profile.resolutionOptions?.[nextRatio]?.some((option) => option.value === item.resolution)) setResolution(item.resolution);
				if (profile.generationQualityOptions?.some((option) => option.value === item.generationQuality)) setGenerationQuality(item.generationQuality);
				if (item.watermark && studioWatermarkCapability(profile, "generate").status === "supported") setWatermark(item.watermark);
			};
			const handleCanvasMouseDown = (e) => {
				if (e.button !== 0 && e.button !== 1) return;
				if (selected === null && (!currentBatch || currentBatch.length === 0)) return;
				setIsDragging(true);
				hasDraggedRef.current = false;
				dragStartRef.current = {
					x: e.clientX,
					y: e.clientY,
					startX: offset.x,
					startY: offset.y
				};
			};
			const handleImageClick = () => {};
			/** Keep the current prompt text in the favorites rail. */
			const handleFavoritePrompt = async () => {
				if (prompt.trim().length === 0) {
					setError(t("needPrompt"));
					return;
				}
				if (await saveFavoritePrompt(prompt)) {
					railToggledByUserRef.current = true;
					setSidebarCollapsed(false);
					setRailTab("favorites");
					flash(t("favPromptSaved"));
				} else setError(t("favSaveFailed"));
			};
			/** Turn one favorited gallery image back into a live reference (edit mode). */
			const applyFavoriteImage = async (item) => {
				const max = maxReferences;
				if (referencesRef.current.length >= max) {
					setError(t("maxReferencesExceeded", { max: String(max) }));
					return;
				}
				try {
					const blob = await fetchAttachmentBlob(item.attachment);
					const newItem = {
						id: `fav-${item.id}-${Date.now()}`,
						attachment: item.attachment,
						previewUrl: URL.createObjectURL(blob)
					};
					const next = [...referencesRef.current, newItem];
					setReferences(next);
					referencesRef.current = next;
					setMode("edit");
					setError(null);
					flash(t("favRefApplied"));
				} catch {
					setError(t("imageLoadFailed"));
				}
			};
			const createFavFolder = async () => {
				if (await addFavoriteFolder("prompt", folderDraftName) === null) {
					flash(t("favSaveFailed"));
					return;
				}
				setFolderDraft(null);
				setFolderDraftName("");
			};
			const openPromptEditor = (fav) => {
				setEditingPrompt(fav);
				setEditPromptText(fav.text);
				setEditPromptFolder(fav.folderId ?? "");
			};
			const doMoveFavorite = (folderId) => {
				if (movingFav === null) return;
				moveFavoritePrompt(movingFav.id, folderId);
			};
			const applyFavoritePrompt = (fav) => {
				setPrompt(fav.text);
				flash(t("favPromptApplied"));
			};
			const addReferenceFiles = async (fileList) => {
				if (!fileList || fileList.length === 0) return;
				const files = Array.from(fileList);
				const validFiles = [];
				for (const file of files) {
					if (![
						"image/jpeg",
						"image/png",
						"image/webp",
						"image/gif"
					].includes(file.type) || file.size > 10485760) {
						setError(t("uploadInvalid"));
						continue;
					}
					validFiles.push(file);
				}
				if (validFiles.length === 0) return;
				const currentLen = referencesRef.current.length;
				const available = maxReferences - currentLen;
				if (available <= 0) {
					setError(t("maxReferencesExceeded", { max: String(maxReferences) }));
					return;
				}
				const toAdd = validFiles.slice(0, available);
				if (validFiles.length > available) setError(t("maxReferencesExceeded", { max: String(maxReferences) }));
				else setError(null);
				const snapshotted = [];
				for (const file of toAdd) try {
					const bytes = await file.arrayBuffer();
					snapshotted.push(new File([bytes], file.name, {
						type: file.type,
						lastModified: file.lastModified
					}));
				} catch {
					setError(t("uploadUnreadable"));
				}
				const newItems = snapshotted.map((file, idx) => ({
					id: `upload-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
					file,
					previewUrl: URL.createObjectURL(file)
				}));
				setReferences((prev) => [...prev, ...newItems]);
			};
			const appliedReferenceRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (initialReference === void 0 || appliedReferenceRef.current === initialReference) return;
				appliedReferenceRef.current = initialReference;
				addReferenceFiles([initialReference]);
				setMode("edit");
				onInitialReferenceApplied?.();
			}, [initialReference, onInitialReferenceApplied]);
			const removeReference = (id) => {
				const target = referencesRef.current.find((item) => item.id === id);
				if (target && target.previewUrl.startsWith("blob:")) URL.revokeObjectURL(target.previewUrl);
				setReferences((prev) => prev.filter((item) => item.id !== id));
			};
			const clearAllReferences = () => {
				for (const item of referencesRef.current) if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
				setReferences([]);
			};
			const continueEdit = async () => {
				if (selected === null) return;
				const targetItem = selected;
				const targetAttId = targetItem.attachment.attachmentId;
				const targetMax = targetItem.provider === "dashscope" ? 3 : 5;
				if (referencesRef.current.some((r) => r.attachment?.attachmentId === targetAttId)) {
					setMode("edit");
					changeProvider(targetItem.provider, targetItem.channel);
					return;
				}
				if (referencesRef.current.length >= targetMax) {
					setError(t("maxReferencesExceeded", { max: String(targetMax) }));
					return;
				}
				try {
					const blob = image.blob ?? await fetchAttachmentBlob(targetItem.attachment);
					if (referencesRef.current.some((r) => r.attachment?.attachmentId === targetAttId)) {
						setMode("edit");
						changeProvider(targetItem.provider, targetItem.channel);
						return;
					}
					if (referencesRef.current.length >= targetMax) {
						setError(t("maxReferencesExceeded", { max: String(targetMax) }));
						return;
					}
					const independentUrl = URL.createObjectURL(blob);
					const newItem = {
						id: `item-${targetItem.id}-${Date.now()}`,
						attachment: targetItem.attachment,
						previewUrl: independentUrl
					};
					const nextList = [...referencesRef.current, newItem];
					setReferences(nextList);
					referencesRef.current = nextList;
					setError(null);
					setMode("edit");
					changeProvider(targetItem.provider, targetItem.channel);
				} catch {
					setError(t("imageLoadFailed"));
				}
			};
			const cancelGeneration = () => {
				session.cancel();
			};
			const toggleComparison = (enabled) => {
				setComparisonEnabled(enabled);
				setError(null);
				if (!enabled) {
					if (activeProfile !== void 0) {
						if (!activeProfile.ratioOptions.some((option) => option.value === ratio)) setRatio(activeProfile.defaultRatio);
						if (!activeProfile.qualityOptions.some((option) => option.value === quality)) setQuality(activeProfile.defaultQuality);
					}
					return;
				}
				if (config === null) return;
				const initial = initialComparisonProviders(comparisonProfiles, provider, channel).filter((item) => mode !== "edit" || referencesRef.current.length <= 3 || item !== "dashscope");
				setComparisonProviderKeys(initial);
				if (![
					"1:1",
					"3:2",
					"2:3",
					"16:9",
					"9:16"
				].includes(ratio)) setRatio("1:1");
				if (![
					"standard",
					"1K",
					"2K",
					"4K"
				].includes(quality)) setQuality("1K");
			};
			const toggleComparisonProvider = (targetKey) => {
				if (mode === "edit" && targetKey === "dashscope" && referencesRef.current.length > 3 && !comparisonProviderKeys.includes(targetKey)) {
					setError(t("maxReferencesExceeded", { max: "3" }));
					return;
				}
				setComparisonProviderKeys((current) => current.includes(targetKey) ? current.filter((item) => item !== targetKey) : [...current, targetKey]);
				setError(null);
			};
			const submit = async () => {
				if (isGenerating || activeProfile === void 0) return;
				if (prompt.trim().length === 0) return setError(t("needPrompt"));
				if (comparisonEnabled && comparisonTargets.length < 2) return setError(t("compareNeedTwo"));
				if (!comparisonEnabled && !activeProfile.configured) return setError(t("selectConfigured"));
				if (mode === "edit" && references.length === 0) return setError(t("needReference"));
				const startedOnInfinite = canvasSurfaceRef.current === "infinite";
				const controller = new AbortController();
				if (!session.start(controller)) return;
				setError(null);
				let outcome;
				try {
					const referencesPayload = mode === "edit" && references.length > 0 ? await Promise.all(references.map(async (ref) => {
						if (ref.attachment !== void 0) return { attachment: ref.attachment };
						if (ref.file !== void 0) return {
							mediaType: ref.file.type,
							data: await fileToBase64(ref.file),
							...ref.file.name ? { name: ref.file.name } : {}
						};
						throw new Error("无效参考图");
					})) : void 0;
					if (comparisonEnabled) {
						const settled = await Promise.allSettled(comparisonTargets.map(async (target) => {
							const response = await fetch(STUDIO_ROUTE, {
								method: "POST",
								credentials: "same-origin",
								signal: controller.signal,
								headers: { "content-type": "application/json" },
								body: JSON.stringify({
									mode,
									provider: target.profile.provider,
									...target.profile.channel === void 0 ? {} : { channel: target.profile.channel },
									model: studioModelForMode(target.profile, mode),
									prompt: prompt.trim(),
									ratio: target.ratio,
									quality: target.quality,
									...target.resolution === void 0 ? {} : { resolution: target.resolution },
									...target.generationQuality === void 0 ? {} : { generationQuality: target.generationQuality },
									...studioWatermarkCapability(target.profile, mode).status === "supported" ? { watermark } : {},
									...workspace?.path ? { workspaceRoot: workspace.path } : {},
									...referencesPayload === void 0 ? {} : { references: referencesPayload }
								})
							});
							const payload = await readStudioBody(response);
							if (!response.ok || !("attachment" in payload)) throw new Error("error" in payload && payload.error ? payload.error : `${target.profile.label}: ${t("generationFailed")}`);
							return {
								payload,
								target
							};
						}));
						if (controller.signal.aborted) return;
						const successes = settled.filter((result) => result.status === "fulfilled");
						const failed = settled.length - successes.length;
						if (successes.length === 0) {
							const firstFailure = settled.find((result) => result.status === "rejected");
							throw firstFailure?.status === "rejected" ? firstFailure.reason : new Error(t("generationFailed"));
						}
						const galleryEntries = successes.map(({ value }, idx) => ({
							id: value.payload.attachment.attachmentId ? imageVersionKey(String(value.payload.attachment.attachmentId), value.payload.original) : `${value.payload.createdAt}-${idx}`,
							attachment: value.payload.attachment,
							prompt: value.payload.prompt,
							provider: value.payload.provider,
							...value.payload.channel === void 0 ? {} : { channel: value.payload.channel },
							model: value.payload.model,
							createdAt: value.payload.createdAt + idx,
							aspectRatio: value.target.ratio,
							imageSize: value.target.quality,
							resolution: value.target.resolution,
							generationQuality: value.target.generationQuality,
							watermark: studioWatermarkCapability(value.target.profile, mode).status === "supported" ? watermark : void 0,
							output: value.payload.output,
							...value.payload.savedTo ? { savedTo: value.payload.savedTo } : {},
							...value.payload.original === void 0 ? {} : { original: value.payload.original },
							...workspace?.path ? { workspacePath: workspace.path } : {},
							...workspace?.workspaceId ? { workspaceId: workspace.workspaceId } : {}
						}));
						outcome = {
							view: {
								currentBatch: galleryEntries.length > 1 ? galleryEntries : null,
								selectedBatchIds: galleryEntries.length > 1 ? [galleryEntries[0].id] : [],
								batchKind: galleryEntries.length > 1 ? "multi-model" : null,
								selected: galleryEntries[0]
							},
							notice: failed > 0 ? t("comparePartial", {
								success: String(successes.length),
								failed: String(failed)
							}) : galleryEntries.some(hasSubscriptionRatioMismatch) ? t("subscriptionRatioMismatch") : void 0
						};
						if (startedOnInfinite) pushTlLandings(galleryEntries.map((entry) => ({
							galleryId: entry.id,
							attachment: entry.attachment,
							prompt: entry.prompt,
							provider: entry.provider,
							model: entry.model
						})));
						return;
					}
					const response = await fetch(STUDIO_ROUTE, {
						method: "POST",
						credentials: "same-origin",
						signal: controller.signal,
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							mode,
							provider,
							model: requestModel,
							prompt: prompt.trim(),
							ratio,
							quality: selectedQuality,
							...activeProfile.channel === void 0 ? {} : { channel: activeProfile.channel },
							...selectedResolution === void 0 ? {} : { resolution: selectedResolution },
							...provider === "openai-compat" ? { generationQuality: selectedGenerationQuality } : {},
							...watermarkCapability.status === "supported" ? { watermark } : {},
							...count > 1 ? { count } : {},
							...workspace?.path ? { workspaceRoot: workspace.path } : {},
							...referencesPayload === void 0 ? {} : { references: referencesPayload }
						})
					});
					const payload = await readStudioBody(response);
					if (!response.ok || !("attachment" in payload)) throw new Error("error" in payload && payload.error ? payload.error : t("generationFailed"));
					const generatedList = Array.isArray(payload.items) && payload.items.length > 0 ? payload.items : [{
						attachment: payload.attachment,
						output: payload.output,
						...payload.savedTo ? { savedTo: payload.savedTo } : {},
						...payload.original === void 0 ? {} : { original: payload.original }
					}];
					const galleryEntries = generatedList.map((gen, idx) => ({
						id: gen.attachment.attachmentId ? imageVersionKey(String(gen.attachment.attachmentId), gen.original) : `${payload.createdAt}-${idx}`,
						attachment: gen.attachment,
						prompt: payload.prompt,
						provider: payload.provider,
						...payload.channel === void 0 ? {} : { channel: payload.channel },
						model: payload.model,
						createdAt: payload.createdAt + idx,
						aspectRatio: ratio,
						imageSize: selectedQuality,
						resolution: selectedResolution,
						generationQuality: provider === "openai-compat" ? selectedGenerationQuality : void 0,
						watermark: watermarkCapability.status === "supported" ? watermark : void 0,
						output: gen.output,
						...gen.savedTo ? { savedTo: gen.savedTo } : {},
						...gen.original === void 0 ? {} : { original: gen.original },
						...workspace?.path ? { workspacePath: workspace.path } : {},
						...workspace?.workspaceId ? { workspaceId: workspace.workspaceId } : {}
					}));
					const view = galleryEntries.length > 1 ? {
						currentBatch: galleryEntries,
						selectedBatchIds: [galleryEntries[0].id],
						batchKind: "multi-image",
						selected: galleryEntries[0]
					} : galleryEntries.length === 1 ? {
						currentBatch: null,
						selectedBatchIds: [],
						batchKind: null,
						selected: galleryEntries[0]
					} : void 0;
					if (startedOnInfinite) pushTlLandings(galleryEntries.map((entry) => ({
						galleryId: entry.id,
						attachment: entry.attachment,
						prompt: entry.prompt,
						provider: entry.provider,
						model: entry.model
					})));
					outcome = {
						view,
						notice: payload.failedCount && payload.failedCount > 0 ? t("partialSuccess", {
							success: String(generatedList.length),
							failed: String(payload.failedCount)
						}) : galleryEntries.some(hasSubscriptionRatioMismatch) ? t("subscriptionRatioMismatch") : void 0
					};
				} catch (submitError) {
					if (controller.signal.aborted) return;
					outcome = { error: messageOf(submitError) };
				} finally {
					session.settle(controller, outcome);
				}
			};
			(0, react.useEffect)(() => {
				const outcome = sessionState.outcome;
				if (outcome === void 0 || session.delivered(outcome.seq)) return;
				session.markDelivered(outcome.seq);
				if (outcome.view !== void 0) {
					setCurrentBatch(outcome.view.currentBatch);
					setSelectedBatchIds(outcome.view.selectedBatchIds);
					setBatchKind(outcome.view.batchKind);
					setSelected(outcome.view.selected);
					resetFit();
				}
				if (outcome.error !== void 0) setError(outcome.error);
				if (outcome.notice !== void 0) flash(outcome.notice);
			}, [session, sessionState.outcome]);
			const isSelectedInGallery = (0, react.useMemo)(() => {
				if (selected === null) return false;
				return items.some((item) => item.id === selected.id);
			}, [items, selected]);
			const selectedBatchItems = (0, react.useMemo)(() => {
				if (currentBatch === null) return [];
				const ids = new Set(selectedBatchIds);
				return currentBatch.filter((item) => ids.has(item.id));
			}, [currentBatch, selectedBatchIds]);
			const pendingGalleryItems = (0, react.useMemo)(() => {
				const galleryIds = new Set(items.map((item) => item.id));
				return (currentBatch === null ? selected === null ? [] : [selected] : selectedBatchItems).filter((item) => !galleryIds.has(item.id));
			}, [
				currentBatch,
				items,
				selected,
				selectedBatchItems
			]);
			const saveButtonLabel = currentBatch !== null ? pendingGalleryItems.length > 0 ? t("saveSelected", { count: String(pendingGalleryItems.length) }) : selectedBatchItems.length === 0 ? t("saveSelected", { count: "0" }) : t("inGallery") : pendingGalleryItems.length > 0 ? t("saveToGallery") : selected !== null ? t("inGallery") : t("saveToGallery");
			const saveSelectionComplete = currentBatch === null ? pendingGalleryItems.length === 0 : selectedBatchItems.length > 0 && pendingGalleryItems.length === 0;
			const saveGalleryEntry = async (item) => {
				let savedTo = item.savedTo;
				const targetRoot = workspace?.path || config?.workspaceRoot;
				if (!savedTo) try {
					const res = await fetch(SAVE_WORKSPACE_ROUTE, {
						method: "POST",
						credentials: "same-origin",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							attachment: item.attachment,
							...targetRoot ? { workspaceRoot: targetRoot } : {}
						})
					});
					if (res.ok) {
						const data = await res.json();
						if (data.savedTo) savedTo = data.savedTo;
					}
				} catch (saveError) {
					console.warn("Failed to save to workspace:", saveError);
				}
				const updatedItem = {
					...item,
					...savedTo ? { savedTo } : {},
					...targetRoot ? { workspacePath: targetRoot } : {},
					...workspace?.workspaceId ? { workspaceId: workspace.workspaceId } : {}
				};
				if (!await persistGalleryRecord(updatedItem)) throw new Error(t("gallerySaveFailed"));
				return updatedItem;
			};
			const handleSaveToGallery = async () => {
				if (selected === null) return;
				if (currentBatch !== null && selectedBatchItems.length === 0) return setError(t("needSelectResult"));
				if (pendingGalleryItems.length === 0) return;
				const activeId = selected.id;
				const settled = await Promise.allSettled(pendingGalleryItems.map(saveGalleryEntry));
				const saved = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
				if (saved.length === 0) {
					const failed = settled.find((result) => result.status === "rejected");
					setError(failed?.status === "rejected" ? messageOf(failed.reason) : t("generationFailed"));
					return;
				}
				const savedById = new Map(saved.map((item) => [item.id, item]));
				setCurrentBatch((current) => current?.map((item) => savedById.get(item.id) ?? item) ?? null);
				setSelected(savedById.get(activeId) ?? saved[0]);
				setError(null);
				pushTlLandings(saved.map((item) => ({
					galleryId: item.id,
					attachment: item.attachment,
					prompt: item.prompt,
					provider: item.provider,
					model: item.model
				})));
				flash(saved.length > 1 ? t("savedSelected", { count: String(saved.length) }) : t("savedToGallery"));
			};
			const handleConfirmDelete = async () => {
				if (selected === null) return;
				const idToDelete = selected.id;
				const attachmentId = selected.attachment.attachmentId;
				const savedPath = selected.savedTo;
				setShowDeleteModal(false);
				try {
					if (deleteWorkspaceFiles && typeof savedPath === "string" && savedPath.trim().length > 0) {
						const res = await fetch(DELETE_ROUTE, {
							method: "POST",
							credentials: "same-origin",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ paths: [savedPath] })
						});
						if (!res.ok) throw new Error(`删除请求网络异常 (${res.status})`);
						const data = await res.json().catch(() => null);
						if (!data || data.ok === false || Array.isArray(data.failedFiles) && data.failedFiles.length > 0) {
							const reason = data?.failedFiles?.[0]?.error || "工作区文件删除失败";
							throw new Error(reason);
						}
					}
					if (isSelectedInGallery) await deleteGalleryItem(idToDelete);
					evictAttachmentCache(attachmentId);
					setSelectedBatchIds((current) => current.filter((id) => id !== idToDelete));
					if (currentBatch) {
						const remaining = currentBatch.filter((i) => i.id !== idToDelete);
						if (remaining.length > 1) {
							setCurrentBatch(remaining);
							setSelected(remaining[0]);
						} else if (remaining.length === 1) {
							setCurrentBatch(null);
							setSelected(remaining[0]);
						} else {
							setCurrentBatch(null);
							setSelected(null);
						}
					} else setSelected(null);
					flash(t("deletedToast"));
				} catch (delError) {
					setError(messageOf(delError));
				}
			};
			const copySelected = async () => {
				if (image.blob === null) return;
				const ok = await copyImageBlob(image.blob);
				flash(ok ? t("copiedImage") : t("copyFailed"));
			};
			const downloadSelected = () => {
				if (image.url === null || selected === null) return;
				downloadBlobUrl(image.url, `dsh-${selected.provider}-${selected.id.slice(-8)}.${extension(selected.attachment.mediaType)}`);
			};
			const toggleFavorite = async () => {
				if (selected === null) return;
				const targetId = selected.id;
				if (isSelectedInGallery) {
					const nextFav = await toggleFavoriteGalleryItem(targetId);
					setSelected((curr) => curr !== null && curr.id === targetId ? {
						...curr,
						isFavorite: nextFav
					} : curr);
					if (currentBatch) setCurrentBatch((prev) => prev ? prev.map((i) => i.id === targetId ? {
						...i,
						isFavorite: nextFav
					} : i) : null);
					flash(nextFav ? t("favoriteAdded") : t("favoriteRemoved"));
				} else {
					if (!!selected.isFavorite) {
						setSelected((curr) => curr !== null && curr.id === targetId ? {
							...curr,
							isFavorite: false
						} : curr);
						if (currentBatch) setCurrentBatch((prev) => prev ? prev.map((i) => i.id === targetId ? {
							...i,
							isFavorite: false
						} : i) : null);
						flash(t("favoriteRemoved"));
						return;
					}
					try {
						const updated = await saveGalleryEntry({
							...selected,
							isFavorite: true
						});
						setSelected((curr) => curr !== null && curr.id === targetId ? updated : curr);
						if (currentBatch) setCurrentBatch((prev) => prev ? prev.map((i) => i.id === targetId ? updated : i) : prev);
						flash(t("favoriteAdded"));
					} catch (err) {
						setError(err instanceof Error ? err.message : t("gallerySaveFailed"));
					}
				}
			};
			const stepLightbox = (delta) => {
				if (!currentBatch || currentBatch.length <= 1 || selected === null) return;
				const currIdx = currentBatch.findIndex((i) => i.id === selected.id);
				if (currIdx === -1) return;
				const nextIdx = (currIdx + delta + currentBatch.length) % currentBatch.length;
				setSelected(currentBatch[nextIdx]);
			};
			(0, react.useEffect)(() => {
				if (!lightboxOpen || !currentBatch || currentBatch.length <= 1) return;
				const onKeyDown = (e) => {
					if (e.key === "ArrowLeft") stepLightbox(-1);
					else if (e.key === "ArrowRight") stepLightbox(1);
				};
				window.addEventListener("keydown", onKeyDown);
				return () => window.removeEventListener("keydown", onKeyDown);
			}, [
				lightboxOpen,
				currentBatch,
				selected
			]);
			const flash = (message) => {
				setNotice(message);
				window.setTimeout(() => setNotice(null), 2200);
			};
			(0, react.useLayoutEffect)(() => {
				railActionsRef.current = {
					select: selectItem,
					favorite: (item) => {
						applyFavoriteImage(item);
					},
					toast: flash
				};
			});
			return (0, react_jsx_runtime.jsxs)("section", {
				ref: workbenchRootRef,
				className: "dsh-ig-workbench",
				"aria-label": t("title"),
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: `dsh-ig-workbench-grid ${sidebarCollapsed ? "is-sidebar-collapsed" : ""} ${generateCollapsed ? "is-generate-collapsed" : ""}`,
						children: [
							!sidebarCollapsed && (0, react_jsx_runtime.jsxs)("aside", {
								className: "dsh-ig-recent-panel",
								children: [
									(0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-ig-panel-title",
										children: [(0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												alignItems: "center",
												gap: "8px"
											},
											children: [(0, react_jsx_runtime.jsx)("span", { children: railTab === "recent" ? t("recent") : t("railTabFavorites") }), (0, react_jsx_runtime.jsx)("span", {
												className: "dsh-ig-count-badge",
												children: railTab === "recent" ? items.length : items.filter((item) => item.isFavorite).length + favPrompts.length
											})]
										}), (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dsh-ig-collapse-btn",
											onClick: () => {
												railToggledByUserRef.current = true;
												setSidebarCollapsed(true);
											},
											title: t("collapseSidebar"),
											children: (0, react_jsx_runtime.jsx)(PanelLeftClose, { size: 15 })
										})]
									}),
									(0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-ig-rail-tabs",
										role: "tablist",
										children: [(0, react_jsx_runtime.jsx)("button", {
											type: "button",
											role: "tab",
											"aria-selected": railTab === "recent",
											className: `dsh-ig-rail-tab ${railTab === "recent" ? "is-active" : ""}`,
											onClick: () => setRailTab("recent"),
											children: t("railTabRecent")
										}), (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											role: "tab",
											"aria-selected": railTab === "favorites",
											className: `dsh-ig-rail-tab ${railTab === "favorites" ? "is-active" : ""}`,
											onClick: () => setRailTab("favorites"),
											children: t("railTabFavorites")
										})]
									}),
									railTab === "recent" ? (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-ig-recent-scroll",
										children: [items.length === 0 ? (0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-recent-empty",
											children: [(0, react_jsx_runtime.jsx)(ImagePlus, { size: 22 }), (0, react_jsx_runtime.jsx)("span", { children: t("empty") })]
										}) : displayItems.map((item) => (0, react_jsx_runtime.jsx)(RecentItem, {
											item,
											active: selected?.id === item.id,
											mode: "select",
											lang,
											actions: railActions
										}, item.id)), items.length > visibleLimit && (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dsh-ig-load-more",
											onClick: () => setVisibleLimit((l) => l + 30),
											children: t("loadMore", { n: String(items.length - visibleLimit) })
										})]
									}) : (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-ig-fav-scroll",
										children: [
											(0, react_jsx_runtime.jsx)("div", {
												className: "dsh-ig-fav-section-label",
												children: (0, react_jsx_runtime.jsx)("span", { children: t("favImages") })
											}),
											(() => {
												const list = items.filter((item) => item.isFavorite);
												if (list.length === 0) return (0, react_jsx_runtime.jsxs)("div", {
													className: "dsh-ig-fav-empty",
													children: [(0, react_jsx_runtime.jsx)(ImagePlus, { size: 18 }), (0, react_jsx_runtime.jsx)("span", { children: t("favEmptyImages") })]
												});
												return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("div", {
													className: "dsh-ig-fav-grid",
													children: list.slice(0, favoriteLimit).map((item) => (0, react_jsx_runtime.jsx)(RecentItem, {
														item,
														active: false,
														mode: "favorite",
														lang,
														actions: railActions
													}, item.id))
												}), list.length > favoriteLimit && (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: "dsh-ig-load-more",
													onClick: () => setFavoriteLimit((limit) => limit + 60),
													children: t("loadMore", { n: String(list.length - favoriteLimit) })
												})] });
											})(),
											(0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-ig-fav-section-label",
												children: [(0, react_jsx_runtime.jsx)("span", { children: t("favPrompts") }), (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: "dsh-ig-fav-folder-add",
													onClick: () => {
														setFolderDraft({ kind: "prompt" });
														setFolderDraftName("");
													},
													title: t("favNewFolder"),
													children: "＋"
												})]
											}),
											(0, react_jsx_runtime.jsx)(FavoriteFolderBar, {
												folders: favFolders.filter((folder) => folder.kind === "prompt"),
												active: activePromptFolder,
												onSelect: (id) => setActivePromptFolder(id === activePromptFolder ? "" : id),
												onDelete: (id) => void deleteFavoriteFolder(id),
												deleteLabel: t("favDeleteFolder")
											}),
											folderDraft?.kind === "prompt" && (0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-ig-fav-folder-draft",
												children: [
													(0, react_jsx_runtime.jsx)("input", {
														value: folderDraftName,
														placeholder: t("favFolderPlaceholder"),
														onChange: (e) => setFolderDraftName(e.target.value),
														onKeyDown: (e) => {
															if (e.key === "Enter") createFavFolder();
														}
													}),
													(0, react_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => void createFavFolder(),
														children: t("favCreate")
													}),
													(0, react_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => setFolderDraft(null),
														children: t("favCancel")
													})
												]
											}),
											(() => {
												const list = favPrompts.filter((fav) => activePromptFolder === "" || fav.folderId === activePromptFolder);
												if (list.length === 0) return (0, react_jsx_runtime.jsxs)("div", {
													className: "dsh-ig-fav-empty",
													children: [(0, react_jsx_runtime.jsx)(PencilLine, { size: 18 }), (0, react_jsx_runtime.jsx)("span", { children: t("favEmptyPrompts") })]
												});
												return (0, react_jsx_runtime.jsx)("div", {
													className: "dsh-ig-fav-prompts",
													children: list.map((fav) => (0, react_jsx_runtime.jsxs)("div", {
														className: "dsh-ig-fav-prompt",
														children: [(0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: "dsh-ig-fav-prompt-text",
															title: fav.text,
															onClick: () => openPromptEditor(fav),
															children: fav.text
														}), (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: "dsh-ig-fav-del",
															title: t("remove"),
															onClick: () => void deleteFavoritePrompt(fav.id),
															children: (0, react_jsx_runtime.jsx)(X, { size: 11 })
														})]
													}, fav.id))
												});
											})()
										]
									})
								]
							}),
							(editingPrompt !== null || movingFav !== null) && (0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ig-fav-dialog-wrap",
								onClick: () => {
									setEditingPrompt(null);
									setMovingFav(null);
								},
								children: (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-fav-dialog",
									onClick: (e) => e.stopPropagation(),
									children: [editingPrompt !== null && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										(0, react_jsx_runtime.jsx)("div", {
											className: "dsh-ig-fav-dialog-title",
											children: t("favEditPrompt")
										}),
										(0, react_jsx_runtime.jsx)("textarea", {
											className: "dsh-ig-fav-dialog-textarea",
											value: editPromptText,
											placeholder: t("favEditPromptPlaceholder"),
											onChange: (e) => setEditPromptText(e.target.value),
											rows: 5
										}),
										(0, react_jsx_runtime.jsxs)("label", {
											className: "dsh-ig-fav-dialog-folder-label",
											children: [t("favFolder"), (0, react_jsx_runtime.jsxs)("select", {
												value: editPromptFolder,
												onChange: (e) => setEditPromptFolder(e.target.value),
												children: [(0, react_jsx_runtime.jsx)("option", {
													value: "",
													children: t("favNoFolder")
												}), favFolders.filter((folder) => folder.kind === "prompt").map((folder) => (0, react_jsx_runtime.jsx)("option", {
													value: folder.id,
													children: folder.name
												}, folder.id))]
											})]
										}),
										(0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-fav-dialog-actions",
											children: [
												(0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: "is-primary",
													onClick: () => {
														updateFavoritePrompt(editingPrompt.id, editPromptText).then((ok) => {
															if (ok) moveFavoritePrompt(editingPrompt.id, editPromptFolder === "" ? void 0 : editPromptFolder);
														});
														setEditingPrompt(null);
													},
													children: t("favSave")
												}),
												(0, react_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => {
														applyFavoritePrompt({
															...editingPrompt,
															text: editPromptText
														});
														setEditingPrompt(null);
													},
													children: t("favUse")
												}),
												(0, react_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => {
														setMovingFav({
															kind: "prompt",
															id: editingPrompt.id,
															folderId: editingPrompt.folderId
														});
														setEditingPrompt(null);
													},
													children: t("favMove")
												}),
												(0, react_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => setEditingPrompt(null),
													children: t("favCancel")
												})
											]
										})
									] }), editingPrompt === null && movingFav !== null && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										(0, react_jsx_runtime.jsx)("div", {
											className: "dsh-ig-fav-dialog-title",
											children: t("favMoveTo")
										}),
										(0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-fav-dialog-folders",
											children: [(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => {
													doMoveFavorite(void 0);
													setMovingFav(null);
												},
												children: t("favNoFolder")
											}), favFolders.filter((folder) => folder.kind === movingFav.kind).map((folder) => (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: movingFav.folderId === folder.id ? "is-current" : "",
												onClick: () => {
													doMoveFavorite(folder.id);
													setMovingFav(null);
												},
												children: folder.name
											}, folder.id))]
										}),
										(0, react_jsx_runtime.jsx)("div", {
											className: "dsh-ig-fav-dialog-actions",
											children: (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setMovingFav(null),
												children: t("favCancel")
											})
										})
									] })]
								})
							}),
							(0, react_jsx_runtime.jsxs)("main", {
								className: "dsh-ig-canvas-column",
								children: [
									(0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-ig-canvas-toolbar",
										children: [
											(0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-ig-canvas-toolbar-left",
												children: [sidebarCollapsed && (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => {
														railToggledByUserRef.current = true;
														setSidebarCollapsed(false);
													},
													title: t("expandSidebar"),
													children: [(0, react_jsx_runtime.jsx)(PanelLeft, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: t("recent") })]
												}), (0, react_jsx_runtime.jsxs)("div", {
													className: "dsh-ig-status-badge-wrap",
													children: [(0, react_jsx_runtime.jsxs)("div", {
														className: "dsh-ig-status-badge",
														children: [
															(0, react_jsx_runtime.jsx)("span", { className: `dsh-ig-status-dot ${configuredCount > 0 ? "is-ready" : "is-muted"}` }),
															(0, react_jsx_runtime.jsx)("span", {
																className: "dsh-ig-status-text",
																children: configuredCount > 0 ? subscriptionSignedInCount > 0 ? t("configuredSplit", {
																	api: String(apiConfiguredCount),
																	sub: String(subscriptionSignedInCount)
																}) : t("configuredCount", { count: String(apiConfiguredCount) }) : t("unconfiguredStatus")
															}),
															(0, react_jsx_runtime.jsx)(ChevronDown, {
																size: 11,
																className: "dsh-ig-status-arrow"
															})
														]
													}), config !== null && (0, react_jsx_runtime.jsxs)("div", {
														className: "dsh-ig-status-popover",
														children: [(0, react_jsx_runtime.jsx)("div", {
															className: "dsh-ig-status-popover-title",
															children: t("providerStatus")
														}), (0, react_jsx_runtime.jsx)("ul", {
															className: "dsh-ig-status-list",
															children: config.providers.map((p) => (0, react_jsx_runtime.jsxs)("li", {
																className: p.configured ? "is-configured" : "is-missing",
																children: [(0, react_jsx_runtime.jsxs)("div", {
																	className: "dsh-ig-status-item-name",
																	children: [(0, react_jsx_runtime.jsx)("strong", { children: p.label }), (0, react_jsx_runtime.jsx)("small", { children: studioModelForMode(p, mode) })]
																}), (0, react_jsx_runtime.jsx)("span", {
																	className: "dsh-ig-status-item-tag",
																	children: isSubscriptionProvider(p.provider) ? p.configured ? t("subSignedIn") : t("subSignedOut") : p.configured ? t("configured") : t("unconfigured")
																})]
															}, p.provider))
														})]
													})]
												})]
											}),
											(0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-ig-canvas-toolbar-center",
												children: [(0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: canvasSurface === "infinite" ? "is-active" : "",
													onClick: () => {
														if (canvasSurface === "infinite") {
															setGenerateCollapsed(generatePanelBeforeInfiniteRef.current);
															setCanvasSurface("preview");
															return;
														}
														generatePanelBeforeInfiniteRef.current = generateCollapsed;
														setGenerateCollapsed(true);
														setCanvasSurface("infinite");
													},
													title: t("infiniteCanvas"),
													children: [(0, react_jsx_runtime.jsx)(Frame, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: t("infiniteCanvas") })]
												}), canvasSurface === "preview" && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
													(0, react_jsx_runtime.jsx)("span", { className: "dsh-ig-toolbar-divider" }),
													(0, react_jsx_runtime.jsxs)("button", {
														type: "button",
														className: fit ? "is-active" : "",
														onClick: resetFit,
														children: [
															t("fit"),
															" ",
															(0, react_jsx_runtime.jsx)(ChevronDown, { size: 13 })
														]
													}),
													(0, react_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => {
															setFit(false);
															setZoom((value) => Math.max(25, value - 25));
														},
														title: "Zoom out",
														children: (0, react_jsx_runtime.jsx)(ZoomOut, { size: 16 })
													}),
													(0, react_jsx_runtime.jsx)("span", {
														className: "dsh-ig-zoom-display",
														children: fit ? "AUTO" : `${Math.round(zoom)}%`
													}),
													(0, react_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => {
															setFit(false);
															setZoom((value) => Math.min(500, value + 25));
														},
														title: "Zoom in",
														children: (0, react_jsx_runtime.jsx)(ZoomIn, { size: 16 })
													})
												] })]
											}),
											(0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-ig-canvas-toolbar-right",
												children: [
													canvasSurface === "infinite" && (0, react_jsx_runtime.jsxs)("button", {
														type: "button",
														onClick: () => setShowClearCanvasModal(true),
														title: t("clearCanvas"),
														children: [(0, react_jsx_runtime.jsx)(Trash2, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: t("clearCanvas") })]
													}),
													canvasSurface === "preview" && selected !== null && (0, react_jsx_runtime.jsxs)("button", {
														type: "button",
														onClick: startNew,
														title: t("newGeneration"),
														children: [(0, react_jsx_runtime.jsx)(Plus, { size: 13 }), (0, react_jsx_runtime.jsx)("span", { children: t("newGeneration") })]
													}),
													canvasSurface === "preview" && (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => setLightboxOpen(true),
														title: t("fullscreen"),
														disabled: selected === null,
														children: (0, react_jsx_runtime.jsx)(Expand, { size: 16 })
													}),
													generateCollapsed && (0, react_jsx_runtime.jsxs)("button", {
														type: "button",
														onClick: () => {
															setGenerateCollapsed(false);
														},
														title: t("expandGenerate"),
														children: [(0, react_jsx_runtime.jsx)(PanelRight, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: t("generatePanel") })]
													})
												]
											})
										]
									}),
									canvasSurface === "infinite" && showInfiniteCanvasHint && !canvasHintDismissed && (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-ig-canvas-hint",
										children: [
											(0, react_jsx_runtime.jsx)(Info, { size: 14 }),
											(0, react_jsx_runtime.jsx)("span", { children: t("infiniteCanvasHint") }),
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: dismissCanvasHint,
												title: t("close"),
												"aria-label": t("close"),
												children: (0, react_jsx_runtime.jsx)(X, { size: 13 })
											})
										]
									}),
									canvasSurface === "infinite" ? (0, react_jsx_runtime.jsx)(StudioTlCanvas, { lang }) : (0, react_jsx_runtime.jsx)("div", {
										className: `dsh-ig-canvas ${isDragging ? "is-dragging" : ""}`,
										ref: canvasRef,
										onMouseDown: handleCanvasMouseDown,
										onDoubleClick: resetFit,
										children: isGenerating ? (0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-generating-state",
											children: [
												(0, react_jsx_runtime.jsx)("div", {
													className: "dsh-ig-generation-orbit",
													children: (0, react_jsx_runtime.jsx)(Sparkles, { size: 28 })
												}),
												(0, react_jsx_runtime.jsx)("strong", { children: comparisonEnabled ? t("comparing", { count: String(comparisonTargets.length) }) : count > 1 ? t("generatingCount", { count: String(count) }) : t("generating") }),
												(0, react_jsx_runtime.jsx)("span", { children: comparisonEnabled ? comparisonTargets.map((target) => target.profile.label).join(" · ") : `${activeProfile?.label ?? ""} · ${requestModel}` })
											]
										}) : currentBatch && currentBatch.length > 1 ? (0, react_jsx_runtime.jsx)("div", {
											className: "dsh-ig-canvas-cluster",
											"data-count": currentBatch.length,
											style: {
												transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom / 100})`,
												transformOrigin: "center center",
												transition: isDragging ? "none" : "transform 0.08s ease-out"
											},
											children: currentBatch.map((batchItem, index) => (0, react_jsx_runtime.jsx)(BatchCanvasItem, {
												item: batchItem,
												index,
												badge: batchKind === "multi-model" ? batchItem.model : void 0,
												isActive: selected?.id === batchItem.id,
												isChecked: selectedBatchIds.includes(batchItem.id),
												onSelect: () => {
													if (!hasDraggedRef.current) {
														setSelected(batchItem);
														setSelectedBatchIds((current) => current.includes(batchItem.id) ? current.filter((id) => id !== batchItem.id) : [...current, batchItem.id]);
													}
												}
											}, batchItem.id))
										}) : selected === null ? (0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-canvas-empty",
											children: [(0, react_jsx_runtime.jsx)(ImagePlus, { size: 36 }), (0, react_jsx_runtime.jsx)("span", { children: t("selectHistory") })]
										}) : image.loading ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("img", {
											className: "dsh-ig-canvas-thumb",
											src: thumbUrlFor(selected.attachment),
											alt: selected.prompt,
											draggable: false,
											style: {
												...selected.attachment.width && selected.attachment.height ? {
													width: String(selected.attachment.width) + "px",
													height: String(selected.attachment.height) + "px"
												} : {},
												transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom / 100})`,
												transformOrigin: "center center",
												transition: isDragging ? "none" : "transform 0.08s ease-out"
											}
										}), (0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-canvas-loading-pill",
											children: [(0, react_jsx_runtime.jsx)(LoaderCircle, {
												className: "dsh-ig-spin",
												size: 16
											}), (0, react_jsx_runtime.jsx)("span", { children: t("loading") })]
										})] }) : image.url !== null ? (0, react_jsx_runtime.jsx)("img", {
											src: image.url,
											alt: selected.prompt,
											draggable: false,
											onClick: handleImageClick,
											style: {
												transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom / 100})`,
												transformOrigin: "center center",
												transition: isDragging ? "none" : "transform 0.08s ease-out"
											}
										}) : (0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-canvas-empty",
											children: [(0, react_jsx_runtime.jsx)(ImagePlus, { size: 32 }), (0, react_jsx_runtime.jsx)("span", { children: t("imageLoadFailed") })]
										})
									}),
									selected !== null && canvasSurface === "preview" && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										(0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-result-strip",
											children: [(0, react_jsx_runtime.jsx)("span", { children: t("result") }), (0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => void continueEdit(),
												children: [(0, react_jsx_runtime.jsx)(PencilLine, { size: 15 }), t("continueEdit")]
											}), (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => prepareRegeneration(selected),
												children: [(0, react_jsx_runtime.jsx)(RefreshCw, { size: 15 }), t("regenerate")]
											})] })]
										}),
										(0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-result-actions",
											children: [(0, react_jsx_runtime.jsx)("p", { children: selected.prompt }), (0, react_jsx_runtime.jsxs)("div", { children: [
												(0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: `dsh-ig-save-gallery-btn ${saveSelectionComplete ? "is-saved" : ""}`,
													onClick: () => void handleSaveToGallery(),
													title: saveButtonLabel,
													disabled: saveSelectionComplete,
													children: [saveSelectionComplete ? (0, react_jsx_runtime.jsx)(Check, { size: 15 }) : (0, react_jsx_runtime.jsx)(BookmarkPlus, { size: 15 }), (0, react_jsx_runtime.jsx)("span", { children: saveButtonLabel })]
												}),
												(0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => void toggleFavorite(),
													title: selected.isFavorite ? t("favorited") : t("favorite"),
													children: [(0, react_jsx_runtime.jsx)(Heart, {
														size: 15,
														fill: selected.isFavorite ? "#ef4444" : "none",
														color: selected.isFavorite ? "#ef4444" : "currentColor"
													}), (0, react_jsx_runtime.jsx)("span", { children: selected.isFavorite ? t("favorited") : t("favorite") })]
												}),
												(0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => void copySelected(),
													children: [(0, react_jsx_runtime.jsx)(Clipboard, { size: 15 }), (0, react_jsx_runtime.jsx)("span", { children: t("copy") })]
												}),
												(0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: downloadSelected,
													children: [(0, react_jsx_runtime.jsx)(Download, { size: 15 }), (0, react_jsx_runtime.jsx)("span", { children: t("download") })]
												}),
												(0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => setShowDeleteModal(true),
													children: [(0, react_jsx_runtime.jsx)(Trash2, { size: 15 }), (0, react_jsx_runtime.jsx)("span", { children: t("remove") })]
												})
											] })]
										}),
										(0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-result-meta",
											children: [
												(0, react_jsx_runtime.jsx)("span", { children: formatRelativeTime$1(selected.createdAt, lang) }),
												(0, react_jsx_runtime.jsx)("span", { children: selected.provider }),
												(0, react_jsx_runtime.jsx)("span", { children: selected.model }),
												(0, react_jsx_runtime.jsx)("span", { children: selected.provider === "chatgpt-sub" ? selected.output : selected.attachment.width && selected.attachment.height ? `${selected.attachment.width} × ${selected.attachment.height}` : "—" }),
												hasSubscriptionRatioMismatch(selected) && (0, react_jsx_runtime.jsx)("span", { children: t("subscriptionRatioMismatch") })
											]
										})
									] })
								]
							}),
							!generateCollapsed && (0, react_jsx_runtime.jsxs)("aside", {
								className: "dsh-ig-generate-panel",
								children: [(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-panel-title",
									children: [(0, react_jsx_runtime.jsx)("span", { children: t("generatePanel") }), (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-collapse-btn",
										onClick: () => {
											setGenerateCollapsed(true);
										},
										title: t("collapseGenerate"),
										children: (0, react_jsx_runtime.jsx)(PanelRightClose, { size: 15 })
									})]
								}), (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-generator-form",
									children: [
										(0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-mode-switch",
											children: [(0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: mode === "generate" ? "is-active" : "",
												onClick: () => setMode("generate"),
												children: [(0, react_jsx_runtime.jsx)(Sparkles, { size: 15 }), t("generate")]
											}), (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: mode === "edit" ? "is-active" : "",
												onClick: () => setMode("edit"),
												children: [(0, react_jsx_runtime.jsx)(ImagePlus, { size: 15 }), t("edit")]
											})]
										}),
										mode === "edit" && (0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-field",
											children: [
												(0, react_jsx_runtime.jsxs)("div", {
													className: "dsh-ig-field-label",
													children: [(0, react_jsx_runtime.jsxs)("label", { children: [
														t("referencesCount", {
															current: String(references.length),
															max: String(maxReferences)
														}),
														" ",
														(0, react_jsx_runtime.jsx)("b", { children: "*" })
													] }), references.length > 0 && (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: clearAllReferences,
														children: t("clear")
													})]
												}),
												references.length === 0 ? (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: `dsh-ig-upload ${dragging ? "is-dragging" : ""}`,
													onClick: () => fileInputRef.current?.click(),
													onDragOver: (event) => {
														event.preventDefault();
														setDragging(true);
													},
													onDragLeave: () => setDragging(false),
													onDrop: (event) => {
														event.preventDefault();
														setDragging(false);
														addReferenceFiles(event.dataTransfer.files);
													},
													children: [
														(0, react_jsx_runtime.jsx)(Upload, { size: 20 }),
														(0, react_jsx_runtime.jsx)("strong", { children: t("upload") }),
														(0, react_jsx_runtime.jsx)("small", { children: t("uploadHint") })
													]
												}) : (0, react_jsx_runtime.jsxs)("div", {
													className: "dsh-ig-reference-grid",
													children: [references.map((item, index) => (0, react_jsx_runtime.jsxs)("div", {
														className: "dsh-ig-reference-card",
														children: [(0, react_jsx_runtime.jsx)("img", {
															src: item.previewUrl,
															alt: `Ref ${index + 1}`
														}), (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															title: t("closeReference"),
															onClick: () => removeReference(item.id),
															children: (0, react_jsx_runtime.jsx)(X, { size: 12 })
														})]
													}, item.id)), references.length < maxReferences && (0, react_jsx_runtime.jsxs)("button", {
														type: "button",
														className: "dsh-ig-reference-add",
														onClick: () => fileInputRef.current?.click(),
														title: t("upload"),
														children: [(0, react_jsx_runtime.jsx)(Upload, { size: 16 }), (0, react_jsx_runtime.jsx)("span", { children: t("addMoreRef") })]
													})]
												}),
												(0, react_jsx_runtime.jsx)("input", {
													ref: fileInputRef,
													type: "file",
													multiple: true,
													accept: "image/png,image/jpeg,image/webp,image/gif",
													hidden: true,
													onChange: (event) => {
														addReferenceFiles(event.target.files);
														event.target.value = "";
													}
												})
											]
										}),
										(0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-field",
											children: [
												(0, react_jsx_runtime.jsxs)("div", {
													className: "dsh-ig-field-label",
													children: [(0, react_jsx_runtime.jsxs)("label", {
														htmlFor: "dsh-ig-prompt",
														children: [
															t("prompt"),
															" ",
															(0, react_jsx_runtime.jsx)("b", { children: "*" })
														]
													}), (0, react_jsx_runtime.jsxs)("span", { children: [
														(0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: "dsh-ig-find-inspiration",
															onClick: onOpenInspiration,
															children: [(0, react_jsx_runtime.jsx)(Sparkles, { size: 11 }), t("findInspiration")]
														}),
														(0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: "dsh-ig-fav-save-btn",
															onClick: () => void handleFavoritePrompt(),
															title: t("favoritePrompt"),
															children: [(0, react_jsx_runtime.jsx)(Star, { size: 12 }), t("favActionShort")]
														}),
														(0, react_jsx_runtime.jsx)("button", {
															type: "button",
															onClick: () => setPrompt(""),
															children: t("clear")
														})
													] })]
												}),
												(0, react_jsx_runtime.jsx)("textarea", {
													id: "dsh-ig-prompt",
													value: prompt,
													onChange: (event) => setPrompt(event.target.value),
													onKeyDown: (event) => {
														if (event.nativeEvent.isComposing) return;
														if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
															event.preventDefault();
															if (!isGenerating && config !== null && prompt.trim().length > 0) submit();
														}
													},
													placeholder: t("promptPlaceholder")
												}),
												(0, react_jsx_runtime.jsx)("small", { children: prompt.length })
											]
										}),
										config === null ? configLoading ? (0, react_jsx_runtime.jsx)("div", {
											className: "dsh-ig-form-loading",
											children: (0, react_jsx_runtime.jsx)(LoaderCircle, {
												className: "dsh-ig-spin",
												size: 18
											})
										}) : (0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-config-error",
											children: [(0, react_jsx_runtime.jsx)("p", { children: configError ?? t("configLoadFailed") }), (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => void loadConfig(),
												children: [(0, react_jsx_runtime.jsx)(RefreshCw, { size: 13 }), (0, react_jsx_runtime.jsx)("span", { children: t("retry") })]
											})]
										}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [comparisonProfiles.length >= 2 && (0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-generation-kind",
											role: "group",
											"aria-label": t("compareModels"),
											children: [(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: !comparisonEnabled ? "is-active" : "",
												onClick: () => toggleComparison(false),
												children: t("singleModel")
											}), (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: comparisonEnabled ? "is-active" : "",
												onClick: () => toggleComparison(true),
												children: [(0, react_jsx_runtime.jsx)(Copy, { size: 13 }), t("compareModels")]
											})]
										}), comparisonEnabled ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
											(0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-ig-compare-box",
												children: [
													(0, react_jsx_runtime.jsxs)("div", {
														className: "dsh-ig-compare-heading",
														children: [(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("strong", { children: t("compareSelect") }), (0, react_jsx_runtime.jsx)("small", { children: t("compareHint") })] }), (0, react_jsx_runtime.jsx)("span", { children: t("compareSelected", { count: String(comparisonTargets.length) }) })]
													}),
													(0, react_jsx_runtime.jsx)("div", {
														className: "dsh-ig-model-checks",
														children: comparisonProfiles.map((item) => {
															const targetKey = studioTargetKey(item.provider, item.channel);
															const target = comparisonTargets.find((candidate) => studioTargetKey(candidate.profile.provider, candidate.profile.channel) === targetKey);
															return (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: target ? "is-selected" : "",
																"aria-pressed": Boolean(target),
																onClick: () => toggleComparisonProvider(targetKey),
																children: [
																	(0, react_jsx_runtime.jsx)("span", {
																		className: "dsh-ig-model-checkmark",
																		children: target ? (0, react_jsx_runtime.jsx)(Check, { size: 12 }) : null
																	}),
																	(0, react_jsx_runtime.jsxs)("span", {
																		className: "dsh-ig-model-copy",
																		children: [(0, react_jsx_runtime.jsx)("strong", { children: item.label }), (0, react_jsx_runtime.jsx)("small", {
																			title: studioModelForMode(item, mode),
																			children: studioModelForMode(item, mode)
																		})]
																	}),
																	target && (0, react_jsx_runtime.jsxs)("span", {
																		className: "dsh-ig-model-settings",
																		children: [[
																			target.ratio,
																			target.resolution,
																			target.quality === target.resolution ? void 0 : target.quality,
																			target.generationQuality === "__default__" ? void 0 : target.generationQuality
																		].filter(Boolean).join(" · "), target.adjusted ? (0, react_jsx_runtime.jsx)("em", { children: t("compareAdjusted") }) : null]
																	})
																]
															}, targetKey);
														})
													}),
													(0, react_jsx_runtime.jsx)("p", { children: t("compareParameterHint") })
												]
											}),
											(0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-ig-field-grid is-output-grid",
												children: [
													(0, react_jsx_runtime.jsx)(FieldSelect, {
														label: t("ratio"),
														value: ratio,
														onChange: setRatio,
														options: comparisonRatioOpts
													}),
													comparisonResolutionOpts.length > 0 ? (0, react_jsx_runtime.jsx)(FieldSelect, {
														label: lang === "en" ? "Resolution" : "分辨率",
														value: comparisonResolution,
														onChange: setResolution,
														options: comparisonResolutionOpts
													}) : null,
													comparisonGenerationQualityOpts.length > 0 ? (0, react_jsx_runtime.jsx)(FieldSelect, {
														label: lang === "en" ? "Generation quality" : "生成质量",
														value: comparisonGenerationQuality,
														onChange: setGenerationQuality,
														options: comparisonGenerationQualityOpts
													}) : null,
													(0, react_jsx_runtime.jsx)(WatermarkControl, {
														capability: comparisonWatermarkCapability,
														value: watermark,
														onChange: setWatermark,
														lang
													})
												]
											}),
											comparisonWatermarkCapability.status === "supported" ? (0, react_jsx_runtime.jsx)("div", {
												className: "dsh-ig-inline-note",
												children: lang === "en" ? "Watermark applies only to models with confirmed support for this operation." : "水印选项仅用于已确认支持当前操作的模型。"
											}) : null,
											comparisonTargets.some((target) => target.profile.provider === "chatgpt-sub") && (0, react_jsx_runtime.jsx)("div", {
												className: "dsh-ig-inline-note",
												children: t("subscriptionParameterHint")
											})
										] }) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
											(0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-ig-field-grid",
												children: [(0, react_jsx_runtime.jsx)(FieldSelect, {
													label: t("provider"),
													value: studioTargetKey(provider, channel),
													onChange: changeProfile,
													options: config.providers.map((item) => ({
														value: studioTargetKey(item.provider, item.channel),
														label: `${item.label}${item.configured ? "" : ` · ${t("unconfigured")}`}`
													}))
												}), (0, react_jsx_runtime.jsx)(FieldSelect, {
													label: t("model"),
													value: requestModel,
													onChange: setModel,
													options: activeProfile === void 0 ? [] : studioModelOptionsForMode(activeProfile, mode)
												})]
											}),
											(0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-ig-field-grid is-output-grid",
												children: [
													(0, react_jsx_runtime.jsx)(FieldSelect, {
														label: t("ratio"),
														value: ratio,
														onChange: setRatio,
														options: localizeRatioOptions(activeProfile?.ratioOptions ?? [], lang)
													}),
													resolutionOpts.length > 0 ? (0, react_jsx_runtime.jsx)(FieldSelect, {
														label: lang === "en" ? "Resolution" : "分辨率",
														value: selectedResolution ?? "",
														onChange: setResolution,
														options: resolutionOpts
													}) : null,
													(0, react_jsx_runtime.jsx)(FieldSelect, {
														label: [
															"openai",
															"chatgpt-sub",
															"zhipu"
														].includes(provider) ? lang === "en" ? "Generation quality" : "生成质量" : lang === "en" ? "Resolution" : "分辨率",
														value: selectedQuality,
														onChange: (value) => {
															setQuality(value);
															if (provider === "openai") setGenerationQuality(value);
															else setResolution(value);
														},
														options: provider === "openai-compat" ? singleQualityOpts : localizeQualityOptions(singleQualityOpts, lang)
													}),
													activeProfile?.generationQualityOptions ? (0, react_jsx_runtime.jsx)(FieldSelect, {
														label: lang === "en" ? "Generation quality" : "生成质量",
														value: selectedGenerationQuality,
														onChange: setGenerationQuality,
														options: localizeQualityOptions(activeProfile.generationQualityOptions, lang)
													}) : null,
													(0, react_jsx_runtime.jsx)(WatermarkControl, {
														capability: watermarkCapability,
														value: watermark,
														onChange: setWatermark,
														lang
													})
												]
											}),
											provider === "chatgpt-sub" && (0, react_jsx_runtime.jsx)("div", {
												className: "dsh-ig-inline-note",
												children: t("subscriptionParameterHint")
											}),
											(0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-ig-field",
												children: [(0, react_jsx_runtime.jsx)("label", { children: t("count") }), (0, react_jsx_runtime.jsx)("div", {
													className: "dsh-ig-count-row",
													children: [
														1,
														2,
														3,
														4
													].map((option) => (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: `dsh-ig-count-pill ${count === option ? "is-active" : ""}`,
														onClick: () => setCount(option),
														children: t("countUnit", { n: String(option) })
													}, option))
												})]
											})
										] })] }),
										configuredCount === 0 && config !== null && (0, react_jsx_runtime.jsx)("div", {
											className: "dsh-ig-inline-note",
											children: t("noProvider")
										}),
										error !== null && (0, react_jsx_runtime.jsx)("div", {
											className: "dsh-ig-form-error",
											children: error
										}),
										isGenerating ? (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dsh-ig-generate-button is-cancel",
											onClick: cancelGeneration,
											children: [(0, react_jsx_runtime.jsx)(LoaderCircle, {
												className: "dsh-ig-spin",
												size: 17
											}), (0, react_jsx_runtime.jsx)("span", { children: t("cancelGenerate") })]
										}) : (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dsh-ig-generate-button",
											disabled: config === null,
											onClick: () => void submit(),
											children: [(0, react_jsx_runtime.jsx)(Sparkles, { size: 17 }), (0, react_jsx_runtime.jsx)("span", { children: comparisonEnabled ? `${t("compareStart")} (${comparisonTargets.length})` : `${t("start")}${count > 1 ? ` (${count})` : ""}` })]
										})
									]
								})]
							})
						]
					}),
					lightboxOpen && selected !== null && (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-lightbox-backdrop",
						onClick: () => setLightboxOpen(false),
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-lightbox-topbar",
								children: [(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-lightbox-meta",
									children: [
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-tag",
											children: selected.provider
										}),
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-tag dsh-ig-tag-model",
											children: selected.model
										}),
										currentBatch && currentBatch.length > 1 && (0, react_jsx_runtime.jsxs)("span", {
											className: "dsh-ig-tag",
											children: [
												currentBatch.findIndex((i) => i.id === selected.id) + 1,
												" / ",
												currentBatch.length
											]
										}),
										selected.attachment.width && selected.attachment.height ? (0, react_jsx_runtime.jsxs)("span", {
											className: "dsh-ig-tag",
											children: [
												selected.attachment.width,
												" × ",
												selected.attachment.height
											]
										}) : null
									]
								}), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-ig-lightbox-close-btn",
									title: t("close"),
									onClick: () => setLightboxOpen(false),
									children: (0, react_jsx_runtime.jsx)(X, { size: 18 })
								})]
							}),
							currentBatch && currentBatch.length > 1 && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-lightbox-nav is-prev",
								onClick: (e) => {
									e.stopPropagation();
									stepLightbox(-1);
								},
								title: "上一张",
								children: (0, react_jsx_runtime.jsx)(ChevronLeft, { size: 24 })
							}), (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-lightbox-nav is-next",
								onClick: (e) => {
									e.stopPropagation();
									stepLightbox(1);
								},
								title: "下一张",
								children: (0, react_jsx_runtime.jsx)(ChevronRight, { size: 24 })
							})] }),
							(0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ig-lightbox-img-wrap",
								onClick: (e) => e.stopPropagation(),
								children: image.url !== null ? (0, react_jsx_runtime.jsx)("img", {
									className: "dsh-ig-lightbox-img",
									src: image.url,
									alt: selected.prompt
								}) : (0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-lightbox-loading",
									children: (0, react_jsx_runtime.jsx)("div", { className: "dsh-ig-lightbox-spinner" })
								})
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-lightbox-bottombar",
								onClick: (e) => e.stopPropagation(),
								children: [(0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-lightbox-prompt-text",
									title: selected.prompt,
									children: selected.prompt
								}), (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-lightbox-actions",
									children: [
										(0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dsh-ig-lightbox-btn",
											title: t("copyPpt"),
											onClick: async () => {
												await navigator.clipboard.writeText(selected.prompt);
												flash(t("copiedPrompt"));
											},
											children: [(0, react_jsx_runtime.jsx)(FileText, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: t("copyPpt") })]
										}),
										(0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dsh-ig-lightbox-btn",
											title: t("copy"),
											onClick: async () => {
												if (!image.blob) return;
												const ok = await copyImageBlob(image.blob);
												flash(ok ? t("copiedImage") : t("copyFailed"));
											},
											children: [(0, react_jsx_runtime.jsx)(Copy, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: t("copy") })]
										}),
										(0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dsh-ig-lightbox-btn",
											title: t("download"),
											onClick: downloadSelected,
											children: [(0, react_jsx_runtime.jsx)(Download, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: t("download") })]
										}),
										(0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: `dsh-ig-lightbox-btn ${saveSelectionComplete ? "is-saved" : ""}`,
											title: saveButtonLabel,
											onClick: () => void handleSaveToGallery(),
											disabled: saveSelectionComplete,
											children: [saveSelectionComplete ? (0, react_jsx_runtime.jsx)(Check, { size: 14 }) : (0, react_jsx_runtime.jsx)(BookmarkPlus, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: saveButtonLabel })]
										}),
										(0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dsh-ig-lightbox-btn",
											title: selected.isFavorite ? t("favorited") : t("favorite"),
											onClick: () => void toggleFavorite(),
											children: [(0, react_jsx_runtime.jsx)(Heart, {
												size: 14,
												fill: selected.isFavorite ? "#ef4444" : "none",
												color: selected.isFavorite ? "#ef4444" : "currentColor"
											}), (0, react_jsx_runtime.jsx)("span", { children: selected.isFavorite ? t("favorited") : t("favorite") })]
										})
									]
								})]
							})
						]
					}),
					showClearCanvasModal && (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-workbench-modal-backdrop",
						onClick: () => setShowClearCanvasModal(false),
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-workbench-modal-box",
							role: "dialog",
							"aria-modal": "true",
							"aria-label": t("clearCanvas"),
							onClick: (event) => event.stopPropagation(),
							children: [
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-workbench-modal-header",
									children: [(0, react_jsx_runtime.jsx)(TriangleAlert, {
										size: 20,
										color: "#dc2626"
									}), (0, react_jsx_runtime.jsx)("strong", { children: t("clearCanvas") })]
								}),
								(0, react_jsx_runtime.jsx)("p", {
									className: "dsh-ig-workbench-modal-desc",
									children: t("clearCanvasDescription")
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-workbench-modal-actions",
									children: [(0, react_jsx_runtime.jsx)("button", {
										autoFocus: true,
										type: "button",
										className: "dsh-ig-workbench-modal-cancel",
										onClick: () => setShowClearCanvasModal(false),
										children: t("cancel")
									}), (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-workbench-modal-danger",
										onClick: () => {
											try {
												if (!clearStudioTlCanvases()) {
													flash(t("loading"));
													return;
												}
												setShowClearCanvasModal(false);
												flash(t("canvasCleared"));
											} catch (error) {
												setError(messageOf(error));
												setShowClearCanvasModal(false);
											}
										},
										children: t("clearCanvas")
									})]
								})
							]
						})
					}),
					showDeleteModal && selected !== null && (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-workbench-modal-backdrop",
						onClick: () => setShowDeleteModal(false),
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-workbench-modal-box",
							onClick: (e) => e.stopPropagation(),
							children: [
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-workbench-modal-header",
									children: [(0, react_jsx_runtime.jsx)(TriangleAlert, {
										size: 20,
										color: "#dc2626"
									}), (0, react_jsx_runtime.jsx)("strong", { children: t("deleteModalTitle") })]
								}),
								(0, react_jsx_runtime.jsx)("p", {
									className: "dsh-ig-workbench-modal-desc",
									children: t("deleteModalDesc")
								}),
								Boolean(selected.savedTo) && (0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-ig-workbench-modal-option",
									children: [(0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: deleteWorkspaceFiles,
										onChange: (e) => setDeleteWorkspaceFiles(e.target.checked)
									}), (0, react_jsx_runtime.jsx)("span", { children: t("deleteWorkspaceFilesLabel") })]
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-workbench-modal-actions",
									children: [(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-workbench-modal-cancel",
										onClick: () => setShowDeleteModal(false),
										children: t("cancel")
									}), (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-workbench-modal-danger",
										onClick: () => void handleConfirmDelete(),
										children: t("confirm")
									})]
								})
							]
						})
					}),
					notice !== null && (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-workbench-toast",
						children: notice
					})
				]
			});
		};
		//#endregion
		//#region lib/types/client/inspiration-image-cache.js
		/** Persistent, bounded browser cache for publicly proxied inspiration images. */
		const DB_NAME$1 = "dsh-image-gen-inspiration";
		const STORE$1 = "images";
		const CATALOG_STORE = "catalog";
		const MAX_ENTRIES = 120;
		const MAX_BYTES = 188743680;
		const pending = /* @__PURE__ */ new Map();
		let cacheEpoch = 0;
		/**
		* Resolve the IndexedDB key for one image. `rev` (the source's imageRevision,
		* falling back to its version) namespaces the cache by image content: when a
		* source re-packages its images at stable case IDs, a bumped rev orphans the
		* old blobs instead of serving them forever.
		*/
		function cacheKey(sourceId, caseId, rev) {
			return rev === void 0 ? `${sourceId}:${caseId}` : `${sourceId}:${caseId}@${rev}`;
		}
		function fetchInspirationImage(sourceId, caseId, rev) {
			const key = cacheKey(sourceId, caseId, rev);
			const existing = pending.get(key);
			if (existing !== void 0) return existing;
			const requestEpoch = cacheEpoch;
			const task = getCached(key).then(async (cached) => {
				if (cached !== void 0) return cached;
				const response = await fetch(`${INSPIRATION_ROUTE}/image/${encodeURIComponent(sourceId)}/${encodeURIComponent(caseId)}`, {
					credentials: "same-origin",
					headers: { accept: "image/avif,image/webp,image/png,image/jpeg" }
				});
				if (!response.ok) throw new Error(`灵感图片读取失败 (${String(response.status)})`);
				const blob = await response.blob();
				if (blob.size < 64 || ![
					"image/jpeg",
					"image/png",
					"image/webp"
				].includes(blob.type)) throw new Error("灵感图片格式不受支持");
				if (requestEpoch === cacheEpoch) putCached(key, blob);
				return blob;
			}).finally(() => pending.delete(key));
			pending.set(key, task);
			return task;
		}
		async function evictInspirationImage(sourceId, caseId, rev) {
			const key = cacheKey(sourceId, caseId, rev);
			pending.delete(key);
			const db = await openDatabase$1();
			if (db === void 0) return;
			try {
				await new Promise((resolve) => {
					const req = db.transaction(STORE$1, "readwrite").objectStore(STORE$1).delete(key);
					req.onsuccess = () => resolve();
					req.onerror = () => resolve();
				});
			} finally {
				db.close();
			}
		}
		function openDatabase$1() {
			if (typeof indexedDB === "undefined") return Promise.resolve(void 0);
			return new Promise((resolve) => {
				try {
					const request = indexedDB.open(DB_NAME$1, 2);
					request.onupgradeneeded = () => {
						const db = request.result;
						if (!db.objectStoreNames.contains(STORE$1)) db.createObjectStore(STORE$1, { keyPath: "key" }).createIndex("accessedAt", "accessedAt");
						if (!db.objectStoreNames.contains(CATALOG_STORE)) db.createObjectStore(CATALOG_STORE, { keyPath: "id" });
					};
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => resolve(void 0);
				} catch {
					resolve(void 0);
				}
			});
		}
		async function getCached(key) {
			const db = await openDatabase$1();
			if (db === void 0) return void 0;
			try {
				return await new Promise((resolve) => {
					const store = db.transaction(STORE$1, "readwrite").objectStore(STORE$1);
					const request = store.get(key);
					request.onsuccess = () => {
						const entry = request.result;
						if (entry === void 0 || !(entry.blob instanceof Blob) || entry.blob.size < 64) {
							if (entry !== void 0) try {
								store.delete(key);
							} catch {}
							return resolve(void 0);
						}
						entry.accessedAt = Date.now();
						store.put(entry);
						resolve(entry.blob);
					};
					request.onerror = () => resolve(void 0);
				});
			} finally {
				db.close();
			}
		}
		async function putCached(key, blob) {
			const db = await openDatabase$1();
			if (db === void 0) return;
			try {
				await new Promise((resolve) => {
					const tx = db.transaction(STORE$1, "readwrite");
					tx.objectStore(STORE$1).put({
						key,
						blob,
						bytes: blob.size,
						accessedAt: Date.now()
					});
					tx.oncomplete = () => resolve();
					tx.onerror = () => resolve();
					tx.onabort = () => resolve();
				});
				await trimCache(db);
			} finally {
				db.close();
			}
		}
		async function trimCache(db) {
			await new Promise((resolve) => {
				const tx = db.transaction(STORE$1, "readwrite");
				const store = tx.objectStore(STORE$1);
				const items = [];
				const cursor = store.openCursor();
				cursor.onsuccess = () => {
					const result = cursor.result;
					if (result !== null) {
						items.push(result.value);
						result.continue();
						return;
					}
					items.sort((a, b) => a.accessedAt - b.accessedAt);
					let count = items.length;
					let bytes = items.reduce((total, item) => total + Math.max(0, item.bytes), 0);
					for (const item of items) {
						if (count <= MAX_ENTRIES && bytes <= MAX_BYTES) break;
						store.delete(item.key);
						count -= 1;
						bytes -= Math.max(0, item.bytes);
					}
				};
				tx.oncomplete = () => resolve();
				tx.onerror = () => resolve();
				tx.onabort = () => resolve();
			});
		}
		async function clearInspirationImageCache() {
			cacheEpoch += 1;
			pending.clear();
			const db = await openDatabase$1();
			if (db === void 0) return;
			try {
				await new Promise((resolve) => {
					const tx = db.transaction(STORE$1, "readwrite");
					tx.objectStore(STORE$1).clear();
					tx.oncomplete = () => resolve();
					tx.onerror = () => resolve();
					tx.onabort = () => resolve();
				});
			} finally {
				db.close();
			}
		}
		//#endregion
		//#region lib/types/client/inspiration-catalog-cache.js
		const DB_NAME = "dsh-image-gen-inspiration";
		const STORE = "catalog";
		const IMAGE_STORE = "images";
		const KEY = "latest";
		async function loadCachedInspirationCatalog() {
			const db = await openDatabase();
			if (db === void 0) return void 0;
			try {
				return await new Promise((resolve) => {
					const request = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
					request.onsuccess = () => {
						const record = request.result;
						resolve(isCatalog(record?.catalog) ? record.catalog : void 0);
					};
					request.onerror = () => resolve(void 0);
				});
			} finally {
				db.close();
			}
		}
		async function saveCachedInspirationCatalog(catalog) {
			if (!isCatalog(catalog)) return;
			const db = await openDatabase();
			if (db === void 0) return;
			try {
				await new Promise((resolve) => {
					const tx = db.transaction(STORE, "readwrite");
					tx.objectStore(STORE).put({
						id: KEY,
						catalog,
						storedAt: Date.now()
					});
					tx.oncomplete = () => resolve();
					tx.onerror = () => resolve();
					tx.onabort = () => resolve();
				});
			} finally {
				db.close();
			}
		}
		function openDatabase() {
			if (typeof indexedDB === "undefined") return Promise.resolve(void 0);
			return new Promise((resolve) => {
				try {
					const request = indexedDB.open(DB_NAME, 2);
					request.onupgradeneeded = () => {
						const db = request.result;
						if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
						if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE, { keyPath: "key" }).createIndex("accessedAt", "accessedAt");
					};
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => resolve(void 0);
				} catch {
					resolve(void 0);
				}
			});
		}
		function isCatalog(value) {
			if (typeof value !== "object" || value === null || value.schemaVersion !== 1) return false;
			const sources = value.sources;
			return Array.isArray(sources) && sources.length > 0 && sources.every((source) => typeof source === "object" && source !== null && Array.isArray(source.cases));
		}
		//#endregion
		//#region lib/types/inspiration/data/baoyu-compose.json
		var types = [
			{
				"id": "hero",
				"description": "Large visual impact, title overlay",
				"composition": "Large focal visual (60-70% area), title overlay on visual, dramatic composition"
			},
			{
				"id": "conceptual",
				"description": "Concept visualization, abstract core ideas",
				"composition": "Abstract shapes representing core concepts, information hierarchy, clean zones"
			},
			{
				"id": "typography",
				"description": "Text-focused layout, prominent title",
				"composition": "Title as primary element (40%+ area), minimal supporting visuals, strong hierarchy"
			},
			{
				"id": "metaphor",
				"description": "Visual metaphor, concrete expressing abstract",
				"composition": "Concrete object/scene representing abstract idea, symbolic elements, emotional resonance"
			},
			{
				"id": "scene",
				"description": "Atmospheric scene, narrative feel",
				"composition": "Atmospheric environment, narrative elements, mood-setting lighting and colors"
			},
			{
				"id": "minimal",
				"description": "Minimalist composition, generous whitespace",
				"composition": "Single focal element, generous whitespace (60%+), essential shapes only"
			}
		];
		var palettes = [
			{
				"id": "warm",
				"tagline": "Friendly, approachable, human-centered",
				"colors": [
					{
						"role": "Primary 1",
						"name": "Warm Orange",
						"hex": "#ed8936"
					},
					{
						"role": "Primary 2",
						"name": "Golden Yellow",
						"hex": "#f6ad55"
					},
					{
						"role": "Primary 3",
						"name": "Terracotta",
						"hex": "#c05621"
					},
					{
						"role": "Background",
						"name": "Cream",
						"hex": "#fffaf0"
					},
					{
						"role": "Background Alt",
						"name": "Soft Peach",
						"hex": "#fed7aa"
					},
					{
						"role": "Accent 1",
						"name": "Deep Brown",
						"hex": "#744210"
					},
					{
						"role": "Accent 2",
						"name": "Soft Red",
						"hex": "#e53e3e"
					}
				],
				"decorativeHints": [
					"Sun rays, warm lighting effects",
					"Rounded shapes, organic curves",
					"Hearts, smiling faces, friendly icons",
					"Warm gradient overlays"
				],
				"bestFor": ""
			},
			{
				"id": "cool",
				"tagline": "Technical, professional, precise",
				"colors": [
					{
						"role": "Primary 1",
						"name": "Engineering Blue",
						"hex": "#2563eb"
					},
					{
						"role": "Primary 2",
						"name": "Navy Blue",
						"hex": "#1e3a5f"
					},
					{
						"role": "Primary 3",
						"name": "Cyan",
						"hex": "#06b6d4"
					},
					{
						"role": "Background",
						"name": "Light Gray",
						"hex": "#f8f9fa"
					},
					{
						"role": "Background Alt",
						"name": "Blueprint Off-White",
						"hex": "#faf8f5"
					},
					{
						"role": "Accent 1",
						"name": "Amber",
						"hex": "#f59e0b"
					},
					{
						"role": "Accent 2",
						"name": "Light Blue",
						"hex": "#bfdbfe"
					}
				],
				"decorativeHints": [
					"Grid lines and alignment guides",
					"Dimension indicators and measurements",
					"Technical schematics and diagrams",
					"Geometric precision elements"
				],
				"bestFor": ""
			},
			{
				"id": "dark",
				"tagline": "Cinematic, premium, atmospheric",
				"colors": [
					{
						"role": "Primary 1",
						"name": "Electric Purple",
						"hex": "#8b5cf6"
					},
					{
						"role": "Primary 2",
						"name": "Cyan Blue",
						"hex": "#06b6d4"
					},
					{
						"role": "Primary 3",
						"name": "Magenta Pink",
						"hex": "#ec4899"
					},
					{
						"role": "Background",
						"name": "Deep Purple-Black",
						"hex": "#0a0a0a"
					},
					{
						"role": "Background Alt",
						"name": "Rich Navy",
						"hex": "#1a1a2e"
					},
					{
						"role": "Accent 1",
						"name": "Amber",
						"hex": "#f59e0b"
					},
					{
						"role": "Accent 2",
						"name": "Pure White",
						"hex": "#ffffff"
					}
				],
				"decorativeHints": [
					"Glowing accent elements and neon highlights",
					"Atmospheric fog or particle effects",
					"Silhouettes with backlit edges",
					"Subtle gradient backgrounds"
				],
				"bestFor": ""
			},
			{
				"id": "earth",
				"tagline": "Natural, organic, grounded",
				"colors": [
					{
						"role": "Primary 1",
						"name": "Forest Green",
						"hex": "#276749"
					},
					{
						"role": "Primary 2",
						"name": "Sage",
						"hex": "#9ae6b4"
					},
					{
						"role": "Primary 3",
						"name": "Earth Brown",
						"hex": "#744210"
					},
					{
						"role": "Background",
						"name": "Sand Beige",
						"hex": "#f5e6d3"
					},
					{
						"role": "Background Alt",
						"name": "Sky Blue",
						"hex": "#e0f2fe"
					},
					{
						"role": "Accent 1",
						"name": "Sunset Orange",
						"hex": "#ed8936"
					},
					{
						"role": "Accent 2",
						"name": "Water Blue",
						"hex": "#63b3ed"
					}
				],
				"decorativeHints": [
					"Leaves, trees, mountains, natural forms",
					"Sun, clouds, organic flowing lines",
					"Botanical illustrations",
					"Earthy textures and natural patterns"
				],
				"bestFor": ""
			},
			{
				"id": "elegant",
				"tagline": "Sophisticated, refined, understated luxury",
				"colors": [
					{
						"role": "Primary 1",
						"name": "Soft Coral",
						"hex": "#e8a598"
					},
					{
						"role": "Primary 2",
						"name": "Muted Teal",
						"hex": "#5b8a8a"
					},
					{
						"role": "Primary 3",
						"name": "Dusty Rose",
						"hex": "#d4a5a5"
					},
					{
						"role": "Background",
						"name": "Warm Cream",
						"hex": "#f5f0e6"
					},
					{
						"role": "Background Alt",
						"name": "Soft Beige",
						"hex": "#f0ebe0"
					},
					{
						"role": "Accent 1",
						"name": "Gold",
						"hex": "#c9a962"
					},
					{
						"role": "Accent 2",
						"name": "Copper",
						"hex": "#b87333"
					}
				],
				"decorativeHints": [
					"Delicate ornamental details",
					"Subtle gradients and soft transitions",
					"Refined geometric patterns",
					"Balanced, symmetrical compositions"
				],
				"bestFor": ""
			},
			{
				"id": "macaron",
				"tagline": "Soft macaron pastel color blocks on warm cream",
				"colors": [
					{
						"role": "Primary 1",
						"name": "Sky Blue",
						"hex": "#a8d8ea"
					},
					{
						"role": "Primary 2",
						"name": "Mint Green",
						"hex": "#b5e5cf"
					},
					{
						"role": "Primary 3",
						"name": "Lavender",
						"hex": "#d5c6e0"
					},
					{
						"role": "Background",
						"name": "Warm Cream",
						"hex": "#f5f0e8"
					},
					{
						"role": "Background Alt",
						"name": "Peach",
						"hex": "#ffd5c2"
					},
					{
						"role": "Accent 1",
						"name": "Coral Red",
						"hex": "#e8655a"
					},
					{
						"role": "Accent 2",
						"name": "Deep Charcoal",
						"hex": "#2d2d2d"
					}
				],
				"decorativeHints": [
					"Rounded pastel color blocks",
					"Subtle warm paper grain texture",
					"Soft shadows, no hard edges",
					"Gentle gradient transitions between zones"
				],
				"bestFor": ""
			},
			{
				"id": "mono",
				"tagline": "Clean, focused, essential",
				"colors": [
					{
						"role": "Primary 1",
						"name": "Pure Black",
						"hex": "#000000"
					},
					{
						"role": "Primary 2",
						"name": "Near Black",
						"hex": "#1f1f1f"
					},
					{
						"role": "Primary 3",
						"name": "Dark Gray",
						"hex": "#374151"
					},
					{
						"role": "Background",
						"name": "White",
						"hex": "#ffffff"
					},
					{
						"role": "Background Alt",
						"name": "Off-White",
						"hex": "#fafafa"
					},
					{
						"role": "Accent 2",
						"name": "Medium Gray",
						"hex": "#9ca3af"
					}
				],
				"decorativeHints": [
					"Maximum negative space",
					"Thin lines and minimal strokes",
					"Single focal point emphasis",
					"Stark contrast between elements"
				],
				"bestFor": ""
			},
			{
				"id": "pastel",
				"tagline": "Gentle, whimsical, soft",
				"colors": [
					{
						"role": "Primary 1",
						"name": "Soft Pink",
						"hex": "#ffb6c1"
					},
					{
						"role": "Primary 2",
						"name": "Mint",
						"hex": "#98d8c8"
					},
					{
						"role": "Primary 3",
						"name": "Lavender",
						"hex": "#c8a2c8"
					},
					{
						"role": "Background",
						"name": "White",
						"hex": "#ffffff"
					},
					{
						"role": "Background Alt",
						"name": "Light Cream",
						"hex": "#fff8e7"
					},
					{
						"role": "Accent 1",
						"name": "Butter Yellow",
						"hex": "#fffacd"
					},
					{
						"role": "Accent 2",
						"name": "Sky Blue",
						"hex": "#bee3f8"
					}
				],
				"decorativeHints": [
					"Cute rounded proportions",
					"Stars, sparkles, flowers, decorative flourishes",
					"Soft shadows and gentle highlights",
					"Storybook-style elements"
				],
				"bestFor": ""
			},
			{
				"id": "retro",
				"tagline": "Nostalgic, vintage, classic",
				"colors": [
					{
						"role": "Primary 1",
						"name": "Coral Red",
						"hex": "#e07a5f"
					},
					{
						"role": "Primary 2",
						"name": "Mint Green",
						"hex": "#81b29a"
					},
					{
						"role": "Primary 3",
						"name": "Mustard Yellow",
						"hex": "#f2cc8f"
					},
					{
						"role": "Primary 4",
						"name": "Dark Maroon",
						"hex": "#5d3a3a"
					},
					{
						"role": "Background",
						"name": "Cream Off-White",
						"hex": "#f5f0e6"
					},
					{
						"role": "Background Alt",
						"name": "Aged Paper",
						"hex": "#f5e6d3"
					},
					{
						"role": "Accent 1",
						"name": "Burnt Orange",
						"hex": "#d4764a"
					},
					{
						"role": "Accent 2",
						"name": "Rock Blue",
						"hex": "#577590"
					},
					{
						"role": "Accent 3",
						"name": "Vintage Gold",
						"hex": "#c9a227"
					},
					{
						"role": "Accent 4",
						"name": "Faded Teal",
						"hex": "#2f7373"
					}
				],
				"decorativeHints": [
					"Halftone dots and vintage badges",
					"Aged textures with subtle paper grain",
					"Sunburst/radiating lines for energy",
					"Pill-shaped clouds, small dots and stars",
					"Classic icons and retro motifs"
				],
				"bestFor": ""
			},
			{
				"id": "duotone",
				"tagline": "Dramatic, cinematic, two-color high contrast",
				"colors": [
					{
						"role": "Primary 1",
						"name": "Burnt Orange",
						"hex": "#e8751a"
					},
					{
						"role": "Primary 2",
						"name": "Deep Teal",
						"hex": "#0a6e6e"
					},
					{
						"role": "Background",
						"name": "Off-Black",
						"hex": "#121212"
					},
					{
						"role": "Background Alt",
						"name": "Dark Charcoal",
						"hex": "#1e1e1e"
					},
					{
						"role": "Accent 1",
						"name": "Warm Cream",
						"hex": "#f5e6d0"
					},
					{
						"role": "Accent 2",
						"name": "Amber Highlight",
						"hex": "#f4a623"
					}
				],
				"decorativeHints": [
					"Stark two-color separation across entire composition",
					"Halftone transitions between the two colors",
					"Silhouettes in one color against the other",
					"Minimal use of third color (only for small highlights)",
					"High contrast figure-ground relationships"
				],
				"bestFor": "",
				"pairs": [
					{
						"name": "Orange + Teal",
						"a": "#e8751a",
						"b": "#0a6e6e",
						"feel": "Cinematic, action"
					},
					{
						"name": "Red + Cream",
						"a": "#c0392b",
						"b": "#f5e6d0",
						"feel": "Bold, classic"
					},
					{
						"name": "Blue + Gold",
						"a": "#1a3a5c",
						"b": "#d4a843",
						"feel": "Prestigious, premium"
					},
					{
						"name": "Purple + Green",
						"a": "#6b3fa0",
						"b": "#2ecc71",
						"feel": "Futuristic, contrast"
					},
					{
						"name": "Magenta + Cyan",
						"a": "#c2185b",
						"b": "#00bcd4",
						"feel": "Vibrant, pop"
					},
					{
						"name": "Crimson + Navy",
						"a": "#dc143c",
						"b": "#0d1b2a",
						"feel": "Dramatic, noir"
					}
				]
			},
			{
				"id": "vivid",
				"tagline": "Energetic, bold, attention-grabbing",
				"colors": [
					{
						"role": "Primary 1",
						"name": "Bright Red",
						"hex": "#ef4444"
					},
					{
						"role": "Primary 2",
						"name": "Neon Green",
						"hex": "#22c55e"
					},
					{
						"role": "Primary 3",
						"name": "Electric Blue",
						"hex": "#3b82f6"
					},
					{
						"role": "Background",
						"name": "Light Blue",
						"hex": "#eff6ff"
					},
					{
						"role": "Background Alt",
						"name": "Soft Lavender",
						"hex": "#f5f3ff"
					},
					{
						"role": "Accent 1",
						"name": "Bright Orange",
						"hex": "#fb923c"
					},
					{
						"role": "Accent 2",
						"name": "Vivid Yellow",
						"hex": "#facc15"
					}
				],
				"decorativeHints": [
					"Dynamic diagonal lines and angles",
					"Bold geometric shapes and color blocks",
					"Dramatic lighting effects",
					"High-energy visual compositions"
				],
				"bestFor": ""
			}
		];
		var renderings = [
			{
				"id": "flat-vector",
				"tagline": "Clean, modern, geometric illustration",
				"lines": [
					"Clean outlines with uniform stroke weight",
					"Closed shapes (coloring-book style)",
					"Rounded line endings, avoid sharp corners",
					"Consistent stroke width throughout"
				],
				"texture": [
					"None: smooth, flat color fills only",
					"No gradients, shadows, or noise",
					"Solid color blocks"
				],
				"depth": [
					"Flat: no shadows, no perspective",
					"2D layering with overlap for depth illusion",
					"Optional 2.5D isometric layering (front/back occlusion, no atmospheric perspective)",
					"No 3D effects or bevels"
				],
				"elements": [
					"Geometric icons and simple shapes",
					"Bold outlined objects with clean fills",
					"Geometric simplification: complex objects → basic shapes (trees → lollipop/triangle, buildings → rectangles)",
					"\"Toy model\" aesthetic: cute, rounded proportions",
					"Decorative: dots, lines, sunbursts, pill-shaped clouds, small stars",
					"Isolated elements on clean backgrounds"
				]
			},
			{
				"id": "pixel",
				"tagline": "Retro 8-bit, nostalgic, chunky",
				"lines": [
					"Pixel grid alignment, no anti-aliasing",
					"Staircase edges on diagonals",
					"Single-pixel or double-pixel outlines",
					"Blocky, angular forms"
				],
				"texture": [
					"Dithering patterns for gradients",
					"No smooth transitions",
					"Cross-hatching with pixel precision",
					"Limited 16-32 color palette per scene"
				],
				"depth": [
					"None: flat pixel planes only",
					"Parallax layering (foreground/background)",
					"No perspective or 3D effects"
				],
				"elements": [
					"8-bit sprites and chunky shapes",
					"Simple iconography: stars, hearts, arrows",
					"Text bubbles with pixel borders",
					"Progress bars with chunky segments",
					"Retro gaming UI elements"
				]
			},
			{
				"id": "digital",
				"tagline": "Polished, precise, modern",
				"lines": [
					"Clean, precise, computer-perfect edges",
					"Consistent stroke weights",
					"Sharp corners where appropriate",
					"Anti-aliased smooth rendering"
				],
				"texture": [
					"Smooth surfaces with no visible texture",
					"Subtle gradients permitted (soft, controlled)",
					"Frosted glass and blur effects",
					"Clean shadows with consistent direction"
				],
				"depth": [
					"Subtle gradients and soft drop shadows",
					"Layered card-based layouts",
					"Light 3D effects (subtle, not realistic)",
					"Material Design-inspired elevation"
				],
				"elements": [
					"Polished icons and UI components",
					"Data visualizations: charts, graphs, metrics",
					"Card layouts and structured grids",
					"Tag chips, progress bars, status indicators",
					"Clean geometric shapes"
				]
			},
			{
				"id": "hand-drawn",
				"tagline": "Sketchy, organic, personal",
				"lines": [
					"Sketchy, organic, slightly imperfect strokes",
					"Variable line weight (thicker at pressure points)",
					"Wavy connectors and arrows",
					"Natural hand tremor visible"
				],
				"texture": [
					"Paper grain and subtle surface texture",
					"Pencil/pen/marker texture on strokes",
					"Casual fills with visible brush direction"
				],
				"depth": [
					"Minimal: light hand-drawn shadows or hatching",
					"No realistic depth or perspective",
					"Simple layering with overlap"
				],
				"elements": [
					"Doodles, organic shapes, hand-lettered labels",
					"Conceptual icons with sketchy quality",
					"Connection lines with hand-drawn wavy feel",
					"Stars, arrows, underlines, circles, checkmarks",
					"Stick figures and simple characters"
				]
			},
			{
				"id": "painterly",
				"tagline": "Soft, artistic, expressive",
				"lines": [
					"Soft brush strokes with variable opacity",
					"No hard outlines; edges defined by color transitions",
					"Organic flowing strokes with natural blending"
				],
				"texture": [
					"Visible paint or watercolor wash textures",
					"Color bleeds and wet-on-wet effects",
					"Paper texture showing through transparent areas",
					"Brush stroke patterns visible"
				],
				"depth": [
					"Soft edges with natural color blending",
					"Atmospheric depth through color fading",
					"Layered washes creating depth illusion"
				],
				"elements": [
					"Watercolor washes as backgrounds",
					"Natural elements: leaves, flowers, organic forms",
					"Soft gradients and color transitions",
					"Splatter and drip effects as accents",
					"Botanical and environmental motifs"
				]
			},
			{
				"id": "chalk",
				"tagline": "Educational, authentic, classroom",
				"lines": [
					"Imperfect chalk strokes with variable pressure",
					"Visible chalk texture and grain",
					"Slightly wobbly, hand-drawn quality",
					"Thick strokes for emphasis, thin for details"
				],
				"texture": [
					"Chalk dust effects around text and elements",
					"Board surface (dark, slightly worn)",
					"Eraser smudges and residue",
					"Grainy chalk quality on all elements"
				],
				"depth": [
					"None: flat chalk drawings on board surface",
					"Layering through erasure and redrawing",
					"No shadows or perspective"
				],
				"elements": [
					"Chalk doodles: stars, arrows, underlines",
					"Mathematical formulas and diagrams",
					"Stick figures and simple icons",
					"Connection lines with chalk feel",
					"Checkmarks, circles, boxes for lists",
					"Wooden frame border optional"
				]
			},
			{
				"id": "screen-print",
				"tagline": "Bold, limited-color poster art with print texture",
				"lines": [
					"Clean, sharp edges between color blocks",
					"No outlines — shapes defined by color boundaries",
					"Stencil-cut quality, bold silhouettes",
					"Geometric shapes with precise registration"
				],
				"texture": [
					"Halftone dot patterns within color fills",
					"Slight color layer misregistration (offset between print layers)",
					"Paper grain texture beneath colors",
					"Risograph / screen print imperfections (ink spread, dot gain)"
				],
				"depth": [
					"Flat color planes layered front to back",
					"Depth through silhouette overlap and color layering",
					"No gradients — tonal variation via halftone density",
					"Negative space as active compositional element"
				],
				"elements": [
					"Bold silhouettes and symbolic shapes",
					"Geometric framing (circles, arches, triangles)",
					"Figure-ground inversion (negative space forms secondary image)",
					"Limited icon vocabulary: key props, symbolic objects",
					"Typography integrated as design element, not overlay",
					"Vintage poster border treatments"
				]
			}
		];
		var textLevels = [
			{
				"id": "none",
				"area": "85% visual area"
			},
			{
				"id": "title-only",
				"area": "85% visual area"
			},
			{
				"id": "title-subtitle",
				"area": "75% visual area"
			},
			{
				"id": "text-rich",
				"area": "60% visual area"
			}
		];
		var moods = [
			{
				"id": "subtle",
				"application": "Use low contrast, muted colors, light visual weight, calm aesthetic"
			},
			{
				"id": "balanced",
				"application": "Use medium contrast, normal saturation, balanced visual weight"
			},
			{
				"id": "bold",
				"application": "Use high contrast, vivid saturated colors, heavy visual weight, dynamic energy"
			}
		];
		//#endregion
		//#region lib/types/baoyu-compose.js
		/**
		* Dimension-composition prompt assembly for the inspiration composer tab.
		* Data is generated by scripts/build-baoyu-compose.mjs from JimLiu/baoyu-skills
		* (baoyu-cover-image skill, MIT license).
		*/
		/** Pseudo inspiration source id that switches the view into composer mode. */
		const BAOYU_COMPOSER_SOURCE_ID = "baoyu-compose";
		const BAOYU_TYPES = types;
		const BAOYU_PALETTES = palettes;
		const BAOYU_RENDERINGS = renderings;
		const BAOYU_TEXT_LEVELS = textLevels;
		const BAOYU_MOODS = moods;
		/** Chinese labels for every dimension option id, shown when the UI language is zh. */
		const BAOYU_LABELS_ZH = {
			hero: "主视觉大图",
			conceptual: "概念抽象",
			typography: "文字主导",
			metaphor: "隐喻象征",
			scene: "氛围场景",
			minimal: "极简留白",
			warm: "暖色",
			cool: "冷色",
			dark: "暗色",
			earth: "大地色",
			elegant: "优雅",
			macaron: "马卡龙",
			mono: "单色",
			pastel: "粉彩",
			retro: "复古",
			duotone: "双色调",
			vivid: "高饱和",
			"flat-vector": "扁平矢量",
			pixel: "像素风",
			digital: "数字插画",
			"hand-drawn": "手绘",
			painterly: "绘画感",
			chalk: "粉笔",
			"screen-print": "丝网印刷",
			none: "无文字",
			"title-only": "仅标题",
			"title-subtitle": "标题+副标题",
			"text-rich": "丰富文字",
			subtle: "含蓄",
			balanced: "均衡",
			bold: "强烈"
		};
		const BAOYU_DEFAULT_SELECTION = {
			type: "metaphor",
			palette: "warm",
			rendering: "flat-vector",
			text: "title-only",
			mood: "balanced",
			title: ""
		};
		function palette(id) {
			return BAOYU_PALETTES.find((item) => item.id === id);
		}
		function rendering(id) {
			return BAOYU_RENDERINGS.find((item) => item.id === id);
		}
		function typeOf(id) {
			return BAOYU_TYPES.find((item) => item.id === id);
		}
		function moodOf(id) {
			return BAOYU_MOODS.find((item) => item.id === id);
		}
		function textLevel(id) {
			return BAOYU_TEXT_LEVELS.find((item) => item.id === id);
		}
		/** Assemble the five-dimension selection into one generate_image-ready prompt. */
		function composeBaoyuPrompt(selection) {
			const chosenType = typeOf(selection.type);
			const chosenPalette = palette(selection.palette);
			const chosenRendering = rendering(selection.rendering);
			const chosenText = textLevel(selection.text);
			const chosenMood = moodOf(selection.mood);
			if (chosenType === void 0 || chosenPalette === void 0 || chosenRendering === void 0 || chosenText === void 0 || chosenMood === void 0) throw new Error("invalid-baoyu-selection");
			const title = selection.title.trim();
			if (selection.text !== "none" && title === "") throw new Error("baoyu-title-required");
			const primary = chosenPalette.colors.filter((color) => color.role.startsWith("Primary"));
			const background = chosenPalette.colors.filter((color) => color.role.startsWith("Background"));
			const accent = chosenPalette.colors.filter((color) => color.role.startsWith("Accent"));
			const swatch = (colors) => colors.map((color) => `${color.name} ${color.hex}`).join(", ");
			const textElements = selection.text === "none" ? "No text elements; the full area stays visual." : [
				`Title: "${title}"`,
				...selection.text === "title-subtitle" || selection.text === "text-rich" ? ["Subtitle: derive one short supporting line from the title"] : [],
				...selection.text === "text-rich" ? ["Tags: derive 2-3 keyword badges from the title"] : []
			].join("\n");
			const pairNote = chosenPalette.pairs === void 0 ? "" : `\n- Duotone pair: pick ONE dominant two-color pair from ${chosenPalette.pairs.map((pair) => `${pair.name} (${pair.a} + ${pair.b})`).join("; ")}`;
			return [
				"Cover image.",
				"",
				"# Visual Design",
				`- Type: ${chosenType.id} — ${chosenType.composition}`,
				`- Palette: ${chosenPalette.id} (${chosenPalette.tagline})`,
				`- Rendering: ${chosenRendering.id} — ${chosenRendering.tagline}`,
				`- Text level: ${chosenText.id} (${chosenText.area})`,
				`- Mood: ${chosenMood.id} — ${chosenMood.application}`,
				"",
				"# Text Elements",
				textElements,
				"",
				"# Composition",
				`- Type composition: ${chosenType.composition}`,
				"- Layout: generous whitespace (40-60% breathing room); one dominant focal point with 1-2 supporting elements plus decorative accents; main visual centered or slightly left, reserving the right side for the title when included.",
				`- Decorative: ${chosenPalette.decorativeHints.join("; ")}`,
				"",
				"# Color Scheme",
				`- Primary: ${swatch(primary)}`,
				`- Background: ${swatch(background)}`,
				`- Accent: ${swatch(accent)}${pairNote}`,
				`- Mood adjustment: ${chosenMood.application}`,
				"- Color constraint: Color values (#hex) and color names are rendering guidance only — do NOT display color names, hex codes, or palette labels as visible text in the image.",
				"",
				`# Rendering Notes (${chosenRendering.id})`,
				`- Lines: ${chosenRendering.lines.join("; ")}`,
				`- Texture: ${chosenRendering.texture.join("; ")}`,
				`- Depth: ${chosenRendering.depth.join("; ")}`,
				`- Elements: ${chosenRendering.elements.join("; ")}`,
				"",
				"# Core Principles",
				"- Ample whitespace, highlight the core message, avoid cluttered layouts.",
				"- Simplified silhouettes for any characters — no realistic human faces or bodies.",
				"- Icon-based vocabulary: represent concepts with simple, recognizable icons."
			].join("\n");
		}
		/** Randomize every visual dimension, keeping the current title text. */
		function randomBaoyuSelection(current) {
			const pick = (items) => items[Math.floor(Math.random() * items.length)];
			return {
				type: pick(BAOYU_TYPES).id,
				palette: pick(BAOYU_PALETTES).id,
				rendering: pick(BAOYU_RENDERINGS).id,
				text: pick(BAOYU_TEXT_LEVELS).id,
				mood: pick(BAOYU_MOODS).id,
				title: current.title
			};
		}
		//#endregion
		//#region lib/types/client/inspiration-view.js
		const FAVORITES_STORAGE_KEY = "dsh-ig-inspiration-favorites";
		function loadInspirationFavorites() {
			if (typeof localStorage === "undefined") return /* @__PURE__ */ new Set();
			try {
				const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
				if (raw) {
					const parsed = JSON.parse(raw);
					if (Array.isArray(parsed)) return new Set(parsed);
				}
			} catch {}
			return /* @__PURE__ */ new Set();
		}
		function saveInspirationFavorites(favorites) {
			if (typeof localStorage === "undefined") return;
			try {
				localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favorites)));
			} catch {}
		}
		const TAG_MAP_ZH = {
			"Architecture & Spaces": "建筑空间",
			"Brand & Logos": "品牌 Logo",
			"Characters & People": "角色人物",
			"Charts & Infographics": "图表信息图",
			"Documents & Publishing": "文档出版",
			"History & Classical Themes": "历史古典",
			"Illustration & Art": "插画艺术",
			"Other Use Cases": "其他案例",
			"Photography & Realism": "摄影写真",
			"Posters & Typography": "海报排版",
			"Products & E-commerce": "产品电商",
			"Scenes & Storytelling": "场景故事",
			"UI & Interfaces": "UI 界面",
			"3D": "3D 渲染",
			"Architecture": "建筑空间",
			"Brand": "品牌视觉",
			"Character": "角色人物",
			"Characters": "人物群像",
			"Charts": "图表图解",
			"Classical": "古典艺术",
			"Documents": "文档出版",
			"History": "历史人文",
			"Illustration": "插画手绘",
			"Infographic": "信息图表",
			"Photography": "摄影写真",
			"Poster": "海报封面",
			"Product": "产品设计",
			"Products": "商业产品",
			"Realistic": "写实逼真",
			"Scenes": "场景概念",
			"UI": "UI 界面",
			"Commerce": "商业电商",
			"Creative": "创意设计",
			"Education": "教育科普",
			"Fashion": "时尚潮流",
			"Food": "美食餐饮",
			"Social": "社媒传播",
			"Story": "故事剧情",
			"Tech": "科技未来",
			"Travel": "旅游出行",
			"Art": "艺术创作",
			"Minimalist": "极简主义",
			"Vintage": "复古胶片",
			"Cyberpunk": "赛博朋克",
			"Anime": "二次元日系",
			"Watercolor": "水彩手绘",
			"Oil Painting": "油画质感"
		};
		function translateTag(name, lang) {
			if (lang !== "zh") return name;
			return TAG_MAP_ZH[name] ?? name;
		}
		const COPY = {
			zh: {
				kicker: "Prompt inspiration",
				title: "灵感素材",
				subtitle: "从公开案例中找构图、质感和文字处理，再带回工作台继续调整。",
				refresh: "检查更新",
				refreshing: "正在更新…",
				clearCache: "清理缓存",
				clearingCache: "正在清理…",
				cacheCleared: "已清空本地图片缓存",
				cacheClearFailed: "清理缓存失败",
				clearCacheRestart: "后端未就绪，请重启 DSH 后生效",
				clearModalTitle: "清理本地图片缓存？",
				clearModalDesc: "将删除本地保存的灵感素材图片以释放磁盘空间。案例列表、Prompt 和您的收藏夹不会受到任何影响，后续浏览时会自动重新拉取。",
				cancel: "取消",
				confirmClear: "确认清理",
				allCategories: "全部分类",
				allStyles: "全部风格",
				allScenes: "全部场景",
				categoryNav: "分类导航",
				search: "搜索案例、Prompt、风格…",
				results: "找到 {count} 个案例",
				noResults: "没有匹配的素材，换个关键词或筛选条件试试。",
				selectHint: "选择一张素材，查看完整 Prompt 并带回工作台。",
				prompt: "完整 Prompt",
				copy: "复制 Prompt",
				copied: "已复制",
				use: "使用这个 Prompt",
				source: "查看原来源",
				useReference: "提示词 + 参考图",
				referenceLoading: "获取参考图中…",
				referenceFailed: "参考图获取失败，请重试",
				loading: "正在读取素材库…",
				loadFailed: "素材库读取失败，请稍后重试。",
				copyFailed: "复制失败",
				retry: "重新加载",
				imageFailed: "图片暂时无法读取",
				featured: "精选",
				updated: "素材已更新（{count} 条）",
				updateFailed: "更新失败，仍在使用当前内置素材。",
				allLoaded: "已展示全部 {count} 个案例",
				onlyFavorites: "仅看收藏",
				noFavorites: "暂无收藏的灵感案例，浏览时点击星标即可收藏。",
				favorite: "收藏",
				favorited: "已收藏",
				zoomHint: "点击放大查看",
				close: "关闭",
				composeTab: "宝玉维度组合",
				composeHint: "五个维度自由拼接封面 Prompt，数据源自宝玉封图 skill（JimLiu/baoyu-skills，MIT）。",
				composeType: "类型",
				composePalette: "色板",
				composeRendering: "渲染",
				composeText: "文字",
				composeMood: "情绪",
				composeTitleLabel: "标题文字",
				composeTitlePlaceholder: "输入封面标题（文字层级含标题时必填）",
				composeTitleRequired: "该文字层级需要先填写标题。",
				composeRandomize: "随机组合",
				composeUse: "用此 Prompt 去生成",
				composeCombos: "共 {count} 种组合",
				composePreview: "拼接结果预览"
			},
			en: {
				kicker: "Prompt inspiration",
				title: "Inspiration",
				subtitle: "Explore public examples, then bring a prompt back to Studio to make it your own.",
				refresh: "Check updates",
				refreshing: "Updating…",
				clearCache: "Clear cache",
				clearingCache: "Clearing…",
				cacheCleared: "Local image cache cleared",
				cacheClearFailed: "Failed to clear cache",
				clearCacheRestart: "Backend not ready, please restart DSH",
				clearModalTitle: "Clear local image cache?",
				clearModalDesc: "This will delete locally cached inspiration images to free up disk space. The catalog, prompts, and your bookmarks will remain intact. Images will be re-fetched on demand.",
				cancel: "Cancel",
				confirmClear: "Clear Cache",
				allCategories: "All categories",
				allStyles: "All styles",
				allScenes: "All scenes",
				categoryNav: "Categories",
				search: "Search examples, prompts, styles…",
				results: "{count} examples",
				noResults: "No matching examples. Try another keyword or filter.",
				selectHint: "Choose an example to read its full prompt and use it in Studio.",
				prompt: "Full prompt",
				copy: "Copy prompt",
				copied: "Copied",
				use: "Use this prompt",
				source: "View source",
				useReference: "Prompt + reference",
				referenceLoading: "Fetching image…",
				referenceFailed: "Failed to load the reference image",
				loading: "Loading inspiration…",
				loadFailed: "Could not load the inspiration library.",
				copyFailed: "Failed to copy",
				retry: "Retry",
				imageFailed: "Image is temporarily unavailable",
				featured: "Featured",
				updated: "Updated ({count} examples)",
				updateFailed: "Update failed. The current bundled library is still available.",
				allLoaded: "All {count} examples displayed",
				onlyFavorites: "Favorites only",
				noFavorites: "No favorited examples yet. Click the star icon on any card to save.",
				favorite: "Favorite",
				favorited: "Favorited",
				zoomHint: "Click to zoom in",
				close: "Close",
				composeTab: "Baoyu Composer",
				composeHint: "Stitch a cover prompt from five dimensions, based on the baoyu cover-image skill (JimLiu/baoyu-skills, MIT).",
				composeType: "Type",
				composePalette: "Palette",
				composeRendering: "Rendering",
				composeText: "Text",
				composeMood: "Mood",
				composeTitleLabel: "Title text",
				composeTitlePlaceholder: "Cover title (required when the text level includes a title)",
				composeTitleRequired: "This text level needs a title first.",
				composeRandomize: "Randomize",
				composeUse: "Generate with this prompt",
				composeCombos: "{count} combinations",
				composePreview: "Composed prompt preview"
			}
		};
		const InspirationView = ({ locale, onUsePrompt, onUseReference }) => {
			const [language, setLanguage] = (0, react.useState)(() => locale?.getSnapshot?.().active?.startsWith("en") ? "en" : "zh");
			const [catalog, setCatalog] = (0, react.useState)(null);
			const [activeSourceId, setActiveSourceId] = (0, react.useState)("");
			const [baoyuSelection, setBaoyuSelection] = (0, react.useState)(BAOYU_DEFAULT_SELECTION);
			const [catalogError, setCatalogError] = (0, react.useState)(false);
			const [search, setSearch] = (0, react.useState)("");
			const [category, setCategory] = (0, react.useState)("");
			const [style, setStyle] = (0, react.useState)("");
			const [scene, setScene] = (0, react.useState)("");
			const [visibleLimit, setVisibleLimit] = (0, react.useState)(60);
			const [selected, setSelected] = (0, react.useState)(null);
			const [refreshing, setRefreshing] = (0, react.useState)(false);
			const [clearingCache, setClearingCache] = (0, react.useState)(false);
			const [confirmClearOpen, setConfirmClearOpen] = (0, react.useState)(false);
			const [copied, setCopied] = (0, react.useState)(false);
			const [favorites, setFavorites] = (0, react.useState)(() => loadInspirationFavorites());
			const [onlyFavorites, setOnlyFavorites] = (0, react.useState)(false);
			const [lightboxCase, setLightboxCase] = (0, react.useState)(null);
			const [toast, setToast] = (0, react.useState)(null);
			const [referenceBusy, setReferenceBusy] = (0, react.useState)(false);
			const [pendingJump, setPendingJump] = (0, react.useState)("");
			const [activeCategory, setActiveCategory] = (0, react.useState)("");
			const toastTimerRef = (0, react.useRef)(null);
			const sentinelRef = (0, react.useRef)(null);
			const listRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!locale?.subscribe) return;
				return locale.subscribe(() => setLanguage(locale.getSnapshot?.().active?.startsWith("en") ? "en" : "zh"));
			}, [locale]);
			const t = (key, values) => {
				let value = COPY[language][key] ?? COPY.zh[key];
				for (const [name, replacement] of Object.entries(values ?? {})) value = value.replace(`{${name}}`, replacement);
				return value;
			};
			const showToast = (text, isError = false) => {
				if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
				setToast({
					text,
					isError
				});
				toastTimerRef.current = window.setTimeout(() => {
					setToast(null);
					toastTimerRef.current = null;
				}, 2400);
			};
			const toggleFavorite = (id) => {
				setFavorites((prev) => {
					const next = new Set(prev);
					if (next.has(id)) next.delete(id);
					else next.add(id);
					saveInspirationFavorites(next);
					return next;
				});
			};
			const loadCatalog = async (method = "GET") => {
				const response = await fetch(`${INSPIRATION_ROUTE}/${method === "GET" ? "catalog" : "refresh"}`, {
					method,
					credentials: "same-origin"
				});
				const payload = await response.json().catch(() => null);
				if (!response.ok || payload === null || !("schemaVersion" in payload) || payload.schemaVersion !== 1) throw new Error(payload && "error" in payload && payload.error ? payload.error : t("loadFailed"));
				return payload;
			};
			const retryCatalog = async () => {
				setCatalogError(false);
				try {
					const data = await loadCatalog("GET");
					setCatalog(data);
					setSelected((previous) => previous === null ? data.sources[0]?.cases.find((item) => item.featured) ?? data.sources[0]?.cases[0] ?? null : previous);
				} catch {
					setCatalogError(true);
					showToast(t("loadFailed"), true);
				}
			};
			(0, react.useEffect)(() => {
				let mounted = true;
				setCatalogError(false);
				Promise.allSettled([loadCatalog(), loadCachedInspirationCatalog()]).then(([server, cache]) => {
					if (!mounted) return;
					const cached = cache.status === "fulfilled" ? cache.value : void 0;
					const next = resolveActiveCatalog(server.status === "fulfilled" ? server.value : void 0, cached);
					if (next === void 0) {
						setCatalogError(true);
						showToast(t("loadFailed"), true);
						return;
					}
					setCatalogError(false);
					setCatalog(next);
					setSelected((previous) => previous === null ? next.sources[0]?.cases.find((item) => item.featured) ?? next.sources[0]?.cases[0] ?? null : previous);
				});
				return () => {
					mounted = false;
				};
			}, []);
			const source = catalog?.sources.find((candidate) => candidate.id === activeSourceId) ?? catalog?.sources[0] ?? null;
			const composerActive = activeSourceId === BAOYU_COMPOSER_SOURCE_ID;
			/** Switch the active library; each source owns its own category/style/scene vocabularies. */
			const switchSource = (id) => {
				if (id === activeSourceId) return;
				setActiveSourceId(id);
				setCategory("");
				setStyle("");
				setScene("");
				setOnlyFavorites(false);
				setSelected(null);
				setPendingJump("");
				setActiveCategory("");
			};
			const useSelectedReference = async () => {
				if (selected === null || source === null || onUseReference === void 0) return;
				setReferenceBusy(true);
				try {
					const blob = await fetchInspirationImage(source.id, selected.id, source.imageRevision ?? source.version);
					const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "png";
					onUseReference(new File([blob], `inspiration-${selected.id}.${ext}`, { type: blob.type.startsWith("image/") ? blob.type : "image/webp" }), selected.prompt);
				} catch {
					showToast(t("referenceFailed"), true);
				} finally {
					setReferenceBusy(false);
				}
			};
			const matchingCases = (0, react.useMemo)(() => {
				if (source === null) return [];
				const query = search.trim().toLowerCase();
				return source.cases.filter((item) => {
					if (onlyFavorites && !favorites.has(item.id)) return false;
					if (category && item.category !== category) return false;
					if (style && !item.styles.includes(style)) return false;
					if (scene && !item.scenes.includes(scene)) return false;
					if (!query) return true;
					const translatedCat = translateTag(item.category, language);
					const translatedStyles = item.styles.map((s) => translateTag(s, language));
					const translatedScenes = item.scenes.map((s) => translateTag(s, language));
					return [
						item.title,
						item.prompt,
						item.category,
						translatedCat,
						...item.styles,
						...translatedStyles,
						...item.scenes,
						...translatedScenes
					].some((value) => value.toLowerCase().includes(query));
				});
			}, [
				source,
				search,
				category,
				style,
				scene,
				onlyFavorites,
				favorites,
				language
			]);
			(0, react.useEffect)(() => setVisibleLimit(60), [
				search,
				category,
				style,
				scene,
				onlyFavorites
			]);
			const visibleCases = matchingCases.slice(0, visibleLimit);
			const categoryCounts = (0, react.useMemo)(() => {
				const counts = /* @__PURE__ */ new Map();
				for (const item of matchingCases) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
				return counts;
			}, [matchingCases]);
			const visibleGroups = (0, react.useMemo)(() => {
				if (source === null) return [];
				const byCategory = /* @__PURE__ */ new Map();
				for (const item of visibleCases) {
					const bucket = byCategory.get(item.category);
					if (bucket !== void 0) bucket.push(item);
					else byCategory.set(item.category, [item]);
				}
				return source.categories.flatMap((name) => {
					const items = byCategory.get(name);
					return items !== void 0 ? [{
						name,
						items
					}] : [];
				});
			}, [source, visibleCases]);
			const visibleGroupSignature = visibleGroups.map((group) => group.name).join("\0");
			const jumpToCategory = (name) => {
				if (category !== "") setCategory("");
				setPendingJump(name);
			};
			(0, react.useEffect)(() => {
				if (pendingJump === "") return;
				const index = matchingCases.findIndex((item) => item.category === pendingJump);
				if (index < 0) return;
				if (index >= visibleLimit) {
					setVisibleLimit(index + 60);
					return;
				}
				const raf = requestAnimationFrame(() => {
					document.getElementById(`dsh-ig-cat-${encodeURIComponent(pendingJump)}`)?.scrollIntoView({
						behavior: "smooth",
						block: "start"
					});
					setPendingJump("");
				});
				return () => cancelAnimationFrame(raf);
			}, [
				pendingJump,
				matchingCases,
				visibleLimit
			]);
			(0, react.useEffect)(() => {
				const root = listRef.current;
				if (root === null) return;
				const headers = Array.from(root.querySelectorAll(".dsh-ig-inspiration-group-head"));
				if (headers.length === 0) return;
				const categoryByTarget = /* @__PURE__ */ new Map();
				for (const header of headers) categoryByTarget.set(header, header.dataset.category ?? "");
				const observer = new IntersectionObserver((entries) => {
					const visible = entries.find((entry) => entry.isIntersecting);
					if (visible !== void 0) setActiveCategory(categoryByTarget.get(visible.target) ?? "");
				}, { rootMargin: "0px 0px -75% 0px" });
				for (const header of headers) observer.observe(header);
				return () => observer.disconnect();
			}, [visibleGroupSignature]);
			(0, react.useEffect)(() => {
				const el = sentinelRef.current;
				if (!el) return;
				const observer = new IntersectionObserver((entries) => {
					if (entries.some((e) => e.isIntersecting)) setVisibleLimit((limit) => Math.min(limit + 48, matchingCases.length));
				}, { rootMargin: "360px" });
				observer.observe(el);
				return () => observer.disconnect();
			}, [matchingCases.length, visibleCases.length]);
			(0, react.useEffect)(() => {
				if (lightboxCase === null) return;
				const onKeyDown = (e) => {
					if (e.key === "Escape") setLightboxCase(null);
				};
				window.addEventListener("keydown", onKeyDown);
				return () => window.removeEventListener("keydown", onKeyDown);
			}, [lightboxCase]);
			const refresh = async () => {
				if (refreshing) return;
				setRefreshing(true);
				try {
					const next = await loadCatalog("POST");
					setCatalog(next);
					saveCachedInspirationCatalog(next);
					setSelected((previous) => previous === null ? next.sources[0]?.cases[0] ?? null : next.sources[0]?.cases.find((item) => item.id === previous.id) ?? next.sources[0]?.cases[0] ?? null);
					showToast(t("updated", { count: String(next.sources[0]?.cases.length ?? 0) }));
				} catch {
					showToast(t("updateFailed"), true);
				} finally {
					setRefreshing(false);
				}
			};
			const clearCache = async () => {
				if (clearingCache) return;
				setClearingCache(true);
				setConfirmClearOpen(false);
				try {
					await clearInspirationImageCache();
					const res = await fetch(`${INSPIRATION_ROUTE}/cache/clear`, {
						method: "POST",
						credentials: "same-origin"
					});
					if (!res.ok) {
						if (res.status === 404) throw new Error(t("clearCacheRestart"));
						throw new Error(`HTTP ${res.status}`);
					}
					showToast(t("cacheCleared"));
				} catch (err) {
					const msg = err instanceof Error && err.message ? err.message : t("cacheClearFailed");
					showToast(msg, true);
				} finally {
					setClearingCache(false);
				}
			};
			const copyPrompt = async () => {
				if (selected === null) return;
				try {
					await copyText(selected.prompt);
					setCopied(true);
					showToast(t("copied"));
					window.setTimeout(() => setCopied(false), 1800);
				} catch {
					showToast(t("copyFailed"), true);
				}
			};
			return (0, react_jsx_runtime.jsxs)("section", {
				className: "dsh-ig-inspiration",
				"aria-label": t("title"),
				children: [
					(0, react_jsx_runtime.jsxs)("header", {
						className: "dsh-ig-inspiration-head",
						children: [(0, react_jsx_runtime.jsxs)("div", { children: [
							(0, react_jsx_runtime.jsx)("p", {
								className: "dsh-ig-inspiration-kicker",
								children: t("kicker")
							}),
							(0, react_jsx_runtime.jsx)("h1", { children: t("title") }),
							(0, react_jsx_runtime.jsx)("p", {
								className: "dsh-ig-inspiration-subtitle",
								children: t("subtitle")
							})
						] }), (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-inspiration-head-actions",
							children: [(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dsh-ig-inspiration-clear-cache",
								onClick: () => setConfirmClearOpen(true),
								disabled: clearingCache,
								title: t("clearCache"),
								children: [clearingCache ? (0, react_jsx_runtime.jsx)(LoaderCircle, {
									className: "dsh-ig-spin",
									size: 13
								}) : (0, react_jsx_runtime.jsx)(Trash2, { size: 13 }), clearingCache ? t("clearingCache") : t("clearCache")]
							}), (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dsh-ig-inspiration-refresh",
								onClick: () => void refresh(),
								disabled: refreshing,
								title: t("refresh"),
								children: [refreshing ? (0, react_jsx_runtime.jsx)(LoaderCircle, {
									className: "dsh-ig-spin",
									size: 13
								}) : (0, react_jsx_runtime.jsx)(Sparkles, { size: 13 }), refreshing ? t("refreshing") : t("refresh")]
							})]
						})]
					}),
					catalogError ? (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-inspiration-empty is-catalog-error",
						children: [
							(0, react_jsx_runtime.jsx)(TriangleAlert, { size: 28 }),
							(0, react_jsx_runtime.jsx)("p", { children: t("loadFailed") }),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-inspiration-retry-btn",
								onClick: () => void retryCatalog(),
								children: t("retry")
							})
						]
					}) : source === null ? (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-inspiration-empty",
						children: [(0, react_jsx_runtime.jsx)(LoaderCircle, {
							className: "dsh-ig-spin",
							size: 23
						}), (0, react_jsx_runtime.jsx)("span", { children: t("loading") })]
					}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [catalog !== null ? (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-inspiration-sources",
						role: "tablist",
						children: [catalog.sources.map((item) => (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "tab",
							"aria-selected": !composerActive && item.id === source?.id,
							className: `dsh-ig-inspiration-source-chip ${!composerActive && item.id === source?.id ? "is-active" : ""}`,
							onClick: () => switchSource(item.id),
							children: item.label
						}, item.id)), (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							role: "tab",
							"aria-selected": composerActive,
							className: `dsh-ig-inspiration-source-chip ${composerActive ? "is-active" : ""}`,
							onClick: () => switchSource(BAOYU_COMPOSER_SOURCE_ID),
							children: [(0, react_jsx_runtime.jsx)(Sparkles, { size: 11 }), t("composeTab")]
						})]
					}) : null, composerActive ? (0, react_jsx_runtime.jsx)(BaoyuComposerPanel, {
						language,
						selection: baoyuSelection,
						onChange: setBaoyuSelection,
						onUsePrompt
					}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						(0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-inspiration-toolbar",
							children: [
								(0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-ig-inspiration-search",
									children: [(0, react_jsx_runtime.jsx)(Search, { size: 15 }), (0, react_jsx_runtime.jsx)("input", {
										value: search,
										onChange: (event) => setSearch(event.target.value),
										placeholder: t("search")
									})]
								}),
								(0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: `dsh-ig-inspiration-fav-filter ${onlyFavorites ? "is-active" : ""}`,
									onClick: () => setOnlyFavorites((prev) => !prev),
									title: t("onlyFavorites"),
									children: [(0, react_jsx_runtime.jsx)(Star, {
										size: 14,
										className: onlyFavorites ? "fill-star" : ""
									}), (0, react_jsx_runtime.jsxs)("span", { children: [t("onlyFavorites"), favorites.size > 0 ? ` (${favorites.size})` : ""] })]
								}),
								(0, react_jsx_runtime.jsxs)("select", {
									value: category,
									onChange: (event) => setCategory(event.target.value),
									"aria-label": t("allCategories"),
									children: [(0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: t("allCategories")
									}), source.categories.map((item) => (0, react_jsx_runtime.jsx)("option", {
										value: item,
										children: translateTag(item, language)
									}, item))]
								}),
								(0, react_jsx_runtime.jsxs)("select", {
									value: style,
									onChange: (event) => setStyle(event.target.value),
									"aria-label": t("allStyles"),
									children: [(0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: t("allStyles")
									}), source.styles.map((item) => (0, react_jsx_runtime.jsx)("option", {
										value: item,
										children: translateTag(item, language)
									}, item))]
								}),
								(0, react_jsx_runtime.jsxs)("select", {
									value: scene,
									onChange: (event) => setScene(event.target.value),
									"aria-label": t("allScenes"),
									children: [(0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: t("allScenes")
									}), source.scenes.map((item) => (0, react_jsx_runtime.jsx)("option", {
										value: item,
										children: translateTag(item, language)
									}, item))]
								})
							]
						}),
						(0, react_jsx_runtime.jsxs)("nav", {
							className: "dsh-ig-inspiration-catnav",
							"aria-label": t("categoryNav"),
							children: [(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `dsh-ig-inspiration-catnav-chip ${category === "" && activeCategory === "" ? "is-active" : ""}`,
								onClick: () => {
									if (category !== "") setCategory("");
									listRef.current?.scrollIntoView({
										behavior: "smooth",
										block: "start"
									});
								},
								children: [(0, react_jsx_runtime.jsx)("span", { children: t("allCategories") }), (0, react_jsx_runtime.jsx)("em", { children: matchingCases.length })]
							}), source.categories.map((name) => {
								const count = categoryCounts.get(name) ?? 0;
								const isActive = category === name || category === "" && activeCategory === name;
								return (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									disabled: count === 0,
									"aria-current": isActive || void 0,
									className: `dsh-ig-inspiration-catnav-chip ${isActive ? "is-active" : ""}`,
									onClick: () => jumpToCategory(name),
									children: [(0, react_jsx_runtime.jsx)("span", { children: translateTag(name, language) }), (0, react_jsx_runtime.jsx)("em", { children: count })]
								}, name);
							})]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-inspiration-layout",
							children: [(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-inspiration-summary",
								children: [(0, react_jsx_runtime.jsx)("strong", { children: t("results", { count: String(matchingCases.length) }) }), (0, react_jsx_runtime.jsx)("span", { children: source.version.slice(0, 8) })]
							}), matchingCases.length === 0 ? (0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ig-inspiration-empty",
								children: onlyFavorites ? t("noFavorites") : t("noResults")
							}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("div", {
								ref: listRef,
								className: "dsh-ig-inspiration-list",
								children: visibleGroups.map((group) => (0, react_jsx_runtime.jsxs)("section", {
									className: "dsh-ig-inspiration-group",
									children: [(0, react_jsx_runtime.jsxs)("h3", {
										id: `dsh-ig-cat-${encodeURIComponent(group.name)}`,
										"data-category": group.name,
										className: "dsh-ig-inspiration-group-head",
										children: [(0, react_jsx_runtime.jsx)("span", { children: translateTag(group.name, language) }), (0, react_jsx_runtime.jsx)("em", { children: categoryCounts.get(group.name) ?? group.items.length })]
									}), (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-ig-inspiration-grid",
										children: group.items.map((item) => (0, react_jsx_runtime.jsx)(InspirationCard, {
											item,
											sourceId: source.id,
											sourceRevision: source.imageRevision ?? source.version,
											selected: selected?.id === item.id,
											isFavorited: favorites.has(item.id),
											language,
											featuredLabel: t("featured"),
											retryLabel: t("retry"),
											onSelect: () => {
												setSelected(item);
												setCopied(false);
											},
											onToggleFavorite: () => toggleFavorite(item.id)
										}, item.id))
									})]
								}, group.name))
							}), visibleCases.length < matchingCases.length ? (0, react_jsx_runtime.jsx)("div", {
								ref: sentinelRef,
								style: {
									height: 32,
									margin: "16px 0"
								}
							}) : (0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ig-inspiration-end-hint",
								children: t("allLoaded", { count: String(matchingCases.length) })
							})] })] }), (0, react_jsx_runtime.jsx)("aside", {
								className: "dsh-ig-inspiration-inspector",
								children: selected === null ? (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-inspiration-inspector-empty",
									children: [(0, react_jsx_runtime.jsx)(Image$1, { size: 28 }), (0, react_jsx_runtime.jsx)("span", { children: t("selectHint") })]
								}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-inspiration-inspector-image",
									onClick: () => setLightboxCase({
										sourceId: source.id,
										caseId: selected.id,
										revision: source.imageRevision ?? source.version,
										title: selected.title,
										alt: selected.imageAlt
									}),
									title: t("zoomHint"),
									children: [(0, react_jsx_runtime.jsx)(InspirationImage, {
										sourceId: source.id,
										caseId: selected.id,
										revision: source.imageRevision ?? source.version,
										alt: selected.imageAlt,
										retryLabel: t("retry")
									}), (0, react_jsx_runtime.jsxs)("span", {
										className: "dsh-ig-inspiration-inspector-zoom-hint",
										children: [(0, react_jsx_runtime.jsx)(Maximize2, { size: 11 }), t("zoomHint")]
									})]
								}), (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-inspiration-inspector-body",
									children: [
										(0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-inspiration-inspector-head",
											children: [(0, react_jsx_runtime.jsx)("h2", { children: selected.title }), (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: `dsh-ig-inspiration-inspector-fav ${favorites.has(selected.id) ? "is-favorited" : ""}`,
												onClick: () => toggleFavorite(selected.id),
												title: favorites.has(selected.id) ? t("favorited") : t("favorite"),
												children: (0, react_jsx_runtime.jsx)(Star, {
													size: 15,
													className: favorites.has(selected.id) ? "fill-star" : ""
												})
											})]
										}),
										selected.sourceLabel && (0, react_jsx_runtime.jsx)("p", {
											className: "dsh-ig-inspiration-origin",
											children: selected.sourceLabel
										}),
										(0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-inspiration-tags",
											children: [(0, react_jsx_runtime.jsx)("span", { children: translateTag(selected.category, language) }), selected.styles.slice(0, 3).map((item) => (0, react_jsx_runtime.jsx)("span", { children: translateTag(item, language) }, item))]
										}),
										(0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-inspiration-prompt-label",
											children: [(0, react_jsx_runtime.jsx)("span", { children: t("prompt") }), (0, react_jsx_runtime.jsx)("span", { children: selected.prompt.length })]
										}),
										(0, react_jsx_runtime.jsx)("p", {
											className: "dsh-ig-inspiration-prompt",
											children: selected.prompt
										}),
										(0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-inspiration-actions",
											children: [
												(0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => void copyPrompt(),
													children: [copied ? (0, react_jsx_runtime.jsx)(Check, { size: 14 }) : (0, react_jsx_runtime.jsx)(Clipboard, { size: 14 }), copied ? t("copied") : t("copy")]
												}),
												selected.sourceUrl ?? selected.githubUrl ? (0, react_jsx_runtime.jsxs)("a", {
													className: "dsh-ig-inspiration-source-link",
													href: selected.sourceUrl ?? selected.githubUrl,
													target: "_blank",
													rel: "noreferrer",
													children: [(0, react_jsx_runtime.jsx)(ExternalLink, { size: 14 }), t("source")]
												}) : (0, react_jsx_runtime.jsx)("span", {}),
												(0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: "dsh-ig-inspiration-use",
													onClick: () => onUsePrompt(selected.prompt),
													children: [(0, react_jsx_runtime.jsx)(Sparkles, { size: 14 }), t("use")]
												}),
												onUseReference !== void 0 ? (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: "dsh-ig-inspiration-use is-secondary",
													disabled: referenceBusy,
													onClick: () => {
														useSelectedReference();
													},
													children: [(0, react_jsx_runtime.jsx)(ImagePlus, { size: 14 }), referenceBusy ? t("referenceLoading") : t("useReference")]
												}) : null
											]
										})
									]
								})] })
							})]
						})
					] })] }),
					lightboxCase !== null && (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-inspiration-lightbox",
						onClick: () => setLightboxCase(null),
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-inspiration-lightbox-content",
							onClick: (e) => e.stopPropagation(),
							children: [
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-ig-inspiration-lightbox-close",
									onClick: () => setLightboxCase(null),
									"aria-label": t("close"),
									children: (0, react_jsx_runtime.jsx)(X, { size: 18 })
								}),
								(0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-inspiration-lightbox-img-wrap",
									children: (0, react_jsx_runtime.jsx)(InspirationImage, {
										sourceId: lightboxCase.sourceId,
										caseId: lightboxCase.caseId,
										revision: lightboxCase.revision,
										alt: lightboxCase.alt,
										retryLabel: t("retry")
									})
								}),
								(0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-inspiration-lightbox-caption",
									children: lightboxCase.title
								})
							]
						})
					}),
					confirmClearOpen && (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-inspiration-modal-backdrop",
						onClick: () => setConfirmClearOpen(false),
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-inspiration-modal",
							onClick: (e) => e.stopPropagation(),
							role: "dialog",
							"aria-modal": "true",
							children: [
								(0, react_jsx_runtime.jsx)("h3", { children: t("clearModalTitle") }),
								(0, react_jsx_runtime.jsx)("p", { children: t("clearModalDesc") }),
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-inspiration-modal-actions",
									children: [(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-inspiration-modal-btn",
										onClick: () => setConfirmClearOpen(false),
										disabled: clearingCache,
										children: t("cancel")
									}), (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "dsh-ig-inspiration-modal-btn is-danger",
										onClick: () => void clearCache(),
										disabled: clearingCache,
										children: [clearingCache ? (0, react_jsx_runtime.jsx)(LoaderCircle, {
											className: "dsh-ig-spin",
											size: 13
										}) : null, t("confirmClear")]
									})]
								})
							]
						})
					}),
					toast !== null && (0, react_jsx_runtime.jsxs)("div", {
						className: `dsh-ig-inspiration-toast ${toast.isError ? "is-error" : "is-success"}`,
						role: "status",
						children: [toast.isError ? (0, react_jsx_runtime.jsx)(X, { size: 14 }) : (0, react_jsx_runtime.jsx)(Check, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: toast.text })]
					})
				]
			});
		};
		const BaoyuComposerPanel = ({ language, selection, onChange, onUsePrompt }) => {
			const [copied, setCopied] = (0, react.useState)(false);
			const [copyFailed, setCopyFailed] = (0, react.useState)(false);
			const tr = (key, params) => {
				let text = COPY[language][key] ?? COPY.zh[key];
				if (params) for (const [k, v] of Object.entries(params)) text = text.replace(`{${k}}`, v);
				return text;
			};
			const label = (id) => language === "zh" ? BAOYU_LABELS_ZH[id] ?? id : id;
			const needsTitle = selection.text !== "none";
			const titleReady = !needsTitle || selection.title.trim() !== "";
			let prompt = "";
			if (titleReady) try {
				prompt = composeBaoyuPrompt(selection);
			} catch {
				prompt = "";
			}
			const combos = BAOYU_TYPES.length * BAOYU_PALETTES.length * BAOYU_RENDERINGS.length * BAOYU_TEXT_LEVELS.length * BAOYU_MOODS.length;
			const dimension = (name, key, options) => (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-ig-baoyu-dim",
				children: [(0, react_jsx_runtime.jsx)("div", {
					className: "dsh-ig-baoyu-dim-head",
					children: name
				}), (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-ig-baoyu-chips",
					children: options.map((option) => {
						const palette = key === "palette" ? BAOYU_PALETTES.find((item) => item.id === option.id) : void 0;
						return (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `dsh-ig-baoyu-chip ${selection[key] === option.id ? "is-active" : ""}`,
							onClick: () => {
								onChange({
									...selection,
									[key]: option.id
								});
								setCopied(false);
							},
							title: language === "zh" ? palette?.tagline ?? option.id : option.id,
							children: [(0, react_jsx_runtime.jsx)("span", { children: label(option.id) }), palette !== void 0 ? (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-ig-baoyu-swatch",
								children: [
									palette.colors[0],
									palette.colors.find((color) => color.role === "Background"),
									palette.colors.find((color) => color.role === "Accent 1")
								].map((color, index) => color === void 0 ? null : (0, react_jsx_runtime.jsx)("i", { style: { background: color.hex } }, index))
							}) : null]
						}, option.id);
					})
				})]
			}, name);
			const copyPrompt = async () => {
				if (prompt === "") return;
				try {
					await navigator.clipboard.writeText(prompt);
					setCopied(true);
					setCopyFailed(false);
				} catch {
					setCopyFailed(true);
				}
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-ig-baoyu-panel",
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-baoyu-intro",
						children: [(0, react_jsx_runtime.jsx)("strong", {
							className: "dsh-ig-baoyu-combos",
							children: tr("composeCombos", { count: String(combos) })
						}), (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-ig-baoyu-hint",
							children: tr("composeHint")
						})]
					}),
					dimension(tr("composeType"), "type", BAOYU_TYPES),
					dimension(tr("composePalette"), "palette", BAOYU_PALETTES),
					dimension(tr("composeRendering"), "rendering", BAOYU_RENDERINGS),
					dimension(tr("composeText"), "text", BAOYU_TEXT_LEVELS),
					dimension(tr("composeMood"), "mood", BAOYU_MOODS),
					(0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-baoyu-dim",
						children: [
							(0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ig-baoyu-dim-head",
								children: tr("composeTitleLabel")
							}),
							(0, react_jsx_runtime.jsx)("input", {
								className: "dsh-ig-baoyu-title-input",
								value: selection.title,
								placeholder: tr("composeTitlePlaceholder"),
								disabled: selection.text === "none",
								onChange: (event) => {
									onChange({
										...selection,
										title: event.target.value
									});
									setCopied(false);
								}
							}),
							needsTitle && !titleReady ? (0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ig-baoyu-required",
								children: tr("composeTitleRequired")
							}) : null
						]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-baoyu-actions",
						children: [
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dsh-ig-baoyu-btn",
								onClick: () => onChange(randomBaoyuSelection(selection)),
								children: [(0, react_jsx_runtime.jsx)(Shuffle, { size: 13 }), (0, react_jsx_runtime.jsx)("span", { children: tr("composeRandomize") })]
							}),
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dsh-ig-baoyu-btn",
								disabled: prompt === "",
								onClick: () => {
									copyPrompt();
								},
								children: [copied ? (0, react_jsx_runtime.jsx)(Check, { size: 13 }) : (0, react_jsx_runtime.jsx)(Clipboard, { size: 13 }), (0, react_jsx_runtime.jsx)("span", { children: copied ? tr("copied") : tr("copy") })]
							}),
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dsh-ig-baoyu-btn is-primary",
								disabled: prompt === "",
								onClick: () => onUsePrompt(prompt),
								children: [(0, react_jsx_runtime.jsx)(Sparkles, { size: 13 }), (0, react_jsx_runtime.jsx)("span", { children: tr("composeUse") })]
							}),
							copyFailed ? (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-ig-baoyu-required",
								children: tr("copyFailed")
							}) : null
						]
					}),
					prompt !== "" ? (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-baoyu-preview-block",
						children: [(0, react_jsx_runtime.jsx)("div", {
							className: "dsh-ig-baoyu-preview-head",
							children: tr("composePreview")
						}), (0, react_jsx_runtime.jsx)("pre", {
							className: "dsh-ig-baoyu-preview",
							children: prompt
						})]
					}) : null
				]
			});
		};
		const InspirationCard = ({ item, sourceId, sourceRevision, selected, isFavorited, language, featuredLabel, retryLabel, onSelect, onToggleFavorite }) => (0, react_jsx_runtime.jsxs)("button", {
			type: "button",
			className: `dsh-ig-inspiration-card ${selected ? "is-selected" : ""}`,
			onClick: onSelect,
			children: [(0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-ig-inspiration-visual",
				children: [
					item.featured && (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-ig-inspiration-featured",
						children: [(0, react_jsx_runtime.jsx)(Sparkles, { size: 10 }), featuredLabel]
					}),
					(0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: `dsh-ig-inspiration-card-star ${isFavorited ? "is-favorited" : ""}`,
						onClick: (e) => {
							e.stopPropagation();
							onToggleFavorite();
						},
						"aria-label": "收藏",
						children: (0, react_jsx_runtime.jsx)(Star, {
							size: 13,
							className: isFavorited ? "fill-star" : ""
						})
					}),
					(0, react_jsx_runtime.jsx)(InspirationImage, {
						sourceId,
						caseId: item.id,
						revision: sourceRevision,
						alt: item.imageAlt,
						retryLabel
					})
				]
			}), (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-ig-inspiration-card-copy",
				children: [(0, react_jsx_runtime.jsx)("strong", { children: item.title }), (0, react_jsx_runtime.jsx)("span", { children: translateTag(item.category, language) })]
			})]
		});
		const InspirationImage = ({ sourceId, caseId, revision, alt, retryLabel = "Retry" }) => {
			const [node, setNode] = (0, react.useState)(null);
			const [visible, setVisible] = (0, react.useState)(false);
			const [url, setUrl] = (0, react.useState)(null);
			const [failed, setFailed] = (0, react.useState)(false);
			const urlRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (node === null) return;
				const observer = new IntersectionObserver((entries) => setVisible(entries.some((entry) => entry.isIntersecting)), { rootMargin: "320px" });
				observer.observe(node);
				return () => observer.disconnect();
			}, [node]);
			(0, react.useEffect)(() => {
				if (!visible) return;
				let active = true;
				setFailed(false);
				if (urlRef.current !== null) {
					URL.revokeObjectURL(urlRef.current);
					urlRef.current = null;
				}
				setUrl(null);
				fetchInspirationImage(sourceId, caseId, revision).then((blob) => {
					if (!active) return;
					const next = URL.createObjectURL(blob);
					if (urlRef.current !== null) URL.revokeObjectURL(urlRef.current);
					urlRef.current = next;
					setUrl(next);
				}).catch(() => {
					if (active) setFailed(true);
				});
				return () => {
					active = false;
				};
			}, [
				visible,
				sourceId,
				caseId,
				revision
			]);
			(0, react.useEffect)(() => {
				return () => {
					if (urlRef.current !== null) {
						URL.revokeObjectURL(urlRef.current);
						urlRef.current = null;
					}
				};
			}, []);
			return (0, react_jsx_runtime.jsx)("div", {
				ref: setNode,
				style: {
					width: "100%",
					height: "100%"
				},
				children: url !== null && !failed ? (0, react_jsx_runtime.jsx)("img", {
					src: url,
					alt,
					loading: "lazy",
					onError: () => {
						setFailed(true);
						evictInspirationImage(sourceId, caseId);
					}
				}) : (0, react_jsx_runtime.jsx)("div", {
					className: `dsh-ig-inspiration-image-placeholder ${failed ? "is-error" : ""}`,
					children: failed ? (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-ig-inspiration-retry-btn",
						onClick: (e) => {
							e.stopPropagation();
							setFailed(false);
							if (urlRef.current !== null) {
								URL.revokeObjectURL(urlRef.current);
								urlRef.current = null;
							}
							setUrl(null);
							evictInspirationImage(sourceId, caseId, revision).then(() => fetchInspirationImage(sourceId, caseId, revision)).then((blob) => {
								const next = URL.createObjectURL(blob);
								if (urlRef.current !== null) URL.revokeObjectURL(urlRef.current);
								urlRef.current = next;
								setUrl(next);
							}).catch(() => setFailed(true));
						},
						children: retryLabel
					}) : (0, react_jsx_runtime.jsx)(LoaderCircle, {
						className: "dsh-ig-spin",
						size: 18
					})
				})
			});
		};
		async function copyText(value) {
			if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
			const textarea = document.createElement("textarea");
			textarea.value = value;
			textarea.style.position = "fixed";
			textarea.style.opacity = "0";
			document.body.appendChild(textarea);
			textarea.select();
			const copied = document.execCommand("copy");
			textarea.remove();
			if (!copied) throw new Error("copy-failed");
		}
		function resolveActiveCatalog(bundled, cached) {
			if (!bundled) return cached;
			if (!cached) return bundled;
			const bundledSource = bundled.sources[0];
			const cachedSource = cached.sources[0];
			if (!bundledSource) return cached;
			if (!cachedSource) return bundled;
			if (bundledSource.version === cachedSource.version) return bundled;
			const bundledTime = bundledSource.updatedAt ? Date.parse(bundledSource.updatedAt) : NaN;
			const cachedTime = cachedSource.updatedAt ? Date.parse(cachedSource.updatedAt) : NaN;
			if (Number.isFinite(bundledTime) && Number.isFinite(cachedTime)) return cachedTime > bundledTime ? cached : bundled;
			return cachedSource.cases.length > bundledSource.cases.length ? cached : bundled;
		}
		//#endregion
		//#region lib/types/client/gallery-batch-bar.js
		/**
		* The batch bar is a fixed overlay at the page root, so it must only render on
		* the grid tabs; leaving them (studio/inspiration) hides it even if manage mode
		* or a selection somehow survives a tab switch.
		*/
		function shouldShowBatchBar(activeTab, isManageMode, selectedCount) {
			return (activeTab === "gallery" || activeTab === "favorites") && (isManageMode || selectedCount > 0);
		}
		//#endregion
		//#region lib/types/client/gallery-merge.js
		function sameStringArray(a, b) {
			if (a === b) return true;
			if (a === void 0 || b === void 0 || a.length !== b.length) return false;
			for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
			return true;
		}
		function sameOriginal(a, b) {
			if (a === b) return true;
			if (a === void 0 || b === void 0) return false;
			return a.key === b.key && a.bytes === b.bytes && a.mediaType === b.mediaType;
		}
		/** Content addressing makes these five fields the complete attachment identity. */
		function sameAttachment(a, b) {
			return a.attachmentId === b.attachmentId && a.mediaType === b.mediaType && a.bytes === b.bytes && a.width === b.width && a.height === b.height;
		}
		/**
		* Field-by-field comparison for one gallery record. Keep this list in sync with
		* GalleryItem: a field added there but missing here would silently keep the old
		* object and show stale data after a reload.
		*/
		function sameGalleryItem(a, b) {
			return a.id === b.id && sameAttachment(a.attachment, b.attachment) && a.prompt === b.prompt && a.provider === b.provider && a.channel === b.channel && a.model === b.model && a.createdAt === b.createdAt && a.aspectRatio === b.aspectRatio && a.imageSize === b.imageSize && a.resolution === b.resolution && a.generationQuality === b.generationQuality && a.watermark === b.watermark && a.output === b.output && a.seed === b.seed && a.savedTo === b.savedTo && Boolean(a.isFavorite) === Boolean(b.isFavorite) && sameStringArray(a.tags, b.tags) && a.workspacePath === b.workspacePath && a.workspaceId === b.workspaceId && a.sessionId === b.sessionId && sameStringArray(a.sourceAttachmentIds, b.sourceAttachmentIds) && sameOriginal(a.original, b.original);
		}
		/**
		* Reuse the previous object for every unchanged record so memoized cards keep
		* their identity after a full-table reload; only changed records get new
		* objects. The order always follows the incoming list.
		*/
		function mergeGalleryItems(prev, next) {
			if (prev.length === 0) return [...next];
			const byId = /* @__PURE__ */ new Map();
			for (const item of prev) byId.set(item.id, item);
			return next.map((item) => {
				const previous = byId.get(item.id);
				return previous !== void 0 && sameGalleryItem(previous, item) ? previous : item;
			});
		}
		//#endregion
		//#region lib/types/gif-info.js
		/**
		* Frame count, timing and size of a GIF, read from its block structure, plus
		* a speed change that rewrites only the frame delays: no decoding, no node
		* imports, so the browser bundle shares it.
		*/
		/**
		* Read every frame's delay. Returns undefined for anything that is not a GIF
		* with at least one intact frame: callers only decorate a successful result
		* with these facts, so a parse failure must never fail the image.
		*/
		function readGifInfo(bytes) {
			const delaysMs = [];
			return walkGif(bytes, (delayMs) => {
				delaysMs.push(delayMs);
			}) && delaysMs.length > 0 ? {
				frames: delaysMs.length,
				delaysMs,
				width: u16(bytes, 6),
				height: u16(bytes, 8)
			} : void 0;
		}
		/** The most common frame delay (the first one on a tie); 0 without frames. */
		function gifFrameDurationMs(delaysMs) {
			const counts = /* @__PURE__ */ new Map();
			for (const delay of delaysMs) counts.set(delay, (counts.get(delay) ?? 0) + 1);
			let winner = delaysMs[0] ?? 0;
			for (const [delay, count] of counts) if (count > (counts.get(winner) ?? 0)) winner = delay;
			return winner;
		}
		/**
		* Play a GIF faster or slower by rewriting the delay of every Graphic Control
		* Extension in place: same length, same pixels, so the result is still the
		* provider's file. 1x returns the input itself. A delay the browser treats as
		* "too short" (0 or 1 tick plays as 100 ms) is scaled from that effective
		* value, and the result never goes below 2 ticks, where it would fall back
		* into that same 100 ms rule and play slower instead of faster. Returns
		* undefined for anything the walker cannot trust, or a speed that is not a
		* positive number.
		*/
		function retimeGif(bytes, speed) {
			if (!(speed > 0) || !Number.isFinite(speed)) return void 0;
			if (speed === 1) return bytes;
			const offsets = [];
			if (!walkGif(bytes, (_delayMs, delayOffset) => {
				if (delayOffset !== void 0) offsets.push(delayOffset);
			})) return void 0;
			const out = Uint8Array.from(bytes);
			for (const offset of offsets) {
				const ticks = u16(bytes, offset);
				const next = Math.min(65535, Math.max(2, Math.round((ticks <= 1 ? 10 : ticks) / speed)));
				out[offset] = next & 255;
				out[offset + 1] = next >> 8;
			}
			return out;
		}
		/**
		* Walk the block sequence after the header and report each image descriptor
		* with the delay of the Graphic Control Extension that precedes it (and the
		* byte offset of that delay field, when there is one). The walk follows block
		* lengths instead of scanning for byte patterns because the LZW payload can
		* contain anything, including a fake `0x21 0xF9`. Returns true when every
		* block was intact: a missing trailer byte is tolerated, as decoders tolerate
		* it, but a cut block or an unknown block id is not.
		*/
		function walkGif(bytes, onFrame) {
			if (bytes.length < 13) return false;
			const signature = String.fromCharCode(...bytes.subarray(0, 6));
			if (signature !== "GIF87a" && signature !== "GIF89a") return false;
			let offset = 13 + colorTableBytes(bytes[10]);
			let pendingDelayMs = 0;
			let pendingDelayOffset;
			while (offset < bytes.length) {
				const block = bytes[offset];
				if (block === 59) return true;
				if (block === 33) {
					const label = bytes[offset + 1];
					if (label === void 0) return false;
					let cursor = offset + 2;
					let first = true;
					while (true) {
						const size = bytes[cursor];
						if (size === void 0) return false;
						if (size === 0) break;
						if (first && label === 249 && size >= 3) {
							pendingDelayOffset = cursor + 2;
							pendingDelayMs = u16(bytes, pendingDelayOffset) * 10;
						}
						first = false;
						cursor += 1 + size;
					}
					offset = cursor + 1;
					continue;
				}
				if (block === 44) {
					if (offset + 10 > bytes.length) return false;
					let cursor = offset + 10 + colorTableBytes(bytes[offset + 9]);
					cursor += 1;
					while (true) {
						const size = bytes[cursor];
						if (size === void 0) return false;
						if (size === 0) break;
						cursor += 1 + size;
					}
					onFrame(pendingDelayMs, pendingDelayOffset);
					pendingDelayMs = 0;
					pendingDelayOffset = void 0;
					offset = cursor + 1;
					continue;
				}
				return false;
			}
			return true;
		}
		function u16(bytes, offset) {
			return (bytes[offset] ?? 0) | (bytes[offset + 1] ?? 0) << 8;
		}
		/** Byte length of a colour table announced by a packed descriptor byte, 0 when absent. */
		function colorTableBytes(packed) {
			return (packed & 128) === 0 ? 0 : 3 * (1 << (packed & 7) + 1);
		}
		//#endregion
		//#region lib/types/client/conversation-regenerate.js
		/** Build the workbench request that reproduces a conversation image with an edited prompt. */
		function conversationRegenerateRequest(image, prompt, remembered) {
			if (!CLOUD_IMAGE_PROVIDERS.includes(image.provider)) throw new Error("当前图片使用的 Provider 暂不支持重新生成");
			const provider = image.provider;
			const settings = remembered ?? outputSettings(provider, image.output, image.model);
			return {
				mode: "generate",
				provider,
				...provider === "openai-compat" && image.channel !== void 0 ? { channel: image.channel } : {},
				model: image.model,
				prompt: prompt.trim(),
				ratio: settings.ratio,
				quality: settings.quality,
				...settings.resolution === void 0 ? {} : { resolution: settings.resolution },
				...settings.generationQuality === void 0 ? {} : { generationQuality: settings.generationQuality },
				...settings.watermark === void 0 ? {} : { watermark: settings.watermark }
			};
		}
		function outputSettings(provider, output, model = "") {
			const normalized = (output ?? "").trim();
			if (provider === "google") {
				const [rawRatio, rawQuality] = normalized.split(",").map((value) => value.trim());
				return {
					ratio: isRatio(rawRatio) ? rawRatio : "1:1",
					quality: rawQuality === "1K" || rawQuality === "2K" || rawQuality === "4K" ? rawQuality : "1K"
				};
			}
			if (provider === "seedream") return {
				ratio: "auto",
				quality: [
					"1K",
					"1.5K",
					"2K",
					"3K",
					"4K"
				].includes(normalized) ? normalized : "2K"
			};
			if (provider === "openai" || provider === "openai-compat" || provider === "xai" || provider === "zhipu") {
				const [size, qualityPart] = normalized.split(",").map((value) => value.trim());
				const requestedQuality = qualityPart?.startsWith("quality=") ? qualityPart.slice(8) : void 0;
				const resolution = provider === "openai" ? Object.values(officialSizeTable({}, model)).flatMap((tiers) => Object.entries(tiers)).find(([, pixels]) => pixels === size)?.[0] : void 0;
				return {
					ratio: ratioFromSize(size ?? "", "x"),
					quality: provider === "openai" ? requestedQuality ?? "auto" : "standard",
					...resolution === void 0 ? {} : { resolution },
					...provider === "openai-compat" && requestedQuality ? { generationQuality: requestedQuality } : {}
				};
			}
			return {
				ratio: ratioFromSize(normalized, "*"),
				quality: "standard"
			};
		}
		function ratioFromSize(size, separator) {
			const dimensions = size.split(separator).map(Number);
			if (dimensions.length === 2 && dimensions.every((value) => Number.isFinite(value) && value > 0)) {
				const target = dimensions[0] / dimensions[1];
				for (const ratio of [
					"1:1",
					"3:2",
					"2:3",
					"4:3",
					"3:4",
					"16:9",
					"9:16"
				]) {
					const [width, height] = ratio.split(":").map(Number);
					if (Math.abs(target - width / height) < .015) return ratio;
				}
			}
			return (separator === "x" ? {
				"1024x1024": "1:1",
				"1536x1024": "3:2",
				"1024x1536": "2:3"
			} : {
				"1024*1024": "1:1",
				"1536*1024": "3:2",
				"1024*1536": "2:3",
				"1664*928": "16:9",
				"928*1664": "9:16"
			})[size] ?? "1:1";
		}
		function isRatio(value) {
			return value === "1:1" || value === "3:2" || value === "2:3" || value === "4:3" || value === "3:4" || value === "16:9" || value === "9:16";
		}
		/**
		* Ask for a GIF again, keeping whichever of the current animation's frame
		* count, frame delay and frame size the provider contract accepts; an imported
		* GIF outside the contract on one of them falls back to the provider default
		* for that field alone.
		*/
		function gifOutputRequest(info) {
			if (info === void 0) return { format: "gif" };
			const frameDurationMs = gifFrameDurationMs(info.delaysMs);
			const frameSize = (edge) => edge > 0 && edge % 16 === 0 && edge <= 3840;
			return {
				format: "gif",
				...info.frames >= 2 && info.frames <= 16 ? { frameCount: info.frames } : {},
				...frameDurationMs >= 20 && frameDurationMs <= 2e3 ? { frameDurationMs } : {},
				...frameSize(info.width) && frameSize(info.height) ? { size: `${String(info.width)}x${String(info.height)}` } : {}
			};
		}
		//#endregion
		//#region lib/types/client/gallery-i18n.js
		/** Gallery copy for the zh/en dictionaries and their key union. */
		const DICT$1 = {
			zh: {
				tabGallery: "图库",
				tabStudio: "工作台",
				tabInspiration: "灵感",
				tabFavorites: "收藏",
				tabCompare: "对比",
				tabTasks: "任务",
				filterAllProviders: "全部提供商",
				filterGoogle: "Google Gemini",
				filterOpenAI: "OpenAI",
				filterOpenAICompat: "OpenAI 兼容",
				filterSeedream: "字节 Seedream",
				filterDashScope: "阿里 DashScope",
				filterXAI: "xAI Grok",
				filterZhipu: "智谱 GLM",
				filterComfyUI: "本地 ComfyUI",
				filterImport: "导入",
				importImages: "导入图片",
				importAdded: "已导入 {count} 张图片",
				importPartial: "导入 {count} 张，{fail} 张失败",
				importFailed: "导入失败",
				importPickHint: "选择要导入的图片（PNG/JPG/WebP/GIF）",
				filterAllModels: "全部模型",
				filterAllRatios: "全部比例",
				searchPlaceholder: "搜索 Prompt、标签…",
				filterCurrentWorkspace: "仅看此工作区",
				filterCurrentWorkspaceHint: "只展示属于当前工作区的生图记录与物理文件",
				sortNewest: "最新生成",
				sortOldest: "最早生成",
				totalCount: "共 {count} 张生成图片",
				emptyTitle: "暂无生图记录",
				emptyDesc: "在对话中让 Agent 生图后，生成的图片会自动收录到这里。",
				favEmptyTitle: "暂无收藏图片",
				favEmptyDesc: "在图库中点击卡片右下角的 ♡ 按钮，即可将喜爱的图片收录到这里。",
				noMatchTitle: "未找到匹配结果",
				noMatchDesc: "尝试更换搜索关键词或调整筛选条件。",
				copiedPrompt: "已复制 Prompt",
				copiedImage: "已复制图片",
				copyFailed: "复制失败",
				favoriteAdded: "已添加到收藏",
				favoriteRemoved: "已取消收藏",
				preview: "查看大图",
				download: "下载图片",
				copyImg: "复制图片",
				copyPpt: "复制 Prompt",
				regenerate: "重新生成",
				regenerateTitle: "重新生成图片",
				regenerateHint: "可按需修改 Prompt，基于当前模型和比例在画廊生成一张新图片。",
				confirmRegenerate: "开始生成",
				regenerating: "正在重新生成…",
				regenerateSuccess: "已生成新图片并收录到画廊",
				regenerateSaveFailed: "图片已生成，但保存到图库失败，请重试",
				regenerateFailed: "重新生成失败",
				delete: "从画廊删除",
				confirmDelete: "确定要从画廊中删除这张图片吗？若它是导入时被归一化/转码的原图，且没有其他图库或浏览器引用，原图也会永久删除。（不会影响原聊天记录）",
				deleted: "已从画廊删除",
				model: "模型",
				prompt: "Prompt",
				close: "关闭 (Esc)",
				prevImage: "上一张 (←)",
				nextImage: "下一张 (→)",
				manage: "批量管理",
				exitManage: "退出选择",
				selectedCount: "已选 {n} 项",
				selectAll: "全选",
				invertSelect: "反选",
				clearSelect: "清空",
				batchFavorite: "批量收藏",
				batchUnfavorite: "批量取消收藏",
				batchFavoritedToast: "已将 {count} 张图片加入收藏",
				batchUnfavoritedToast: "已取消 {count} 张图片的收藏",
				batchFavoriteFailed: "收藏操作失败，请重试",
				batchDownload: "批量下载",
				batchDownloading: "打包中 ({current}/{total})…",
				batchDownloadSingleToast: "已下载 1 张图片",
				batchDownloadZipToast: "已开始下载 {count} 张图片（ZIP）",
				batchDownloadComplete: "已下载 {count} 张图片（ZIP）",
				batchDownloadFailed: "批量下载失败，请重试",
				batchDownloadLimit: "选择过大：一次最多导出 2000 张，请分批下载",
				batchDelete: "批量删除",
				batchDeleteTitle: "确认批量删除选中的 {count} 张图片？",
				batchDeleteTitleSingle: "确认从画廊中删除这张图片？",
				batchDeleteDesc: "将从画廊历史记录中移除所选图片；其中导入时被归一化/转码的原图，若没有其他引用也会永久删除。",
				deleteWorkspaceFilesOpt: "同时清理工作区磁盘物理文件（不可恢复）",
				cancel: "取消",
				confirmBatchDelete: "确认删除 ({count})",
				confirmDeleteSingle: "确认删除",
				batchDeletedToast: "已删除 {count} 张图片",
				storageTitle: "存储占用",
				storageScanning: "扫描中…",
				storageAttachments: "附件对象",
				storageThumbs: "缩略图缓存（本地回退）",
				storageRequestCache: "请求图缓存",
				storageOrphans: "画廊未引用附件",
				storageItems: "{n} 个文件",
				storageOrphanHint: "只统计本图库记录未引用的对象；其他会话、画布或上传仍可能引用，导出清单不代表可安全删除。",
				storageThumbsHint: "服务端缩略图正常时，本地回退缓存保持为空；320px 缩略图计入请求图缓存。",
				storageExport: "导出孤儿清单",
				storageScanFailed: "存储统计失败",
				storageClose: "关闭",
				batchDeletedWithFilesToast: "已删除 {count} 张图片，并清理了 {files} 个工作区文件",
				deleteFailedFileLocked: "已删除 {count} 张图片，但有 {files} 个文件因被系统占用未能删除",
				deleteFailedDatabase: "删除失败：本地数据库操作异常",
				justNow: "刚刚",
				minutesAgo: "{n} 分钟前",
				hoursAgo: "{n} 小时前",
				daysAgo: "{n} 天前",
				studioTitle: "AI 图像工作台 (Studio)",
				studioDesc: "工作台模块正在紧锣密鼓开发中。在此你将体验大图精修、变体生成 (Variations)、参数重调并一键将生成结果无缝插回 DSH 正在进行的对话。",
				studioTip: "💡 提示：目前你可以在“图库”中点击任意图片，在弹窗中进行查看、复制与下载。",
				compareTitle: "多模型横向对比 (Compare)",
				compareDesc: "支持单个 Prompt 一键同时调度 Gemini、Seedream、DashScope 及本地 ComfyUI 模型并排生成，直观横评画质与细节。",
				tasksTitle: "异步任务队列 (Tasks)",
				tasksDesc: "集中管理后台批量生图、多模型并发生成与本地 ComfyUI 耗时任务。支持状态追踪、失败重试与执行耗时分析。",
				comingSoonBadge: "即将推出"
			},
			en: {
				tabGallery: "Gallery",
				tabStudio: "Studio",
				tabInspiration: "Inspiration",
				tabFavorites: "Favorites",
				tabCompare: "Compare",
				tabTasks: "Tasks",
				filterAllProviders: "All Providers",
				filterGoogle: "Google Gemini",
				filterOpenAI: "OpenAI",
				filterOpenAICompat: "OpenAI-compatible",
				filterSeedream: "ByteDance Seedream",
				filterDashScope: "Aliyun DashScope",
				filterXAI: "xAI Grok",
				filterZhipu: "Zhipu GLM",
				filterComfyUI: "Local ComfyUI",
				filterImport: "Imported",
				importImages: "Import images",
				importAdded: "Imported {count} images",
				importPartial: "Imported {count}, {fail} failed",
				importFailed: "Import failed",
				importPickHint: "Choose images to import (PNG/JPG/WebP/GIF)",
				filterAllModels: "All Models",
				filterAllRatios: "All Ratios",
				searchPlaceholder: "Search prompt, tags…",
				filterCurrentWorkspace: "Current workspace only",
				filterCurrentWorkspaceHint: "Only show images belonging to the active workspace",
				sortNewest: "Newest first",
				sortOldest: "Oldest first",
				totalCount: "{count} images total",
				emptyTitle: "No images generated yet",
				emptyDesc: "Images generated during conversations will automatically appear here.",
				favEmptyTitle: "No favorite images yet",
				favEmptyDesc: "Click the ♡ button on any card in the gallery to collect your favorite images here.",
				noMatchTitle: "No matching images",
				noMatchDesc: "Try a different search keyword or adjust filter criteria.",
				copiedPrompt: "Prompt copied",
				copiedImage: "Image copied",
				copyFailed: "Copy failed",
				favoriteAdded: "Added to favorites",
				favoriteRemoved: "Removed from favorites",
				preview: "Full Preview",
				download: "Download",
				copyImg: "Copy Image",
				copyPpt: "Copy Prompt",
				regenerate: "Regenerate",
				regenerateTitle: "Regenerate Image",
				regenerateHint: "Edit prompt if needed. A new image will be generated and added to the gallery.",
				confirmRegenerate: "Generate",
				regenerating: "Regenerating…",
				regenerateSuccess: "New image generated and added to gallery",
				regenerateSaveFailed: "Image generated, but saving to the gallery failed. Please retry.",
				regenerateFailed: "Regeneration failed",
				delete: "Delete from gallery",
				confirmDelete: "Remove this image from the gallery? If it is a normalized imported original with no other gallery or browser references, the stored original will also be permanently deleted. (Chat history is unaffected.)",
				deleted: "Deleted from gallery",
				model: "Model",
				prompt: "Prompt",
				close: "Close (Esc)",
				prevImage: "Previous (←)",
				nextImage: "Next (→)",
				manage: "Batch Manage",
				exitManage: "Done",
				selectedCount: "{n} selected",
				selectAll: "Select All",
				invertSelect: "Invert",
				clearSelect: "Clear",
				batchFavorite: "Batch Favorite",
				batchUnfavorite: "Batch Unfavorite",
				batchFavoritedToast: "Added {count} images to favorites",
				batchUnfavoritedToast: "Removed {count} images from favorites",
				batchFavoriteFailed: "Favorite operation failed, please retry",
				batchDownload: "Batch Download",
				batchDownloading: "Packaging ({current}/{total})…",
				batchDownloadSingleToast: "Downloaded 1 image",
				batchDownloadZipToast: "Started downloading {count} images (ZIP)",
				batchDownloadComplete: "Downloaded {count} images (ZIP)",
				batchDownloadFailed: "Batch download failed, please retry",
				batchDownloadLimit: "Selection too large: up to 2000 images per export. Please split it.",
				batchDelete: "Batch Delete",
				batchDeleteTitle: "Delete {count} selected images?",
				batchDeleteTitleSingle: "Delete this image from gallery?",
				batchDeleteDesc: "These images will be removed from gallery history; normalized imported originals will also be permanently deleted when no other references remain.",
				deleteWorkspaceFilesOpt: "Also delete files from workspace disk (cannot be undone)",
				cancel: "Cancel",
				confirmBatchDelete: "Delete ({count})",
				confirmDeleteSingle: "Delete",
				batchDeletedToast: "Deleted {count} images",
				storageTitle: "Storage usage",
				storageScanning: "Scanning…",
				storageAttachments: "Attachment objects",
				storageThumbs: "Thumbnail cache (local fallback)",
				storageRequestCache: "Request-image cache",
				storageOrphans: "Gallery-unreferenced attachments",
				storageItems: "{n} files",
				storageOrphanHint: "Counts objects not referenced by this gallery; other sessions, the canvas, or uploads may still use them. The exported list is not a safe-deletion list.",
				storageThumbsHint: "The local fallback stays empty while server thumbnails work; 320px thumbnails count as request-image cache.",
				storageExport: "Export orphan list",
				storageScanFailed: "Storage scan failed",
				storageClose: "Close",
				batchDeletedWithFilesToast: "Deleted {count} images and cleaned {files} workspace files",
				deleteFailedFileLocked: "Deleted {count} images, but {files} files could not be deleted (busy/locked)",
				deleteFailedDatabase: "Failed to delete: local database error",
				justNow: "Just now",
				minutesAgo: "{n}m ago",
				hoursAgo: "{n}h ago",
				daysAgo: "{n}d ago",
				studioTitle: "AI Image Studio",
				studioDesc: "Studio workbench is under active development. Fine-tune prompts, generate variations (2x/4x), and inject images directly into DSH chat.",
				studioTip: "💡 Tip: You can currently click any image in the Gallery to preview, copy, or download it.",
				compareTitle: "Model Comparison (Compare)",
				compareDesc: "Side-by-side multi-model benchmarking coming soon. Test Gemini, Seedream, DashScope, and ComfyUI with a single prompt.",
				tasksTitle: "Task Queue (Tasks)",
				tasksDesc: "Centralized view for batch generation, asynchronous ComfyUI runs, live progress tracking, and retry controls.",
				comingSoonBadge: "Coming Soon"
			}
		};
		//#endregion
		//#region lib/types/client/gallery-format.js
		function formatRelativeTime(timestamp, t) {
			const diff = Date.now() - timestamp;
			if (diff < 6e4) return t("justNow");
			if (diff < 36e5) {
				const mins = Math.max(1, Math.floor(diff / 6e4));
				return t("minutesAgo", { n: String(mins) });
			}
			if (diff < 864e5) {
				const hours = Math.floor(diff / 36e5);
				return t("hoursAgo", { n: String(hours) });
			}
			if (diff < 2592e6) {
				const days = Math.floor(diff / 864e5);
				return t("daysAgo", { n: String(days) });
			}
			const d = new Date(timestamp);
			return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
		}
		function hasImageDimensions(item) {
			const { width, height } = item.attachment;
			return Number.isSafeInteger(width) && width > 0 && Number.isSafeInteger(height) && height > 0;
		}
		/** Extract standard aspect ratio for precise filtering */
		function getItemRatio(item) {
			if ((item.provider === "import" || item.provider === "chatgpt-sub") && hasImageDimensions(item)) {
				const actual = item.attachment.width / item.attachment.height;
				for (const [label, value] of [
					["1:1", 1],
					["16:9", 16 / 9],
					["9:16", 9 / 16],
					["4:3", 4 / 3],
					["3:4", 3 / 4],
					["3:2", 3 / 2],
					["2:3", 2 / 3]
				]) if (Math.abs(actual / value - 1) < .08) return label;
				return "custom";
			}
			if (item.aspectRatio && item.aspectRatio !== "custom") return item.aspectRatio;
			if (item.output) {
				const ratioMatch = item.output.match(/\b(1:1|16:9|9:16|4:3|3:4|3:2|2:3)\b/);
				if (ratioMatch?.[1]) return ratioMatch[1];
				const dimMatch = item.output.match(/(\d{3,4})\s*[×x*]\s*(\d{3,4})/);
				if (dimMatch?.[1] && dimMatch[2]) {
					const w = parseInt(dimMatch[1], 10);
					const h = parseInt(dimMatch[2], 10);
					if (w === h) return "1:1";
					const approx = w / h;
					if (Math.abs(approx - 16 / 9) < .05) return "16:9";
					if (Math.abs(approx - 9 / 16) < .05) return "9:16";
					if (Math.abs(approx - 4 / 3) < .05) return "4:3";
					if (Math.abs(approx - 3 / 4) < .05) return "3:4";
					if (Math.abs(approx - 3 / 2) < .05) return "3:2";
					if (Math.abs(approx - 2 / 3) < .05) return "2:3";
				}
			}
			return "1:1";
		}
		/** Format aspect ratio or dimensions for card metadata (e.g., 1024×1024 or 16:9) */
		function formatCardMeta(item) {
			if (item.provider === "import" && hasImageDimensions(item)) return `${item.attachment.width}×${item.attachment.height}`;
			if (item.output) {
				const dimMatch = item.output.match(/(\d{3,4})\s*[×x*]\s*(\d{3,4})/);
				if (dimMatch?.[1] && dimMatch[2]) return `${dimMatch[1]}×${dimMatch[2]}`;
			}
			if (item.aspectRatio && item.aspectRatio !== "custom") return item.aspectRatio;
			if (item.output) {
				const ratioMatch = item.output.match(/\b(1:1|16:9|9:16|4:3|3:4|3:2|2:3)\b/);
				if (ratioMatch?.[1]) return ratioMatch[1];
			}
			if (item.imageSize) return item.imageSize;
			return "1:1";
		}
		//#endregion
		//#region lib/types/client/gif-player.js
		/**
		* Frame-accurate GIF playback for the conversation card: a small external
		* store that owns the decoded frames and the clock, a stage that paints the
		* current frame, and a control bar. Frames are decoded only while a stage is
		* visible and only within a memory budget; otherwise the GIF plays natively in
		* an <img>, which still animates but cannot pause, seek or change speed.
		*/
		/** Range and step of the speed control: one decimal is enough to fine-tune around 1x. */
		const GIF_SPEED_MIN = .2;
		const GIF_SPEED_STEP = .1;
		/** Decoded bitmap bytes one card may hold, and all cards together; beyond either the GIF plays natively. */
		const DECODE_BUDGET_BYTES = 100663296;
		const DECODE_MAX_FRAMES = 512;
		/** Shortest tick the clock schedules, so 2x on a 20 ms GIF cannot spin the timer. */
		const MIN_TICK_MS = 20;
		/** A stage starts decoding one viewport early and releases one viewport late. */
		const VISIBILITY_MARGIN = "100%";
		function nextFrameIndex(index, total, delta = 1) {
			return total <= 0 ? 0 : ((index + delta) % total + total) % total;
		}
		/** Delays are rounded to the 10 ms ticks a retimed download stores, so the preview plays at the file's speed. */
		function scheduledDelayMs(delayMs, speed) {
			return Math.max(MIN_TICK_MS, Math.round(delayMs / speed / 10) * 10);
		}
		/** A speed on the control's grid and within its range; anything unreadable is 1x. */
		function snapSpeed(speed) {
			if (!Number.isFinite(speed)) return 1;
			return Math.min(2, Math.max(GIF_SPEED_MIN, Math.round(speed * 10) / 10));
		}
		function formatSpeed(speed) {
			return String(Math.round(speed * 10) / 10);
		}
		/**
		* The delay a browser plays a frame for: its own decoder's duration when it
		* reports one, else the header delay; either way a delay of at most 10 ms is
		* shown for 100 ms, as the <img> element and the retimed download do.
		*/
		function playedDelayMs(durationUs, headerMs) {
			const ms = durationUs !== null && durationUs !== void 0 && durationUs > 0 ? Math.round(durationUs / 1e3) : headerMs;
			return ms <= 10 ? 100 : ms;
		}
		/**
		* The lightbox shortcut for a key, given the element that holds focus. A
		* focused control keeps only the keys it handles itself (a button its Space
		* and Enter, the frame scrubber its arrows and Home/End), so stepping still
		* works after the mouse has clicked a button, while a text field keeps all.
		*/
		function gifKeyboardAction(key, target) {
			const action = {
				" ": "toggle",
				ArrowLeft: "previous",
				ArrowRight: "next",
				Home: "first",
				End: "last"
			}[key];
			if (action === void 0 || target === null) return action;
			const tag = target.tagName.toUpperCase();
			if (tag === "BUTTON") return key === " " || key === "Enter" ? void 0 : action;
			if (tag === "INPUT" && target.type === "range") return action === "toggle" ? action : void 0;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return void 0;
			return action;
		}
		/** File-name suffix for a download at a non-default speed. */
		function speedSuffix(speed) {
			return speed === 1 ? "" : `-${formatSpeed(speed)}x`;
		}
		/** "Download GIF", naming the speed only when it is not the file's own. */
		function gifDownloadLabel(t, speed) {
			return speed === 1 ? t("gifDownload") : t("gifDownloadSpeed", { speed: formatSpeed(speed) });
		}
		function decodedBytesOf(info) {
			return info.frames * info.width * info.height * 4;
		}
		/** Judged from the header before anything is decoded: the GIF alone, and together with what other cards already hold; a header without a screen size cannot be judged. */
		function withinDecodeBudget(info, usedBytes) {
			const bytes = decodedBytesOf(info);
			return info.width > 0 && info.height > 0 && info.frames <= DECODE_MAX_FRAMES && bytes <= DECODE_BUDGET_BYTES && usedBytes + bytes <= 268435456;
		}
		/** Bitmap bytes currently held by every player, so cards share one budget. */
		let decodedBytesInUse = 0;
		/** Visible players the shared budget turned away; a release wakes them, as no visibility event would. */
		const waitingForBudget = /* @__PURE__ */ new Set();
		function createGifPlayer(blob, overrides = {}) {
			const deps = {
				...browserDeps(),
				...overrides
			};
			const listeners = /* @__PURE__ */ new Set();
			const visibleStages = /* @__PURE__ */ new Set();
			let snapshot = {
				status: "native",
				info: void 0,
				index: 0,
				playing: true,
				scrubbing: false,
				speed: 1,
				frames: [],
				delaysMs: []
			};
			/** The frame a paused player returns to after a scrub. */
			let chosenIndex = 0;
			let bytes;
			let timer;
			let heldBytes = 0;
			let decodeToken = 0;
			let disposed = false;
			const url = typeof URL !== "undefined" && typeof URL.createObjectURL === "function" ? URL.createObjectURL(blob) : void 0;
			const set = (patch) => {
				snapshot = {
					...snapshot,
					...patch
				};
				for (const listener of listeners) listener();
			};
			const frameCount = () => snapshot.frames.length || snapshot.info?.frames || 0;
			const stopClock = () => {
				if (timer === void 0) return;
				deps.clearTimeout(timer);
				timer = void 0;
			};
			const schedule = () => {
				stopClock();
				if (disposed || snapshot.status !== "ready" || !snapshot.playing || snapshot.scrubbing || visibleStages.size === 0 || deps.hidden()) return;
				timer = deps.setTimeout(() => {
					timer = void 0;
					set({ index: nextFrameIndex(snapshot.index, snapshot.frames.length) });
					schedule();
				}, scheduledDelayMs(snapshot.delaysMs[snapshot.index] ?? 100, snapshot.speed));
			};
			const giveBack = (bytes) => {
				if (bytes === 0) return;
				decodedBytesInUse -= bytes;
				for (const retry of [...waitingForBudget]) retry();
			};
			/** Return the share of the frames this player holds; a decode in flight returns its own share when it settles. */
			const returnBudget = () => {
				const bytes = heldBytes;
				heldBytes = 0;
				giveBack(bytes);
			};
			/** Drop the frames (and any decode in flight) but keep index, speed and playing for the next decode. */
			const release = () => {
				stopClock();
				decodeToken += 1;
				for (const frame of snapshot.frames) frame.close();
				returnBudget();
				set({
					status: snapshot.status === "fallback" ? "fallback" : "native",
					frames: [],
					delaysMs: []
				});
			};
			const maybeDecode = () => {
				waitingForBudget.delete(maybeDecode);
				if (disposed || visibleStages.size === 0 || snapshot.status !== "native") return;
				const info = snapshot.info;
				if (info === void 0) return;
				if (!withinDecodeBudget(info, 0)) {
					set({ status: "fallback" });
					return;
				}
				if (!withinDecodeBudget(info, decodedBytesInUse)) {
					waitingForBudget.add(maybeDecode);
					return;
				}
				const token = ++decodeToken;
				const reserved = decodedBytesOf(info);
				decodedBytesInUse += reserved;
				set({ status: "decoding" });
				deps.decode(blob, info).then((decoded) => {
					if (token !== decodeToken) {
						for (const frame of decoded?.frames ?? []) frame.close();
						giveBack(reserved);
						return;
					}
					if (decoded === void 0 || decoded.frames.length === 0) {
						giveBack(reserved);
						set({ status: "fallback" });
						return;
					}
					heldBytes = reserved;
					set({
						status: "ready",
						frames: decoded.frames,
						delaysMs: decoded.delaysMs,
						index: Math.min(snapshot.index, decoded.frames.length - 1)
					});
					schedule();
				}, () => {
					giveBack(reserved);
					if (token !== decodeToken) return;
					set({ status: "fallback" });
				});
			};
			blob.arrayBuffer().then((buffer) => {
				if (disposed) return;
				bytes = new Uint8Array(buffer);
				set({ info: readGifInfo(bytes) });
				maybeDecode();
			}, () => void 0);
			const onVisibilityChange = () => {
				if (deps.hidden()) stopClock();
				else schedule();
			};
			const doc = typeof document !== "undefined" && typeof document.addEventListener === "function" ? document : void 0;
			doc?.addEventListener("visibilitychange", onVisibilityChange);
			const pause = () => {
				if (!snapshot.playing) return;
				stopClock();
				set({ playing: false });
			};
			const play = () => {
				if (snapshot.playing) return;
				set({ playing: true });
				schedule();
			};
			const clampIndex = (index) => Math.min(Math.max(Math.trunc(index), 0), frameCount() - 1);
			const choose = (index) => {
				stopClock();
				chosenIndex = index;
				set({
					playing: false,
					index
				});
			};
			const seek = (index) => {
				if (frameCount() === 0) return;
				choose(clampIndex(index));
			};
			const scrub = (index) => {
				if (frameCount() === 0) return;
				if (!snapshot.scrubbing) chosenIndex = snapshot.index;
				stopClock();
				set({
					scrubbing: true,
					index: clampIndex(index)
				});
			};
			const endScrub = () => {
				if (!snapshot.scrubbing) return;
				set({
					scrubbing: false,
					index: snapshot.playing ? snapshot.index : chosenIndex
				});
				schedule();
			};
			return {
				blob,
				url,
				bytes: () => bytes,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				getSnapshot: () => snapshot,
				setVisible: (stage, visible) => {
					if (disposed) return;
					if (visible) visibleStages.add(stage);
					else visibleStages.delete(stage);
					if (visibleStages.size === 0) {
						waitingForBudget.delete(maybeDecode);
						if (snapshot.status === "ready" || snapshot.status === "decoding") release();
						return;
					}
					if (snapshot.status === "ready") schedule();
					else maybeDecode();
				},
				play,
				pause,
				toggle: () => {
					if (snapshot.playing) pause();
					else play();
				},
				seek,
				scrub,
				endScrub,
				step: (delta) => {
					const total = frameCount();
					if (total === 0) return;
					choose(nextFrameIndex(snapshot.index, total, delta));
				},
				first: () => {
					seek(0);
				},
				last: () => {
					seek(frameCount() - 1);
				},
				setSpeed: (speed) => {
					set({ speed: snapSpeed(speed) });
				},
				captureFrame: async () => {
					const frame = snapshot.frames[snapshot.index];
					if (frame === void 0) return void 0;
					return deps.encodeFrame(frame);
				},
				dispose: () => {
					if (disposed) return;
					waitingForBudget.delete(maybeDecode);
					release();
					disposed = true;
					listeners.clear();
					doc?.removeEventListener("visibilitychange", onVisibilityChange);
					if (url !== void 0) URL.revokeObjectURL(url);
				}
			};
		}
		function browserDeps() {
			return {
				decode: decodeWithWebCodecs,
				encodeFrame: encodeFramePng,
				hidden: () => typeof document !== "undefined" && document.hidden,
				setTimeout: (fn, ms) => setTimeout(fn, ms),
				clearTimeout: (handle) => {
					clearTimeout(handle);
				}
			};
		}
		/**
		* WebCodecs hands out frames already composited by disposal method. Each
		* VideoFrame is closed as soon as its bitmap exists.
		*/
		async function decodeWithWebCodecs(blob, info) {
			if (typeof ImageDecoder === "undefined" || !await ImageDecoder.isTypeSupported("image/gif")) return void 0;
			const decoder = new ImageDecoder({
				data: await blob.arrayBuffer(),
				type: "image/gif"
			});
			const frames = [];
			const delaysMs = [];
			try {
				await decoder.completed;
				await decoder.tracks.ready;
				const count = decoder.tracks.selectedTrack?.frameCount ?? info.frames;
				for (let index = 0; index < count; index += 1) {
					const { image } = await decoder.decode({ frameIndex: index });
					try {
						frames.push(await createImageBitmap(image));
						delaysMs.push(playedDelayMs(image.duration, info.delaysMs[index] ?? 100));
					} finally {
						image.close();
					}
				}
				return {
					frames,
					delaysMs
				};
			} catch (error) {
				for (const frame of frames) frame.close();
				throw error;
			} finally {
				decoder.close();
			}
		}
		async function encodeFramePng(frame) {
			if (typeof document === "undefined") return void 0;
			const canvas = document.createElement("canvas");
			canvas.width = frame.width;
			canvas.height = frame.height;
			const context = canvas.getContext("2d");
			if (context === null) return void 0;
			context.drawImage(frame, 0, 0);
			return new Promise((resolve) => {
				canvas.toBlob((result) => {
					resolve(result ?? void 0);
				}, "image/png");
			});
		}
		/**
		* Paint one composited frame on the stage canvas. The canvas is cleared first:
		* a frame can hold transparent pixels after disposal compositing, and
		* source-over would leave the previous frame showing through them. A bitmap
		* released between render and effect has zero size; drawing it would throw,
		* so it is skipped.
		*/
		function paintGifFrame(canvas, frame) {
			if (frame.width === 0) return;
			const context = canvas.getContext("2d");
			if (context === null) return;
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.drawImage(frame, 0, 0);
		}
		/** Own a player for the current GIF blob; a new blob replaces and disposes the previous player. */
		function useGifPlayer(blob) {
			const [player, setPlayer] = (0, react.useState)();
			(0, react.useEffect)(() => {
				if (blob === void 0) {
					setPlayer(void 0);
					return;
				}
				const next = createGifPlayer(blob);
				setPlayer(next);
				return () => {
					next.dispose();
				};
			}, [blob]);
			return player;
		}
		const noSubscription$1 = () => () => {};
		/** Status alone, so the card re-renders on readiness rather than on every frame. */
		function useGifStatus(player) {
			const status = () => player?.getSnapshot().status;
			return (0, react.useSyncExternalStore)(player?.subscribe ?? noSubscription$1, status, status);
		}
		function useGifSpeed(player) {
			const speed = () => player?.getSnapshot().speed;
			return (0, react.useSyncExternalStore)(player?.subscribe ?? noSubscription$1, speed, speed);
		}
		function useGifPlaying(player) {
			const playing = () => player.getSnapshot().playing;
			return (0, react.useSyncExternalStore)(player.subscribe, playing, playing);
		}
		/** Whether the file's bytes are read: the speed and a speed-named download need them, frames do not. */
		function useGifReadable(player) {
			const readable = () => player?.getSnapshot().info !== void 0;
			return (0, react.useSyncExternalStore)(player?.subscribe ?? noSubscription$1, readable, readable);
		}
		/** Every change, including each frame; only components that draw the frame should use it. */
		function useGifSnapshot(player) {
			return (0, react.useSyncExternalStore)(player.subscribe, player.getSnapshot, player.getSnapshot);
		}
		/** Paints the current frame on a canvas once decoded; the raw GIF plays in an <img> until then or when decoding is not possible. */
		function GifStage({ player, stage, className, alt, poster, onClick, onDragStart }) {
			const snapshot = useGifSnapshot(player);
			const stageRef = (0, react.useRef)(null);
			const canvasRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const element = stageRef.current;
				if (element === null) return;
				if (typeof IntersectionObserver === "undefined") {
					player.setVisible(stage, true);
					return () => {
						player.setVisible(stage, false);
					};
				}
				const observer = new IntersectionObserver((entries) => {
					player.setVisible(stage, entries.some((entry) => entry.isIntersecting));
				}, { rootMargin: VISIBILITY_MARGIN });
				observer.observe(element);
				return () => {
					observer.disconnect();
					player.setVisible(stage, false);
				};
			}, [player, stage]);
			const frame = snapshot.status === "ready" ? snapshot.frames[snapshot.index] : void 0;
			(0, react.useEffect)(() => {
				const canvas = canvasRef.current;
				if (canvas === null || frame === void 0) return;
				paintGifFrame(canvas, frame);
			}, [frame]);
			const first = snapshot.frames[0];
			const draggable = onDragStart === void 0 ? void 0 : true;
			const still = !snapshot.playing && snapshot.status !== "fallback" ? poster : void 0;
			return (0, react_jsx_runtime.jsx)("div", {
				ref: stageRef,
				className: "dsh-ig-gif-stage",
				children: frame !== void 0 && first !== void 0 ? (0, react_jsx_runtime.jsx)("canvas", {
					ref: canvasRef,
					className,
					width: first.width,
					height: first.height,
					role: "img",
					"aria-label": alt,
					draggable,
					onClick,
					onDragStart
				}) : (0, react_jsx_runtime.jsx)("img", {
					className,
					src: still ?? player.url,
					alt,
					draggable,
					onClick,
					onDragStart
				})
			});
		}
		//#endregion
		//#region lib/types/client/gif-filmstrip.js
		/** The frame under a pointer: one equal cell per frame across the strip; the ends hold outside it. */
		function filmstripFrameAt(x, width, total) {
			if (total <= 0 || width <= 0) return 0;
			return Math.min(total - 1, Math.max(0, Math.floor(x / width * total)));
		}
		/** The centred source rectangle that fills a cell without stretching the frame. */
		function coverCrop(frameW, frameH, cellW, cellH) {
			const scale = Math.max(cellW / frameW, cellH / frameH);
			const sw = cellW / scale;
			const sh = cellH / scale;
			return {
				sx: (frameW - sw) / 2,
				sy: (frameH - sh) / 2,
				sw,
				sh
			};
		}
		function paintStrip(canvas, frames, width, height) {
			const ratio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
			canvas.width = Math.round(width * ratio);
			canvas.height = Math.round(height * ratio);
			const context = canvas.getContext("2d");
			if (context === null) return;
			context.clearRect(0, 0, canvas.width, canvas.height);
			const cell = canvas.width / frames.length;
			frames.forEach((frame, index) => {
				if (frame.width === 0) return;
				const x = Math.round(index * cell);
				const w = Math.round((index + 1) * cell) - x;
				const { sx, sy, sw, sh } = coverCrop(frame.width, frame.height, w, canvas.height);
				context.drawImage(frame, sx, sy, sw, sh, x, 0, w, canvas.height);
			});
		}
		/**
		* The frame timeline, as ChatGPT draws it: every frame in an equal cell and a
		* playhead on the current one. Hovering previews a frame on the stage without
		* changing play state; a press stops on it, and a drag keeps choosing. Keys
		* are handled here and kept from the page, whose arrows turn gallery pages.
		*/
		function GifFilmstrip({ player, t, hint, marks }) {
			const snapshot = useGifSnapshot(player);
			const stripRef = (0, react.useRef)(null);
			const canvasRef = (0, react.useRef)(null);
			const [size, setSize] = (0, react.useState)();
			const ready = snapshot.status === "ready";
			const total = snapshot.frames.length || snapshot.info?.frames || 0;
			const index = Math.min(snapshot.index, Math.max(total - 1, 0));
			(0, react.useEffect)(() => {
				const element = stripRef.current;
				if (element === null || typeof ResizeObserver === "undefined") return;
				const observer = new ResizeObserver(([entry]) => {
					if (entry !== void 0) setSize({
						width: entry.contentRect.width,
						height: entry.contentRect.height
					});
				});
				observer.observe(element);
				return () => {
					observer.disconnect();
				};
			}, []);
			(0, react.useEffect)(() => {
				const canvas = canvasRef.current;
				if (canvas === null || size === void 0 || snapshot.frames.length === 0) return;
				paintStrip(canvas, snapshot.frames, size.width, size.height);
			}, [snapshot.frames, size]);
			(0, react.useEffect)(() => () => {
				player.endScrub();
			}, [player]);
			const frameAt = (event) => {
				const rect = event.currentTarget.getBoundingClientRect();
				return filmstripFrameAt(event.clientX - rect.left, rect.width, total);
			};
			const onPointerDown = (event) => {
				if (!ready) return;
				event.currentTarget.setPointerCapture(event.pointerId);
				player.seek(frameAt(event));
			};
			const onPointerMove = (event) => {
				if (!ready) return;
				if (event.currentTarget.hasPointerCapture(event.pointerId)) player.seek(frameAt(event));
				else if (event.pointerType === "mouse") player.scrub(frameAt(event));
			};
			const onKeyDown = (event) => {
				if (!ready) return;
				const action = {
					ArrowLeft: () => {
						player.step(-1);
					},
					ArrowRight: () => {
						player.step(1);
					},
					Home: () => {
						player.first();
					},
					End: () => {
						player.last();
					},
					" ": () => {
						player.toggle();
					}
				}[event.key];
				if (action === void 0) return;
				event.preventDefault();
				event.stopPropagation();
				action();
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: stripRef,
				className: "dsh-ig-gif-strip",
				role: "slider",
				tabIndex: ready ? 0 : -1,
				"aria-disabled": !ready,
				"aria-label": t("gifFrames"),
				"aria-valuemin": 1,
				"aria-valuemax": Math.max(total, 1),
				"aria-valuenow": index + 1,
				"aria-valuetext": t("gifFrameOf", {
					current: String(index + 1),
					total: String(total)
				}),
				title: hint ?? t("gifStripHint"),
				onPointerDown,
				onPointerMove,
				onPointerLeave: () => {
					player.endScrub();
				},
				onPointerCancel: () => {
					player.endScrub();
				},
				onKeyDown,
				children: [
					(0, react_jsx_runtime.jsx)("canvas", {
						ref: canvasRef,
						"aria-hidden": "true"
					}),
					total > 0 ? [...marks ?? []].filter((frame) => frame < total).map((frame) => (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-ig-gif-strip-mark",
						"aria-hidden": "true",
						style: { left: `${String((frame + .5) / total * 100)}%` }
					}, frame)) : null,
					ready && total > 0 ? (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-ig-gif-strip-head",
						"aria-hidden": "true",
						style: { left: `${String((index + .5) / total * 100)}%` }
					}) : null
				]
			});
		}
		//#endregion
		//#region lib/types/client/gif-menus.js
		/**
		* Close a popup on a press outside it or on Escape, returning focus to its
		* trigger. Escape is taken in the capture phase and stopped, so the lightbox
		* listening on the window stays open.
		*/
		function useDismiss(open, close, root, trigger) {
			(0, react.useEffect)(() => {
				if (!open) return;
				const onPointerDown = (event) => {
					if (event.target instanceof Node && root.current?.contains(event.target) !== true) close();
				};
				const onKeyDown = (event) => {
					if (event.key !== "Escape") return;
					event.preventDefault();
					event.stopPropagation();
					close();
					trigger.current?.focus();
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				document.addEventListener("keydown", onKeyDown, true);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown, true);
					document.removeEventListener("keydown", onKeyDown, true);
				};
			}, [open]);
		}
		function usePopup(onOpenChange) {
			const [open, setOpen] = (0, react.useState)(false);
			const root = (0, react.useRef)(null);
			const trigger = (0, react.useRef)(null);
			const latest = (0, react.useRef)({
				open,
				onOpenChange
			});
			latest.current = {
				open,
				onOpenChange
			};
			const change = (next) => {
				setOpen(next);
				onOpenChange?.(next);
			};
			(0, react.useEffect)(() => () => {
				if (latest.current.open) latest.current.onOpenChange?.(false);
			}, []);
			useDismiss(open, () => {
				change(false);
			}, root, trigger);
			return {
				open,
				root,
				trigger,
				toggle: () => {
					change(!open);
				},
				close: () => {
					change(false);
				}
			};
		}
		const FASTER = (0, react_jsx_runtime.jsxs)("svg", {
			width: "18",
			height: "18",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			"aria-hidden": "true",
			children: [(0, react_jsx_runtime.jsx)("path", { d: "M4 17a8 8 0 0 1 16 0" }), (0, react_jsx_runtime.jsx)("path", { d: "M12 17l4.5-5" })]
		});
		const SLOWER = (0, react_jsx_runtime.jsxs)("svg", {
			width: "18",
			height: "18",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			"aria-hidden": "true",
			children: [(0, react_jsx_runtime.jsx)("path", { d: "M4 17a8 8 0 0 1 16 0" }), (0, react_jsx_runtime.jsx)("path", { d: "M12 17l-4.5-5" })]
		});
		/**
		* The speed slider: a native range for keys and assistive tech, drawn as a
		* vertical track. It carries no numbers; the trigger shows the value.
		*/
		function GifSpeedPanel({ speed, t, onChange }) {
			const percent = (value) => `${String((value - GIF_SPEED_MIN) / 1.8 * 100)}%`;
			const style = {
				"--dsh-ig-speed-pct": percent(speed),
				"--dsh-ig-speed-one": percent(2.2 - 1)
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-ig-speed-panel",
				role: "dialog",
				"aria-label": t("gifSpeed"),
				onClick: (event) => {
					event.stopPropagation();
				},
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						className: "dsh-ig-speed-icon",
						title: t("gifFaster"),
						children: FASTER
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-speed-track",
						style,
						children: [
							(0, react_jsx_runtime.jsx)("span", { className: "dsh-ig-speed-rail" }),
							(0, react_jsx_runtime.jsx)("span", { className: "dsh-ig-speed-fill" }),
							(0, react_jsx_runtime.jsx)("span", { className: "dsh-ig-speed-one" }),
							(0, react_jsx_runtime.jsx)("span", { className: "dsh-ig-speed-knob" }),
							(0, react_jsx_runtime.jsx)("input", {
								className: "dsh-ig-speed-input",
								type: "range",
								min: GIF_SPEED_MIN,
								max: 2,
								step: GIF_SPEED_STEP,
								value: speed,
								"aria-label": t("gifSpeed"),
								"aria-valuetext": `${formatSpeed(speed)}×`,
								title: t("gifSpeedHint"),
								autoFocus: true,
								onChange: (event) => {
									onChange(Number(event.target.value));
								},
								onDoubleClick: () => {
									onChange(1);
								}
							})
						]
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: "dsh-ig-speed-icon",
						title: t("gifSlower"),
						children: SLOWER
					})
				]
			});
		}
		/** The speed trigger and its panel: a chip on the card, a button in the lightbox bar. */
		function GifSpeedControl({ player, t, variant, onOpenChange }) {
			const speed = useGifSpeed(player) ?? 1;
			const readable = useGifReadable(player);
			const popup = usePopup(onOpenChange);
			const label = `${formatSpeed(speed)}×`;
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: popup.root,
				className: `dsh-ig-speed dsh-ig-speed-${variant}`,
				children: [(0, react_jsx_runtime.jsx)("button", {
					ref: popup.trigger,
					type: "button",
					className: variant === "chip" ? "dsh-ig-gif-chip dsh-ig-speed-trigger" : "dsh-ig-speed-trigger",
					title: t("gifSpeed"),
					"aria-label": `${t("gifSpeed")} ${label}`,
					"aria-haspopup": "dialog",
					"aria-expanded": popup.open,
					disabled: !readable,
					onClick: (event) => {
						event.stopPropagation();
						popup.toggle();
					},
					children: label
				}), popup.open ? (0, react_jsx_runtime.jsx)(GifSpeedPanel, {
					speed,
					t,
					onChange: (value) => {
						player.setSpeed(value);
					}
				}) : null]
			});
		}
		/** The GIF at the speed it plays, the original timing when that differs, and the frame on screen (one-based). */
		function gifDownloadItems(t, speed, framesReady, frame) {
			return [
				{
					kind: "gif",
					label: gifDownloadLabel(t, speed),
					hint: speed === 1 ? t("gifDownloadHintOriginal") : t("gifDownloadHintSpeed"),
					disabled: false
				},
				...speed === 1 ? [] : [{
					kind: "original",
					label: t("gifDownloadOriginal"),
					hint: t("gifDownloadOriginalHint"),
					disabled: false
				}],
				{
					kind: "frame",
					label: t("gifDownloadFrame"),
					hint: t("gifDownloadFrameHint", { frame: String(frame) }),
					disabled: !framesReady
				}
			];
		}
		const DOWNLOAD_ICON = (0, react_jsx_runtime.jsxs)("svg", {
			width: "16",
			height: "16",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": "true",
			children: [
				(0, react_jsx_runtime.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
				(0, react_jsx_runtime.jsx)("polyline", { points: "7 10 12 15 17 10" }),
				(0, react_jsx_runtime.jsx)("line", {
					x1: "12",
					y1: "15",
					x2: "12",
					y2: "3"
				})
			]
		});
		const CARET = (0, react_jsx_runtime.jsx)("svg", {
			width: "11",
			height: "11",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2.5",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": "true",
			children: (0, react_jsx_runtime.jsx)("polyline", { points: "6 9 12 15 18 9" })
		});
		const DOWNLOAD_TRIGGER_CLASS = {
			toolbar: "dsh-ig-tool-btn",
			lightbox: "dsh-ig-gif-action",
			gallery: "dsh-ig-lightbox-btn"
		};
		function GifDownloadMenu({ player, t, variant, onDownload, onOpenChange }) {
			const popup = usePopup(onOpenChange);
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: popup.root,
				className: `dsh-ig-dl dsh-ig-dl-${variant}`,
				children: [(0, react_jsx_runtime.jsxs)("button", {
					ref: popup.trigger,
					type: "button",
					className: DOWNLOAD_TRIGGER_CLASS[variant],
					title: t("gifDownloadMenu"),
					"aria-label": t("gifDownloadMenu"),
					"aria-haspopup": "menu",
					"aria-expanded": popup.open,
					onClick: (event) => {
						event.stopPropagation();
						popup.toggle();
					},
					children: [
						DOWNLOAD_ICON,
						variant === "toolbar" ? null : (0, react_jsx_runtime.jsx)("span", { children: t("gifDownloadMenu") }),
						CARET
					]
				}), popup.open ? (0, react_jsx_runtime.jsx)(GifDownloadList, {
					player,
					t,
					onPick: (kind) => {
						popup.close();
						onDownload(kind);
					}
				}) : null]
			});
		}
		/** The open menu; it alone follows the frame on screen, so a closed trigger never re-renders per frame. */
		function GifDownloadList({ player, t, onPick }) {
			const { speed, status, index } = useGifSnapshot(player);
			return (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-ig-dl-menu",
				role: "menu",
				"aria-label": t("gifDownloadMenu"),
				onClick: (event) => {
					event.stopPropagation();
				},
				children: gifDownloadItems(t, speed, status === "ready", index + 1).map((item) => (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					role: "menuitem",
					className: "dsh-ig-dl-item",
					disabled: item.disabled,
					onClick: () => {
						onPick(item.kind);
					},
					children: [(0, react_jsx_runtime.jsx)("span", { children: item.label }), (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-ig-dl-hint",
						children: item.hint
					})]
				}, item.kind))
			});
		}
		//#endregion
		//#region lib/types/client/gif-controls.js
		/**
		* The lightbox player: play/pause, the frame strip and the speed. The bar is
		* in place from the first render; frame controls wait for decoded frames,
		* the speed only for the file's bytes, which a speed-named download retimes.
		*/
		function GifPlayerBar({ player, t, className, trailing, stripHint, marks }) {
			const status = useGifStatus(player);
			const playing = useGifPlaying(player);
			const playLabel = playing ? t("gifPause") : t("gifPlay");
			return (0, react_jsx_runtime.jsxs)("div", {
				className: className === void 0 ? "dsh-ig-gif-bar" : `dsh-ig-gif-bar ${className}`,
				role: "toolbar",
				"aria-label": t("gifControls"),
				title: status === "fallback" ? t("gifControlsUnavailable") : void 0,
				onClick: (event) => {
					event.stopPropagation();
				},
				children: [
					(0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-ig-gif-play",
						"aria-label": playLabel,
						title: playing ? t("gifPauseTitle") : t("gifPlayTitle"),
						disabled: status !== "ready",
						onClick: () => {
							player.toggle();
						},
						children: playing ? (0, react_jsx_runtime.jsxs)("svg", {
							width: "18",
							height: "18",
							viewBox: "0 0 24 24",
							fill: "currentColor",
							"aria-hidden": "true",
							children: [(0, react_jsx_runtime.jsx)("rect", {
								x: "6",
								y: "4",
								width: "4",
								height: "16",
								rx: "1"
							}), (0, react_jsx_runtime.jsx)("rect", {
								x: "14",
								y: "4",
								width: "4",
								height: "16",
								rx: "1"
							})]
						}) : (0, react_jsx_runtime.jsx)("svg", {
							width: "18",
							height: "18",
							viewBox: "0 0 24 24",
							fill: "currentColor",
							"aria-hidden": "true",
							children: (0, react_jsx_runtime.jsx)("path", { d: "M7 4.5v15a1 1 0 0 0 1.5.87l13-7.5a1 1 0 0 0 0-1.74l-13-7.5A1 1 0 0 0 7 4.5z" })
						})
					}),
					(0, react_jsx_runtime.jsx)(GifFilmstrip, {
						player,
						t,
						hint: stripHint,
						marks
					}),
					(0, react_jsx_runtime.jsx)(GifSpeedControl, {
						player,
						t,
						variant: "bar"
					}),
					trailing
				]
			});
		}
		//#endregion
		//#region lib/types/client/gif-i18n.js
		/**
		* Copy for the GIF player and the card's saved-file opener, kept apart from
		* the plugin dictionary so this UI ships as its own files.
		*/
		const GIF_TEXT = {
			zh: {
				gifBadge: "GIF 动图",
				openInSidebar: "在右侧栏打开",
				notSavedVersion: "这个版本没有保存到工作区",
				gifControls: "GIF 播放控制",
				gifPlay: "播放 GIF",
				gifPause: "暂停 GIF",
				gifPlayTitle: "播放 GIF（空格）",
				gifPauseTitle: "暂停 GIF（空格）",
				gifFrames: "GIF 帧",
				gifFrameOf: "第 {current} 帧，共 {total} 帧",
				gifStripHint: "悬停预览，点击停在这一帧，← → 逐帧",
				gifStripHintGallery: "悬停预览，点击停在这一帧；焦点在这里时 ← → 逐帧，其它时候 ← → 翻页",
				gifSpeed: "播放速度",
				gifSpeedHint: "拖动调整播放速度（0.2×–2×），双击恢复 1×",
				gifFaster: "更快",
				gifSlower: "更慢",
				gifDownloadMenu: "下载",
				gifDownload: "下载 GIF",
				gifDownloadSpeed: "下载 GIF（{speed}×）",
				gifDownloadHintOriginal: "原速动图",
				gifDownloadHintSpeed: "按当前播放速度",
				gifDownloadOriginal: "下载原速 GIF",
				gifDownloadOriginalHint: "不改变帧时长",
				gifDownloadFrame: "下载当前帧（PNG）",
				gifDownloadFrameHint: "第 {frame} 帧，静态图",
				gifCopyFrame: "复制当前帧（静态图）",
				gifCopyFirstFrame: "复制首帧（静态图）",
				gifCopiedFrame: "已复制第 {current}/{total} 帧（静态图）；要动图请下载或拖出",
				gifCopiedFirstFrame: "已复制首帧（静态图）；要动图请下载或拖出",
				gifCopyFailed: "复制失败",
				gifClose: "关闭（Esc）",
				gifControlsUnavailable: "此环境不支持逐帧控制，动图仍可下载",
				gifEdit: "编辑",
				gifEditChipTitle: "逐帧写修改意见，让 AI 重新画这个动图",
				gifEditToggle: "编辑帧",
				gifEditEnterTitle: "暂停在当前帧，点画面写修改意见",
				gifEditExitTitle: "退出编辑",
				gifEditTooManyFrames: "超过 16 帧的动图暂不支持按帧修改",
				gifEditDecodeFailed: "无法解码动图，暂不能按帧修改",
				gifEditDecoding: "正在解码动图帧…",
				gifEditNotLoaded: "动图帧尚未加载，暂不能按帧修改",
				gifEditHint: "在画面上点一下写评论；评论只显示在它所在的那一帧，可以换帧继续加，最后一次发送。",
				gifEditSheetHint: "所有帧平铺成一张网格图，点任意一格放评论，就是给那一帧写修改意见。",
				gifEditLayerLabel: "在第 {frame} 帧上放评论",
				gifEditView: "显示方式",
				gifGifView: "动图",
				gifSheetView: "全部帧",
				gifFrameComments: "第 {current} 帧 · 共 {count} 条评论",
				gifSheetComments: "共 {total} 帧 · {count} 条评论",
				gifCommentPlaceholder: "添加评论…",
				gifCommentNew: "在第 {frame} 帧添加评论",
				gifCommentPublish: "发表评论",
				gifCommentPublishTitle: "发表（Enter）",
				gifCommentEdit: "编辑评论 {index}",
				gifCommentView: "查看评论",
				gifCommentSheetTitle: "第 {frame} 帧：{text}",
				gifCommentLabel: "评论 {index}（第 {frame} 帧）",
				gifCommentSave: "保存",
				gifCommentDelete: "删除评论",
				gifCommentsClear: "清空",
				gifCommentsClearConfirm: "确定清空全部 {count} 条评论吗？",
				gifEditCancel: "取消",
				gifSend: "发送 ({count})",
				gifSending: "发送中…",
				gifEditDone: "已按评论重绘",
				gifEditSaveFailed: "已按评论重绘，但保存到图库失败，请重试",
				gifEditFailed: "按帧修改失败",
				gifEditFailedNotice: "按帧修改失败：{reason}",
				gifEditFailedHint: "通常是该渠道的图生图接口不接受这次请求（如不支持 images/edits 或 GIF 输出）；可改为描述后重新生成。",
				gifEditStill: "渠道返回的是静态图，动画未保留；评论仍留在上一版本。",
				gifEditFallbackRegenerate: "改为描述后重新生成（不保留原动画）",
				gifEditFallbackHint: "评论已改写成文字要求附在提示词后。这会整段重新生成，不保留原动画；可继续修改后确认。",
				gifSheetTooLarge: "动图太大，无法生成参考拼图"
			},
			en: {
				gifBadge: "Animated GIF",
				openInSidebar: "Open in the sidebar",
				notSavedVersion: "This version was not saved to the workspace",
				gifControls: "GIF playback controls",
				gifPlay: "Play GIF",
				gifPause: "Pause GIF",
				gifPlayTitle: "Play GIF (Space)",
				gifPauseTitle: "Pause GIF (Space)",
				gifFrames: "GIF frames",
				gifFrameOf: "Frame {current} of {total}",
				gifStripHint: "Hover to preview, click to stop on this frame, ← → to step",
				gifStripHintGallery: "Hover to preview, click to stop on this frame; ← → step frames while this has focus and turn pages otherwise",
				gifSpeed: "Playback speed",
				gifSpeedHint: "Drag to change the playback speed (0.2×–2×); double-click for 1×",
				gifFaster: "Faster",
				gifSlower: "Slower",
				gifDownloadMenu: "Download",
				gifDownload: "Download GIF",
				gifDownloadSpeed: "Download GIF ({speed}×)",
				gifDownloadHintOriginal: "Animation at its own speed",
				gifDownloadHintSpeed: "At the current playback speed",
				gifDownloadOriginal: "Download original-speed GIF",
				gifDownloadOriginalHint: "Frame timing unchanged",
				gifDownloadFrame: "Download frame (PNG)",
				gifDownloadFrameHint: "Frame {frame}, still image",
				gifCopyFrame: "Copy frame (still)",
				gifCopyFirstFrame: "Copy first frame (still)",
				gifCopiedFrame: "Frame {current} of {total} copied as a still; download or drag out for the GIF",
				gifCopiedFirstFrame: "First frame copied as a still; download or drag out for the GIF",
				gifCopyFailed: "Copy failed",
				gifClose: "Close (Esc)",
				gifControlsUnavailable: "Frame-by-frame controls are not available here; the GIF can still be downloaded",
				gifEdit: "Edit",
				gifEditChipTitle: "Leave notes on frames and have the AI redraw this animation",
				gifEditToggle: "Edit frames",
				gifEditEnterTitle: "Pause on this frame and click the picture to leave notes",
				gifEditExitTitle: "Leave editing",
				gifEditTooManyFrames: "Animations with more than 16 frames cannot be edited by frame yet",
				gifEditDecodeFailed: "The animation could not be decoded, so it cannot be edited by frame",
				gifEditDecoding: "Decoding the animation frames…",
				gifEditNotLoaded: "The animation frames are not loaded yet, so it cannot be edited by frame",
				gifEditHint: "Click the picture to leave a note. A note shows only on its own frame; switch frames to add more, then send them all at once.",
				gifEditSheetHint: "Every frame laid out in one grid: click a cell to leave a note on that frame.",
				gifEditLayerLabel: "Place a note on frame {frame}",
				gifEditView: "View",
				gifGifView: "GIF",
				gifSheetView: "All frames",
				gifFrameComments: "Frame {current} · {count} notes",
				gifSheetComments: "{total} frames · {count} notes",
				gifCommentPlaceholder: "Add a note…",
				gifCommentNew: "New note on frame {frame}",
				gifCommentPublish: "Post note",
				gifCommentPublishTitle: "Post (Enter)",
				gifCommentEdit: "Edit note {index}",
				gifCommentView: "View note",
				gifCommentSheetTitle: "Frame {frame}: {text}",
				gifCommentLabel: "Note {index} (frame {frame})",
				gifCommentSave: "Save",
				gifCommentDelete: "Delete note",
				gifCommentsClear: "Clear",
				gifCommentsClearConfirm: "Clear all {count} notes?",
				gifEditCancel: "Cancel",
				gifSend: "Send ({count})",
				gifSending: "Sending…",
				gifEditDone: "Redrawn from your notes",
				gifEditSaveFailed: "Redrawn from your notes, but saving to the gallery failed. Please retry.",
				gifEditFailed: "Frame edit failed",
				gifEditFailedNotice: "Frame edit failed: {reason}",
				gifEditFailedHint: "Usually the channel's image-editing endpoint did not accept this request (for example, no images/edits or no GIF output); you can regenerate from a description instead.",
				gifEditStill: "The channel returned a still image, so the animation was not kept; your notes stay on the previous version.",
				gifEditFallbackRegenerate: "Regenerate from a description instead (the current animation is not kept)",
				gifEditFallbackHint: "Your notes were rewritten as text requirements after the prompt. This regenerates the whole animation without keeping the current one; edit further, then confirm.",
				gifSheetTooLarge: "The animation is too large to build a reference sheet"
			}
		};
		function gifT(lang) {
			return (key, params) => {
				let text = GIF_TEXT[lang][key];
				for (const [name, value] of Object.entries(params ?? {})) text = text.replace(`{${name}}`, value);
				return text;
			};
		}
		//#endregion
		//#region lib/types/client/gif-card.js
		function downloadFile(file, name) {
			const objectUrl = URL.createObjectURL(file);
			downloadBlobUrl(objectUrl, name);
			setTimeout(() => {
				URL.revokeObjectURL(objectUrl);
			}, 1e4);
		}
		/** The GIF as it plays: retimed to the playback speed once its bytes are read. */
		function gifAtSpeed(player, speed) {
			const bytes = player.bytes();
			if (bytes === void 0) return player.blob;
			return new Blob([retimeGif(bytes, speed) ?? bytes], { type: "image/gif" });
		}
		/** Save the GIF at its speed, at its original timing, or the frame on display, named after `stem`. */
		function downloadGif(player, kind, speed, stem) {
			if (kind === "frame") {
				const frame = player.getSnapshot().index + 1;
				player.captureFrame().then((still) => {
					if (still !== void 0) downloadFile(still, `${stem}-frame${String(frame)}.png`);
				});
				return;
			}
			if (kind === "original") downloadFile(player.blob, `${stem}.gif`);
			else downloadFile(gifAtSpeed(player, speed), `${stem}${speedSuffix(speed)}.gif`);
		}
		/** The animation behind a conversation card: its raw bytes, the player over them, and what a card does with them. */
		function useGifCard({ lang, original, attachmentMediaType, attachmentBlob, onOriginalGone }) {
			const t = gifT(lang);
			const gifKey = original?.mediaType === "image/gif" ? original.key : void 0;
			const attachmentIsGif = attachmentMediaType === "image/gif";
			const [vaultBlob, setVaultBlob] = (0, react.useState)();
			const [vaultGone, setVaultGone] = (0, react.useState)(false);
			/** The vault fetch in flight, for a regeneration that starts before it lands. */
			const vaultBlobRef = (0, react.useRef)();
			const goneRef = (0, react.useRef)(onOriginalGone);
			goneRef.current = onOriginalGone;
			(0, react.useEffect)(() => {
				if (gifKey === void 0) {
					vaultBlobRef.current = void 0;
					return;
				}
				let canceled = false;
				const loading = fetch(vaultUrlFor(gifKey, "image/gif"), { credentials: "same-origin" }).then(async (response) => {
					if (response.ok) return response.blob();
					if (response.status === 404) return void 0;
					throw new Error(`Original unavailable (${String(response.status)})`);
				});
				vaultBlobRef.current = loading.catch(() => void 0);
				loading.then((blob) => {
					if (canceled) return;
					if (blob !== void 0) {
						setVaultBlob(blob);
						return;
					}
					setVaultGone(true);
					goneRef.current();
				}, () => void 0);
				return () => {
					canceled = true;
					setVaultBlob(void 0);
					setVaultGone(false);
				};
			}, [gifKey]);
			const player = useGifPlayer(gifKey !== void 0 ? vaultBlob : attachmentIsGif ? attachmentBlob : void 0);
			const speed = useGifSpeed(player) ?? 1;
			return {
				t,
				animated: gifKey !== void 0 && !vaultGone || attachmentIsGif,
				player,
				info: async () => {
					if (player !== void 0) return player.getSnapshot().info ?? readGifInfo(new Uint8Array(await player.blob.arrayBuffer()));
					const source = gifKey !== void 0 ? await vaultBlobRef.current : attachmentIsGif ? attachmentBlob : void 0;
					return source === void 0 ? void 0 : readGifInfo(new Uint8Array(await source.arrayBuffer()));
				},
				file: () => player === void 0 ? void 0 : gifAtSpeed(player, speed),
				download: (kind) => {
					if (player !== void 0) downloadGif(player, kind, speed, `dsh-image-${String(Date.now())}`);
				},
				copyFrame: async () => {
					if (player === void 0) return void 0;
					const { index, frames } = player.getSnapshot();
					const frame = await player.captureFrame();
					const target = frame ?? attachmentBlob;
					if (target === void 0) return void 0;
					if (!await copyImageBlob(target)) return t("gifCopyFailed");
					return frame === void 0 ? t("gifCopiedFirstFrame") : t("gifCopiedFrame", {
						current: String(index + 1),
						total: String(frames.length)
					});
				}
			};
		}
		/** The card's speed chip; its panel opens over the image, so the card unclips while it is open. */
		function GifCardOverlay({ gif, onOpenChange }) {
			if (gif.player === void 0) return null;
			return (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-ig-gif-chip-slot",
				children: (0, react_jsx_runtime.jsx)(GifSpeedControl, {
					player: gif.player,
					t: gif.t,
					variant: "chip",
					onOpenChange
				})
			});
		}
		/** The card's hover-toolbar download, as a menu of the GIF, its original timing and the frame on screen. */
		function GifToolbarDownload({ gif, onOpenChange }) {
			if (gif.player === void 0) return null;
			return (0, react_jsx_runtime.jsx)(GifDownloadMenu, {
				player: gif.player,
				t: gif.t,
				variant: "toolbar",
				onDownload: gif.download,
				onOpenChange
			});
		}
		const COPY_ICON = (0, react_jsx_runtime.jsxs)("svg", {
			width: "18",
			height: "18",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": "true",
			children: [(0, react_jsx_runtime.jsx)("rect", {
				x: "9",
				y: "9",
				width: "13",
				height: "13",
				rx: "2"
			}), (0, react_jsx_runtime.jsx)("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })]
		});
		const CLOSE_ICON = (0, react_jsx_runtime.jsxs)("svg", {
			width: "18",
			height: "18",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": "true",
			children: [(0, react_jsx_runtime.jsx)("line", {
				x1: "6",
				y1: "6",
				x2: "18",
				y2: "18"
			}), (0, react_jsx_runtime.jsx)("line", {
				x1: "18",
				y1: "6",
				x2: "6",
				y2: "18"
			})]
		});
		/** The GIF lightbox: the stage, the player bar, and copy, download and close at the top right. */
		function GifLightbox({ gif, player, alt, poster, onClose, onDragStart, stageOverlay, barTrailing, footer, wrapClassName, frameMarks }) {
			const t = gif.t;
			const ready = useGifStatus(player) === "ready";
			const [toast, setToast] = (0, react.useState)();
			const backdropRef = (0, react.useRef)(null);
			const dockRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const dock = dockRef.current;
				const backdrop = backdropRef.current;
				if (dock === null || backdrop === null || typeof ResizeObserver === "undefined") return;
				const observer = new ResizeObserver(() => {
					backdrop.style.setProperty("--dsh-ig-gif-dock-h", `${String(dock.offsetHeight)}px`);
				});
				observer.observe(dock);
				return () => {
					observer.disconnect();
				};
			}, []);
			(0, react.useEffect)(() => {
				const onKeyDown = (event) => {
					if (player.getSnapshot().status !== "ready") return;
					const action = gifKeyboardAction(event.key, event.target);
					if (action === void 0) return;
					event.preventDefault();
					({
						toggle: () => {
							player.toggle();
						},
						previous: () => {
							player.step(-1);
						},
						next: () => {
							player.step(1);
						},
						first: () => {
							player.first();
						},
						last: () => {
							player.last();
						}
					})[action]();
				};
				window.addEventListener("keydown", onKeyDown);
				return () => {
					window.removeEventListener("keydown", onKeyDown);
				};
			}, [player]);
			(0, react.useEffect)(() => () => {
				player.play();
			}, [player]);
			(0, react.useEffect)(() => {
				if (toast === void 0) return;
				const timer = setTimeout(() => {
					setToast(void 0);
				}, 3500);
				return () => {
					clearTimeout(timer);
				};
			}, [toast]);
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: backdropRef,
				className: "dsh-ig-lightbox-backdrop",
				onClick: onClose,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-gif-actions",
						onClick: (event) => {
							event.stopPropagation();
						},
						children: [
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-gif-action",
								title: ready ? t("gifCopyFrame") : t("gifCopyFirstFrame"),
								"aria-label": ready ? t("gifCopyFrame") : t("gifCopyFirstFrame"),
								onClick: () => {
									gif.copyFrame().then(setToast);
								},
								children: COPY_ICON
							}),
							(0, react_jsx_runtime.jsx)(GifDownloadMenu, {
								player,
								t,
								variant: "lightbox",
								onDownload: gif.download
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-gif-action",
								title: t("gifClose"),
								"aria-label": t("gifClose"),
								onClick: onClose,
								children: CLOSE_ICON
							})
						]
					}),
					toast !== void 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-gif-toast",
						role: "status",
						children: toast
					}) : null,
					(0, react_jsx_runtime.jsxs)("div", {
						className: wrapClassName === void 0 ? "dsh-ig-lightbox-img-wrap dsh-ig-gif-wrap" : `dsh-ig-lightbox-img-wrap dsh-ig-gif-wrap ${wrapClassName}`,
						onClick: (event) => {
							event.stopPropagation();
						},
						children: [(0, react_jsx_runtime.jsx)(GifStage, {
							player,
							stage: "lightbox",
							className: "dsh-ig-lightbox-img",
							alt,
							poster,
							onDragStart
						}), stageOverlay]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						ref: dockRef,
						className: "dsh-ig-gif-dock",
						onClick: (event) => {
							event.stopPropagation();
						},
						children: [(0, react_jsx_runtime.jsx)(GifPlayerBar, {
							player,
							t,
							trailing: barTrailing,
							marks: frameMarks
						}), footer]
					})
				]
			});
		}
		//#endregion
		//#region lib/types/client/gif-gallery.js
		/** Where a gallery item's animation is served, when it has one: its vault original, or a GIF attachment. */
		function galleryGifUrl(item) {
			if (item.original?.mediaType === "image/gif") return vaultUrlFor(item.original.key, item.original.mediaType);
			if (item.attachment.mediaType === "image/gif") return imageUrlFor(item.attachment);
		}
		/**
		* A grid tile's GIF badge, and its animation laid over the still thumbnail
		* while the pointer is on the tile. The thumbnail stays underneath, so a slow
		* or missing original never blanks the tile, and drags still start from it.
		*/
		function GalleryGifTile({ item, lang, hovered }) {
			const url = galleryGifUrl(item);
			const [failedUrl, setFailedUrl] = (0, react.useState)();
			if (url === void 0) return null;
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [hovered && failedUrl !== url ? (0, react_jsx_runtime.jsx)("img", {
				className: "dsh-ig-gallery-card-img dsh-ig-gallery-gif-hover",
				src: url,
				alt: "",
				"aria-hidden": "true",
				onError: () => {
					setFailedUrl(url);
				}
			}) : null, (0, react_jsx_runtime.jsx)("span", {
				className: "dsh-ig-gallery-gif-badge",
				title: gifT(lang)("gifBadge"),
				children: "GIF"
			})] });
		}
		/**
		* The player behind the gallery preview of an animated item, once its bytes
		* are at hand. An original that is gone falls back to the still attachment,
		* which the gallery's own image shows.
		*/
		function useGalleryGifPreview(item, lang) {
			const [loaded, setLoaded] = (0, react.useState)();
			const itemRef = (0, react.useRef)(item);
			itemRef.current = item;
			const gifUrl = item === null ? void 0 : galleryGifUrl(item);
			(0, react.useEffect)(() => {
				const current = itemRef.current;
				if (current === null || gifUrl === void 0) return;
				let canceled = false;
				fetchGalleryItemBlob(current).then((blob) => {
					if (!canceled && blob.type === "image/gif") setLoaded({
						item: current,
						blob
					});
				}, () => void 0);
				return () => {
					canceled = true;
					setLoaded(void 0);
				};
			}, [gifUrl, item?.id]);
			const player = useGifPlayer(loaded?.blob);
			if (player === void 0 || loaded === void 0 || loaded.item.id !== item?.id) return void 0;
			return {
				t: gifT(lang),
				player,
				item: loaded.item
			};
		}
		/** The preview's animation, in place of the gallery image; sized to leave room for the player bar. */
		function GalleryGifStage({ preview, poster }) {
			return (0, react_jsx_runtime.jsx)(GifStage, {
				player: preview.player,
				stage: "gallery",
				className: "dsh-ig-lightbox-img dsh-ig-gallery-gif-img",
				alt: preview.item.prompt,
				poster
			});
		}
		/** The player bar, floating above the gallery's own bottom bar. */
		function GalleryGifBar({ preview }) {
			return (0, react_jsx_runtime.jsx)(GifPlayerBar, {
				player: preview.player,
				t: preview.t,
				className: "dsh-ig-gif-bar-gallery",
				stripHint: preview.t("gifStripHintGallery")
			});
		}
		/** The bottom bar's download, as a menu of the GIF at its speed, its original timing and the frame on display. */
		function GalleryGifDownload({ preview }) {
			const { player, item } = preview;
			return (0, react_jsx_runtime.jsx)(GifDownloadMenu, {
				player,
				t: preview.t,
				variant: "gallery",
				onDownload: (kind) => {
					downloadGif(player, kind, player.getSnapshot().speed, `dsh-${item.provider}-${item.id}`);
				}
			});
		}
		//#endregion
		//#region lib/types/client/gallery-card.js
		const GalleryCard = (0, react.memo)(function GalleryCard({ lang, item, index, isManageMode, isSelected, t, actions }) {
			const [setCardRef, inView] = useInView();
			const [url, setUrl] = (0, react.useState)();
			const [blob, setBlob] = (0, react.useState)();
			const [loading, setLoading] = (0, react.useState)(true);
			const [error, setError] = (0, react.useState)();
			const [thumbFailed, setThumbFailed] = (0, react.useState)(false);
			const [thumbAttempt, setThumbAttempt] = (0, react.useState)(0);
			const [hovered, setHovered] = (0, react.useState)(false);
			const serverThumbUrl = thumbUrlFor(item.attachment);
			const displayUrl = url ?? (thumbFailed ? void 0 : thumbAttempt === 0 ? serverThumbUrl : serverThumbUrl + "&retry=1");
			const originalRef = (0, react.useRef)(void 0);
			const ensureAttachment = (0, react.useCallback)(async () => {
				if (blob) return blob;
				const pending = originalRef.current ?? (originalRef.current = fetchAttachmentBlob(item.attachment));
				try {
					const original = await pending;
					setBlob(original);
					return original;
				} finally {
					originalRef.current = void 0;
				}
			}, [blob, item.attachment]);
			const ensureOriginal = (0, react.useCallback)(async () => {
				if (item.original !== void 0) return fetchGalleryItemBlob(item);
				return ensureAttachment();
			}, [ensureAttachment, item]);
			(0, react.useEffect)(() => {
				if (!inView || !thumbFailed) return;
				let active = true;
				let objectUrl;
				setUrl(void 0);
				setError(void 0);
				setLoading(true);
				const thumbnailKey = galleryThumbKey(item.attachment.attachmentId);
				(async () => {
					try {
						const cached = await getGalleryThumb(thumbnailKey);
						if (!active) return;
						if (cached) {
							objectUrl = URL.createObjectURL(cached);
							setUrl(objectUrl);
							setLoading(false);
							return;
						}
						const original = await fetchAttachmentBlob(item.attachment);
						if (!active) return;
						const thumbnail = await createImageThumbnail(original, 320);
						if (!active) return;
						if (thumbnail !== original) putGalleryThumb(thumbnailKey, thumbnail);
						objectUrl = URL.createObjectURL(thumbnail);
						setUrl(objectUrl);
						setLoading(false);
					} catch (err) {
						if (active) {
							setError(err instanceof Error ? err.message : String(err));
							setLoading(false);
						}
					}
				})();
				return () => {
					active = false;
					if (objectUrl) URL.revokeObjectURL(objectUrl);
				};
			}, [
				item.attachment.attachmentId,
				inView,
				thumbFailed
			]);
			const copyPrompt = async (e) => {
				e.stopPropagation();
				try {
					await navigator.clipboard.writeText(item.prompt);
					actions.toast(t("copiedPrompt"));
				} catch {
					actions.toast(t("copyFailed"));
				}
			};
			const copyImage = async (e) => {
				e.stopPropagation();
				try {
					const ok = await copyImageBlob(await ensureOriginal());
					actions.toast(ok ? t("copiedImage") : t("copyFailed"));
				} catch {
					actions.toast(t("copyFailed"));
				}
			};
			const downloadImage = async (e) => {
				e.stopPropagation();
				try {
					const blob = await ensureOriginal();
					const objectUrl = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = objectUrl;
					a.download = galleryDownloadName(item, blob);
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(objectUrl);
				} catch {}
			};
			const toggleFavorite = async (e) => {
				e.stopPropagation();
				const nextStatus = await toggleFavoriteGalleryItem(item.id);
				actions.toast(nextStatus ? t("favoriteAdded") : t("favoriteRemoved"));
			};
			const badgeLabel = item.model || item.provider;
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: setCardRef,
				className: `dsh-ig-gallery-card ${isSelected ? "is-selected" : ""} ${isManageMode ? "is-manage-mode" : ""}`,
				onClick: (e) => actions.click(item, index, e),
				onPointerEnter: () => {
					setHovered(true);
					if (blob !== void 0) return;
					if (shouldPrefetchOriginal(item.original)) fetchGalleryItemBlob(item).then(setBlob).catch(() => void 0);
					else ensureAttachment().catch(() => void 0);
				},
				onPointerLeave: () => setHovered(false),
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ig-gallery-card-media",
					children: [
						(0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `dsh-ig-card-checkbox ${isSelected ? "is-checked" : ""}`,
							title: isSelected ? t("clearSelect") : t("manage"),
							onClick: (e) => actions.toggleSelect(item, index, e),
							children: isSelected && (0, react_jsx_runtime.jsx)(Check, {
								size: 11,
								strokeWidth: 3
							})
						}),
						loading && displayUrl === void 0 && (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-ig-gallery-card-loading",
							children: "..."
						}),
						error && (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-gallery-card-error",
							children: ["⚠️ ", error]
						}),
						displayUrl !== void 0 && (0, react_jsx_runtime.jsx)("img", {
							className: "dsh-ig-gallery-card-img",
							src: displayUrl,
							alt: item.prompt,
							loading: "lazy",
							decoding: "async",
							onLoad: () => setLoading(false),
							onError: () => {
								if (url !== void 0) return;
								if (thumbAttempt === 0) setThumbAttempt(1);
								else setThumbFailed(true);
							},
							draggable: !isManageMode,
							onDragStart: (event) => {
								if (isManageMode) event.preventDefault();
								else startGalleryImageDrag(event, item, blob);
							}
						}),
						(0, react_jsx_runtime.jsx)(GalleryGifTile, {
							item,
							lang,
							hovered
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-card-toolbar",
							children: [
								!isManageMode && (0, react_jsx_runtime.jsx)(GalleryCanvasButton, {
									item,
									lang,
									className: "dsh-ig-tool-btn",
									onToast: actions.toast
								}),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-ig-tool-btn",
									title: t("copyImg"),
									onClick: (e) => {
										copyImage(e);
									},
									children: (0, react_jsx_runtime.jsx)(Copy, { size: 13 })
								}),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-ig-tool-btn",
									title: t("download"),
									onClick: (e) => {
										downloadImage(e);
									},
									children: (0, react_jsx_runtime.jsx)(Download, { size: 13 })
								}),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-ig-tool-btn",
									title: t("copyPpt"),
									onClick: (e) => {
										copyPrompt(e);
									},
									children: (0, react_jsx_runtime.jsx)(FileText, { size: 13 })
								}),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-ig-tool-btn dsh-ig-tool-btn-danger",
									title: t("delete"),
									onClick: (e) => {
										e.stopPropagation();
										actions.requestDelete(item);
									},
									children: (0, react_jsx_runtime.jsx)(Trash2, { size: 13 })
								})
							]
						})
					]
				}), (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ig-gallery-card-meta",
					children: [
						(0, react_jsx_runtime.jsx)("div", {
							className: "dsh-ig-card-badge-row",
							children: (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-ig-card-badge",
								title: badgeLabel,
								children: badgeLabel
							})
						}),
						(0, react_jsx_runtime.jsx)("div", {
							className: "dsh-ig-gallery-card-prompt-line",
							title: item.prompt,
							children: item.prompt
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-card-footer-row",
							children: [(0, react_jsx_runtime.jsxs)("span", {
								className: "dsh-ig-card-meta-text",
								children: [
									formatCardMeta(item),
									" | ",
									formatRelativeTime(item.createdAt, t)
								]
							}), (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `dsh-ig-card-fav-btn ${item.isFavorite ? "is-favorited" : ""}`,
								title: item.isFavorite ? t("favoriteRemoved") : t("favoriteAdded"),
								onClick: (e) => {
									toggleFavorite(e);
								},
								children: (0, react_jsx_runtime.jsx)(Heart, {
									size: 15,
									fill: item.isFavorite ? "currentColor" : "none"
								})
							})]
						})
					]
				})]
			});
		});
		//#endregion
		//#region lib/types/client/gallery-view.js
		/**
		* Native Workspace Gallery & Studio View Component for DSH `conversation.view` slot.
		* Fully i18n-reactive (Chinese & English) with modular tabs, multi-dimensional filters,
		* responsive image grid, and placeholder routes.
		*/
		const GALLERY_RENDER_BATCH = 120;
		const GalleryViewTab = (props) => {
			const { locale, sessionId, useSessions, useWorkspaces, credentialEvents, inSidebar, defaultTab, initialCanvasSurface, useTabInfo } = props;
			const [activeTab, setActiveTab] = (0, react.useState)(defaultTab ?? "gallery");
			const [studioDraft, setStudioDraft] = (0, react.useState)(void 0);
			const [studioReference, setStudioReference] = (0, react.useState)(void 0);
			const [items, setItems] = (0, react.useState)([]);
			const [renderLimit, setRenderLimit] = (0, react.useState)(GALLERY_RENDER_BATCH);
			const gallerySentinelRef = (0, react.useRef)(null);
			const [search, setSearch] = (0, react.useState)("");
			const deferredSearch = (0, react.useDeferredValue)(search);
			const [selectedProvider, setSelectedProvider] = (0, react.useState)("all");
			const [selectedRatio, setSelectedRatio] = (0, react.useState)("all");
			const [sortBy, setSortBy] = (0, react.useState)("newest");
			const [onlyCurrentWorkspace, setOnlyCurrentWorkspace] = (0, react.useState)(() => {
				try {
					const stored = localStorage.getItem("dsh-ig-only-current-workspace");
					return stored === null ? true : stored === "true";
				} catch {
					return true;
				}
			});
			const [serverWorkspaces, setServerWorkspaces] = (0, react.useState)([]);
			const [serverActiveRoot, setServerActiveRoot] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				try {
					localStorage.setItem("dsh-ig-only-current-workspace", String(onlyCurrentWorkspace));
				} catch {}
			}, [onlyCurrentWorkspace]);
			const tabVisible = useTabInfo?.().tab?.visible;
			(0, react.useEffect)(() => {
				if (tabVisible === false) deselectStudioTlCanvases();
			}, [tabVisible]);
			(0, react.useEffect)(() => {
				let mounted = true;
				fetch(STUDIO_ROUTE).then((res) => res.ok ? res.json() : null).then((data) => {
					if (!mounted || !data) return;
					if (Array.isArray(data.workspaces)) setServerWorkspaces(data.workspaces);
					if (typeof data.workspaceRoot === "string") setServerActiveRoot(data.workspaceRoot);
				}).catch(() => {});
				return () => {
					mounted = false;
				};
			}, []);
			const liveWorkspaces = useWorkspaces ? useWorkspaces((s) => s?.items) : null;
			const liveSessions = useSessions ? useSessions((s) => s) : null;
			const currentSessionId = sessionId || liveSessions?.current;
			const activeWorkspace = (0, react.useMemo)(() => {
				const allWs = Array.isArray(liveWorkspaces) && liveWorkspaces.length > 0 ? liveWorkspaces : serverWorkspaces;
				if (allWs.length > 0) {
					if (currentSessionId) {
						const matched = allWs.find((ws) => Array.isArray(ws.sessionIds) && ws.sessionIds.includes(currentSessionId));
						if (matched) return matched;
					}
					if (serverActiveRoot) {
						const normActive = serverActiveRoot.replace(/\\/g, "/").toLowerCase();
						const matched = allWs.find((ws) => ws.path && ws.path.replace(/\\/g, "/").toLowerCase() === normActive);
						if (matched) return matched;
					}
					return allWs[0];
				}
				if (serverActiveRoot) return {
					workspaceId: "default",
					path: serverActiveRoot,
					title: "Workspace",
					sessionIds: []
				};
				return null;
			}, [
				liveWorkspaces,
				serverWorkspaces,
				currentSessionId,
				serverActiveRoot
			]);
			const [previewItem, setPreviewItem] = (0, react.useState)(null);
			const [previewUrl, setPreviewUrl] = (0, react.useState)(null);
			const previewUrlRef = (0, react.useRef)(null);
			/** Identifies the current preview attempt; late fallback fetches are ignored. */
			const previewRequestRef = (0, react.useRef)(0);
			const previewPrefetchRef = (0, react.useRef)([]);
			previewUrlRef.current = previewUrl;
			const [previewBlob, setPreviewBlob] = (0, react.useState)(null);
			const cardActionsRef = (0, react.useRef)(null);
			const cardActions = (0, react.useMemo)(() => ({
				click: (item, index, event) => cardActionsRef.current?.click(item, index, event),
				toggleSelect: (item, index, event) => cardActionsRef.current?.toggleSelect(item, index, event),
				requestDelete: (item) => cardActionsRef.current?.requestDelete(item),
				preview: (item, blob) => cardActionsRef.current?.preview(item, blob),
				toast: (message) => cardActionsRef.current?.toast(message)
			}), []);
			const [toast, setToast] = (0, react.useState)(null);
			const [showRegenerateModal, setShowRegenerateModal] = (0, react.useState)(false);
			const [regeneratePrompt, setRegeneratePrompt] = (0, react.useState)("");
			const [isRegenerating, setIsRegenerating] = (0, react.useState)(false);
			const regenerateControllerRef = (0, react.useRef)(null);
			const [isManageMode, setIsManageMode] = (0, react.useState)(false);
			const [selectedIds, setSelectedIds] = (0, react.useState)(/* @__PURE__ */ new Set());
			const lastSelectedIndexRef = (0, react.useRef)(null);
			const [showDeleteModal, setShowDeleteModal] = (0, react.useState)(false);
			const [deleteWorkspaceFiles, setDeleteWorkspaceFiles] = (0, react.useState)(true);
			const [isDeleting, setIsDeleting] = (0, react.useState)(false);
			const [showStorageModal, setShowStorageModal] = (0, react.useState)(false);
			const [isStorageScanning, setIsStorageScanning] = (0, react.useState)(false);
			const [storageStats, setStorageStats] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				setSelectedIds(/* @__PURE__ */ new Set());
				lastSelectedIndexRef.current = null;
			}, [
				activeTab,
				search,
				selectedProvider,
				selectedRatio,
				sortBy,
				onlyCurrentWorkspace
			]);
			const [lang, setLang] = (0, react.useState)(() => {
				return (locale?.getSnapshot?.()?.active)?.startsWith("en") ? "en" : "zh";
			});
			(0, react.useEffect)(() => {
				if (!locale?.subscribe) return;
				return locale.subscribe(() => {
					const active = locale.getSnapshot?.()?.active;
					setLang(active?.startsWith("en") ? "en" : "zh");
				});
			}, [locale]);
			const dict = lang === "en" ? DICT$1.en : DICT$1.zh;
			const gifPreview = useGalleryGifPreview(previewItem, lang);
			const t = (0, react.useMemo)(() => {
				return (key, params) => {
					let text = dict[key] || DICT$1.zh[key] || key;
					if (params) for (const [k, v] of Object.entries(params)) text = text.replace(`{${k}}`, v);
					return text;
				};
			}, [dict]);
			const showToast = (msg) => {
				setToast(msg);
				setTimeout(() => {
					setToast(null);
				}, 2e3);
			};
			const [importing, setImporting] = (0, react.useState)(false);
			const importInputRef = (0, react.useRef)(null);
			const importImages = async (files) => {
				if (files === null || files.length === 0 || importing) return;
				const all = Array.from(files);
				const picked = all.map((file) => ({
					file,
					mediaType: imageMediaTypeOf(file)
				})).filter((entry) => entry.mediaType !== void 0).slice(0, 8);
				if (picked.length === 0) {
					showToast(t("importFailed"));
					return;
				}
				setImporting(true);
				try {
					const form = new FormData();
					for (const entry of picked) {
						const name = entry.file.name.length > 0 ? entry.file.name : `image.${extensionFor(entry.mediaType)}`;
						form.append("images", entry.file, name);
					}
					const profileId = vaultProfileId();
					const response = await fetch(IMPORT_ROUTE, {
						method: "POST",
						credentials: "same-origin",
						...profileId === void 0 ? {} : { headers: { "x-dsh-vault-profile": profileId } },
						body: form
					});
					if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
					const payload = await response.json();
					if ((payload.failures ?? []).length > 0) console.warn("[dsh-image-gen] import failures", payload.failures);
					const imported = payload.images ?? [];
					let added = 0;
					let writeFailures = 0;
					for (const entry of imported) if (await saveGalleryItem({
						id: `import-${entry.attachment.attachmentId}-${crypto.randomUUID()}`,
						attachment: entry.attachment,
						prompt: "",
						provider: "import",
						model: "",
						createdAt: Date.now(),
						...activeWorkspace?.workspaceId ? { workspaceId: activeWorkspace.workspaceId } : {},
						...activeWorkspace?.path ? { workspacePath: activeWorkspace.path } : {},
						...currentSessionId ? { sessionId: currentSessionId } : {},
						...entry.original === void 0 ? {} : { original: entry.original }
					})) added += 1;
					else writeFailures += 1;
					if (added > 0) await syncVaultRefs(vaultKeysOf(await getGalleryItemsStrict()));
					const failCount = (payload.failures ?? []).length + (all.length - picked.length) + writeFailures;
					if (added === 0) {
						const firstFailure = (payload.failures ?? [])[0];
						const reason = typeof firstFailure?.error === "string" ? firstFailure.error : void 0;
						showToast(reason === void 0 ? t("importFailed") : t("importFailed") + " · " + reason);
					} else if (failCount > 0) showToast(t("importPartial", {
						count: String(added),
						fail: String(failCount)
					}));
					else showToast(t("importAdded", { count: String(added) }));
				} catch (err) {
					console.warn("[dsh-image-gen] import failed", err);
					showToast(t("importFailed") + (err instanceof Error ? " · " + err.message : ""));
				} finally {
					setImporting(false);
				}
			};
			const useInspirationPrompt = (0, react.useCallback)((prompt) => {
				setStudioDraft(prompt);
				setActiveTab("studio");
			}, []);
			const useInspirationReference = (0, react.useCallback)((file, prompt) => {
				setStudioDraft(prompt);
				setStudioReference(file);
				setActiveTab("studio");
			}, []);
			const clearStudioDraft = (0, react.useCallback)(() => setStudioDraft(void 0), []);
			const clearStudioReference = (0, react.useCallback)(() => setStudioReference(void 0), []);
			(0, react.useEffect)(() => {
				if (inSidebar) return void 0;
				const seat = document.querySelector("[data-composer-seat]");
				if (seat) {
					const prevDisplay = seat.style.display;
					seat.style.display = "none";
					return () => {
						seat.style.display = prevDisplay;
					};
				}
			}, [inSidebar]);
			(0, react.useEffect)(() => {
				let active = true;
				let pruned = false;
				const load = () => {
					getGalleryItemsStrict().then((res) => {
						if (!active) return;
						setItems((prev) => mergeGalleryItems(prev, res));
						if (!pruned) {
							pruned = true;
							pruneGalleryThumbs(res.map((item) => String(item.attachment.attachmentId)));
							pruneTombstones();
							syncVaultRefs(vaultKeysOf(res)).catch((err) => {
								console.warn("[dsh-image-gen] Failed to sync original references:", err);
							});
						}
					}).catch((err) => {
						console.warn("[dsh-image-gen] Failed to read gallery items:", err);
					});
				};
				load();
				let timer;
				const unsubscribe = subscribeGallery(() => {
					if (timer !== void 0) clearTimeout(timer);
					timer = setTimeout(load, 120);
				});
				return () => {
					active = false;
					if (timer !== void 0) clearTimeout(timer);
					unsubscribe();
				};
			}, []);
			const [previewLoading, setPreviewLoading] = (0, react.useState)(false);
			const filteredItems = (0, react.useMemo)(() => {
				return items.filter((item) => {
					if (activeTab === "favorites" && !item.isFavorite) return false;
					if (selectedProvider !== "all" && item.provider !== selectedProvider) return false;
					if (selectedRatio !== "all") {
						if (getItemRatio(item) !== selectedRatio) return false;
					}
					if (deferredSearch.trim().length > 0) {
						const q = deferredSearch.trim().toLowerCase();
						const matchPrompt = item.prompt?.toLowerCase().includes(q);
						const matchModel = item.model?.toLowerCase().includes(q);
						const matchProvider = item.provider?.toLowerCase().includes(q);
						const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
						if (!matchPrompt && !matchModel && !matchProvider && !matchTags) return false;
					}
					if (onlyCurrentWorkspace && activeWorkspace) {
						if (!isItemInWorkspace(item, activeWorkspace)) return false;
					}
					return true;
				}).sort((a, b) => {
					if (sortBy === "oldest") return a.createdAt - b.createdAt;
					return b.createdAt - a.createdAt;
				});
			}, [
				items,
				activeTab,
				selectedProvider,
				selectedRatio,
				deferredSearch,
				sortBy,
				onlyCurrentWorkspace,
				activeWorkspace
			]);
			const galleryFilterKey = [
				activeTab,
				selectedProvider,
				selectedRatio,
				deferredSearch,
				sortBy,
				String(onlyCurrentWorkspace),
				activeWorkspace?.path ?? ""
			].join("|");
			(0, react.useEffect)(() => {
				setRenderLimit(GALLERY_RENDER_BATCH);
			}, [galleryFilterKey]);
			(0, react.useEffect)(() => {
				if (filteredItems.length <= renderLimit) return;
				const node = gallerySentinelRef.current;
				if (node === null) return;
				if (typeof IntersectionObserver === "undefined") {
					setRenderLimit(filteredItems.length);
					return;
				}
				const observer = new IntersectionObserver((entries) => {
					if (entries.some((entry) => entry.isIntersecting)) setRenderLimit((limit) => Math.min(filteredItems.length, limit + GALLERY_RENDER_BATCH));
				}, { rootMargin: "800px" });
				observer.observe(node);
				return () => observer.disconnect();
			}, [filteredItems.length, renderLimit]);
			const workspaceItemsCount = (0, react.useMemo)(() => {
				if (!activeWorkspace) return items.length;
				return items.filter((item) => isItemInWorkspace(item, activeWorkspace)).length;
			}, [items, activeWorkspace]);
			const currentPreviewIndex = (0, react.useMemo)(() => {
				if (!previewItem) return -1;
				return filteredItems.findIndex((i) => i.id === previewItem.id);
			}, [previewItem, filteredItems]);
			const hasPrev = currentPreviewIndex > 0;
			const hasNext = currentPreviewIndex >= 0 && currentPreviewIndex < filteredItems.length - 1;
			const clearPreviewPrefetch = () => {
				for (const image of previewPrefetchRef.current) image.src = "";
				previewPrefetchRef.current = [];
			};
			const prefetchPreviewNeighbors = (item) => {
				clearPreviewPrefetch();
				if (typeof Image === "undefined") return;
				const index = filteredItems.findIndex((entry) => entry.id === item.id);
				if (index < 0) return;
				for (const neighbor of [filteredItems[index - 1], filteredItems[index + 1]]) {
					if (neighbor === void 0) continue;
					const image = new Image();
					image.src = previewUrlFor(neighbor.attachment);
					previewPrefetchRef.current.push(image);
				}
			};
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
				setPreviewLoading(true);
				setPreviewUrl(previewUrlFor(item.attachment));
				prefetchPreviewNeighbors(item);
			};
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
					if (prevItem) openPreviewItem(prevItem);
				}
			};
			const goToNext = () => {
				if (currentPreviewIndex >= 0 && currentPreviewIndex < filteredItems.length - 1) {
					const nextItem = filteredItems[currentPreviewIndex + 1];
					if (nextItem) openPreviewItem(nextItem);
				}
			};
			const handleOpenRegenerate = () => {
				if (!previewItem || isRegenerating) return;
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
				showToast(t("cancel"));
			};
			const handleConfirmRegenerate = async () => {
				if (!previewItem || isRegenerating || regeneratePrompt.trim().length === 0) return;
				setShowRegenerateModal(false);
				setIsRegenerating(true);
				const controller = new AbortController();
				regenerateControllerRef.current = controller;
				try {
					const request = conversationRegenerateRequest(previewItem, regeneratePrompt, previewItem.aspectRatio ? {
						ratio: previewItem.aspectRatio,
						quality: previewItem.imageSize || "standard",
						resolution: previewItem.resolution,
						generationQuality: previewItem.generationQuality,
						watermark: previewItem.watermark
					} : void 0);
					if (activeWorkspace?.path) request.workspaceRoot = activeWorkspace.path;
					if (previewItem.original?.mediaType === "image/gif" || previewItem.attachment.mediaType === "image/gif") request.output = gifOutputRequest(readGifInfo(new Uint8Array(await (await fetchGalleryItemBlob(previewItem)).arrayBuffer())));
					const response = await fetch(STUDIO_ROUTE, {
						method: "POST",
						credentials: "same-origin",
						signal: controller.signal,
						headers: { "content-type": "application/json" },
						body: JSON.stringify(request)
					});
					const payload = await response.json().catch(() => null);
					if (!response.ok || payload === null || !("attachment" in payload)) throw new Error(payload && "error" in payload && payload.error ? payload.error : t("regenerateFailed"));
					const original = originalFromMeta(payload.original);
					const newItem = {
						id: imageVersionKey(String(payload.attachment.attachmentId), original),
						attachment: payload.attachment,
						prompt: payload.prompt,
						provider: payload.provider,
						...payload.channel === void 0 ? {} : { channel: payload.channel },
						model: payload.model,
						createdAt: payload.createdAt,
						aspectRatio: request.ratio,
						imageSize: request.quality,
						resolution: request.resolution,
						generationQuality: request.generationQuality,
						watermark: request.watermark,
						output: payload.output,
						...payload.savedTo ? { savedTo: payload.savedTo } : {},
						...activeWorkspace?.path ? { workspacePath: activeWorkspace.path } : {},
						...activeWorkspace?.workspaceId ? { workspaceId: activeWorkspace.workspaceId } : {},
						...currentSessionId ? { sessionId: currentSessionId } : {},
						...original === void 0 ? {} : { original }
					};
					const savedOk = await persistGalleryRecord(newItem);
					if (activeTab !== "gallery") setActiveTab("gallery");
					if (search.trim().length > 0) setSearch("");
					openPreviewItem(newItem);
					showToast(savedOk ? t("regenerateSuccess") : t("regenerateSaveFailed"));
				} catch (err) {
					if (controller.signal.aborted) return;
					showToast(err instanceof Error ? err.message : String(err));
				} finally {
					setIsRegenerating(false);
					regenerateControllerRef.current = null;
				}
			};
			(0, react.useEffect)(() => {
				return () => {
					if (regenerateControllerRef.current) regenerateControllerRef.current.abort();
					clearPreviewPrefetch();
					closeZipProgress();
					if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
				};
			}, []);
			(0, react.useEffect)(() => {
				const onKeyDown = (e) => {
					if (["INPUT", "TEXTAREA"].includes(e.target?.tagName)) return;
					if (showRegenerateModal) {
						if (e.key === "Escape") {
							e.preventDefault();
							setShowRegenerateModal(false);
						}
						return;
					}
					if (showDeleteModal) {
						if (e.key === "Escape" && !isDeleting) {
							e.preventDefault();
							setShowDeleteModal(false);
							if (!isManageMode) setSelectedIds(/* @__PURE__ */ new Set());
						}
						return;
					}
					if (previewItem) {
						if (e.key === "Escape") handleClosePreview();
						else if (e.key === "ArrowLeft" || e.key === "Left") {
							e.preventDefault();
							goToPrev();
						} else if (e.key === "ArrowRight" || e.key === "Right") {
							e.preventDefault();
							goToNext();
						}
					}
				};
				window.addEventListener("keydown", onKeyDown);
				return () => window.removeEventListener("keydown", onKeyDown);
			}, [
				showRegenerateModal,
				showDeleteModal,
				isDeleting,
				isManageMode,
				previewItem,
				currentPreviewIndex,
				filteredItems
			]);
			const handleCardClick = (item, index, e) => {
				if (e.shiftKey || isManageMode) {
					e.stopPropagation();
					if (!isManageMode) setIsManageMode(true);
					if (e.shiftKey && lastSelectedIndexRef.current !== null) {
						const from = Math.min(lastSelectedIndexRef.current, index);
						const to = Math.max(lastSelectedIndexRef.current, index);
						const rangeItems = filteredItems.slice(from, to + 1);
						setSelectedIds((prev) => {
							const next = new Set(prev);
							for (const r of rangeItems) next.add(r.id);
							return next;
						});
					} else {
						setSelectedIds((prev) => {
							const next = new Set(prev);
							if (next.has(item.id)) next.delete(item.id);
							else next.add(item.id);
							return next;
						});
						lastSelectedIndexRef.current = index;
					}
					return;
				}
				openPreviewItem(item);
			};
			const handleToggleSelect = (id, index, e) => {
				e.stopPropagation();
				if (!isManageMode) setIsManageMode(true);
				if (e.shiftKey && lastSelectedIndexRef.current !== null) {
					const from = Math.min(lastSelectedIndexRef.current, index);
					const to = Math.max(lastSelectedIndexRef.current, index);
					const rangeItems = filteredItems.slice(from, to + 1);
					setSelectedIds((prev) => {
						const next = new Set(prev);
						for (const r of rangeItems) next.add(r.id);
						return next;
					});
				} else {
					setSelectedIds((prev) => {
						const next = new Set(prev);
						if (next.has(id)) next.delete(id);
						else next.add(id);
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
					const next = /* @__PURE__ */ new Set();
					for (const item of filteredItems) if (!prev.has(item.id)) next.add(item.id);
					return next;
				});
			};
			const handleClearSelect = () => {
				setSelectedIds(/* @__PURE__ */ new Set());
				lastSelectedIndexRef.current = null;
			};
			const handleExitManage = () => {
				setIsManageMode(false);
				setSelectedIds(/* @__PURE__ */ new Set());
				lastSelectedIndexRef.current = null;
			};
			(0, react.useEffect)(() => {
				if (activeTab === "gallery" || activeTab === "favorites") return;
				if (!isManageMode && selectedIds.size === 0) return;
				handleExitManage();
			}, [activeTab]);
			const selectedItems = (0, react.useMemo)(() => {
				if (selectedIds.size === 0) return [];
				return items.filter((item) => selectedIds.has(item.id));
			}, [items, selectedIds]);
			const allSelectedAreFavorites = (0, react.useMemo)(() => {
				if (selectedItems.length === 0) return false;
				return selectedItems.every((item) => Boolean(item.isFavorite));
			}, [selectedItems]);
			const handleBatchToggleFavorite = async () => {
				if (selectedIds.size === 0) return;
				const targetFavorite = !allSelectedAreFavorites;
				const targetIds = Array.from(selectedIds);
				setItems((prev) => prev.map((item) => selectedIds.has(item.id) ? {
					...item,
					isFavorite: targetFavorite
				} : item));
				try {
					await bulkSetFavoriteGalleryItems(targetIds, targetFavorite);
					showToast(targetFavorite ? t("batchFavoritedToast", { count: String(targetIds.length) }) : t("batchUnfavoritedToast", { count: String(targetIds.length) }));
				} catch (err) {
					console.error("[dsh-image-gen] Batch favorite failed:", err);
					getGalleryItems().then((res) => setItems((prev) => mergeGalleryItems(prev, res)));
					showToast(t("batchFavoriteFailed"));
				}
			};
			const [isDownloadingBatch, setIsDownloadingBatch] = (0, react.useState)(false);
			const [batchDownloadProgress, setBatchDownloadProgress] = (0, react.useState)(null);
			const [batchDownloadStatus, setBatchDownloadStatus] = (0, react.useState)(null);
			const [isZipDownload, setIsZipDownload] = (0, react.useState)(false);
			const zipEventSourceRef = (0, react.useRef)(null);
			const zipTokenRef = (0, react.useRef)(null);
			const zipWatchdogRef = (0, react.useRef)(null);
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
				if (zipWatchdogRef.current !== null) window.clearTimeout(zipWatchdogRef.current);
				zipWatchdogRef.current = window.setTimeout(() => {
					zipWatchdogRef.current = null;
					showToast(t("batchDownloadFailed"));
					setIsDownloadingBatch(false);
					closeZipProgress();
				}, 3e4);
			};
			/**
			* Keep the fast iframe download and still report progress: the host writes
			* one SSE event per archived entry, then a final state event.
			*/
			const startZipProgress = (token, total) => {
				const source = new EventSource("/plugins/dsh-image-gen/zip/progress?token=" + encodeURIComponent(token));
				zipEventSourceRef.current = source;
				armZipWatchdog();
				source.addEventListener("progress", (event) => {
					try {
						const data = JSON.parse(event.data);
						if (typeof data.done === "number" && typeof data.total === "number" && data.total > 0) {
							if (zipWatchdogRef.current !== null) {
								window.clearTimeout(zipWatchdogRef.current);
								zipWatchdogRef.current = null;
							}
							setBatchDownloadStatus(String(data.done) + "/" + String(data.total));
						}
						if (data.state === "done") {
							showToast(t("batchDownloadComplete", { count: String(data.total ?? total) }));
							setIsDownloadingBatch(false);
							closeZipProgress();
						} else if (data.state === "cancelled") {
							showToast(t("cancel"));
							setIsDownloadingBatch(false);
							closeZipProgress();
						} else if (data.state === "error") {
							showToast(t("batchDownloadFailed"));
							setIsDownloadingBatch(false);
							closeZipProgress();
						}
					} catch {}
				});
				source.onerror = () => {
					if (source.readyState === EventSource.CLOSED) {
						showToast(t("batchDownloadFailed"));
						setIsDownloadingBatch(false);
						closeZipProgress();
					}
				};
			};
			/** Prefer the raw vault copy; the attachment remains the fallback. */
			const fetchOriginalBlob = fetchGalleryItemBlob;
			const cancelZipDownload = async () => {
				const token = zipTokenRef.current;
				if (token === null) return;
				try {
					await fetch("/plugins/dsh-image-gen/zip/cancel?token=" + encodeURIComponent(token), { method: "POST" });
				} catch {}
				showToast(t("cancel"));
				setIsDownloadingBatch(false);
				closeZipProgress();
			};
			const handleBatchDownload = async () => {
				if (selectedIds.size === 0 || isDownloadingBatch) return;
				const itemsToDownload = selectedItems;
				if (itemsToDownload.length === 0) return;
				setIsDownloadingBatch(true);
				let awaitingServer = false;
				try {
					if (itemsToDownload.length === 1) {
						const single = itemsToDownload[0];
						if (!single) return;
						const blob = await fetchGalleryItemBlob(single);
						const objectUrl = URL.createObjectURL(blob);
						downloadBlobUrl(objectUrl, galleryDownloadName(single, blob));
						URL.revokeObjectURL(objectUrl);
						showToast(t("batchDownloadSingleToast"));
						return;
					}
					if (itemsToDownload.length > 2e3) {
						showToast(t("batchDownloadLimit"));
						return;
					}
					if (await canUseServerZip()) {
						const token = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
						zipTokenRef.current = token;
						setIsZipDownload(true);
						startZipProgress(token, itemsToDownload.length);
						postZipDownload(itemsToDownload, token);
						showToast(t("batchDownloadZipToast", { count: String(itemsToDownload.length) }));
						awaitingServer = true;
						return;
					}
					const zipFiles = [];
					const usedNames = /* @__PURE__ */ new Set();
					for (let i = 0; i < itemsToDownload.length; i++) {
						const it = itemsToDownload[i];
						if (!it) continue;
						setBatchDownloadProgress(`${i + 1}/${itemsToDownload.length}`);
						const blob = await fetchAttachmentBlob(it.attachment);
						const arrayBuffer = await blob.arrayBuffer();
						const ext = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png";
						let baseName = `dsh-${it.provider}-${it.id.slice(0, 8)}.${ext}`;
						let count = 1;
						while (usedNames.has(baseName)) {
							baseName = `dsh-${it.provider}-${it.id.slice(0, 8)}-${count}.${ext}`;
							count++;
						}
						usedNames.add(baseName);
						zipFiles.push({
							name: baseName,
							data: new Uint8Array(arrayBuffer)
						});
					}
					const zipBlob = createZipBlob(zipFiles);
					const zipUrl = URL.createObjectURL(zipBlob);
					downloadBlobUrl(zipUrl, `dsh-gallery-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "")}.zip`);
					URL.revokeObjectURL(zipUrl);
					showToast(t("batchDownloadZipToast", { count: String(itemsToDownload.length) }));
				} catch (err) {
					console.error("[dsh-image-gen] Batch download failed:", err);
					showToast(t("batchDownloadFailed"));
				} finally {
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
					const attachmentIds = Array.from(new Set(items.map((item) => String(item.attachment.attachmentId))));
					const [thumbs, response] = await Promise.all([getGalleryThumbStats(), fetch(STORAGE_STATS_ROUTE, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ attachmentIds })
					})]);
					if (!response.ok) throw new Error("storage stats failed (" + response.status + ")");
					const stats = await response.json();
					setStorageStats({
						...stats,
						thumbs
					});
				} catch (err) {
					console.error("[dsh-image-gen] Storage stats failed:", err);
					showToast(t("storageScanFailed"));
					setShowStorageModal(false);
				} finally {
					setIsStorageScanning(false);
				}
			};
			const exportOrphanList = () => {
				if (storageStats === null) return;
				const payload = JSON.stringify({
					scannedAt: new Date(storageStats.scannedAt).toISOString(),
					count: storageStats.orphans.count,
					bytes: storageStats.orphans.bytes,
					ids: storageStats.orphans.ids
				}, null, 2);
				const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
				const anchor = document.createElement("a");
				anchor.href = url;
				anchor.download = "dsh-image-gen-orphans.json";
				document.body.appendChild(anchor);
				anchor.click();
				document.body.removeChild(anchor);
				window.setTimeout(() => URL.revokeObjectURL(url), 1e4);
			};
			const requestSingleDelete = (item, e) => {
				if (e) e.stopPropagation();
				setSelectedIds(/* @__PURE__ */ new Set([item.id]));
				setShowDeleteModal(true);
			};
			const hasWorkspaceFilesToDelete = (0, react.useMemo)(() => items.some((i) => selectedIds.has(i.id) && typeof i.savedTo === "string" && i.savedTo.trim().length > 0), [items, selectedIds]);
			const handleConfirmBatchDelete = async () => {
				if (selectedIds.size === 0 || isDeleting) return;
				setIsDeleting(true);
				const idsToDelete = Array.from(selectedIds);
				const itemsToDelete = items.filter((i) => selectedIds.has(i.id));
				const pathsToDelete = itemsToDelete.map((i) => i.savedTo).filter((p) => typeof p === "string" && p.trim().length > 0);
				let deletedFiles = 0;
				if (deleteWorkspaceFiles && pathsToDelete.length > 0) try {
					const res = await fetch(DELETE_ROUTE, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ paths: pathsToDelete })
					});
					if (!res.ok) {
						setIsDeleting(false);
						showToast(`工作区文件删除失败 (${res.status})`);
						return;
					}
					const data = await res.json().catch(() => null);
					if (!data || data.ok === false || Array.isArray(data.failedFiles) && data.failedFiles.length > 0) {
						setIsDeleting(false);
						const reason = data?.failedFiles?.[0]?.error || "工作区文件未能删除";
						showToast(`删除失败：${reason}`);
						return;
					}
					deletedFiles = data.deletedCount ?? 0;
				} catch (err) {
					setIsDeleting(false);
					showToast(err instanceof Error ? err.message : "工作区文件删除网络异常");
					return;
				}
				try {
					const deletedVaultKeys = vaultKeysOf(itemsToDelete);
					const remainingVaultKeys = vaultKeysOf((await getGalleryItemsStrict()).filter((item) => !idsToDelete.includes(item.id)));
					await bulkDeleteGalleryItems(idsToDelete);
					for (const item of itemsToDelete) evictAttachmentCache(item.attachment.attachmentId);
					deleteVaultOriginals(deletedVaultKeys, remainingVaultKeys);
				} catch (err) {
					setIsDeleting(false);
					showToast(t("deleteFailedDatabase"));
					return;
				}
				if (previewItem && selectedIds.has(previewItem.id)) handleClosePreview();
				setIsDeleting(false);
				setShowDeleteModal(false);
				if (isManageMode) handleExitManage();
				else {
					setSelectedIds(/* @__PURE__ */ new Set());
					lastSelectedIndexRef.current = null;
				}
				if (deletedFiles > 0) showToast(t("batchDeletedWithFilesToast", {
					count: String(idsToDelete.length),
					files: String(deletedFiles)
				}));
				else showToast(t("batchDeletedToast", { count: String(idsToDelete.length) }));
			};
			(0, react.useLayoutEffect)(() => {
				cardActionsRef.current = {
					click: handleCardClick,
					toggleSelect: (item, index, event) => handleToggleSelect(item.id, index, event),
					requestDelete: (item) => requestSingleDelete(item),
					preview: (item, blob) => openPreviewItem(item, blob),
					toast: showToast
				};
			});
			return (0, react_jsx_runtime.jsxs)("div", {
				className: `dsh-ig-gallery-page${inSidebar ? " dsh-ig-page-in-sidebar" : ""}`,
				"data-conversation-composer-overlay": "",
				children: [
					(0, react_jsx_runtime.jsxs)("header", {
						className: "dsh-ig-studio-tabs-bar",
						children: [
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `dsh-ig-studio-tab-btn ${activeTab === "gallery" ? "is-active" : ""}`,
								onClick: () => setActiveTab("gallery"),
								children: [(0, react_jsx_runtime.jsx)(Image$1, { size: 15 }), (0, react_jsx_runtime.jsx)("span", { children: t("tabGallery") })]
							}),
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `dsh-ig-studio-tab-btn ${activeTab === "studio" ? "is-active" : ""}`,
								onClick: () => setActiveTab("studio"),
								children: [(0, react_jsx_runtime.jsx)(SlidersHorizontal, { size: 15 }), (0, react_jsx_runtime.jsx)("span", { children: t("tabStudio") })]
							}),
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `dsh-ig-studio-tab-btn ${activeTab === "inspiration" ? "is-active" : ""}`,
								onClick: () => setActiveTab("inspiration"),
								children: [(0, react_jsx_runtime.jsx)(Sparkles, { size: 15 }), (0, react_jsx_runtime.jsx)("span", { children: t("tabInspiration") })]
							}),
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `dsh-ig-studio-tab-btn ${activeTab === "favorites" ? "is-active" : ""}`,
								onClick: () => setActiveTab("favorites"),
								children: [(0, react_jsx_runtime.jsx)(Heart, { size: 15 }), (0, react_jsx_runtime.jsx)("span", { children: t("tabFavorites") })]
							})
						]
					}),
					(activeTab === "gallery" || activeTab === "favorites") && (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-studio-toolbar",
						children: [(0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-studio-toolbar-left",
							children: [
								(0, react_jsx_runtime.jsxs)("select", {
									className: "dsh-ig-studio-select",
									value: selectedProvider,
									onChange: (e) => setSelectedProvider(e.target.value),
									children: [
										(0, react_jsx_runtime.jsx)("option", {
											value: "all",
											children: t("filterAllProviders")
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "google",
											children: t("filterGoogle")
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "openai",
											children: t("filterOpenAI")
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "openai-compat",
											children: t("filterOpenAICompat")
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "seedream",
											children: t("filterSeedream")
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "dashscope",
											children: t("filterDashScope")
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "xai",
											children: t("filterXAI")
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "zhipu",
											children: t("filterZhipu")
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "comfyui",
											children: t("filterComfyUI")
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "import",
											children: t("filterImport")
										})
									]
								}),
								(0, react_jsx_runtime.jsxs)("select", {
									className: "dsh-ig-studio-select",
									value: selectedRatio,
									onChange: (e) => setSelectedRatio(e.target.value),
									children: [
										(0, react_jsx_runtime.jsx)("option", {
											value: "all",
											children: t("filterAllRatios")
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "1:1",
											children: "1:1"
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "16:9",
											children: "16:9"
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "9:16",
											children: "9:16"
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "4:3",
											children: "4:3"
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "3:4",
											children: "3:4"
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "3:2",
											children: "3:2"
										}),
										(0, react_jsx_runtime.jsx)("option", {
											value: "2:3",
											children: "2:3"
										})
									]
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-studio-search-wrap",
									children: [(0, react_jsx_runtime.jsx)(Search, {
										className: "dsh-ig-studio-search-icon",
										size: 14
									}), (0, react_jsx_runtime.jsx)("input", {
										type: "text",
										className: "dsh-ig-studio-search-input",
										placeholder: t("searchPlaceholder"),
										value: search,
										onChange: (e) => setSearch(e.target.value)
									})]
								}),
								(0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-ig-workspace-filter-label",
									title: t("filterCurrentWorkspaceHint"),
									children: [
										(0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											className: "dsh-ig-workspace-checkbox",
											checked: onlyCurrentWorkspace,
											onChange: (e) => setOnlyCurrentWorkspace(e.target.checked)
										}),
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-workspace-filter-text",
											children: t("filterCurrentWorkspace")
										}),
										(0, react_jsx_runtime.jsxs)("span", {
											className: "dsh-ig-workspace-filter-badge",
											children: [
												workspaceItemsCount,
												"/",
												items.length
											]
										})
									]
								})
							]
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-studio-toolbar-right",
							children: [
								activeTab === "gallery" && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("input", {
									ref: importInputRef,
									type: "file",
									accept: "image/png,image/jpeg,image/webp,image/gif",
									multiple: true,
									style: { display: "none" },
									onChange: (event) => {
										importImages(event.target.files);
										event.target.value = "";
									}
								}), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-ig-studio-btn",
									disabled: importing,
									title: t("importPickHint"),
									"aria-label": t("importImages"),
									onClick: () => importInputRef.current?.click(),
									children: (0, react_jsx_runtime.jsx)(Upload, { size: 13 })
								})] }),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-ig-studio-btn",
									title: t("storageTitle"),
									onClick: () => void openStorageStats(),
									children: (0, react_jsx_runtime.jsx)(HardDrive, { size: 13 })
								}),
								(0, react_jsx_runtime.jsxs)("select", {
									className: "dsh-ig-studio-select dsh-ig-studio-select-sort",
									value: sortBy,
									onChange: (e) => setSortBy(e.target.value),
									children: [(0, react_jsx_runtime.jsx)("option", {
										value: "newest",
										children: t("sortNewest")
									}), (0, react_jsx_runtime.jsx)("option", {
										value: "oldest",
										children: t("sortOldest")
									})]
								}),
								(0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: `dsh-ig-studio-btn ${isManageMode ? "is-active" : ""}`,
									title: isManageMode ? t("exitManage") : t("manage"),
									onClick: () => {
										if (isManageMode) handleExitManage();
										else setIsManageMode(true);
									},
									children: [(0, react_jsx_runtime.jsx)(SquareCheckBig, { size: 13 }), (0, react_jsx_runtime.jsx)("span", { children: isManageMode ? t("exitManage") : t("manage") })]
								})
							]
						})]
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: `dsh-ig-gallery-page-body ${activeTab === "studio" ? "is-workbench" : ""}`,
						children: activeTab === "gallery" || activeTab === "favorites" ? items.length === 0 ? (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-gallery-empty",
							children: [
								(0, react_jsx_runtime.jsxs)("svg", {
									className: "dsh-ig-gallery-empty-icon",
									width: "44",
									height: "44",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "1.5",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									"aria-hidden": "true",
									children: [
										(0, react_jsx_runtime.jsx)("rect", {
											x: "3",
											y: "3",
											width: "18",
											height: "18",
											rx: "2",
											ry: "2"
										}),
										(0, react_jsx_runtime.jsx)("circle", {
											cx: "9",
											cy: "9",
											r: "2"
										}),
										(0, react_jsx_runtime.jsx)("path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" })
									]
								}),
								(0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-gallery-empty-title",
									children: t("emptyTitle")
								}),
								(0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-gallery-empty-desc",
									children: t("emptyDesc")
								})
							]
						}) : activeTab === "favorites" && filteredItems.length === 0 && search === "" && selectedProvider === "all" && selectedRatio === "all" ? (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-gallery-empty",
							children: [
								(0, react_jsx_runtime.jsx)("svg", {
									className: "dsh-ig-gallery-empty-icon",
									width: "44",
									height: "44",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "1.5",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									"aria-hidden": "true",
									children: (0, react_jsx_runtime.jsx)("path", { d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" })
								}),
								(0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-gallery-empty-title",
									children: t("favEmptyTitle")
								}),
								(0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-gallery-empty-desc",
									children: t("favEmptyDesc")
								})
							]
						}) : filteredItems.length === 0 ? (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-gallery-empty",
							children: [
								(0, react_jsx_runtime.jsxs)("svg", {
									className: "dsh-ig-gallery-empty-icon",
									width: "44",
									height: "44",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "1.5",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									"aria-hidden": "true",
									children: [(0, react_jsx_runtime.jsx)("circle", {
										cx: "11",
										cy: "11",
										r: "8"
									}), (0, react_jsx_runtime.jsx)("path", { d: "m21 21-4.3-4.3" })]
								}),
								(0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-gallery-empty-title",
									children: t("noMatchTitle")
								}),
								(0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-gallery-empty-desc",
									children: t("noMatchDesc")
								})
							]
						}) : (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-gallery-grid",
							children: [filteredItems.slice(0, renderLimit).map((item, idx) => (0, react_jsx_runtime.jsx)(GalleryCard, {
								lang,
								item,
								index: idx,
								isManageMode,
								isSelected: selectedIds.has(item.id),
								t,
								actions: cardActions
							}, item.id)), filteredItems.length > renderLimit && (0, react_jsx_runtime.jsx)("div", {
								ref: gallerySentinelRef,
								className: "dsh-ig-gallery-sentinel",
								"aria-hidden": "true"
							})]
						}) : activeTab === "inspiration" ? (0, react_jsx_runtime.jsx)(InspirationView, {
							locale,
							onUsePrompt: useInspirationPrompt,
							onUseReference: useInspirationReference
						}) : (0, react_jsx_runtime.jsx)(StudioView, {
							locale,
							credentialEvents,
							workspace: activeWorkspace,
							initialPrompt: studioDraft,
							initialReference: studioReference,
							initialCanvasSurface,
							showInfiniteCanvasHint: !inSidebar,
							onInitialPromptApplied: clearStudioDraft,
							onInitialReferenceApplied: clearStudioReference,
							onOpenInspiration: () => setActiveTab("inspiration")
						})
					}),
					toast && (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-gallery-page-toast",
						children: toast
					}),
					shouldShowBatchBar(activeTab, isManageMode, selectedIds.size) && (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-batch-bar",
						children: [(0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-batch-bar-left",
							children: [
								(0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ig-batch-counter",
									children: t("selectedCount", { n: String(selectedIds.size) })
								}),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-ig-batch-btn",
									onClick: handleSelectAll,
									children: t("selectAll")
								}),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-ig-batch-btn",
									onClick: handleInvertSelect,
									children: t("invertSelect")
								}),
								selectedIds.size > 0 && (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-ig-batch-btn",
									onClick: handleClearSelect,
									children: t("clearSelect")
								})
							]
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-batch-bar-right",
							children: [
								(0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: `dsh-ig-batch-btn ${allSelectedAreFavorites ? "is-favorited" : ""}`,
									disabled: selectedIds.size === 0,
									onClick: () => void handleBatchToggleFavorite(),
									title: allSelectedAreFavorites ? t("batchUnfavorite") : t("batchFavorite"),
									children: [(0, react_jsx_runtime.jsx)(Heart, {
										size: 13,
										fill: allSelectedAreFavorites ? "#ef4444" : "none",
										color: allSelectedAreFavorites ? "#ef4444" : "currentColor"
									}), (0, react_jsx_runtime.jsx)("span", { children: allSelectedAreFavorites ? t("batchUnfavorite") : t("batchFavorite") })]
								}),
								(0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "dsh-ig-batch-btn dsh-ig-batch-btn-download",
									disabled: selectedIds.size === 0 || isDownloadingBatch,
									onClick: () => void handleBatchDownload(),
									title: t("batchDownload"),
									children: [(0, react_jsx_runtime.jsx)(Download, { size: 13 }), (0, react_jsx_runtime.jsx)("span", { children: isDownloadingBatch && batchDownloadStatus ? batchDownloadStatus : isDownloadingBatch && batchDownloadProgress ? t("batchDownloading", {
										current: batchDownloadProgress.split("/")[0] ?? "",
										total: batchDownloadProgress.split("/")[1] ?? ""
									}) : t("batchDownload") })]
								}),
								isZipDownload && (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "dsh-ig-batch-btn",
									onClick: () => void cancelZipDownload(),
									title: t("cancel"),
									children: [(0, react_jsx_runtime.jsx)(X, { size: 13 }), (0, react_jsx_runtime.jsx)("span", { children: t("cancel") })]
								}),
								(0, react_jsx_runtime.jsx)("span", { className: "dsh-ig-batch-divider" }),
								(0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "dsh-ig-batch-btn dsh-ig-batch-btn-danger",
									disabled: selectedIds.size === 0,
									onClick: () => setShowDeleteModal(true),
									children: [(0, react_jsx_runtime.jsx)(Trash2, { size: 13 }), (0, react_jsx_runtime.jsxs)("span", { children: [t("batchDelete"), selectedIds.size > 0 ? ` (${selectedIds.size})` : ""] })]
								}),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-ig-batch-btn dsh-ig-batch-btn-exit",
									onClick: handleExitManage,
									children: t("exitManage")
								})
							]
						})]
					}),
					showDeleteModal && (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-modal-backdrop",
						onClick: () => {
							if (!isDeleting) {
								setShowDeleteModal(false);
								if (!isManageMode) setSelectedIds(/* @__PURE__ */ new Set());
							}
						},
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-modal-box",
							onClick: (e) => e.stopPropagation(),
							children: [
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-modal-header",
									children: [(0, react_jsx_runtime.jsx)("div", {
										className: "dsh-ig-modal-icon-danger",
										children: (0, react_jsx_runtime.jsx)(TriangleAlert, { size: 20 })
									}), (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-ig-modal-title",
										children: selectedIds.size === 1 ? t("batchDeleteTitleSingle") : t("batchDeleteTitle", { count: String(selectedIds.size) })
									})]
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-modal-body",
									children: [(0, react_jsx_runtime.jsx)("p", {
										className: "dsh-ig-modal-desc",
										children: t("batchDeleteDesc")
									}), hasWorkspaceFilesToDelete && (0, react_jsx_runtime.jsxs)("label", {
										className: "dsh-ig-modal-checkbox-label",
										children: [(0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: deleteWorkspaceFiles,
											onChange: (e) => setDeleteWorkspaceFiles(e.target.checked),
											disabled: isDeleting
										}), (0, react_jsx_runtime.jsx)("span", { children: t("deleteWorkspaceFilesOpt") })]
									})]
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-modal-footer",
									children: [(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-modal-btn dsh-ig-modal-btn-cancel",
										onClick: () => {
											setShowDeleteModal(false);
											if (!isManageMode) setSelectedIds(/* @__PURE__ */ new Set());
										},
										disabled: isDeleting,
										children: t("cancel")
									}), (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-modal-btn dsh-ig-modal-btn-danger",
										onClick: handleConfirmBatchDelete,
										disabled: isDeleting,
										children: isDeleting ? "..." : selectedIds.size === 1 ? t("confirmDeleteSingle") : t("confirmBatchDelete", { count: String(selectedIds.size) })
									})]
								})
							]
						})
					}),
					showStorageModal && (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-modal-backdrop",
						onClick: () => {
							if (!isStorageScanning) setShowStorageModal(false);
						},
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-modal-box",
							onClick: (e) => e.stopPropagation(),
							children: [
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-modal-header",
									children: [(0, react_jsx_runtime.jsx)("div", {
										className: "dsh-ig-regenerate-modal-icon",
										children: (0, react_jsx_runtime.jsx)(HardDrive, { size: 18 })
									}), (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-ig-modal-title",
										children: t("storageTitle")
									})]
								}),
								(0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-modal-body",
									children: isStorageScanning || storageStats === null ? (0, react_jsx_runtime.jsx)("p", {
										className: "dsh-ig-modal-desc",
										children: t("storageScanning")
									}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										(0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												flexDirection: "column",
												gap: "8px",
												marginBottom: "12px"
											},
											children: [
												(0, react_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														justifyContent: "space-between",
														gap: "12px"
													},
													children: [(0, react_jsx_runtime.jsx)("span", { children: t("storageAttachments") }), (0, react_jsx_runtime.jsxs)("span", { children: [
														t("storageItems", { n: String(storageStats.attachments.count) }),
														" · ",
														formatStorageBytes(storageStats.attachments.bytes)
													] })]
												}),
												(0, react_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														justifyContent: "space-between",
														gap: "12px"
													},
													children: [(0, react_jsx_runtime.jsx)("span", { children: t("storageThumbs") }), (0, react_jsx_runtime.jsxs)("span", { children: [
														t("storageItems", { n: String(storageStats.thumbs.count) }),
														" · ",
														formatStorageBytes(storageStats.thumbs.bytes)
													] })]
												}),
												(0, react_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														justifyContent: "space-between",
														gap: "12px"
													},
													children: [(0, react_jsx_runtime.jsx)("span", { children: t("storageRequestCache") }), (0, react_jsx_runtime.jsxs)("span", { children: [
														t("storageItems", { n: String(storageStats.requestImages.count) }),
														" · ",
														formatStorageBytes(storageStats.requestImages.bytes)
													] })]
												}),
												(0, react_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														justifyContent: "space-between",
														gap: "12px"
													},
													children: [(0, react_jsx_runtime.jsx)("span", { children: t("storageOrphans") }), (0, react_jsx_runtime.jsxs)("span", { children: [
														t("storageItems", { n: String(storageStats.orphans.count) }),
														" · ",
														formatStorageBytes(storageStats.orphans.bytes)
													] })]
												})
											]
										}),
										(0, react_jsx_runtime.jsx)("p", {
											className: "dsh-ig-modal-desc",
											children: t("storageThumbsHint")
										}),
										(0, react_jsx_runtime.jsx)("p", {
											className: "dsh-ig-modal-desc",
											children: t("storageOrphanHint")
										}),
										(0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dsh-ig-modal-btn",
											onClick: exportOrphanList,
											disabled: storageStats.orphans.count === 0,
											children: t("storageExport")
										})
									] })
								}),
								(0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-modal-footer",
									children: (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-modal-btn dsh-ig-modal-btn-cancel",
										onClick: () => setShowStorageModal(false),
										disabled: isStorageScanning,
										children: t("storageClose")
									})
								})
							]
						})
					}),
					showRegenerateModal && previewItem && (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-modal-backdrop",
						onClick: handleCancelRegeneratePrompt,
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-modal-box dsh-ig-regenerate-modal-box",
							onClick: (e) => e.stopPropagation(),
							children: [
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-modal-header",
									children: [(0, react_jsx_runtime.jsx)("div", {
										className: "dsh-ig-regenerate-modal-icon",
										children: (0, react_jsx_runtime.jsx)(Sparkles, { size: 18 })
									}), (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-ig-regenerate-modal-title-wrap",
										children: [(0, react_jsx_runtime.jsx)("div", {
											className: "dsh-ig-modal-title",
											children: t("regenerateTitle")
										}), (0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-regenerate-modal-meta",
											children: [
												(0, react_jsx_runtime.jsx)("span", {
													className: "dsh-ig-tag",
													children: previewItem.provider === "import" ? t("filterImport") : previewItem.provider
												}),
												previewItem.model && (0, react_jsx_runtime.jsx)("span", {
													className: "dsh-ig-tag dsh-ig-tag-model",
													children: previewItem.model
												}),
												(0, react_jsx_runtime.jsx)("span", {
													className: "dsh-ig-tag",
													children: formatCardMeta(previewItem)
												})
											]
										})]
									})]
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-modal-body",
									children: [(0, react_jsx_runtime.jsx)("p", {
										className: "dsh-ig-modal-desc",
										children: t("regenerateHint")
									}), (0, react_jsx_runtime.jsx)("textarea", {
										className: "dsh-ig-regenerate-modal-textarea",
										value: regeneratePrompt,
										onChange: (e) => setRegeneratePrompt(e.target.value),
										placeholder: t("prompt"),
										rows: 4,
										autoFocus: true
									})]
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-modal-footer",
									children: [(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-modal-btn dsh-ig-modal-btn-cancel",
										onClick: handleCancelRegeneratePrompt,
										children: t("cancel")
									}), (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "dsh-ig-modal-btn dsh-ig-modal-btn-primary",
										onClick: handleConfirmRegenerate,
										disabled: regeneratePrompt.trim().length === 0,
										children: [(0, react_jsx_runtime.jsx)(Sparkles, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: t("confirmRegenerate") })]
									})]
								})
							]
						})
					}),
					previewItem && (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-lightbox-backdrop",
						onClick: handleClosePreview,
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-lightbox-topbar",
								onClick: (e) => e.stopPropagation(),
								children: [(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-lightbox-meta",
									children: [
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-tag",
											children: previewItem.provider === "import" ? t("filterImport") : previewItem.provider
										}),
										previewItem.model ? (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-tag dsh-ig-tag-model",
											children: previewItem.model
										}) : null,
										currentPreviewIndex >= 0 && (0, react_jsx_runtime.jsxs)("span", {
											className: "dsh-ig-lightbox-counter",
											children: [
												currentPreviewIndex + 1,
												" / ",
												filteredItems.length
											]
										})
									]
								}), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-ig-lightbox-close-btn",
									title: t("close"),
									onClick: handleClosePreview,
									children: (0, react_jsx_runtime.jsx)(X, { size: 18 })
								})]
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-lightbox-nav-btn dsh-ig-lightbox-nav-prev",
								title: t("prevImage"),
								disabled: !hasPrev,
								onClick: (e) => {
									e.stopPropagation();
									goToPrev();
								},
								children: (0, react_jsx_runtime.jsx)(ChevronLeft, { size: 24 })
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-lightbox-nav-btn dsh-ig-lightbox-nav-next",
								title: t("nextImage"),
								disabled: !hasNext,
								onClick: (e) => {
									e.stopPropagation();
									goToNext();
								},
								children: (0, react_jsx_runtime.jsx)(ChevronRight, { size: 24 })
							}),
							(0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ig-lightbox-img-wrap",
								onClick: (e) => e.stopPropagation(),
								children: gifPreview !== void 0 ? (0, react_jsx_runtime.jsx)(GalleryGifStage, {
									preview: gifPreview,
									poster: previewUrl ?? void 0
								}) : previewUrl ? (0, react_jsx_runtime.jsx)("img", {
									className: "dsh-ig-lightbox-img",
									src: previewUrl,
									alt: previewItem.prompt,
									decoding: "async",
									onLoad: () => setPreviewLoading(false),
									onError: () => {
										const failedUrl = previewUrl;
										if (failedUrl.startsWith("blob:")) {
											setPreviewLoading(false);
											return;
										}
										const original = imageUrlFor(previewItem.attachment);
										if (failedUrl !== original) {
											if (previewUrlRef.current !== null) URL.revokeObjectURL(previewUrlRef.current);
											previewUrlRef.current = null;
											setPreviewBlob(null);
											setPreviewUrl(original);
											return;
										}
										const requestId = previewRequestRef.current;
										fetchAttachmentBlob(previewItem.attachment).then((fetched) => {
											if (previewRequestRef.current !== requestId) return;
											if (previewUrlRef.current !== null) URL.revokeObjectURL(previewUrlRef.current);
											const objectUrl = URL.createObjectURL(fetched);
											previewUrlRef.current = objectUrl;
											setPreviewBlob(fetched);
											setPreviewUrl(objectUrl);
											setPreviewLoading(false);
										}).catch(() => setPreviewLoading(false));
									}
								}) : null
							}),
							gifPreview !== void 0 ? (0, react_jsx_runtime.jsx)(GalleryGifBar, { preview: gifPreview }) : null,
							(0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-lightbox-bottombar",
								onClick: (e) => e.stopPropagation(),
								children: [(0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-lightbox-prompt-text",
									title: previewItem.prompt,
									children: previewItem.prompt
								}), (0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-lightbox-actions",
									children: [
										(0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dsh-ig-lightbox-btn",
											title: t("copyPpt"),
											onClick: async () => {
												await navigator.clipboard.writeText(previewItem.prompt);
												showToast(t("copiedPrompt"));
											},
											children: [(0, react_jsx_runtime.jsx)(FileText, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: t("copyPpt") })]
										}),
										(0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dsh-ig-lightbox-btn",
											title: t("copyImg"),
											onClick: async () => {
												try {
													const ok = await copyImageBlob(previewItem.original !== void 0 ? await fetchOriginalBlob(previewItem) : previewBlob ?? await fetchAttachmentBlob(previewItem.attachment));
													showToast(ok ? t("copiedImage") : t("copyFailed"));
												} catch {
													showToast(t("copyFailed"));
												}
											},
											children: [(0, react_jsx_runtime.jsx)(Copy, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: t("copyImg") })]
										}),
										gifPreview !== void 0 ? (0, react_jsx_runtime.jsx)(GalleryGifDownload, { preview: gifPreview }) : (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dsh-ig-lightbox-btn",
											title: t("download"),
											onClick: async () => {
												try {
													const blob = previewItem.original !== void 0 ? await fetchOriginalBlob(previewItem) : previewBlob ?? await fetchAttachmentBlob(previewItem.attachment);
													const objectUrl = URL.createObjectURL(blob);
													downloadBlobUrl(objectUrl, galleryDownloadName(previewItem, blob));
													URL.revokeObjectURL(objectUrl);
												} catch {
													showToast(t("batchDownloadFailed"));
												}
											},
											children: [(0, react_jsx_runtime.jsx)(Download, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: t("download") })]
										}),
										(0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dsh-ig-lightbox-btn dsh-ig-lightbox-btn-regenerate",
											title: t("regenerate"),
											disabled: isRegenerating,
											onClick: handleOpenRegenerate,
											children: [(0, react_jsx_runtime.jsx)(Sparkles, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: t("regenerate") })]
										}),
										isRegenerating && (0, react_jsx_runtime.jsxs)("div", {
											className: "dsh-ig-lightbox-generating-indicator",
											children: [
												(0, react_jsx_runtime.jsx)("div", { className: "dsh-ig-lightbox-spinner-sm" }),
												(0, react_jsx_runtime.jsx)("span", { children: t("regenerating") }),
												(0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: "dsh-ig-lightbox-abort-btn",
													onClick: handleAbortRegenerating,
													children: t("cancel")
												})
											]
										}),
										(0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dsh-ig-lightbox-btn dsh-ig-lightbox-btn-danger",
											title: t("delete"),
											onClick: () => {
												if (previewItem) requestSingleDelete(previewItem);
											},
											children: [(0, react_jsx_runtime.jsx)(Trash2, { size: 14 }), (0, react_jsx_runtime.jsx)("span", { children: t("delete") })]
										})
									]
								})]
							})
						]
					})
				]
			});
		};
		//#endregion
		//#region lib/types/client/image-ref.js
		/**
		* Extract the verified durable image attachment from a completed tool result block.
		* Supports legacy rc.2 `resultView.content` and modern DSH `block.content`.
		*/
		function imageRef(block) {
			if (!("kind" in block)) return void 0;
			const fromResultView = block.resultView?.card === "generic" ? block.resultView.content?.find((item) => item.type === "image") : void 0;
			if (fromResultView?.type === "image") return fromResultView.attachment;
			const fromBlockContent = Array.isArray(block.content) ? block.content.find((item) => item.type === "image") : void 0;
			if (fromBlockContent?.type === "image") return fromBlockContent.attachment;
		}
		//#endregion
		//#region lib/types/client/conversation-image-revisions.js
		function revisionKey(revision) {
			return imageVersionKey(String(revision.attachment.attachmentId), revision.original);
		}
		const STORAGE_PREFIX = "dsh_image_gen_conversation_revisions:";
		/** Read the locally persisted replacement history for one immutable conversation image. */
		function loadConversationImageRevisionChain(originId) {
			const empty = () => ({
				originId,
				currentIndex: 0,
				revisions: []
			});
			try {
				const raw = globalThis.localStorage?.getItem(storageKey(originId));
				if (!raw) return empty();
				const value = JSON.parse(raw);
				if (!isChain(value, originId)) return empty();
				return {
					originId,
					currentIndex: Math.min(value.currentIndex, value.revisions.length),
					revisions: value.revisions.map(({ original, ...revision }) => {
						const checked = originalFromMeta(original);
						return checked === void 0 ? revision : {
							...revision,
							original: checked
						};
					})
				};
			} catch {
				return empty();
			}
		}
		/** Append a generated version and make it the version shown by the conversation card. */
		function appendConversationImageRevision(originId, revision) {
			const current = loadConversationImageRevisionChain(originId);
			const key = revisionKey(revision);
			const revisions = [...current.revisions.filter((item) => revisionKey(item) !== key), revision].slice(-20);
			const next = {
				originId,
				currentIndex: revisions.length,
				revisions
			};
			persist(next);
			return next;
		}
		/** Select an earlier or later version without altering the underlying conversation event. */
		function selectConversationImageRevision(originId, requestedIndex) {
			const current = loadConversationImageRevisionChain(originId);
			const currentIndex = Math.max(0, Math.min(Math.trunc(requestedIndex), current.revisions.length));
			const next = {
				...current,
				currentIndex
			};
			persist(next);
			return next;
		}
		function persist(chain) {
			try {
				globalThis.localStorage?.setItem(storageKey(chain.originId), JSON.stringify(chain));
			} catch {}
		}
		function storageKey(originId) {
			return `${STORAGE_PREFIX}${originId}`;
		}
		function isChain(value, originId) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
			const candidate = value;
			return candidate.originId === originId && typeof candidate.currentIndex === "number" && Number.isSafeInteger(candidate.currentIndex) && candidate.currentIndex >= 0 && Array.isArray(candidate.revisions) && candidate.revisions.every(isRevision);
		}
		function isRevision(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
			const candidate = value;
			return isAttachment(candidate.attachment) && typeof candidate.provider === "string" && STUDIO_PROVIDERS.includes(candidate.provider) && (candidate.channel === void 0 || typeof candidate.channel === "string") && typeof candidate.prompt === "string" && typeof candidate.model === "string" && typeof candidate.output === "string" && typeof candidate.createdAt === "number" && Number.isFinite(candidate.createdAt) && typeof candidate.ratio === "string" && typeof candidate.quality === "string" && (candidate.resolution === void 0 || typeof candidate.resolution === "string") && (candidate.generationQuality === void 0 || typeof candidate.generationQuality === "string") && (candidate.watermark === void 0 || STUDIO_WATERMARK_VALUES.some((value) => value === candidate.watermark));
		}
		function isAttachment(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
			const candidate = value;
			return typeof candidate.attachmentId === "string" && (candidate.mediaType === "image/png" || candidate.mediaType === "image/jpeg" || candidate.mediaType === "image/webp" || candidate.mediaType === "image/gif") && typeof candidate.bytes === "number" && typeof candidate.width === "number" && typeof candidate.height === "number";
		}
		//#endregion
		//#region lib/types/client/plugin-i18n.js
		const DICT = {
			zh: {
				title: "图像生成",
				description: "配置各 Provider 的 Key 与模型，并选择默认 Provider。",
				defaultProvider: "默认 Provider",
				defaultProviderHint: "Agent 生图默认使用；Studio 与工具调用可临时指定其他 Provider。",
				settingsReadOnly: "设置由配置文件提供，只读；如需修改请编辑对应的配置来源。",
				settingsLoading: "正在加载图像生成设置，请稍候。",
				settingsRemote: "当前连接不支持保存到宿主，请在 DSH 本机页面修改设置。",
				settingsUnavailable: "宿主尚未提供图像生成设置，请检查插件是否已启用及其加载日志。",
				settingsIncompatible: "当前加载的设置库不支持保存。请将插件所在环境的 @deepseek-ai/schemastery 更新到 3.18.4 或兼容的 3.x 版本，并重启 DSH。",
				providerGoogle: "Google Gemini",
				providerOpenAI: "OpenAI",
				providerOpenAICompat: "OpenAI 兼容（中转站）",
				addCompatChannel: "新增 OpenAI 兼容渠道",
				channelName: "渠道名称",
				channelNameRequired: "请填写渠道名称。",
				removeChannel: "删除渠道",
				removeChannelConfirm: "确定删除“{label}”吗？该渠道的配置将被移除。",
				providerSeedream: "字节 Seedream",
				providerDashScope: "阿里 DashScope (通义万相 / Qwen)",
				providerXAI: "xAI Grok Imagine",
				providerZhipu: "智谱 GLM-Image",
				providerComfyUI: "本地 ComfyUI",
				providerChatGPTSub: "ChatGPT 订阅",
				providerGrokSub: "Grok 订阅",
				providerGoogleSub: "Google 订阅",
				subBadgeLoggedIn: "已登录",
				subBadgeLoggedOut: "未登录",
				subBadgeUnknown: "状态未知",
				subSectionTitle: "订阅生图",
				subHint: "通过已登录的订阅账号生图，无需 API Key。登录在你的授权下进行，不会修改任何 API Key 或默认 Provider。",
				subProxyHint: "需要代理时，请在登录前开启代理软件的 TUN（虚拟网卡）模式。普通系统代理可能无法覆盖 DSH 后端请求，导致网页授权后登录失败。",
				subAccountLabel: "账号",
				subAccountEmail: "已登录：{email}",
				subAccountNone: "未登录",
				subLogin: "登录",
				subLoggingIn: "正在登录…",
				subLogout: "退出登录",
				subLoggingOut: "正在退出…",
				subWaitingLogin: "已打开授权页面，请在浏览器中完成登录…",
				subLoginOk: "登录成功",
				subModelLabel: "订阅模型",
				subModelHint: "由订阅通道固定，不可更改。",
				subEditCapability: "订阅生图 · 图生图：支持。对话 edit_image、Studio 图生图与多模型对比均可上传参考图（最多 5 张）。",
				subDefaultHint: "订阅 Provider 已支持文字生图与图生图；图生图使用各订阅渠道默认参数。",
				apiKeyLabel: "{provider} API Key",
				apiKeyPlaceholder: "留空即可保留已配置的 Key",
				apiKeyHint: "安全保存为 {key}；页面不会读回明文。",
				getApiKey: "去官方获取 Key ↗",
				keyReadOnly: "Key 由 {source} 提供且只读；请在该来源中修改。",
				credentialsUnavailable: "凭据服务不可用，无法保存 API Key；建议升级 DSH 到稳定版本。",
				badgeUnavailable: "凭据服务不可用",
				badgeChecking: "检查中…",
				badgeConfigured: "Key 已配置",
				badgeMissing: "Key 未配置",
				badgeUnknown: "状态未知",
				comfyuiNoKey: "无需 API Key",
				testConnection: "测试连接",
				testing: "正在测试…",
				testOk: "连接成功",
				testFailed: "连接失败",
				testUnauthorized: "Key 无效或无权限",
				clearKey: "清除 Key",
				keyCleared: "已清除 Key",
				clearKeyFailed: "清除 Key 失败",
				saveKeyFailed: "保存 Key 失败",
				saveKeyFirst: "请先保存 API Key，再拉取模型或测试连接。",
				saveEndpointFirst: "接口地址尚未保存，请先点击保存，再拉取模型或测试连接。",
				endpointRequired: "请填写接口地址并保存，再拉取模型或测试连接。",
				savedEndpointMissing: "未读取到已保存的接口地址，请保存后重试。",
				clearKeyUnsupported: "当前版本 DSH 不支持在此清除 Key，请到凭据管理中删除。",
				endpoint: "接口地址",
				reset: "重置",
				resetTitle: "重置为默认官方地址",
				endpointHintGoogle: "Google 官方地址或反代端点（全路径）。",
				googleProtocol: "请求协议",
				googleInteractions: "Interactions（默认）",
				googleNative: "原生 generateContent",
				saveGoogleProtocolFirst: "请求协议尚未保存，请先点击保存，再拉取模型或测试连接。",
				endpointHintGoogleNative: "填写 API 基础地址（如 https://example.com/v1beta）；也兼容 Interactions 或 generateContent 完整地址。",
				endpointHintOpenAI: "官方 api.openai.com 的 /v1 地址；中转站请使用下方「OpenAI 兼容」行。",
				endpointHintOpenAICompat: "中转站/自建服务的 OpenAI 兼容 /v1 地址（必填），例如 https://your-relay.example.com/v1。",
				editFormat: "图生图请求形态",
				editModel: "图生图模型（可选）",
				editModelHint: "留空沿用上方模型。硅基流动可分别填写 Qwen/Qwen-Image（文生图）和 Qwen/Qwen-Image-Edit（图生图）。",
				editFormatSiliconFlow: "硅基流动 JSON（image 字符串）",
				editFormatSiliconFlowHint: "编辑尺寸由参考图决定，不发送尺寸和质量字段。Qwen-Image-Edit 支持一张图，Edit-2509 最多三张；参考图字段由插件填入。",
				editFormatMultipart: "标准 multipart（OpenAI 官方）",
				editFormatAutomatic: "自动：官方接口 JSON 格式",
				editFormatJsonImageUrlArray: "JSON images 数组（商汤等中转）",
				editFormatFormReferenceImages: "multipart + reference_images JSON 数组（base64）",
				editFormatHint: "商汤、通义、硅基流动已确认的官方接口自动使用对应 JSON 格式；其他中转按接口文档选择。文生图不受影响。",
				editExtra: "附加 JSON 字段",
				editExtraPlaceholder: "{\"watermark\": false, \"prompt_extend\": true}",
				editExtraHint: "仅 JSON 形态生效；会合并到请求体末尾，可覆盖默认字段。留空表示不附加。",
				arkOutputFormat: "输出格式",
				arkOutputFormatPng: "PNG（无损，带透明通道）",
				arkOutputFormatJpeg: "JPEG（方舟默认，有损）",
				arkOutputFormatHint: "JPEG 会在主体边缘留下压缩色斑，抠图时变成难去掉的彩色毛边。要后期加工就选 PNG。",
				arkWatermark: "AI 生成水印",
				arkWatermarkOn: "添加（方舟默认）",
				arkWatermarkOff: "不添加",
				arkWatermarkHint: "方舟默认在右下角烙上“AI 生成”标识。做游戏素材或需要后期处理时关掉。",
				arkBackground: "背景",
				arkBackgroundOpaque: "不透明（方舟默认）",
				arkBackgroundTransparent: "透明",
				arkBackgroundHint: "仅图生图有效，且要求参考图本身带透明通道；文生图会被方舟拒绝，因此这一项只在图生图时发出。",
				editExtraInvalid: "附加 JSON 字段必须是合法的 JSON 对象。",
				sizeTable: "自定义分辨率表（JSON）",
				sizeTableHint: "格式为「比例 → 档位 → 像素尺寸」。留空使用默认尺寸；例如 {\"16:9\":{\"2K\":\"2048x1152\"}}。",
				sizeTableInvalid: "分辨率表须为「比例 → 数字档位（如 2K）→ 非空尺寸字符串」的 JSON 对象。",
				defaultQuality: "默认生成质量",
				defaultQualityHint: "留空不发送 quality。该参数与分辨率独立，上游须支持所填值。",
				qualityOptions: "可选生成质量（逗号分隔）",
				generateExtra: "文生图附加字段（JSON）",
				generateExtraHint: "仅文生图生效，合并到请求体末尾，可覆盖 size 和 quality。关闭商汤水印可填 {\"watermark\":false}。",
				editSizeMode: "JSON 图生图尺寸",
				editSizeAuto: "自动（兼容商汤）",
				editSizeSelected: "使用所选分辨率",
				endpointHintSeedream: "火山方舟兼容的 /api/v3 地址。",
				endpointHintDashScope: "阿里云百炼 DashScope 官方接口地址。",
				endpointHintXAI: "xAI 官方 api.x.ai 的 /v1 地址。",
				endpointHintZhipu: "智谱开放平台 open.bigmodel.cn 的 /api/paas/v4 地址。",
				endpointHintComfyUI: "正在运行且 DSH Host 可以访问的 ComfyUI 地址，默认使用本机 8188 端口。",
				model: "模型",
				defaultModel: "默认模型",
				availableModels: "工作台可选模型",
				availableModelsHint: "勾选后可在工作台切换。手动输入的默认模型会自动加入列表，且不可移除。",
				defaultModelTag: "默认",
				workflow: "API Workflow 工作流",
				workflowImport: "导入 JSON 文件",
				workflowMissing: "尚未导入工作流",
				workflowImported: "已导入 {name}",
				workflowHint: "从 ComfyUI 导出 API Format JSON，在提示词输入写入 {{prompt}}，种子可用 {{seed}}；宽高可用 {{width}}、{{height}}（Agent 传入尺寸或比例时生效，默认 1024×1024）；图生图工作流在 LoadImage 的 image 输入写入 {{image}}，多张参考图就写多个，按节点编号顺序对应。可导入多个工作流，Agent 也能在调用时按名称指定。",
				workflowTooLarge: "工作流文件不能超过 5 MB。",
				workflowActiveTitle: "设为当前使用的工作流",
				workflowRemove: "删除",
				workflowPresetPlaceholder: "预设提示词，留空则只用对话内容",
				workflowPresetTitle: "预设提示词：每次调用此工作流时自动加在用户提示词前面。",
				workflowNameRequired: "工作流名称不能为空。",
				workflowDuplicateName: "工作流名称不能重复。",
				timeout: "生成超时（秒）",
				timeoutHint: "包括提交、等待和下载图片；默认 300 秒。",
				cloudTimeout: "云端生成超时（秒）",
				cloudTimeoutHint: "工作台所有 API Key 通道共用，5–3600 秒，默认 150 秒（保持默认时，GIF 请求等 300 秒）。不影响订阅通道和 ComfyUI；修改后对新请求生效。",
				workspaceSection: "工作区",
				saveToWorkspace: "保存到工作区",
				saveToWorkspaceHint: "每次生成后，把图片文件保存到当前会话工作区。",
				folder: "工作区文件夹",
				folderHint: "相对当前会话工作区的子目录；留空表示工作区根目录。",
				uiSection: "界面",
				showPill: "在对话输入栏显示生图切换胶囊",
				showPillHint: "开启后，输入框工具行会显示一枚胶囊，随手切换默认生图 Provider，无需进入设置；默认关闭。",
				fetchModels: "拉取模型",
				fetchingModels: "拉取中…",
				fetchModelsHint: "点击「拉取模型」用当前 Key 获取可用生图模型列表；也可手动输入。",
				modelsFound: "找到 {n} 个生图模型，点击模型框选择",
				modelsNone: "未筛出生图模型，可手动输入模型名",
				saving: "保存中…",
				save: "保存",
				saved: "已保存",
				settingsWriteRejected: "有一项设置未能保存，请检查后重试。",
				savedToPath: "已保存到",
				generating: "正在生成图片…",
				loading: "正在加载图片…",
				loadFailed: "图片读取失败 ({status})",
				generatedTitle: "已生成图片",
				resultShown: "图片结果已显示在对话中",
				copyImg: "复制图片",
				download: "下载图片",
				openNewTab: "新标签页打开",
				copiedImage: "已复制图片",
				copyFailed: "复制失败",
				regenerate: "重新生成",
				regenerateTitle: "重新生成图片",
				regenerateHint: "如有需要可微调提示词。生成的新图片将替代当前展示，原图依然可在版本中查看。",
				prompt: "提示词",
				cancel: "取消",
				confirmRegenerate: "确认生成",
				regenerating: "重新生成中…",
				regenerateFailed: "重新生成失败",
				regenerateSaveFailed: "已重新生成，但保存到图库失败，请重试",
				versionPrevious: "上一版本",
				versionNext: "下一版本",
				versionLabel: "图片版本 {current}/{total}"
			},
			en: {
				title: "Image Generation",
				description: "Configure each provider key and model, then pick the default provider.",
				defaultProvider: "Default provider",
				defaultProviderHint: "Used by the Agent by default; the Studio and tool calls can switch per call.",
				settingsReadOnly: "Settings come from a profile file and are read-only; edit that source to change them.",
				settingsLoading: "Settings are loading; please wait.",
				settingsRemote: "This connection cannot save settings to the host. Edit them from the local DSH page.",
				settingsUnavailable: "The host has not provided image generation settings. Check that the plugin is enabled and review its load logs.",
				settingsIncompatible: "The loaded settings library cannot save these settings. Update @deepseek-ai/schemastery in the plugin environment to 3.18.4 or a compatible 3.x version, then restart DSH.",
				providerGoogle: "Google Gemini",
				providerOpenAI: "OpenAI",
				providerOpenAICompat: "OpenAI Compatible (relay)",
				addCompatChannel: "Add OpenAI-compatible channel",
				channelName: "Channel name",
				channelNameRequired: "Enter a channel name.",
				removeChannel: "Remove channel",
				removeChannelConfirm: "Remove \"{label}\"? Its channel configuration will be deleted.",
				providerSeedream: "ByteDance Seedream",
				providerDashScope: "Aliyun DashScope (Wanx / Qwen)",
				providerXAI: "xAI Grok Imagine",
				providerZhipu: "Zhipu GLM-Image",
				providerComfyUI: "Local ComfyUI",
				providerChatGPTSub: "ChatGPT Subscription",
				providerGrokSub: "Grok Subscription",
				providerGoogleSub: "Google Subscription",
				subBadgeLoggedIn: "Signed in",
				subBadgeLoggedOut: "Signed out",
				subBadgeUnknown: "Unknown",
				subSectionTitle: "Subscription generation",
				subHint: "Generates through a logged-in subscription account; no API key needed. Signing in never changes any API key or the default provider.",
				subProxyHint: "If you need a proxy, enable TUN (virtual network adapter) mode before signing in. A system proxy alone may not cover DSH backend requests, causing sign-in to fail after browser authorization.",
				subAccountLabel: "Account",
				subAccountEmail: "Signed in: {email}",
				subAccountNone: "Not signed in",
				subLogin: "Sign in",
				subLoggingIn: "Signing in…",
				subLogout: "Sign out",
				subLoggingOut: "Signing out…",
				subWaitingLogin: "Authorization page opened; complete sign-in in your browser…",
				subLoginOk: "Signed in",
				subModelLabel: "Subscription model",
				subModelHint: "Fixed by the subscription channel; not changeable.",
				subEditCapability: "Subscription image editing is now supported: edit_image in chats, Studio and multi-model compare all accept reference images (up to 5).",
				subDefaultHint: "Subscription providers support both text-to-image and image editing; edits use each channel's default parameters.",
				apiKeyLabel: "{provider} API Key",
				apiKeyPlaceholder: "Leave empty to keep configured key",
				apiKeyHint: "Securely saved as {key}; never read back in plaintext.",
				getApiKey: "Get a key ↗",
				keyReadOnly: "Key is supplied read-only by {source}; update it there.",
				credentialsUnavailable: "Credentials service unavailable: API keys cannot be saved; please upgrade DSH to a stable release.",
				badgeUnavailable: "Credentials unavailable",
				badgeChecking: "Checking…",
				badgeConfigured: "Key set",
				badgeMissing: "Key missing",
				badgeUnknown: "Unknown",
				comfyuiNoKey: "No API key needed",
				testConnection: "Test connection",
				testing: "Testing…",
				testOk: "Connection OK",
				testFailed: "Connection failed",
				testUnauthorized: "API key rejected",
				clearKey: "Clear key",
				keyCleared: "Key cleared",
				clearKeyFailed: "Failed to clear key",
				saveKeyFailed: "Failed to save the key",
				saveKeyFirst: "Save the API key first, then fetch models or test the connection.",
				saveEndpointFirst: "The endpoint address has not been saved. Click Save before fetching models or testing the connection.",
				endpointRequired: "Enter and save an endpoint address before fetching models or testing the connection.",
				savedEndpointMissing: "No saved endpoint address was found. Save it and try again.",
				clearKeyUnsupported: "This DSH build cannot clear keys here; remove it from credential management instead.",
				endpoint: "Endpoint / Base URL",
				reset: "Reset",
				resetTitle: "Reset to official default URL",
				endpointHintGoogle: "Official Google endpoint or reverse proxy (full path).",
				googleProtocol: "Request protocol",
				googleInteractions: "Interactions (default)",
				googleNative: "Native generateContent",
				saveGoogleProtocolFirst: "Save the request protocol before fetching models or testing the connection.",
				endpointHintGoogleNative: "API base URL (e.g. https://example.com/v1beta). Full Interactions or generateContent URLs also work.",
				endpointHintOpenAI: "Official api.openai.com /v1 base URL; for relays use the \"OpenAI-compatible\" row below.",
				endpointHintOpenAICompat: "OpenAI-compatible /v1 base URL of your relay or self-hosted service (required), e.g. https://your-relay.example.com/v1.",
				editFormat: "Edit request format",
				editModel: "Editing model (optional)",
				editModelHint: "Leave empty to reuse the model above. SiliconFlow can use Qwen/Qwen-Image for generation and Qwen/Qwen-Image-Edit for editing.",
				editFormatSiliconFlow: "SiliconFlow JSON (image string)",
				editFormatSiliconFlowHint: "Edit dimensions follow the reference; size and quality fields are omitted. Qwen-Image-Edit supports one reference, Edit-2509 up to three. The plugin fills the image fields.",
				editFormatMultipart: "Standard multipart (official OpenAI)",
				editFormatAutomatic: "Automatic: official JSON contract",
				editFormatJsonImageUrlArray: "JSON images array (SenseNova etc.)",
				editFormatFormReferenceImages: "Multipart with a reference_images JSON array (base64)",
				editFormatHint: "Recognized official SenseNova, Qwen and SiliconFlow endpoints automatically use their JSON edit contracts. Choose other relay formats according to their documentation. Text-to-image is unaffected.",
				editExtra: "Extra JSON fields",
				editExtraPlaceholder: "{\"watermark\": false, \"prompt_extend\": true}",
				editExtraHint: "Only used with the JSON format; merged into the request body last and may override defaults. Leave empty for none.",
				arkOutputFormat: "Output format",
				arkOutputFormatPng: "PNG (lossless, keeps an alpha channel)",
				arkOutputFormatJpeg: "JPEG (Ark default, lossy)",
				arkOutputFormatHint: "JPEG ringing around the subject turns into coloured fringing that is hard to remove when cutting the background out. Pick PNG if you plan to edit the result.",
				arkWatermark: "AI generated watermark",
				arkWatermarkOn: "Add (Ark default)",
				arkWatermarkOff: "Do not add",
				arkWatermarkHint: "Ark stamps an \"AI generated\" mark into the bottom-right corner by default. Turn it off for game assets or any post-processing.",
				arkBackground: "Background",
				arkBackgroundOpaque: "Opaque (Ark default)",
				arkBackgroundTransparent: "Transparent",
				arkBackgroundHint: "Image-to-image only, and every reference image must already carry an alpha channel; Ark rejects it for text-to-image, so it is sent on edits alone.",
				editExtraInvalid: "Extra JSON fields must be a valid JSON object.",
				sizeTable: "Custom resolution table (JSON)",
				sizeTableHint: "Aspect ratio → tier → pixel size. Leave empty for defaults; e.g. {\"16:9\":{\"2K\":\"2048x1152\"}}.",
				sizeTableInvalid: "Use a JSON object mapping ratios to numeric tiers (e.g. 2K) and nonempty size strings.",
				defaultQuality: "Default generation quality",
				defaultQualityHint: "Leave empty to omit quality. Independent of resolution; the upstream must support this value.",
				qualityOptions: "Available generation qualities (comma-separated)",
				generateExtra: "Generation extra fields (JSON)",
				generateExtraHint: "Generation only. Merged last; can override size and quality. Use {\"watermark\":false} for SenseNova.",
				editSizeMode: "JSON edit dimensions",
				editSizeAuto: "Auto (SenseNova compatible)",
				editSizeSelected: "Use selected resolution",
				endpointHintSeedream: "Volcengine Ark compatible /api/v3 base URL.",
				endpointHintDashScope: "Official Aliyun DashScope endpoint.",
				endpointHintXAI: "Official xAI api.x.ai /v1 base URL.",
				endpointHintZhipu: "Zhipu open.bigmodel.cn /api/paas/v4 base URL.",
				endpointHintComfyUI: "A running ComfyUI server reachable by the DSH Host; the default points to port 8188 on this computer.",
				model: "Model",
				defaultModel: "Default model",
				availableModels: "Models available in Studio",
				availableModelsHint: "Selected models can be switched in Studio. A manually entered default is added automatically and cannot be removed.",
				defaultModelTag: "Default",
				workflow: "API Workflows",
				workflowImport: "Import JSON file",
				workflowMissing: "No workflow imported",
				workflowImported: "Imported {name}",
				workflowHint: "Export an API Format JSON from ComfyUI and place {{prompt}} in its prompt input; {{seed}} is available for a random seed. {{width}} and {{height}} take the size or aspect ratio the Agent asks for (1024×1024 by default). For image editing put {{image}} in a LoadImage image input; use one per reference image, filled in node order. Import as many workflows as you need; the Agent can also pick one by name.",
				workflowTooLarge: "Workflow files must be no larger than 5 MB.",
				workflowActiveTitle: "Make this the active workflow",
				workflowRemove: "Remove",
				workflowPresetPlaceholder: "Preset prompt (optional)",
				workflowPresetTitle: "Preset prompt: automatically prepended to the user prompt on every call of this workflow.",
				workflowNameRequired: "Workflow names cannot be empty.",
				workflowDuplicateName: "Workflow names must be unique.",
				timeout: "Generation timeout (seconds)",
				timeoutHint: "Covers submission, waiting, and image download; defaults to 300 seconds.",
				cloudTimeout: "Cloud generation timeout (seconds)",
				cloudTimeoutHint: "Shared by all API-key channels in the workbench, 5–3600 seconds; defaults to 150 seconds (GIF requests wait 300 seconds while it is left at the default). Does not affect subscription channels or ComfyUI; applies to new requests.",
				workspaceSection: "Workspace",
				saveToWorkspace: "Save to workspace",
				saveToWorkspaceHint: "Write each generated image as a file into the session workspace.",
				folder: "Workspace folder",
				folderHint: "Subdirectory of the session workspace; empty means the workspace root.",
				uiSection: "Interface",
				showPill: "Show the image provider pill in the chat input bar",
				showPillHint: "Adds a small pill to the composer tool row for switching the default image provider without opening settings; off by default.",
				fetchModels: "Fetch models",
				fetchingModels: "Fetching…",
				fetchModelsHint: "Click \"Fetch models\" to list image-capable models with the stored key; manual input still works.",
				modelsFound: "{n} image models found; open the model field to pick one",
				modelsNone: "No image models found; type the model name manually",
				saving: "Saving…",
				save: "Save",
				saved: "Saved",
				settingsWriteRejected: "A setting could not be saved. Please check and try again.",
				savedToPath: "Saved to",
				generating: "Generating image…",
				loading: "Loading image…",
				loadFailed: "Failed to load image ({status})",
				generatedTitle: "Generated image",
				resultShown: "Image result is shown in the conversation",
				copyImg: "Copy Image",
				download: "Download Image",
				openNewTab: "Open in new tab",
				copiedImage: "Image copied",
				copyFailed: "Copy failed",
				regenerate: "Regenerate",
				regenerateTitle: "Regenerate image",
				regenerateHint: "Edit the prompt if needed. The new image replaces this view while the original remains available.",
				prompt: "Prompt",
				cancel: "Cancel",
				confirmRegenerate: "Regenerate",
				regenerating: "Regenerating…",
				regenerateFailed: "Regeneration failed",
				regenerateSaveFailed: "Regenerated, but saving to the gallery failed. Please retry.",
				versionPrevious: "Previous version",
				versionNext: "Next version",
				versionLabel: "Image version {current}/{total}"
			}
		};
		function usePluginLanguage(locale) {
			const [lang, setLang] = (0, react.useState)(() => locale?.getSnapshot?.()?.active?.startsWith("en") ? "en" : "zh");
			(0, react.useEffect)(() => locale?.subscribe?.(() => {
				setLang(locale?.getSnapshot?.()?.active?.startsWith("en") ? "en" : "zh");
			}), [locale]);
			return lang;
		}
		//#endregion
		//#region lib/types/client/gif-sheet.js
		/**
		* The contact sheet a frame-comment edit sends as its reference image, and the
		* prompt and request built around it. An edits endpoint takes a still, so
		* every frame of the animation is tiled into one near-square grid in reading
		* order; the prompt explains the grid and anchors each note inside its frame.
		* Pure except for the canvas work, which takes injectable canvas and encoder
		* stand-ins.
		*/
		/** Longest edge of the sheet as displayed in the editor: twice the card's 520 px for high-density screens. */
		const SHEET_VIEW_MAX_EDGE = 1040;
		/** Matches the opening line ChatGPT sends for a GIF edit, so the model reads the sheet and the coordinates by the same convention. */
		const GIF_EDIT_INSTRUCTION = "Re-animate the GIF with these changes. Coordinates are relative to each frame. Make sure all frames are equal sized.";
		/**
		* Near-square grid: cols = ceil(sqrt(n)). The cells shrink, snapped down to
		* 16 px, only when the sheet's longest edge would exceed the provider limit.
		*/
		function planGifSheet(frames, frameW, frameH, maxEdge = GIF_SHEET_MAX_EDGE) {
			const cols = Math.max(1, Math.ceil(Math.sqrt(frames)));
			const rows = Math.max(1, Math.ceil(frames / cols));
			const longest = Math.max(cols * frameW, rows * frameH);
			let cellW = frameW;
			let cellH = frameH;
			if (longest > maxEdge) {
				const scale = maxEdge / longest;
				cellW = Math.max(16, Math.floor(frameW * scale / 16) * 16);
				cellH = Math.max(16, Math.floor(frameH * scale / 16) * 16);
			}
			return {
				cols,
				rows,
				cellW,
				cellH,
				width: cols * cellW,
				height: rows * cellH,
				blanks: cols * rows - frames,
				frames
			};
		}
		/** The size to show the sheet at: the full sheet scaled into the display edge, so the editor does not hold a second full-size copy. */
		function sheetViewSize(plan, maxEdge = SHEET_VIEW_MAX_EDGE) {
			const scale = Math.min(1, maxEdge / Math.max(plan.width, plan.height, 1));
			return {
				width: Math.max(1, Math.round(plan.width * scale)),
				height: Math.max(1, Math.round(plan.height * scale))
			};
		}
		/** A point inside one frame, as the same point on the whole sheet (percent, one decimal). */
		function sheetPinPosition(comment, plan) {
			const col = comment.frame % plan.cols;
			const row = Math.floor(comment.frame / plan.cols);
			const round = (value) => Math.round(value * 10) / 10;
			return {
				x: round((col + comment.x / 100) / plan.cols * 100),
				y: round((row + comment.y / 100) / plan.rows * 100)
			};
		}
		/** Paint the frames into their cells on a white sheet; blank cells stay white. */
		function drawGifSheet(frames, plan, createCanvas = () => document.createElement("canvas")) {
			const canvas = createCanvas();
			canvas.width = plan.width;
			canvas.height = plan.height;
			const context = canvas.getContext("2d");
			if (context === null) throw new Error("sheet-canvas-unavailable");
			context.fillStyle = "#fff";
			context.fillRect(0, 0, plan.width, plan.height);
			frames.forEach((frame, index) => {
				context.drawImage(frame, index % plan.cols * plan.cellW, Math.floor(index / plan.cols) * plan.cellH, plan.cellW, plan.cellH);
			});
			return canvas;
		}
		/** Same ladder as the canvas selection preview: PNG, then JPEG at falling quality and scale. */
		const SHEET_ENCODE_ATTEMPTS = [
			{
				scale: 1,
				type: "image/png",
				quality: 1
			},
			{
				scale: 1,
				type: "image/jpeg",
				quality: .85
			},
			{
				scale: .75,
				type: "image/jpeg",
				quality: .7
			},
			{
				scale: .5,
				type: "image/jpeg",
				quality: .6
			},
			{
				scale: .25,
				type: "image/jpeg",
				quality: .5
			}
		];
		/**
		* First attempt that fits both the host limit and a modest request budget.
		* The returned plan is scaled with the attempt, so the prompt can name the
		* cell size that was actually sent.
		*/
		async function encodeSheetWithinLimit(canvas, plan, maxBytes, encode = encodeCanvas) {
			const budget = Math.min(maxBytes, 4e6);
			for (const attempt of SHEET_ENCODE_ATTEMPTS) {
				const blob = await encode(canvas, attempt);
				if (blob === void 0 || blob.size > budget) continue;
				return {
					blob,
					mediaType: attempt.type,
					plan: scaledPlan(plan, attempt.scale)
				};
			}
			throw new Error("sheet-too-large");
		}
		function scaledPlan(plan, scale) {
			if (scale === 1) return plan;
			const cellW = Math.round(plan.cellW * scale);
			const cellH = Math.round(plan.cellH * scale);
			return {
				...plan,
				cellW,
				cellH,
				width: plan.cols * cellW,
				height: plan.rows * cellH
			};
		}
		async function encodeCanvas(canvas, attempt) {
			let source = canvas;
			if (attempt.scale !== 1) {
				source = document.createElement("canvas");
				source.width = Math.max(1, Math.round(canvas.width * attempt.scale));
				source.height = Math.max(1, Math.round(canvas.height * attempt.scale));
				const context = source.getContext("2d");
				if (context === null) return void 0;
				context.drawImage(canvas, 0, 0, source.width, source.height);
			}
			return new Promise((resolve) => {
				source.toBlob((blob) => {
					resolve(blob ?? void 0);
				}, attempt.type, attempt.quality);
			});
		}
		/** Notes by frame, then by creation order; a note's line breaks become spaces so each note stays one line. */
		function orderedNotes(comments) {
			return [...comments].filter((comment) => comment.text.trim().length > 0).sort((a, b) => a.frame - b.frame || a.id - b.id).map((comment) => ({
				...comment,
				text: comment.text.trim().replace(/\s*\n\s*/g, " ")
			}));
		}
		/**
		* The edit prompt: the opening instruction, the sheet layout as sent (its
		* cells may be smaller than the frames) and the frames to produce at the
		* animation's own size, then the notes grouped by frame the way ChatGPT
		* writes them: a `Frame #n:` heading and one `(x: X%, y: Y%): note` line each.
		*/
		function composeGifEditPrompt(comments, plan, frame) {
			const blanks = plan.blanks === 0 ? "" : plan.blanks === 1 ? " and the last cell is intentionally blank" : ` and the last ${String(plan.blanks)} cells are intentionally blank`;
			const lines = [
				GIF_EDIT_INSTRUCTION,
				`The reference image is a contact sheet of the original animation: ${String(plan.frames)} frames of ${String(plan.cellW)}x${String(plan.cellH)} pixels, arranged in ${String(plan.cols)} columns x ${String(plan.rows)} rows in reading order (left to right, top to bottom); frame 1 is the top-left cell${blanks}. The notes below are grouped by frame; each point is given as (x, y) in percent of that frame's width and height from its top-left corner.`,
				`Produce a ${String(plan.frames)}-frame looping GIF with frames of ${String(frame.width)}x${String(frame.height)} pixels, keep the character, style, motion and every frame unchanged except for the requested changes, and keep the animation continuous across frames.`
			];
			const groups = /* @__PURE__ */ new Map();
			for (const note of orderedNotes(comments)) {
				const group = groups.get(note.frame) ?? [];
				group.push(`(x: ${percent(note.x)}, y: ${percent(note.y)}): ${note.text}`);
				groups.set(note.frame, group);
			}
			return [lines.join("\n"), ...[...groups].map(([frameIndex, notes]) => [`Frame #${String(frameIndex + 1)}:`, ...notes].join("\n"))].join("\n\n");
		}
		/** A coordinate as ChatGPT writes it: a percentage with at most one decimal. */
		function percent(value) {
			return `${String(Math.round(value * 10) / 10)}%`;
		}
		/**
		* The workbench edit that redraws the animation from the notes: the sheet as
		* the only reference, and a GIF with the sheet's frame count, the delay the
		* frames play at retimed by the speed, and the frame size the contract takes.
		* The prompt is the sheet instruction; the card files the new version under
		* the animation's own description instead.
		*/
		function gifEditRequest({ image, model, comments, sheet, frame, speed }) {
			const delay = gifEditFrameDurationMs(gifFrameDurationMs(frame.delaysMs), speed);
			const { size } = gifOutputRequest({
				frames: sheet.plan.frames,
				delaysMs: [...frame.delaysMs],
				width: frame.width,
				height: frame.height
			});
			return {
				...conversationRegenerateRequest(image, composeGifEditPrompt(comments, sheet.plan, frame)),
				mode: "edit",
				model,
				output: {
					format: "gif",
					frameCount: sheet.plan.frames,
					...delay === void 0 ? {} : { frameDurationMs: delay },
					...size === void 0 ? {} : { size }
				},
				references: [{
					mediaType: sheet.mediaType,
					data: sheet.data,
					name: `gif-frames-sheet.${extension(sheet.mediaType)}`
				}]
			};
		}
		/**
		* The same notes for a plain regeneration, which sees neither the previous
		* animation nor the sheet: no coordinates, the frame only as a time hint.
		*/
		function composeFallbackPrompt(originalPrompt, comments, frameTotal) {
			const position = (frame) => {
				const at = frame / Math.max(frameTotal, 1);
				return at < 1 / 3 ? "Early in" : at < 2 / 3 ? "Midway through" : "Late in";
			};
			return [
				originalPrompt.trim(),
				"",
				`Additional requirements for this animation (${String(frameTotal)} frames):`,
				...orderedNotes(comments).map((note) => `- ${position(note.frame)} the animation (around frame ${String(note.frame + 1)} of ${String(frameTotal)}): ${note.text}`)
			].join("\n");
		}
		/** The frame delay to ask for: the animation's own delay retimed by the playback speed, within the provider range, in 10 ms steps. */
		function gifEditFrameDurationMs(baseMs, speed) {
			if (!Number.isFinite(baseMs) || baseMs <= 0 || !Number.isFinite(speed) || speed <= 0) return void 0;
			const retimed = Math.round(baseMs / speed / 10) * 10;
			return Math.min(GIF_FRAME_DURATION_MS_MAX, Math.max(20, retimed));
		}
		//#endregion
		//#region lib/types/client/gif-comments.js
		/**
		* Frame comments in the GIF lightbox: whether an animation can be edited and
		* with which model, the pins and note boxes over the frame (or over the sheet
		* of every frame), the editing toggle in the player bar, the card's edit chip
		* and the edit bar under the player. The notes and the request live in
		* gif-edit.tsx; this file owns only the interaction.
		*/
		/**
		* Whether the animation can be edited, and why not: only OpenAI-shaped
		* providers take the edit request, the frames must be decoded (the sheet is
		* built from them) and their number must be one the GIF contract can ask for.
		* Once decoded, the frames themselves are counted, whatever the header says:
		* they are what the sheet and the request use.
		*/
		function gifEditAvailability(input) {
			const { snapshot } = input;
			if (input.provider !== "openai" && input.provider !== "openai-compat") return void 0;
			if (!input.animated || snapshot === void 0) return void 0;
			const frames = snapshot.status === "ready" ? snapshot.frames.length : snapshot.info?.frames;
			if (frames !== void 0 && frames < 2) return void 0;
			if (frames !== void 0 && frames > 16) return "frame-count";
			if (snapshot.status === "fallback") return "unsupported";
			if (snapshot.status === "native") return "unloaded";
			return snapshot.status === "ready" ? "ready" : "decoding";
		}
		const UNAVAILABLE_TITLE = {
			"frame-count": "gifEditTooManyFrames",
			unsupported: "gifEditDecodeFailed",
			decoding: "gifEditDecoding",
			unloaded: "gifEditNotLoaded"
		};
		/**
		* The model for the edit: the channel's separate editing model when it has
		* one (the server takes nothing else for an edit); otherwise the model that
		* drew this animation while the channel still offers it, else the channel's
		* default; the card's own model when the channel is gone.
		*/
		function gifEditModel(config, image) {
			const channel = image.provider === "openai-compat" ? image.channel ?? config.activeChannel : void 0;
			const profile = config.providers.find((candidate) => candidate.provider === image.provider && (channel === void 0 || candidate.channel === channel));
			if (profile === void 0) return image.model;
			if (profile.editModel === void 0 && studioModelOptionsForMode(profile, "edit").some((option) => option.value === image.model)) return image.model;
			return studioModelForMode(profile, "edit");
		}
		async function fetchGifEditModel(image, signal) {
			try {
				const response = await fetch(STUDIO_ROUTE, {
					credentials: "same-origin",
					signal
				});
				if (!response.ok) return image.model;
				return gifEditModel(await response.json(), image);
			} catch (cause) {
				if (signal.aborted) throw cause;
				return image.model;
			}
		}
		/** What a key does in a note box: Enter confirms, Escape closes, and an input method still composing keeps every key. */
		function commentKeyAction(event) {
			if (event.nativeEvent.isComposing) return void 0;
			if (event.key === "Escape") return "close";
			if (event.key === "Enter") return "confirm";
		}
		const PENCIL = (0, react_jsx_runtime.jsxs)("svg", {
			width: "15",
			height: "15",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": "true",
			children: [(0, react_jsx_runtime.jsx)("path", { d: "M12 20h9" }), (0, react_jsx_runtime.jsx)("path", { d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" })]
		});
		const SEND = (0, react_jsx_runtime.jsxs)("svg", {
			width: "18",
			height: "18",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "2.2",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": "true",
			children: [(0, react_jsx_runtime.jsx)("path", { d: "M12 19V5" }), (0, react_jsx_runtime.jsx)("path", { d: "M6 11l6-6 6 6" })]
		});
		const TRASH = (0, react_jsx_runtime.jsxs)("svg", {
			width: "20",
			height: "20",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.8",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": "true",
			children: [
				(0, react_jsx_runtime.jsx)("path", { d: "M4 7h16" }),
				(0, react_jsx_runtime.jsx)("path", { d: "M10 11v6M14 11v6" }),
				(0, react_jsx_runtime.jsx)("path", { d: "M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" }),
				(0, react_jsx_runtime.jsx)("path", { d: "M9 7V4h6v3" })
			]
		});
		/** The card's edit chip, opposite the speed chip; it opens the lightbox straight in edit mode. */
		function GifEditChip({ availability, t, disabled, onOpen }) {
			if (availability === void 0) return null;
			const ready = availability === "ready";
			return (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-ig-gif-edit-chip-slot",
				children: (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dsh-ig-gif-chip dsh-ig-gif-edit-chip",
					title: ready ? t("gifEditChipTitle") : t(UNAVAILABLE_TITLE[availability]),
					disabled: !ready || disabled,
					onClick: (event) => {
						event.stopPropagation();
						onOpen();
					},
					children: [PENCIL, (0, react_jsx_runtime.jsx)("span", { children: t("gifEdit") })]
				})
			});
		}
		/** The player bar's editing switch. */
		function GifEditToggle({ availability, editing, t, onToggle }) {
			const title = editing ? t("gifEditExitTitle") : availability === "ready" ? t("gifEditEnterTitle") : t(UNAVAILABLE_TITLE[availability]);
			return (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: editing ? "dsh-ig-gif-edit-toggle is-active" : "dsh-ig-gif-edit-toggle",
				title,
				disabled: !editing && availability !== "ready",
				onClick: onToggle,
				children: editing ? t("gifEditExitTitle") : t("gifEditToggle")
			});
		}
		/** The edit bar under the player: what to do, the count, the view switch and the actions. */
		function GifCommentBar({ view, current, total, count, sending, error, errorHint, t, onView, onClear, onCancel, onSend, onFallback }) {
			const fallback = (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "dsh-ig-gif-edit-ghost",
				disabled: sending,
				onClick: onFallback,
				children: t("gifEditFallbackRegenerate")
			});
			return (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-ig-gif-edit",
				onClick: (event) => {
					event.stopPropagation();
				},
				children: [
					(0, react_jsx_runtime.jsx)("p", {
						className: "dsh-ig-gif-edit-hint",
						children: view === "sheet" ? t("gifEditSheetHint") : t("gifEditHint")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-gif-edit-row",
						children: [
							(0, react_jsx_runtime.jsx)("span", {
								className: "dsh-ig-gif-edit-counter",
								children: view === "sheet" ? t("gifSheetComments", {
									total: String(total),
									count: String(count)
								}) : t("gifFrameComments", {
									current: String(current),
									count: String(count)
								})
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-gif-view",
								role: "group",
								"aria-label": t("gifEditView"),
								children: [(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-pressed": view === "gif",
									onClick: () => {
										onView("gif");
									},
									children: t("gifGifView")
								}), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-pressed": view === "sheet",
									onClick: () => {
										onView("sheet");
									},
									children: t("gifSheetView")
								})]
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-gif-edit-ghost",
								disabled: sending || count === 0,
								onClick: onClear,
								children: t("gifCommentsClear")
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-gif-edit-ghost",
								onClick: onCancel,
								children: t("gifEditCancel")
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-gif-edit-send",
								disabled: sending || count === 0 || total === 0,
								onClick: onSend,
								children: sending ? t("gifSending") : t("gifSend", { count: String(count) })
							})
						]
					}),
					error !== void 0 ? (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-gif-edit-error",
						role: "alert",
						children: [
							(0, react_jsx_runtime.jsx)("strong", { children: t("gifEditFailed") }),
							errorHint !== void 0 ? (0, react_jsx_runtime.jsx)("span", { children: errorHint }) : null,
							(0, react_jsx_runtime.jsx)("span", { children: error }),
							fallback
						]
					}) : null
				]
			});
		}
		const NOTE_BOX_WIDTH = 292;
		const clampPercent = (value) => Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
		/** Which side of a point a note box fits on, judged against the window: it may overhang the picture into the backdrop. */
		function noteSide(clientX, clientY) {
			const width = typeof window === "undefined" ? Infinity : window.innerWidth;
			const height = typeof window === "undefined" ? Infinity : window.innerHeight;
			return {
				left: clientX + 30 + NOTE_BOX_WIDTH > width - 16,
				up: clientY > height * .62
			};
		}
		/**
		* Over the frame on screen: in editing, a layer that places a note on the
		* frame (pausing first), and that frame's pins; outside editing, the pins of a
		* paused frame, which open to read. In the sheet view every cell is a click
		* target and every pin is shown in its cell. Keys typed in a box stay in it:
		* Enter posts or saves, Escape closes only the box.
		*/
		function GifCommentLayer({ player, editing, view, sheet, comments, onChange, t }) {
			const snapshot = useGifSnapshot(player);
			const current = snapshot.index;
			const [box, setBox] = (0, react.useState)();
			const [boxKey, setBoxKey] = (0, react.useState)(0);
			const canvasRef = (0, react.useRef)(null);
			const inputRef = (0, react.useRef)(null);
			const openerRef = (0, react.useRef)(null);
			const plan = editing && view === "sheet" ? sheet?.plan : void 0;
			const sheetView = plan !== void 0;
			(0, react.useEffect)(() => {
				const canvas = canvasRef.current;
				if (!sheetView || sheet === void 0 || canvas === null) return;
				canvas.getContext("2d")?.drawImage(sheet.canvas, 0, 0, canvas.width, canvas.height);
			}, [sheetView, sheet]);
			const leaveBox = (0, react.useRef)(() => {});
			(0, react.useEffect)(() => () => {
				leaveBox.current();
			}, [editing, view]);
			const boxOpen = box !== void 0 && box.mode !== "view";
			(0, react.useEffect)(() => {
				if (boxOpen) inputRef.current?.focus();
			}, [boxOpen, boxKey]);
			const open = (next, opener) => {
				openerRef.current = opener;
				setBox(next);
				setBoxKey((key) => key + 1);
			};
			const close = () => {
				setBox(void 0);
				if (openerRef.current?.classList.contains("dsh-ig-gif-edit-layer") === false) openerRef.current.focus();
				openerRef.current = null;
			};
			const confirm = () => {
				if (box === void 0 || box.mode === "view") return;
				const text = box.text.trim().slice(0, 500);
				if (text.length === 0) return;
				if (box.mode === "edit") {
					const id = box.id;
					onChange(comments.map((comment) => comment.id === id ? {
						...comment,
						text
					} : comment));
				} else onChange([...comments, {
					id: comments.reduce((max, comment) => Math.max(max, comment.id), 0) + 1,
					frame: box.frame,
					x: box.x,
					y: box.y,
					text
				}]);
				close();
			};
			const remove = () => {
				if (box?.id !== void 0) onChange(comments.filter((comment) => comment.id !== box.id));
				close();
			};
			/** Moving on while a note is being written keeps what was typed rather than dropping it. */
			const keepTyped = () => {
				if (box !== void 0 && box.mode !== "view" && box.text.trim().length > 0) confirm();
			};
			leaveBox.current = () => {
				keepTyped();
				setBox(void 0);
			};
			/**
			* A new note where the picture was clicked: on the frame on screen once the
			* player is paused (a click while it plays stops it first), or on the cell's
			* frame, which the player moves to so the pin is seen where it was put. A
			* keyboard press has no point, so the note goes to the frame's centre. While
			* a box is on screen a click only closes it, as a click outside any popover
			* does; a box hidden by a frame change gives way, keeping what was typed.
			*/
			const place = (frame, event) => {
				event.stopPropagation();
				let count = comments.length;
				if (box !== void 0 && box.mode !== "view") {
					const typed = box.text.trim().length > 0;
					if (typed) confirm();
					else close();
					if (onScreen(box.frame)) return;
					if (typed && box.mode === "new") count += 1;
				}
				if (count >= 32) return;
				if (frame === void 0) player.pause();
				else player.seek(frame);
				const rect = event.currentTarget.getBoundingClientRect();
				const fromKeyboard = event.detail === 0;
				const clientX = fromKeyboard ? rect.left + rect.width / 2 : event.clientX;
				const clientY = fromKeyboard ? rect.top + rect.height / 2 : event.clientY;
				const x = clampPercent((clientX - rect.left) / rect.width * 100);
				const y = clampPercent((clientY - rect.top) / rect.height * 100);
				open({
					mode: "new",
					frame: frame ?? player.getSnapshot().index,
					x,
					y,
					text: "",
					...noteSide(clientX, clientY)
				}, event.currentTarget);
			};
			const position = (comment) => plan !== void 0 ? sheetPinPosition(comment, plan) : {
				x: comment.x,
				y: comment.y
			};
			const pin = (comment, number) => {
				const at = position(comment);
				const active = box?.id === comment.id;
				return (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: `dsh-ig-gif-pin${sheetView ? " is-small" : ""}${active ? " is-active" : ""}`,
					style: {
						left: `${String(at.x)}%`,
						top: `${String(at.y)}%`
					},
					title: sheetView ? t("gifCommentSheetTitle", {
						frame: String(comment.frame + 1),
						text: comment.text
					}) : t("gifCommentView"),
					"aria-label": t("gifCommentLabel", {
						index: String(number),
						frame: String(comment.frame + 1)
					}),
					"aria-expanded": active,
					onClick: (event) => {
						event.stopPropagation();
						if (active) {
							close();
							return;
						}
						keepTyped();
						const rect = event.currentTarget.getBoundingClientRect();
						open({
							mode: editing ? "edit" : "view",
							id: comment.id,
							frame: comment.frame,
							x: comment.x,
							y: comment.y,
							text: comment.text,
							...noteSide(rect.left, rect.top)
						}, event.currentTarget);
					},
					children: number
				}, comment.id);
			};
			const onScreen = (frame) => sheetView || frame === current && (editing || !snapshot.playing);
			const pins = comments.flatMap((comment, index) => onScreen(comment.frame) ? [pin(comment, index + 1)] : []);
			const noteBox = box === void 0 || !onScreen(box.frame) ? null : (() => {
				const at = position(box);
				const number = box.id === void 0 ? comments.length + 1 : comments.findIndex((comment) => comment.id === box.id) + 1;
				const className = `dsh-ig-gif-note is-${box.mode}${box.left ? " is-left" : ""}${box.up ? " is-up" : ""}`;
				const style = {
					left: `${String(at.x)}%`,
					top: `${String(at.y)}%`
				};
				if (box.mode === "view") return (0, react_jsx_runtime.jsx)("div", {
					className,
					role: "dialog",
					"aria-label": t("gifCommentLabel", {
						index: String(number),
						frame: String(box.frame + 1)
					}),
					style,
					onClick: (event) => {
						event.stopPropagation();
					},
					children: (0, react_jsx_runtime.jsx)("p", { children: box.text })
				});
				const empty = box.text.trim().length === 0;
				const input = (0, react_jsx_runtime.jsx)("input", {
					ref: inputRef,
					type: "text",
					className: "dsh-ig-gif-note-input",
					"aria-label": t("gifCommentPlaceholder"),
					placeholder: t("gifCommentPlaceholder"),
					maxLength: 500,
					value: box.text,
					onChange: (event) => {
						setBox({
							...box,
							text: event.target.value
						});
					},
					onKeyDown: (event) => {
						if (event.nativeEvent.isComposing) {
							event.stopPropagation();
							return;
						}
						if (commentKeyAction(event) !== "confirm") return;
						event.preventDefault();
						event.stopPropagation();
						confirm();
					}
				});
				return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [box.mode === "new" ? (0, react_jsx_runtime.jsx)("span", {
					className: `dsh-ig-gif-pin is-draft${sheetView ? " is-small" : ""}`,
					"aria-hidden": "true",
					style,
					children: number
				}) : null, (0, react_jsx_runtime.jsx)("div", {
					className,
					role: "dialog",
					"aria-label": box.mode === "new" ? t("gifCommentNew", { frame: String(box.frame + 1) }) : t("gifCommentEdit", { index: String(number) }),
					style,
					onClick: (event) => {
						event.stopPropagation();
					},
					tabIndex: -1,
					onKeyDown: (event) => {
						event.stopPropagation();
						if (commentKeyAction(event) !== "close") return;
						event.preventDefault();
						close();
					},
					children: box.mode === "new" ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [input, (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-ig-gif-note-post",
						title: t("gifCommentPublishTitle"),
						"aria-label": t("gifCommentPublish"),
						disabled: empty,
						onClick: confirm,
						children: SEND
					})] }) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-gif-note-field",
						children: input
					}), (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-gif-note-actions",
						children: [
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-gif-note-icon",
								title: t("gifCommentDelete"),
								"aria-label": t("gifCommentDelete"),
								onClick: remove,
								children: TRASH
							}),
							(0, react_jsx_runtime.jsx)("span", {}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-gif-note-ghost",
								onClick: close,
								children: t("gifEditCancel")
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-gif-note-save",
								disabled: empty,
								onClick: confirm,
								children: t("gifCommentSave")
							})
						]
					})] })
				})] });
			})();
			if (plan !== void 0) {
				const viewSize = sheetViewSize(plan);
				const cells = Array.from({ length: plan.cols * plan.rows }, (_, index) => {
					const style = {
						left: `${String(index % plan.cols / plan.cols * 100)}%`,
						top: `${String(Math.floor(index / plan.cols) / plan.rows * 100)}%`,
						width: `${String(100 / plan.cols)}%`,
						height: `${String(100 / plan.rows)}%`
					};
					if (index >= plan.frames) return (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-gif-sheet-cell is-blank",
						style
					}, index);
					return (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: `dsh-ig-gif-sheet-cell${index === current ? " is-current" : ""}`,
						"aria-label": t("gifEditLayerLabel", { frame: String(index + 1) }),
						style,
						onClick: (event) => {
							place(index, event);
						},
						children: (0, react_jsx_runtime.jsx)("span", { children: index + 1 })
					}, index);
				});
				return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					(0, react_jsx_runtime.jsx)("canvas", {
						ref: canvasRef,
						className: "dsh-ig-gif-sheet",
						width: viewSize.width,
						height: viewSize.height,
						role: "img",
						"aria-label": t("gifSheetView")
					}),
					cells,
					pins,
					noteBox
				] });
			}
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				editing ? (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsh-ig-gif-edit-layer",
					"aria-label": t("gifEditLayerLabel", { frame: String(current + 1) }),
					onMouseDown: (event) => {
						event.preventDefault();
					},
					onClick: (event) => {
						place(void 0, event);
					}
				}) : null,
				pins,
				noteBox
			] });
		}
		//#endregion
		//#region lib/types/client/tl/canvas-selection.js
		async function readCanvasImageLimit(signal) {
			const response = await fetch(CANVAS_ASSET_ROUTE, {
				credentials: "same-origin",
				signal
			});
			if (!response.ok) throw new Error(`host-unavailable (${response.status})`);
			const value = await response.json();
			if (typeof value.maxImageBytes !== "number" || !Number.isSafeInteger(value.maxImageBytes) || value.maxImageBytes <= 0) throw new Error("host-unavailable");
			return value.maxImageBytes;
		}
		//#endregion
		//#region lib/types/client/gif-edit.js
		/**
		* Frame-comment editing of an animated card: the notes of each version, the
		* edit request that redraws the animation from them, and the lightbox that
		* hosts the editor. The card supplies its busy state, its version chain and
		* its regenerate dialog; gif-comments.tsx draws the editor.
		*/
		const noSubscription = () => () => {};
		/**
		* The notes of each image version, by its attachment id: they outlive the card
		* (switching sessions or scrolling it away remounts it) and never mix between
		* images. Memory only; clearing a version's notes drops its entry.
		*/
		const notesByVersion = /* @__PURE__ */ new Map();
		/** The workbench answered with an error, its own or the provider's; a request that never got an answer throws a plain Error. */
		var StudioReplyError = class extends Error {};
		/** The new version an edit reply describes, filed under the animation's own description rather than the sheet instructions. */
		function revisionFromReply(payload, request, prompt) {
			const original = originalFromMeta(payload.original);
			return {
				attachment: payload.attachment,
				prompt,
				provider: payload.provider,
				...payload.channel === void 0 ? {} : { channel: payload.channel },
				model: payload.model,
				output: payload.output,
				createdAt: payload.createdAt,
				ratio: request.ratio,
				quality: request.quality,
				...request.resolution === void 0 ? {} : { resolution: request.resolution },
				...request.generationQuality === void 0 ? {} : { generationQuality: request.generationQuality },
				...request.watermark === void 0 ? {} : { watermark: request.watermark },
				...original === void 0 ? {} : { original }
			};
		}
		/** The notes of the version on display and the edit request built from them. */
		function useGifEdit({ gif, image, versionKey, busy, addRevision, onSent, onFallback }) {
			const { t, player } = gif;
			const [comments, setCommentsState] = (0, react.useState)(() => versionKey === void 0 ? [] : notesByVersion.get(versionKey) ?? []);
			const [sending, setSending] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const [notice, setNotice] = (0, react.useState)();
			const [editRequested, setEditRequested] = (0, react.useState)(false);
			const editorOpen = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				setCommentsState(versionKey === void 0 ? [] : notesByVersion.get(versionKey) ?? []);
				setError(void 0);
				setNotice(void 0);
			}, [versionKey]);
			const readAvailability = () => image === void 0 || image.model.trim().length === 0 ? void 0 : gifEditAvailability({
				provider: image.provider,
				animated: gif.animated,
				snapshot: player?.getSnapshot()
			});
			const availability = (0, react.useSyncExternalStore)(player?.subscribe ?? noSubscription, readAvailability, readAvailability);
			const setComments = (next) => {
				setCommentsState(next);
				if (versionKey === void 0) return;
				if (next.length === 0) notesByVersion.delete(versionKey);
				else notesByVersion.set(versionKey, next);
			};
			const send = (sheet) => {
				if (image === void 0 || player === void 0 || busy.running || comments.length === 0) return;
				const controller = new AbortController();
				busy.controller.current = controller;
				busy.setRunning(true);
				setSending(true);
				setError(void 0);
				setNotice(void 0);
				(async () => {
					try {
						const limit = await readCanvasImageLimit(controller.signal).catch(() => 4e6);
						controller.signal.throwIfAborted();
						const encoded = await encodeSheetWithinLimit(sheet.canvas, sheet.plan, limit).catch(() => {
							throw new Error(t("gifSheetTooLarge"));
						});
						const data = (await blobToDataUrl(encoded.blob)).replace(/^[^,]*,/, "");
						const request = gifEditRequest({
							image,
							model: await fetchGifEditModel(image, controller.signal),
							comments,
							sheet: {
								mediaType: encoded.mediaType,
								data,
								plan: encoded.plan
							},
							frame: sheet.frame,
							speed: player.getSnapshot().speed
						});
						const response = await fetch(STUDIO_ROUTE, {
							method: "POST",
							credentials: "same-origin",
							signal: controller.signal,
							headers: { "content-type": "application/json" },
							body: JSON.stringify(request)
						});
						const payload = await response.json().catch(() => null);
						if (!response.ok || payload === null || !("attachment" in payload)) {
							const reported = payload !== null && "error" in payload && payload.error ? payload.error : void 0;
							throw reported === void 0 ? new Error(t("gifEditFailed")) : new StudioReplyError(reported);
						}
						const revision = revisionFromReply(payload, request, image.prompt);
						const savedOk = await addRevision(revision);
						if (revision.original?.mediaType !== "image/gif" && revision.attachment.mediaType !== "image/gif") {
							onSent(t("gifEditStill"));
							return;
						}
						onSent(savedOk ? t("gifEditDone") : t("gifEditSaveFailed"));
					} catch (cause) {
						if (controller.signal.aborted) return;
						const message = (cause instanceof Error ? cause.message : String(cause)).slice(0, 300);
						const fromChannel = cause instanceof StudioReplyError;
						setError({
							message,
							fromChannel
						});
						if (!editorOpen.current) setNotice(t("gifEditFailedNotice", { reason: message }));
					} finally {
						setSending(false);
						if (busy.controller.current === controller) {
							busy.controller.current = void 0;
							busy.setRunning(false);
						}
					}
				})();
			};
			return {
				t,
				availability,
				comments,
				setComments,
				busy: busy.running,
				sending,
				error,
				notice,
				editRequested,
				requestEdit: () => {
					setEditRequested(true);
				},
				takeEditRequest: () => {
					if (!editRequested) return false;
					setEditRequested(false);
					return true;
				},
				setEditorOpen: (open) => {
					editorOpen.current = open;
				},
				beginEditing: () => {
					setNotice(void 0);
				},
				send,
				cancelSend: () => {
					busy.controller.current?.abort();
				},
				fallback: (total) => {
					if (image === void 0) return;
					onFallback(composeFallbackPrompt(image.prompt, comments, total), t("gifEditFallbackHint"));
				}
			};
		}
		/** The card's edit chip, wired to open the lightbox in edit mode. */
		function GifCardEditChip({ edit, onOpen }) {
			return (0, react_jsx_runtime.jsx)(GifEditChip, {
				availability: edit.availability,
				t: edit.t,
				disabled: edit.busy,
				onOpen: () => {
					edit.requestEdit();
					onOpen();
				}
			});
		}
		/** A failure that came back while no editor was on screen, under the card title. */
		function GifEditNotice({ edit }) {
			return edit.notice === void 0 ? null : (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-ig-gif-edit-notice",
				role: "status",
				children: edit.notice
			});
		}
		/**
		* The GIF lightbox with the frame editor: entering edit mode pauses the
		* player and draws the sheet once (the sheet view and the request read it,
		* and it outlives frames the player releases); leaving it keeps the notes.
		* Escape leaves edit mode before it closes the lightbox.
		*/
		function GifEditLightbox({ edit, ...props }) {
			const { player, gif } = props;
			const t = gif.t;
			const [editing, setEditing] = (0, react.useState)(false);
			const frameIndex = (0, react.useSyncExternalStore)(editing ? player.subscribe : noSubscription, () => editing ? player.getSnapshot().index : 0, () => 0);
			const [view, setView] = (0, react.useState)("gif");
			const [sheet, setSheet] = (0, react.useState)();
			const playedBefore = (0, react.useRef)(false);
			const enter = () => {
				const current = player.getSnapshot();
				const first = current.frames[0];
				if (current.status !== "ready" || first === void 0) return;
				playedBefore.current = current.playing;
				player.pause();
				const plan = planGifSheet(current.frames.length, first.width, first.height);
				setSheet({
					canvas: drawGifSheet(current.frames, plan),
					plan,
					frame: {
						width: first.width,
						height: first.height,
						delaysMs: [...current.delaysMs]
					}
				});
				setView("gif");
				setEditing(true);
				edit.beginEditing();
			};
			const leave = () => {
				setEditing(false);
				setSheet(void 0);
				if (playedBefore.current) player.play();
			};
			(0, react.useEffect)(() => {
				if (edit.takeEditRequest()) enter();
			}, []);
			(0, react.useEffect)(() => {
				edit.setEditorOpen(editing);
				return () => {
					edit.setEditorOpen(false);
				};
			}, [editing]);
			(0, react.useEffect)(() => {
				if (!editing) return;
				const onKeyDown = (event) => {
					if (event.key !== "Escape") return;
					event.stopPropagation();
					leave();
				};
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [editing]);
			const clear = () => {
				const count = edit.comments.length;
				if (count === 0 || !window.confirm(t("gifCommentsClearConfirm", { count: String(count) }))) return;
				edit.setComments([]);
			};
			const frames = new Set(edit.comments.map((comment) => comment.frame));
			return (0, react_jsx_runtime.jsx)(GifLightbox, {
				...props,
				wrapClassName: editing ? view === "sheet" ? "is-editing is-sheet" : "is-editing" : void 0,
				frameMarks: frames,
				stageOverlay: (0, react_jsx_runtime.jsx)(GifCommentLayer, {
					player,
					editing,
					view,
					sheet,
					comments: edit.comments,
					onChange: edit.setComments,
					t
				}),
				barTrailing: edit.availability === void 0 ? null : (0, react_jsx_runtime.jsx)(GifEditToggle, {
					availability: edit.availability,
					editing,
					t,
					onToggle: () => {
						if (editing) leave();
						else enter();
					}
				}),
				footer: editing ? (0, react_jsx_runtime.jsx)(GifCommentBar, {
					view,
					current: frameIndex + 1,
					total: sheet?.plan.frames ?? 0,
					count: edit.comments.length,
					sending: edit.sending,
					error: edit.error?.message,
					errorHint: edit.error?.fromChannel === true ? t("gifEditFailedHint") : void 0,
					t,
					onView: setView,
					onClear: clear,
					onCancel: () => {
						if (edit.sending) edit.cancelSend();
						else leave();
					},
					onSend: () => {
						if (sheet !== void 0) edit.send(sheet);
					},
					onFallback: () => {
						edit.fallback(sheet?.plan.frames ?? player.getSnapshot().frames.length);
					}
				}) : null
			});
		}
		//#endregion
		//#region lib/types/client/image-result-view.js
		function GeneratedImageCard(props) {
			const result = imageResultFromBlock(props.block);
			if (props.promoted && result !== void 0) return (0, react_jsx_runtime.jsx)(PromotedResultNotice, { locale: props.locale });
			return (0, react_jsx_runtime.jsx)(ImageResultCard, {
				result,
				locale: props.locale,
				sessionId: props.sessionId,
				openFile: props.openFile
			});
		}
		/** Suppress the folded duplicate on modern hosts; render every image on legacy hosts. */
		function GeneratedImagesCard(props) {
			const block = props.block;
			let results = imageResultsFromMeta(block.meta ?? block.resultView?.meta);
			if (results.length === 0 && "kind" in block) results = ((block.resultView?.card === "generic" ? block.resultView.content : block.content) ?? []).flatMap((item) => item.type === "image" && item.attachment !== void 0 ? [{
				attachment: item.attachment,
				prompt: "Generated Image",
				provider: "",
				model: "",
				output: ""
			}] : []);
			if (props.promoted && results.length > 0) return (0, react_jsx_runtime.jsx)(PromotedResultNotice, { locale: props.locale });
			if (results.length === 0) {
				if (!("kind" in block)) return (0, react_jsx_runtime.jsx)(ImageResultCard, { locale: props.locale });
				const content = block.content ?? block.resultView?.content ?? [];
				return (0, react_jsx_runtime.jsx)("div", { children: content.filter((item) => item.type === "text").map((item, index) => (0, react_jsx_runtime.jsx)("p", { children: item.text }, index)) });
			}
			return (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-ig-promoted-results",
				children: results.map((result, index) => (0, react_jsx_runtime.jsx)(ImageResultCard, {
					result,
					locale: props.locale,
					sessionId: props.sessionId,
					openFile: props.openFile
				}, `${result.attachment.attachmentId}:${index}`))
			});
		}
		/** Render modern image artifacts as final conversation output instead of Tool process content. */
		function PromotedImageResultNode(props) {
			return (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-ig-promoted-results",
				children: props.node.data.results.map((result, index) => (0, react_jsx_runtime.jsx)(ImageResultCard, {
					result,
					locale: props.locale,
					sessionId: props.sessionId,
					openFile: props.openFile
				}, `${result.attachment.attachmentId}:${index}`))
			});
		}
		function PromotedResultNotice({ locale }) {
			const lang = usePluginLanguage(locale);
			return (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-ig-loading",
				children: DICT[lang].resultShown
			});
		}
		function ImageResultCard({ result, locale, sessionId, openFile }) {
			const attachment = result?.attachment;
			const originId = attachment?.attachmentId;
			const [revisionChain, setRevisionChain] = (0, react.useState)(() => loadConversationImageRevisionChain(String(originId ?? "")));
			const selectedRevision = revisionChain.revisions[revisionChain.currentIndex - 1];
			const activeAttachment = selectedRevision?.attachment ?? attachment;
			const activeOriginal = selectedRevision === void 0 ? result?.original : selectedRevision.original;
			const activeResult = selectedRevision !== void 0 ? {
				prompt: selectedRevision.prompt,
				provider: selectedRevision.provider,
				...selectedRevision.channel === void 0 ? {} : { channel: selectedRevision.channel },
				model: selectedRevision.model,
				output: selectedRevision.output,
				createdAt: selectedRevision.createdAt,
				...result?.sourceAttachmentIds !== void 0 && result.sourceAttachmentIds.length > 0 ? { sourceAttachmentIds: result.sourceAttachmentIds } : {}
			} : result;
			const savedTo = result?.savedTo;
			const [url, setUrl] = (0, react.useState)();
			const [blob, setBlob] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const [previewOpen, setPreviewOpen] = (0, react.useState)(false);
			const [toast, setToast] = (0, react.useState)();
			const [regenerateOpen, setRegenerateOpen] = (0, react.useState)(false);
			const [regeneratePrompt, setRegeneratePrompt] = (0, react.useState)("");
			const [regenerateError, setRegenerateError] = (0, react.useState)();
			const [regenerateHint, setRegenerateHint] = (0, react.useState)();
			const [isRegenerating, setIsRegenerating] = (0, react.useState)(false);
			const regenerateControllerRef = (0, react.useRef)();
			const regenerateTextareaRef = (0, react.useRef)(null);
			const lang = usePluginLanguage(locale);
			const t = (keyName, params) => {
				let text = (lang === "en" ? DICT.en : DICT.zh)[keyName] || DICT.zh[keyName] || keyName;
				if (params) for (const [k, v] of Object.entries(params)) text = text.replace(`{${k}}`, v);
				return text;
			};
			const baseGalleryRecord = (presentation) => ({
				id: imageVersionKey(String(presentation.attachment.attachmentId), presentation.original),
				attachment: presentation.attachment,
				prompt: presentation.prompt,
				provider: presentation.provider,
				...presentation.channel === void 0 ? {} : { channel: presentation.channel },
				model: presentation.model,
				output: presentation.output,
				...presentation.savedTo ? { savedTo: presentation.savedTo } : {},
				...presentation.seed !== void 0 ? { seed: presentation.seed } : {},
				...presentation.sourceAttachmentIds !== void 0 && presentation.sourceAttachmentIds.length > 0 ? { sourceAttachmentIds: [...presentation.sourceAttachmentIds] } : {},
				...sessionId ? { sessionId } : {},
				...presentation.original === void 0 ? {} : { original: presentation.original }
			});
			const revisionGalleryRecord = (revision) => ({
				id: imageVersionKey(String(revision.attachment.attachmentId), revision.original),
				attachment: revision.attachment,
				prompt: revision.prompt,
				provider: revision.provider,
				...revision.channel === void 0 ? {} : { channel: revision.channel },
				model: revision.model,
				createdAt: revision.createdAt,
				aspectRatio: revision.ratio,
				imageSize: revision.quality,
				resolution: revision.resolution,
				generationQuality: revision.generationQuality,
				watermark: revision.watermark,
				output: revision.output,
				...savedTo ? { savedTo } : {},
				...sessionId ? { sessionId } : {},
				...revision.original === void 0 ? {} : { original: revision.original }
			});
			const currentGalleryRecord = () => selectedRevision !== void 0 ? revisionGalleryRecord(selectedRevision) : result === void 0 ? void 0 : baseGalleryRecord(result);
			const [gifPopupOpen, setGifPopupOpen] = (0, react.useState)(false);
			const gif = useGifCard({
				lang,
				original: activeOriginal,
				attachmentMediaType: activeAttachment?.mediaType,
				attachmentBlob: blob,
				onOriginalGone: () => {
					const record = currentGalleryRecord();
					if (record !== void 0) saveGalleryItem({
						...record,
						original: void 0
					});
				}
			});
			const edit = useGifEdit({
				gif,
				image: originId ? activeResult : void 0,
				versionKey: activeAttachment === void 0 ? void 0 : imageVersionKey(String(activeAttachment.attachmentId), activeOriginal),
				busy: {
					running: isRegenerating,
					setRunning: setIsRegenerating,
					controller: regenerateControllerRef
				},
				addRevision: async (revision) => {
					const savedOk = await persistGalleryRecord(revisionGalleryRecord(revision));
					setRevisionChain(appendConversationImageRevision(String(originId), revision));
					return savedOk;
				},
				onSent: (message) => {
					setPreviewOpen(false);
					setToast(message);
					setTimeout(() => {
						setToast(void 0);
					}, 3500);
				},
				onFallback: (prompt, hint) => {
					setPreviewOpen(false);
					setRegeneratePrompt(prompt);
					setRegenerateError(void 0);
					setRegenerateHint(hint);
					setRegenerateOpen(true);
				}
			});
			(0, react.useEffect)(() => {
				if (result === void 0) return;
				persistGalleryRecord(baseGalleryRecord(result));
			}, [result?.attachment.attachmentId]);
			(0, react.useEffect)(() => {
				if (!originId) return;
				regenerateControllerRef.current?.abort();
				regenerateControllerRef.current = void 0;
				setIsRegenerating(false);
				setRegenerateOpen(false);
				setRevisionChain(loadConversationImageRevisionChain(String(originId)));
			}, [originId]);
			(0, react.useEffect)(() => () => {
				regenerateControllerRef.current?.abort();
			}, []);
			(0, react.useEffect)(() => {
				if (!regenerateOpen || isRegenerating) return;
				const frame = requestAnimationFrame(() => {
					regenerateTextareaRef.current?.focus();
					regenerateTextareaRef.current?.select();
				});
				const onKeyDown = (event) => {
					if (event.key === "Escape") setRegenerateOpen(false);
				};
				window.addEventListener("keydown", onKeyDown);
				return () => {
					cancelAnimationFrame(frame);
					window.removeEventListener("keydown", onKeyDown);
				};
			}, [regenerateOpen, isRegenerating]);
			(0, react.useEffect)(() => {
				if (!previewOpen) return;
				const onKeyDown = (e) => {
					if (e.key === "Escape") setPreviewOpen(false);
				};
				window.addEventListener("keydown", onKeyDown);
				return () => {
					window.removeEventListener("keydown", onKeyDown);
				};
			}, [previewOpen]);
			const currentUrlRef = (0, react.useRef)();
			(0, react.useEffect)(() => {
				return () => {
					if (currentUrlRef.current !== void 0) {
						URL.revokeObjectURL(currentUrlRef.current);
						currentUrlRef.current = void 0;
					}
				};
			}, []);
			(0, react.useEffect)(() => {
				if (activeAttachment === void 0) return;
				let canceled = false;
				fetchAttachmentBlob(activeAttachment).then((resBlob) => {
					if (canceled) return;
					setBlob(resBlob);
					setError(void 0);
					const nextUrl = URL.createObjectURL(resBlob);
					if (currentUrlRef.current !== void 0) URL.revokeObjectURL(currentUrlRef.current);
					currentUrlRef.current = nextUrl;
					setUrl(nextUrl);
				}).catch((cause) => {
					if (canceled) return;
					setError(cause instanceof Error ? cause.message : String(cause));
				});
				return () => {
					canceled = true;
				};
			}, [activeAttachment?.attachmentId]);
			const copy = async (e) => {
				e.stopPropagation();
				if (gif.player !== void 0) {
					const message = await gif.copyFrame();
					if (message === void 0) return;
					setToast(message);
					setTimeout(() => {
						setToast(void 0);
					}, 3500);
					return;
				}
				if (!blob) return;
				const ok = await copyImageBlob(blob);
				setToast(ok ? t("copiedImage") : t("copyFailed"));
				setTimeout(() => {
					setToast(void 0);
				}, 2e3);
			};
			const download = (e) => {
				e.stopPropagation();
				if (!url) return;
				const a = document.createElement("a");
				a.href = url;
				a.download = activeAttachment?.name || `dsh-image-${Date.now()}.png`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
			};
			const opensSavedFile = openFile !== void 0 && savedTo !== void 0 && selectedRevision === void 0;
			const openNewTab = (e) => {
				e.stopPropagation();
				if (opensSavedFile) {
					openFile(savedTo);
					return;
				}
				const target = gif.player?.url ?? url;
				if (!target) return;
				window.open(target, "_blank", "noopener,noreferrer");
			};
			/** Drag the GIF out as a file, the same bytes a download would give. */
			const onDragStart = (event) => {
				const record = currentGalleryRecord();
				if (record === void 0) return;
				startGalleryImageDrag(event, {
					createdAt: 0,
					...record
				}, gif.file());
			};
			const openRegenerate = (event) => {
				event.stopPropagation();
				if (activeResult === void 0 || isRegenerating) return;
				setRegeneratePrompt(activeResult.prompt);
				setRegenerateError(void 0);
				setRegenerateHint(void 0);
				setRegenerateOpen(true);
			};
			const cancelRegenerate = () => {
				regenerateControllerRef.current?.abort();
				regenerateControllerRef.current = void 0;
				setIsRegenerating(false);
				setRegenerateOpen(false);
				setRegenerateError(void 0);
			};
			const regenerate = async () => {
				if (activeResult === void 0 || !originId || isRegenerating || regeneratePrompt.trim().length === 0) return;
				setIsRegenerating(true);
				setRegenerateError(void 0);
				setRegenerateOpen(false);
				const controller = new AbortController();
				regenerateControllerRef.current = controller;
				try {
					const base = conversationRegenerateRequest(activeResult, regeneratePrompt, selectedRevision === void 0 ? void 0 : {
						ratio: selectedRevision.ratio,
						quality: selectedRevision.quality,
						resolution: selectedRevision.resolution,
						generationQuality: selectedRevision.generationQuality,
						watermark: selectedRevision.watermark
					});
					const request = gif.animated ? {
						...base,
						output: gifOutputRequest(await gif.info())
					} : base;
					const response = await fetch(STUDIO_ROUTE, {
						method: "POST",
						credentials: "same-origin",
						signal: controller.signal,
						headers: { "content-type": "application/json" },
						body: JSON.stringify(request)
					});
					const payload = await response.json().catch(() => null);
					if (!response.ok || payload === null || !("attachment" in payload)) throw new Error(payload && "error" in payload && payload.error ? payload.error : t("regenerateFailed"));
					const original = originalFromMeta(payload.original);
					const revision = {
						attachment: payload.attachment,
						prompt: payload.prompt,
						provider: payload.provider,
						...payload.channel === void 0 ? {} : { channel: payload.channel },
						model: payload.model,
						output: payload.output,
						createdAt: payload.createdAt,
						ratio: request.ratio,
						quality: request.quality,
						...request.resolution === void 0 ? {} : { resolution: request.resolution },
						...request.generationQuality === void 0 ? {} : { generationQuality: request.generationQuality },
						...request.watermark === void 0 ? {} : { watermark: request.watermark },
						...original === void 0 ? {} : { original }
					};
					const savedOk = await persistGalleryRecord(revisionGalleryRecord(revision));
					const next = appendConversationImageRevision(String(originId), revision);
					setRevisionChain(next);
					setToast(savedOk ? t("regenerate") : t("regenerateSaveFailed"));
					setTimeout(() => {
						setToast(void 0);
					}, 2e3);
				} catch (cause) {
					if (!controller.signal.aborted) {
						const errMsg = cause instanceof Error ? cause.message : String(cause);
						setError(errMsg);
						setToast(errMsg);
						setTimeout(() => {
							setToast(void 0);
						}, 3500);
					}
				} finally {
					if (regenerateControllerRef.current === controller) {
						regenerateControllerRef.current = void 0;
						setIsRegenerating(false);
					}
				}
			};
			const selectVersion = (index) => {
				if (!originId || isRegenerating) return;
				setRevisionChain(selectConversationImageRevision(String(originId), index));
			};
			const canRegenerate = activeResult !== void 0 && CLOUD_IMAGE_PROVIDERS.includes(activeResult.provider) && activeResult.model.trim().length > 0;
			const versionTotal = revisionChain.revisions.length + 1;
			const versionCurrent = revisionChain.currentIndex + 1;
			if (attachment === void 0) return (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-ig-loading",
				children: t("generating")
			});
			return (0, react_jsx_runtime.jsxs)("section", {
				className: "dsh-ig-result",
				"aria-label": t("generatedTitle"),
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-result-title",
						children: [t("generatedTitle"), gif.animated ? (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-ig-tag dsh-ig-gif-badge",
							title: gif.t("gifBadge"),
							children: "GIF"
						}) : null]
					}),
					savedTo !== void 0 ? (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-savedto",
						children: [
							t("savedToPath"),
							": ",
							openFile === void 0 ? savedTo : (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-ig-savedto-open",
								title: savedTo,
								onClick: () => {
									openFile(savedTo);
								},
								children: savedTo
							})
						]
					}) : null,
					error !== void 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-error",
						children: error
					}) : null,
					(0, react_jsx_runtime.jsx)(GifEditNotice, { edit }),
					url === void 0 && error === void 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-loading",
						children: t("loading")
					}) : null,
					url !== void 0 ? (0, react_jsx_runtime.jsxs)("div", {
						className: gifPopupOpen ? "dsh-ig-container is-gif-open" : "dsh-ig-container",
						children: [
							gif.player !== void 0 ? (0, react_jsx_runtime.jsx)(GifStage, {
								player: gif.player,
								stage: "card",
								className: "dsh-ig-image",
								alt: activeAttachment?.name ?? "Generated image",
								poster: url,
								onClick: () => {
									if (!isRegenerating) setPreviewOpen(true);
								},
								onDragStart
							}) : (0, react_jsx_runtime.jsx)("img", {
								className: "dsh-ig-image",
								src: url,
								alt: activeAttachment?.name ?? "Generated image",
								onClick: () => {
									if (!isRegenerating) setPreviewOpen(true);
								}
							}),
							(0, react_jsx_runtime.jsx)(GifCardOverlay, {
								gif,
								onOpenChange: setGifPopupOpen
							}),
							(0, react_jsx_runtime.jsx)(GifCardEditChip, {
								edit,
								onOpen: () => {
									if (!isRegenerating) setPreviewOpen(true);
								}
							}),
							isRegenerating ? (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-regenerate-overlay",
								children: [
									(0, react_jsx_runtime.jsx)("div", { className: "dsh-ig-regenerate-spinner" }),
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-regenerate-overlay-text",
										children: t("regenerating")
									}),
									(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-regenerate-overlay-cancel",
										onClick: cancelRegenerate,
										children: t("cancel")
									})
								]
							}) : null,
							(0, react_jsx_runtime.jsxs)("div", {
								className: gifPopupOpen || toast !== void 0 ? "dsh-ig-toolbar is-pinned" : "dsh-ig-toolbar",
								children: [
									canRegenerate ? (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-tool-btn",
										disabled: isRegenerating,
										title: isRegenerating ? t("regenerating") : t("regenerate"),
										onClick: openRegenerate,
										children: (0, react_jsx_runtime.jsxs)("svg", {
											width: "15",
											height: "15",
											viewBox: "0 0 24 24",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "2",
											strokeLinecap: "round",
											strokeLinejoin: "round",
											children: [(0, react_jsx_runtime.jsx)("path", { d: "M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5" }), (0, react_jsx_runtime.jsx)("path", { d: "M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" })]
										})
									}) : null,
									(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-tool-btn",
										title: gif.player !== void 0 ? gif.t("gifCopyFrame") : t("copyImg"),
										onClick: (e) => {
											copy(e);
										},
										children: (0, react_jsx_runtime.jsxs)("svg", {
											width: "15",
											height: "15",
											viewBox: "0 0 24 24",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "2",
											strokeLinecap: "round",
											strokeLinejoin: "round",
											children: [(0, react_jsx_runtime.jsx)("rect", {
												x: "9",
												y: "9",
												width: "13",
												height: "13",
												rx: "2",
												ry: "2"
											}), (0, react_jsx_runtime.jsx)("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })]
										})
									}),
									gif.player !== void 0 ? (0, react_jsx_runtime.jsx)(GifToolbarDownload, {
										gif,
										onOpenChange: setGifPopupOpen
									}) : (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-tool-btn",
										title: t("download"),
										onClick: download,
										children: (0, react_jsx_runtime.jsxs)("svg", {
											width: "15",
											height: "15",
											viewBox: "0 0 24 24",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "2",
											strokeLinecap: "round",
											strokeLinejoin: "round",
											children: [
												(0, react_jsx_runtime.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
												(0, react_jsx_runtime.jsx)("polyline", { points: "7 10 12 15 17 10" }),
												(0, react_jsx_runtime.jsx)("line", {
													x1: "12",
													y1: "15",
													x2: "12",
													y2: "3"
												})
											]
										})
									}),
									(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-tool-btn",
										title: opensSavedFile ? gif.t("openInSidebar") : openFile !== void 0 ? gif.t("notSavedVersion") : t("openNewTab"),
										disabled: openFile !== void 0 && !opensSavedFile,
										onClick: openNewTab,
										children: (0, react_jsx_runtime.jsxs)("svg", {
											width: "15",
											height: "15",
											viewBox: "0 0 24 24",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "2",
											strokeLinecap: "round",
											strokeLinejoin: "round",
											children: [
												(0, react_jsx_runtime.jsx)("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }),
												(0, react_jsx_runtime.jsx)("polyline", { points: "15 3 21 3 21 9" }),
												(0, react_jsx_runtime.jsx)("line", {
													x1: "10",
													y1: "14",
													x2: "21",
													y2: "3"
												})
											]
										})
									}),
									toast ? (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-ig-toast",
										children: toast
									}) : null
								]
							}),
							versionTotal > 1 ? (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-version-nav",
								"aria-label": t("versionLabel", {
									current: String(versionCurrent),
									total: String(versionTotal)
								}),
								children: [
									(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										title: t("versionPrevious"),
										disabled: revisionChain.currentIndex === 0 || isRegenerating,
										onClick: (event) => {
											event.stopPropagation();
											selectVersion(revisionChain.currentIndex - 1);
										},
										children: "‹"
									}),
									(0, react_jsx_runtime.jsxs)("span", {
										className: "dsh-ig-version-count",
										children: [
											versionCurrent,
											"/",
											versionTotal
										]
									}),
									(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										title: t("versionNext"),
										disabled: revisionChain.currentIndex >= revisionChain.revisions.length || isRegenerating,
										onClick: (event) => {
											event.stopPropagation();
											selectVersion(revisionChain.currentIndex + 1);
										},
										children: "›"
									})
								]
							}) : null
						]
					}) : null,
					previewOpen && url !== void 0 && gif.player !== void 0 ? (0, react_jsx_runtime.jsx)(GifEditLightbox, {
						edit,
						gif,
						player: gif.player,
						alt: activeAttachment?.name ?? "Generated image preview",
						poster: url,
						onClose: () => {
							setPreviewOpen(false);
						},
						onDragStart
					}) : null,
					previewOpen && url !== void 0 && gif.player === void 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-lightbox-backdrop",
						onClick: () => {
							setPreviewOpen(false);
						},
						children: (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-ig-lightbox-img-wrap",
							onClick: (e) => {
								e.stopPropagation();
							},
							children: (0, react_jsx_runtime.jsx)("img", {
								className: "dsh-ig-lightbox-img",
								src: url,
								alt: activeAttachment?.name ?? "Generated image preview"
							})
						})
					}) : null,
					regenerateOpen && activeResult !== void 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: "dsh-ig-regenerate-backdrop",
						onMouseDown: (event) => {
							if (event.target === event.currentTarget && !isRegenerating) setRegenerateOpen(false);
						},
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-regenerate-dialog",
							role: "dialog",
							"aria-modal": "true",
							"aria-labelledby": `dsh-ig-regenerate-${String(originId)}`,
							children: [
								(0, react_jsx_runtime.jsx)("h3", {
									id: `dsh-ig-regenerate-${String(originId)}`,
									children: t("regenerateTitle")
								}),
								(0, react_jsx_runtime.jsx)("p", { children: regenerateHint ?? t("regenerateHint") }),
								(0, react_jsx_runtime.jsxs)("label", { children: [(0, react_jsx_runtime.jsx)("span", { children: t("prompt") }), (0, react_jsx_runtime.jsx)("textarea", {
									ref: regenerateTextareaRef,
									value: regeneratePrompt,
									disabled: isRegenerating,
									onChange: (event) => setRegeneratePrompt(event.target.value),
									onKeyDown: (event) => {
										if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
											event.preventDefault();
											regenerate();
										}
									}
								})] }),
								regenerateError ? (0, react_jsx_runtime.jsx)("p", {
									className: "dsh-ig-regenerate-error",
									role: "alert",
									children: regenerateError
								}) : null,
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-regenerate-actions",
									children: [(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-regenerate-cancel",
										onClick: cancelRegenerate,
										children: t("cancel")
									}), (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-regenerate-confirm",
										disabled: isRegenerating || regeneratePrompt.trim().length === 0,
										onClick: () => {
											regenerate();
										},
										children: t("confirmRegenerate")
									})]
								})
							]
						})
					}) : null
				]
			});
		}
		function imageResultFromBlock(block) {
			const attachment = imageRef(block);
			if (attachment === void 0) return void 0;
			const blockValue = block;
			const meta = blockValue.meta ?? blockValue.resultView?.meta;
			const sourceIds = Array.isArray(blockValue.call?.args?.source_attachment_ids) ? blockValue.call?.args?.source_attachment_ids : typeof blockValue.call?.args?.source_attachment_id === "string" ? [blockValue.call?.args?.source_attachment_id] : void 0;
			const original = originalFromMeta(meta?.original);
			return {
				attachment,
				prompt: typeof meta?.prompt === "string" ? meta.prompt : blockValue.call?.args?.prompt ?? "Generated Image",
				provider: typeof meta?.provider === "string" ? meta.provider : "google",
				model: typeof meta?.model === "string" ? meta.model : "",
				output: typeof meta?.output === "string" ? meta.output : "",
				...typeof meta?.savedTo === "string" ? { savedTo: meta.savedTo } : {},
				...typeof meta?.seed === "number" ? { seed: meta.seed } : {},
				...sourceIds !== void 0 && sourceIds.length > 0 ? { sourceAttachmentIds: sourceIds } : {},
				...original === void 0 ? {} : { original }
			};
		}
		//#endregion
		//#region lib/types/client/plugin-style.js
		const PLUGIN_STYLE = `
.dsh-ig-card{list-style:none;border:0;background:none;padding:0}
.dsh-ig-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 0 6px}
.dsh-ig-head-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.dsh-ig-title{display:block;font-size:15px;font-weight:600;line-height:1.4;color:var(--dsw-alias-label-primary,inherit)}
.dsh-ig-desc{display:block;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-tertiary,#7b818b)}
.dsh-ig-body{padding:0}
.dsh-ig-field{display:flex;flex-direction:column;gap:6px;padding:12px 0}
.dsh-ig-field + .dsh-ig-field{border-top:0.5px solid var(--dsw-alias-border-l2,#e8ebf0)}
.dsh-ig-label{font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary,inherit)}
.dsh-ig-input{box-sizing:border-box;width:100%;height:34px;padding:0 12px;font-size:13px;border:0.5px solid var(--dsw-alias-border-l4,#d7dbe0);border-radius:var(--dsw-radius-md,6px);background:var(--dsw-alias-bg-layer-3,transparent);color:inherit;outline:none;transition:border-color .15s}
.dsh-ig-input:focus{border-color:var(--dsw-alias-brand-primary,#4c78ff)}
.dsh-ig-textarea{resize:vertical;min-height:56px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;line-height:1.5}
.dsh-ig-input-group{display:flex;gap:8px;align-items:center}
.dsh-ig-file-row{display:flex;align-items:center;gap:10px;min-width:0}
.dsh-ig-file-input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;clip-path:inset(50%)}
.dsh-ig-file-button{appearance:none;flex:none;border:1px solid var(--dsw-alias-border-l2,#d7dbe0);border-radius:8px;padding:7px 12px;background:var(--dsw-alias-bg-layer-3,#f9fafb);color:var(--dsw-alias-label-secondary,inherit);font-size:13px;cursor:pointer;transition:background .15s,border-color .15s}
.dsh-ig-file-button:hover{background:var(--dsw-alias-bg-layer-2,#edf0f3);border-color:var(--dsw-alias-label-dimmed,#9ca3af)}
.dsh-ig-file-button:focus-within{outline:2px solid var(--dsw-alias-brand-primary,#4c78ff);outline-offset:2px}
.dsh-ig-file-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary,inherit);font-size:12px}
.dsh-ig-workflow-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.dsh-ig-workflow-row{display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid var(--dsw-alias-border-l2,#eee);border-radius:8px}
.dsh-ig-workflow-main{display:flex;align-items:center;gap:8px}
.dsh-ig-workflow-active{display:inline-flex;align-items:center;cursor:pointer;flex:none}
.dsh-ig-workflow-active input[type=radio]{width:15px;height:15px;accent-color:var(--dsw-alias-brand-primary,#4c78ff);margin:0;cursor:pointer}
.dsh-ig-workflow-name{flex:1;min-width:0}
.dsh-ig-btn-reset{appearance:none;border:0.5px solid var(--dsw-alias-border-l4,#d7dbe0);border-radius:var(--dsw-radius-md,6px);padding:5px 12px;background:var(--dsw-alias-bg-layer-3,#f9fafb);color:var(--dsw-alias-label-secondary,inherit);font:inherit;font-size:13px;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s}
.dsh-ig-btn-reset:hover{background:var(--dsw-alias-bg-layer-2,#edf0f3);border-color:var(--dsw-alias-label-dimmed,#9ca3af)}
.dsh-ig-hint,.dsh-ig-status{margin:0;color:var(--dsw-alias-label-tertiary,#7b818b);font-size:12px;line-height:1.4}
.dsh-ig-link{color:var(--dsw-alias-label-link,#2563eb);text-decoration:none;white-space:nowrap}.dsh-ig-link:hover{text-decoration:underline}
.dsh-ig-hint-error{color:var(--dsw-alias-label-error,#d33)}
.dsh-ig-status-error{color:var(--dsw-alias-label-error,#d33);font-weight:500}
.dsh-ig-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l2,#eee)}
.dsh-ig-check-row{display:flex;align-items:center;gap:8px;cursor:pointer}
.dsh-ig-check-row input[type=checkbox]{width:15px;height:15px;accent-color:var(--dsw-alias-brand-primary,#4c78ff);margin:0}
.dsh-ig-model-picker{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px 12px;max-height:180px;overflow-y:auto;padding:2px 0}
.dsh-ig-model-picker .dsh-ig-check-row{min-width:0}
.dsh-ig-model-option{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.dsh-ig-model-default{flex:none;color:var(--dsw-alias-label-tertiary,#7b818b);font-size:11px}
.dsh-ig-savedto{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary,#7b818b);word-break:break-all}
.dsh-ig-save{appearance:none;border:0;border-radius:var(--dsw-radius-md,6px);padding:5px 14px;background:var(--dsw-alias-label-primary,#111827);color:var(--dsw-alias-bg-layer-3,#fff);font:inherit;font-size:13px;font-weight:400;cursor:pointer;transition:opacity .15s}
.dsh-ig-save:disabled{opacity:.4;cursor:default}

/* Provider list: one expandable row per provider, each saving independently. */
.dsh-ig-providers{display:flex;flex-direction:column;margin-top:12px;overflow:hidden;border:1px solid var(--dsw-alias-border-l2,#e8ebf0);border-radius:10px;background:var(--dsw-alias-bg-layer-3,transparent)}
.dsh-ig-provider-row{border:0;background:none;padding:0 14px}
.dsh-ig-provider-row + .dsh-ig-provider-row{border-top:1px solid var(--dsw-alias-border-l2,#e8ebf0)}
.dsh-ig-provider-head-row{display:flex;align-items:center;gap:8px;min-height:48px}
.dsh-ig-provider-head{flex:1;min-width:0;width:100%;min-height:48px;appearance:none;border:0;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;padding:0}
.dsh-ig-channel-add.dsh-ig-btn-secondary{display:inline-flex;align-items:center;justify-content:center;flex:none;box-sizing:border-box;width:26px;height:26px;padding:0;border:0;border-radius:7px;background:var(--dsw-alias-bg-layer-2,#f3f4f6);color:var(--dsw-alias-label-tertiary,#7b818b);line-height:1;transition:background .15s,color .15s}
.dsh-ig-channel-add.dsh-ig-btn-secondary:hover:not(:disabled){border:0;background:var(--dsw-alias-bg-layer-1,#e5e7eb);color:var(--dsw-alias-label-primary,inherit)}
.dsh-ig-channel-add svg{width:14px;height:14px}
.dsh-ig-provider-head:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4c78ff);outline-offset:2px;border-radius:var(--dsw-radius-sm,4px)}
.dsh-ig-provider-head:hover .dsh-ig-provider-name{color:var(--dsw-alias-label-primary,inherit)}
.dsh-ig-provider-head:hover .dsh-ig-provider-chevron{color:var(--dsw-alias-label-primary,inherit)}
.dsh-ig-provider-name{flex:1;min-width:0;font-size:13px;font-weight:550;line-height:20px;color:var(--dsw-alias-label-primary,inherit);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-ig-provider-chevron{display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;color:var(--dsw-alias-label-tertiary,#7b818b);transition:transform .16s,color .15s}
.dsh-ig-provider-chevron-open{transform:rotate(180deg)}
.dsh-ig-provider-body{border-top:0;padding:0 0 14px}
.dsh-ig-badge{flex:none;display:inline-flex;align-items:center;gap:5px;box-sizing:border-box;min-height:22px;padding:1px 8px;border:1px solid transparent;border-radius:6px;font-size:11px;font-weight:500;line-height:18px;color:var(--dsw-alias-label-secondary,inherit);white-space:nowrap;max-width:60%;overflow:hidden;text-overflow:ellipsis}
.dsh-ig-badge-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex:none}
.dsh-ig-badge-ok{border-color:rgba(34,197,94,.2);color:#15803d;background:rgba(34,197,94,.08)}
.dsh-ig-badge-missing{border-color:rgba(239,68,68,.18);color:#b91c1c;background:rgba(239,68,68,.06)}
.dsh-ig-badge-neutral{border-color:var(--dsw-alias-border-l2,#e8ebf0);color:var(--dsw-alias-label-tertiary,#7b818b);background:var(--dsw-alias-bg-layer-2,transparent)}
.dsh-ig-badge-checking .dsh-ig-badge-dot{animation:dsh-ig-pulse 1s ease-in-out infinite}
@keyframes dsh-ig-pulse{50%{opacity:.25}}

/* Default provider radio pills. */
.dsh-ig-radios{display:flex;flex-wrap:wrap;gap:8px}
.dsh-ig-radio{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l2,#d7dbe0);border-radius:999px;padding:5px 12px;cursor:pointer;font-size:12.5px;color:var(--dsw-alias-label-secondary,inherit);transition:border-color .15s,background .15s}
.dsh-ig-radio:hover{border-color:var(--dsw-alias-label-dimmed,#9ca3af)}
.dsh-ig-radio-checked{border-color:var(--dsw-alias-brand-primary,#4c78ff);background:rgba(76,120,255,.08);color:var(--dsw-alias-label-primary,inherit)}
.dsh-ig-radio input[type=radio]{width:14px;height:14px;accent-color:var(--dsw-alias-brand-primary,#4c78ff);margin:0;cursor:pointer}

/* Row-level actions: test connection, clear key, save. */
.dsh-ig-row-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;flex-wrap:wrap}
.dsh-ig-row-buttons{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsh-ig-btn-secondary{appearance:none;border:0.5px solid var(--dsw-alias-border-l4,#d7dbe0);border-radius:var(--dsw-radius-md,6px);padding:5px 14px;background:var(--dsw-alias-bg-layer-3,#f9fafb);color:var(--dsw-alias-label-secondary,inherit);font:inherit;font-size:13px;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s,opacity .15s}
.dsh-ig-btn-secondary:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2,#edf0f3);border-color:var(--dsw-alias-label-dimmed,#9ca3af)}
.dsh-ig-btn-secondary:disabled{opacity:.45;cursor:default}
.dsh-ig-btn-danger{color:#b91c1c;border-color:rgba(239,68,68,.4)}
.dsh-ig-btn-danger:hover:not(:disabled){background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.6)}

/* Workspace section within the settings card. */
.dsh-ig-section{display:flex;flex-direction:column;gap:6px;margin-top:20px;padding-top:14px;border-top:0.5px solid var(--dsw-alias-border-l2,#e8ebf0)}
.dsh-ig-section-title{font-size:13px;font-weight:500;line-height:1.5;color:var(--dsw-alias-label-primary,inherit)}
.dsh-ig-status-readonly{color:var(--dsw-alias-label-tertiary,#7b818b);font-style:italic}

.dsh-ig-result{display:grid;gap:10px;max-width:520px}
.dsh-ig-promoted-results{display:grid;gap:16px}
.dsh-ig-result-title{font-size:14px;font-weight:600}
.dsh-ig-container{position:relative;display:inline-block;width:fit-content;max-width:100%;justify-self:start;border-radius:12px;overflow:hidden;line-height:0;isolation:isolate}
.dsh-ig-container:hover .dsh-ig-toolbar,.dsh-ig-container:focus-within .dsh-ig-toolbar{opacity:1;pointer-events:auto}
.dsh-ig-toolbar{position:absolute;top:8px;left:8px;display:flex;align-items:center;gap:5px;padding:3px 5px;border-radius:8px;background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .18s ease;z-index:2;line-height:1}
.dsh-ig-tool-btn{appearance:none;border:0;background:transparent;color:#fff;padding:5px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .15s,color .15s}
.dsh-ig-tool-btn:hover{background:rgba(255,255,255,0.25)}
.dsh-ig-tool-btn-danger:hover{background:rgba(239,68,68,0.75)!important;color:#fff!important}
.dsh-ig-toast{position:absolute;top:100%;left:0;margin-top:5px;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,0.85);color:#fff;font-size:11px;white-space:nowrap;pointer-events:none;z-index:4}
.dsh-ig-image{display:block;max-width:100%;max-height:520px;border-radius:12px;background:#f2f3f5;cursor:pointer}
.dsh-ig-version-nav{position:absolute;right:8px;bottom:8px;display:flex;align-items:center;gap:2px;padding:3px;border-radius:999px;background:rgba(15,23,42,.72);color:#fff;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-size:11px;line-height:1;z-index:2}
.dsh-ig-version-nav button{appearance:none;border:0;background:transparent;color:inherit;width:25px;height:25px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:17px;line-height:1}
.dsh-ig-version-nav button:hover:not(:disabled){background:rgba(255,255,255,.2)}
.dsh-ig-version-nav button:disabled{opacity:.3;cursor:default}
.dsh-ig-version-count{min-width:34px;text-align:center;font-variant-numeric:tabular-nums}
.dsh-ig-regenerate-overlay{position:absolute;inset:0;background:rgba(15,23,42,0.52);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;z-index:3;animation:dsh-ig-fade .18s ease-out;line-height:1.4;border-radius:12px}
.dsh-ig-regenerate-spinner{width:28px;height:28px;border:3px solid rgba(255,255,255,0.25);border-top-color:#fff;border-radius:50%;animation:dsh-ig-spin .8s linear infinite}
.dsh-ig-regenerate-overlay-text{font-size:12.5px;font-weight:550;color:#fff;letter-spacing:0.2px;text-shadow:0 1px 2px rgba(0,0,0,0.4)}
.dsh-ig-regenerate-overlay-cancel{appearance:none;border:1px solid rgba(255,255,255,0.4);border-radius:6px;background:rgba(255,255,255,0.15);color:#fff;padding:3px 12px;font-size:11.5px;cursor:pointer;transition:background .15s}
.dsh-ig-regenerate-overlay-cancel:hover{background:rgba(255,255,255,0.3)}
@keyframes dsh-ig-spin{to{transform:rotate(360deg)}}
.dsh-ig-regenerate-backdrop{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(11,17,29,.6);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);animation:dsh-ig-fade .15s ease-out}
.dsh-ig-regenerate-dialog{width:min(520px,100%);border:1px solid var(--dsw-alias-border-l2,#dfe3ea);border-radius:14px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#172033);box-shadow:0 24px 72px rgba(11,17,29,.28);padding:20px;box-sizing:border-box;line-height:1.4}
.dsh-ig-regenerate-dialog h3{margin:0;font-size:16px;font-weight:650}
.dsh-ig-regenerate-dialog p{margin:7px 0 16px;color:var(--dsw-alias-label-tertiary,#737d8f);font-size:12.5px;line-height:1.55}
.dsh-ig-regenerate-dialog label{display:grid;gap:7px;font-size:12.5px;font-weight:600}
.dsh-ig-regenerate-dialog textarea{box-sizing:border-box;width:100%;min-height:132px;resize:vertical;border:1px solid var(--dsw-alias-border-l2,#d7dce5);border-radius:9px;padding:11px 12px;background:var(--dsw-alias-bg-layer-2,#fff);color:inherit;font:inherit;font-size:13px;line-height:1.55;outline:none}
.dsh-ig-regenerate-dialog textarea:focus{border-color:var(--dsw-alias-brand-primary,#4c78ff);box-shadow:0 0 0 3px rgba(76,120,255,.12)}
.dsh-ig-regenerate-error{margin-top:10px!important;color:var(--dsw-alias-label-error,#d33)!important}
.dsh-ig-regenerate-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:16px}
.dsh-ig-regenerate-actions button{height:35px;padding:0 14px;border-radius:7px;font:inherit;font-size:13px;font-weight:550;cursor:pointer}
.dsh-ig-regenerate-cancel{border:1px solid var(--dsw-alias-border-l2,#d7dce5);background:transparent;color:inherit}
.dsh-ig-regenerate-confirm{border:1px solid var(--dsw-alias-brand-primary,#3569ed);background:var(--dsw-alias-brand-primary,#3569ed);color:var(--dsw-alias-label-primary-inverted,#fff)}
.dsh-ig-regenerate-actions button:disabled{opacity:.5;cursor:default}
@media(hover:none){.dsh-ig-container .dsh-ig-toolbar{opacity:1;pointer-events:auto}}
@keyframes dsh-ig-fade{from{opacity:0}to{opacity:1}}
.dsh-ig-error{color:var(--dsw-alias-label-error,#d33);font-size:13px}
.dsh-ig-loading{color:var(--dsw-alias-label-tertiary,#7b818b);font-size:13px}

/* Native Workspace Gallery & Studio View (Renders seamlessly inside DSH Session View) */
.dsh-ig-gallery-page{width:100%;height:100%;background:var(--dsw-alias-bg-layer-1,#ffffff);display:flex;flex-direction:column;overflow:hidden;flex:1}

/* 1. Top Navigation Tab Bar */
.dsh-ig-studio-tabs-bar{display:flex;align-items:center;gap:6px;padding:6px 24px;border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);background:var(--dsw-alias-bg-layer-1,#ffffff);flex-shrink:0}
.dsh-ig-studio-tab-btn{appearance:none;-webkit-appearance:none;border:0;background:transparent;display:inline-flex;align-items:center;gap:7px;padding:7px 14px;font-size:13px;font-weight:500;color:var(--dsw-alias-label-secondary,#64748b);cursor:pointer;border-radius:6px;transition:color .15s ease,background-color .15s ease}
.dsh-ig-studio-tab-btn:hover{color:var(--dsw-alias-label-primary,#0f172a);background:var(--dsw-alias-bg-layer-2,#f1f5f9)}
.dsh-ig-studio-tab-btn.is-active{color:var(--dsw-alias-brand-primary,#2563eb);font-weight:600;background:rgba(37,99,235,0.08)}

/* 2. Secondary Filter & Search Toolbar */
.dsh-ig-studio-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 24px;background:var(--dsw-alias-bg-layer-1,#ffffff);border-bottom:1px solid var(--dsw-alias-border-l2,#f1f5f9);flex-shrink:0;flex-wrap:nowrap;min-width:0}
.dsh-ig-studio-toolbar-left{display:flex;align-items:center;gap:10px;flex-wrap:nowrap;flex:1;min-width:0}
.dsh-ig-studio-toolbar-right{display:flex;align-items:center;gap:10px;flex-shrink:0}

/* Modern Custom Select (Removes OS default arrows & ugly borders) */
.dsh-ig-studio-select{appearance:none;-webkit-appearance:none;-moz-appearance:none;height:32px;line-height:30px;padding:0 28px 0 12px;font-size:12.5px;color:var(--dsw-alias-label-primary,#334155);background-color:var(--dsw-alias-bg-layer-2,#ffffff);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 9px center;border:1px solid var(--dsw-alias-border-l2,#e2e8f0);border-radius:6px;outline:none;cursor:pointer;box-sizing:border-box;transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease}
.dsh-ig-studio-select:hover{border-color:var(--dsw-alias-border-l1,#cbd5e1);background-color:var(--dsw-alias-bg-layer-1,#f8fafc)}
.dsh-ig-studio-select:focus{border-color:var(--dsw-alias-brand-primary,#3b82f6);box-shadow:0 0 0 2px rgba(59,130,246,0.15)}
.dsh-ig-studio-select-sort{font-weight:500}

/* Unified Search Input */
.dsh-ig-studio-search-wrap{position:relative;display:flex;align-items:center;min-width:140px;max-width:320px;flex:1}
.dsh-ig-studio-search-icon{position:absolute;left:10px;color:var(--dsw-alias-label-tertiary,#94a3b8);pointer-events:none}
.dsh-ig-studio-search-input{width:100%;height:32px;line-height:30px;padding:0 12px 0 32px;font-size:12.5px;border:1px solid var(--dsw-alias-border-l2,#e2e8f0);border-radius:6px;background-color:var(--dsw-alias-bg-layer-2,#ffffff);color:inherit;outline:none;box-sizing:border-box;transition:border-color .15s ease,box-shadow .15s ease}
.dsh-ig-studio-search-input:hover{border-color:var(--dsw-alias-border-l1,#cbd5e1)}
.dsh-ig-studio-search-input:focus{border-color:var(--dsw-alias-brand-primary,#3b82f6);box-shadow:0 0 0 2px rgba(59,130,246,0.15)}
.dsh-ig-studio-search-input::placeholder{color:var(--dsw-alias-label-tertiary,#94a3b8)}

/* 3. Grid & Responsive Cards */
.dsh-ig-gallery-page-body{flex:1;overflow-y:auto;padding:20px 24px}
.dsh-ig-gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:18px}
.dsh-ig-gallery-sentinel{grid-column:1/-1;height:1px;width:100%}
.dsh-ig-gallery-card{background:var(--dsw-alias-bg-layer-2,#ffffff);border:1px solid var(--dsw-alias-border-l2,#e2e8f0);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;content-visibility:auto;contain-intrinsic-size:auto 280px}
.dsh-ig-gallery-card:hover{transform:translateY(-2px);box-shadow:0 10px 20px -5px rgba(0,0,0,0.06),0 4px 6px -2px rgba(0,0,0,0.03);border-color:var(--dsw-alias-border-l1,#cbd5e1)}
.dsh-ig-gallery-card-media{position:relative;width:100%;aspect-ratio:1/1;background:#f1f5f9;overflow:hidden;display:flex;align-items:center;justify-content:center}
.dsh-ig-gallery-card-img{width:100%;height:100%;object-fit:cover;transition:transform .2s ease}
.dsh-ig-gallery-card:hover .dsh-ig-gallery-card-img{transform:scale(1.03)}
.dsh-ig-gallery-card-loading{font-size:12px;color:#94a3b8}
.dsh-ig-gallery-card-error{font-size:12px;color:#ef4444;padding:8px;text-align:center}

/* Floating Action Toolbar on Card Hover */
.dsh-ig-gallery-card:hover .dsh-ig-card-toolbar{opacity:1;pointer-events:auto}
.dsh-ig-card-toolbar{position:absolute;top:6px;left:6px;display:flex;align-items:center;gap:3px;padding:3px 5px;border-radius:6px;background:rgba(15,23,42,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .18s ease;z-index:10;line-height:1}

/* Card Bottom Metadata */
.dsh-ig-gallery-card-meta{padding:10px 12px;display:flex;flex-direction:column;gap:5px;background:var(--dsw-alias-bg-layer-2,#ffffff);flex:1}
.dsh-ig-card-badge-row{display:flex;align-items:center}
.dsh-ig-card-badge{display:inline-block;padding:2px 6px;border-radius:4px;background:var(--dsw-alias-bg-layer-3,#f1f5f9);color:var(--dsw-alias-label-secondary,#475569);font-size:11px;font-weight:500;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-ig-gallery-card-prompt-line{font-size:12.5px;font-weight:500;color:var(--dsw-alias-label-primary,#1e293b);line-height:1.4;min-height:1.4em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* An imported image has no prompt: its line keeps one row of height and the footer sits at the bottom, so mixed rows align (#113). */
.dsh-ig-card-footer-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding-top:2px}
.dsh-ig-card-meta-text{font-size:11px;color:var(--dsw-alias-label-tertiary,#94a3b8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-ig-card-fav-btn{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#94a3b8);padding:2px;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:color .15s,transform .15s;flex-shrink:0}
.dsh-ig-card-fav-btn:hover{color:#ef4444;transform:scale(1.15)}
.dsh-ig-card-fav-btn.is-favorited{color:#ef4444}

/* Placeholders for Upcoming Routes */
.dsh-ig-placeholder-view{display:flex;align-items:center;justify-content:center;min-height:360px;height:100%;padding:24px}
.dsh-ig-placeholder-card{max-width:500px;width:100%;text-align:center;padding:36px 28px;background:var(--dsw-alias-bg-layer-2,#ffffff);border:1px dashed var(--dsw-alias-border-l2,#e2e8f0);border-radius:14px;display:flex;flex-direction:column;align-items:center;gap:12px}
.dsh-ig-placeholder-icon{font-size:40px;line-height:1}
.dsh-ig-placeholder-header{display:flex;align-items:center;gap:8px;justify-content:center}
.dsh-ig-placeholder-title{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary,inherit);margin:0}
.dsh-ig-placeholder-badge{font-size:11px;font-weight:500;background:rgba(37,99,235,0.1);color:#2563eb;padding:2px 8px;border-radius:12px}
.dsh-ig-placeholder-desc{font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary,#64748b);margin:0}
.dsh-ig-placeholder-tip{margin-top:6px;padding:8px 12px;font-size:12px;background:var(--dsw-alias-bg-layer-3,#f8fafc);border-radius:8px;color:var(--dsw-alias-label-tertiary,#64748b);text-align:left}

/* Empty State */
.dsh-ig-gallery-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:360px;text-align:center;color:var(--dsw-alias-label-tertiary,#94a3b8)}
.dsh-ig-gallery-empty-icon{display:block;width:44px;height:44px;margin-bottom:10px;color:var(--dsw-alias-label-tertiary,#94a3b8);opacity:.7}
.dsh-ig-gallery-empty-title{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary,inherit);margin-bottom:4px}
.dsh-ig-gallery-empty-desc{font-size:13px;max-width:360px;line-height:1.5}

/* Pure Centered Lightbox */
.dsh-ig-lightbox-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;cursor:zoom-out;animation:dsh-ig-fade .15s ease-out}
.dsh-ig-lightbox-topbar{position:absolute;top:20px;left:24px;right:24px;display:flex;align-items:center;justify-content:space-between;z-index:10;pointer-events:none}
.dsh-ig-lightbox-meta{display:flex;align-items:center;gap:8px;pointer-events:auto}
.dsh-ig-tag{display:inline-block;padding:2px 6px;border-radius:4px;background:var(--dsw-alias-bg-layer-3,#edf0f3);color:var(--dsw-alias-label-secondary,inherit);font-weight:500;text-transform:uppercase;font-size:10px}
.dsh-ig-tag-model{background:rgba(76,120,255,0.1);color:#4c78ff}
.dsh-ig-lightbox-close-btn{appearance:none;border:0;background:rgba(255,255,255,0.15);color:#fff;border-radius:50%;width:34px;height:34px;font-size:16px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .15s;pointer-events:auto}
.dsh-ig-lightbox-close-btn:hover{background:rgba(255,255,255,0.3)}
.dsh-ig-lightbox-img-wrap{max-width:86vw;max-height:78vh;display:flex;align-items:center;justify-content:center;cursor:default}
.dsh-ig-lightbox-img{max-width:100%;max-height:78vh;object-fit:contain;border-radius:8px;box-shadow:0 24px 60px rgba(0,0,0,0.7);user-select:none}
.dsh-ig-lightbox-bottombar{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);max-width:min(90vw,640px);background:rgba(20,22,26,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:10px 16px;display:flex;flex-direction:column;gap:8px;color:#fff;box-shadow:0 16px 40px rgba(0,0,0,0.5);cursor:default}
.dsh-ig-lightbox-prompt-text{font-size:13px;line-height:1.4;color:rgba(255,255,255,0.92);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.dsh-ig-lightbox-counter{display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,0.15);color:#fff;font-size:11.5px;font-weight:500;font-variant-numeric:tabular-nums}
.dsh-ig-lightbox-nav-btn{position:fixed;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.12);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:100;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:background-color .15s ease,transform .15s ease,opacity .15s ease;outline:none}
.dsh-ig-lightbox-nav-btn:hover:not(:disabled){background:rgba(255,255,255,0.28);transform:translateY(-50%) scale(1.08)}
.dsh-ig-lightbox-nav-btn:disabled{opacity:0.2;cursor:not-allowed;pointer-events:none}
.dsh-ig-lightbox-nav-prev{left:24px}
.dsh-ig-lightbox-nav-next{right:24px}
.dsh-ig-lightbox-loading{display:flex;align-items:center;justify-content:center;min-width:180px;min-height:180px}
.dsh-ig-lightbox-spinner{width:36px;height:36px;border:3px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:dsh-ig-spin .8s linear infinite}
@keyframes dsh-ig-spin{to{transform:rotate(360deg)}}
.dsh-ig-lightbox-btn{appearance:none;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.08);color:#fff;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:background .15s,border-color .15s,color .15s}
.dsh-ig-lightbox-btn:hover{background:rgba(255,255,255,0.22)}
.dsh-ig-lightbox-btn-danger{border-color:rgba(239,68,68,0.4);color:#fca5a5}
.dsh-ig-lightbox-btn-danger:hover{background:rgba(239,68,68,0.35)!important;color:#fff!important;border-color:rgba(239,68,68,0.7)!important}
.dsh-ig-gallery-page-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:6px 14px;border-radius:8px;font-size:13px;z-index:99999;animation:dsh-ig-fade .15s}

/* Card selection and checkbox */
.dsh-ig-gallery-card.is-selected{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary,#2563eb);border-color:transparent}
.dsh-ig-card-checkbox{position:absolute;top:8px;left:8px;width:22px;height:22px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.7);background:rgba(0,0,0,0.35);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;z-index:5;opacity:0;transition:opacity .15s ease,background-color .15s ease,border-color .15s ease;padding:0;outline:none}
.dsh-ig-gallery-card:hover .dsh-ig-card-checkbox,.dsh-ig-gallery-card.is-manage-mode .dsh-ig-card-checkbox,.dsh-ig-card-checkbox.is-checked{opacity:1}
.dsh-ig-card-checkbox.is-checked{background:var(--dsw-alias-brand-primary,#2563eb);border-color:var(--dsw-alias-brand-primary,#2563eb)}

/* Studio button in toolbar */
.dsh-ig-studio-btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;box-sizing:border-box;border-radius:6px;border:1px solid var(--dsw-alias-border-subtle,rgba(0,0,0,0.12));background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,inherit);font-size:12.5px;font-weight:500;cursor:pointer;transition:border-color .15s,background .15s,color .15s}
.dsh-ig-studio-btn:hover{background:var(--dsw-alias-bg-layer-3,#f3f4f6);border-color:var(--dsw-alias-border-default,rgba(0,0,0,0.2))}
.dsh-ig-studio-btn.is-active{background:var(--dsw-alias-brand-primary,#2563eb);border-color:var(--dsw-alias-brand-primary,#2563eb);color:#fff}
.dsh-ig-studio-btn-danger{color:#ef4444;border-color:rgba(239,68,68,0.35);background:rgba(239,68,68,0.06)}
.dsh-ig-studio-btn-danger:hover{background:rgba(239,68,68,0.14);border-color:rgba(239,68,68,0.6);color:#dc2626}
.dsh-ig-studio-btn-danger.is-active{background:#dc2626;border-color:#dc2626;color:#fff}

/* Floating Batch Action Bar */
.dsh-ig-batch-bar{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:16px;background:rgba(20,24,32,0.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.18);border-radius:40px;padding:8px 16px;box-shadow:0 16px 40px rgba(0,0,0,0.5);z-index:99990;animation:dsh-ig-slide-up .2s cubic-bezier(0.16,1,0.3,1);color:#fff}
@keyframes dsh-ig-slide-up{from{transform:translate(-50%,20px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
.dsh-ig-batch-bar-left{display:flex;align-items:center;gap:10px}
.dsh-ig-batch-bar-right{display:flex;align-items:center;gap:8px;border-left:1px solid rgba(255,255,255,0.15);padding-left:12px}
.dsh-ig-batch-counter{font-size:13px;font-weight:600;color:rgba(255,255,255,0.95);margin-right:4px}
.dsh-ig-batch-btn{appearance:none;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;border-radius:20px;padding:5px 12px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:background .15s,border-color .15s,color .15s}
.dsh-ig-batch-btn:hover:not(:disabled){background:rgba(255,255,255,0.2)}
.dsh-ig-batch-btn:disabled{opacity:0.4;cursor:not-allowed}
.dsh-ig-batch-btn.is-favorited{background:rgba(239,68,68,0.15);border-color:rgba(239,68,68,0.4);color:#fca5a5}
.dsh-ig-batch-btn.is-favorited:hover:not(:disabled){background:rgba(239,68,68,0.25)!important;border-color:rgba(239,68,68,0.6)!important;color:#fff!important}
.dsh-ig-batch-btn-download:hover:not(:disabled){background:rgba(59,130,246,0.2)!important;border-color:rgba(59,130,246,0.5)!important;color:#93c5fd!important}
.dsh-ig-batch-divider{width:1px;height:16px;background:rgba(255,255,255,0.18);margin:0 2px;display:inline-block}
.dsh-ig-batch-btn-danger{background:rgba(239,68,68,0.2);border-color:rgba(239,68,68,0.5);color:#fca5a5}
.dsh-ig-batch-btn-danger:hover:not(:disabled){background:rgba(239,68,68,0.4)!important;border-color:rgba(239,68,68,0.8)!important;color:#fff!important}
.dsh-ig-batch-btn-exit{border-color:transparent;background:transparent;color:rgba(255,255,255,0.7)}
.dsh-ig-batch-btn-exit:hover{background:rgba(255,255,255,0.1);color:#fff}

/* Batch Delete Confirmation Modal */
.dsh-ig-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:100005;display:flex;align-items:center;justify-content:center;padding:16px;animation:dsh-ig-fade .15s ease-out}
.dsh-ig-modal-box{width:100%;max-width:440px;background:var(--dsw-alias-bg-layer-1,#1c1e24);border:1px solid var(--dsw-alias-border-subtle,rgba(255,255,255,0.12));border-radius:12px;padding:22px;box-sizing:border-box;box-shadow:0 20px 50px rgba(0,0,0,0.45);color:var(--dsw-alias-label-primary,#fff);animation:dsh-ig-scale-up .15s ease-out}
@keyframes dsh-ig-scale-up{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}}
.dsh-ig-modal-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}
.dsh-ig-modal-icon-danger{width:36px;height:36px;border-radius:50%;background:rgba(239,68,68,0.12);color:#ef4444;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.dsh-ig-modal-title{font-size:16px;font-weight:600;line-height:1.4}
.dsh-ig-modal-body{margin-bottom:20px;padding-left:48px}
.dsh-ig-modal-desc{font-size:13.5px;color:var(--dsw-alias-label-secondary,rgba(255,255,255,0.7));margin:0 0 14px 0;line-height:1.5}
.dsh-ig-modal-checkbox-label{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--dsw-alias-label-primary,inherit);cursor:pointer;user-select:none}
.dsh-ig-modal-checkbox-label input{margin:0;cursor:pointer;width:15px;height:15px}
.dsh-ig-modal-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px}
.dsh-ig-modal-btn{height:34px;padding:0 14px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:background .15s,border-color .15s,color .15s;outline:none}
.dsh-ig-modal-btn-cancel{background:transparent;border:1px solid var(--dsw-alias-border-subtle,rgba(255,255,255,0.2));color:var(--dsw-alias-label-primary,inherit)}
.dsh-ig-modal-btn-cancel:hover{background:var(--dsw-alias-bg-layer-3,rgba(255,255,255,0.08))}
.dsh-ig-modal-btn-danger{background:#dc2626;border:1px solid #dc2626;color:#fff}
.dsh-ig-modal-btn-danger:hover{background:#b91c1c;border-color:#b91c1c}
.dsh-ig-modal-btn-primary{background:linear-gradient(135deg,#3b82f6,#2563eb);border:1px solid #2563eb;color:#fff;display:inline-flex;align-items:center;gap:6px}
.dsh-ig-modal-btn-primary:hover:not(:disabled){background:linear-gradient(135deg,#2563eb,#1d4ed8)}
.dsh-ig-modal-btn-primary:disabled{opacity:0.5;cursor:not-allowed}
.dsh-ig-regenerate-modal-box{max-width:520px}
.dsh-ig-regenerate-modal-icon{width:36px;height:36px;border-radius:50%;background:rgba(59,130,246,0.15);color:#3b82f6;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.dsh-ig-regenerate-modal-title-wrap{display:flex;flex-direction:column;gap:4px}
.dsh-ig-regenerate-modal-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dsh-ig-regenerate-modal-textarea{width:100%;box-sizing:border-box;background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,0.25));border:1px solid var(--dsw-alias-border-subtle,rgba(255,255,255,0.15));border-radius:8px;padding:10px 12px;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary,#fff);resize:vertical;font-family:inherit;outline:none;transition:border-color .15s,box-shadow .15s}
.dsh-ig-regenerate-modal-textarea:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,0.2)}
.dsh-ig-lightbox-btn-regenerate:hover{color:#60a5fa!important;border-color:rgba(96,165,250,0.5)!important;background:rgba(96,165,250,0.12)!important}
.dsh-ig-lightbox-generating-indicator{display:inline-flex;align-items:center;gap:8px;padding:4px 12px;background:rgba(37,99,235,0.2);border:1px solid rgba(59,130,246,0.5);border-radius:20px;font-size:12px;color:#93c5fd;animation:dsh-ig-fade .15s ease-out}
.dsh-ig-lightbox-spinner-sm{width:12px;height:12px;border:2px solid rgba(147,197,253,0.3);border-top-color:#93c5fd;border-radius:50%;animation:dsh-ig-spin .8s linear infinite;flex-shrink:0}
.dsh-ig-lightbox-abort-btn{appearance:none;background:transparent;border:0;color:#fca5a5;font-size:11.5px;cursor:pointer;padding:0 4px;margin-left:4px;text-decoration:underline;text-underline-offset:2px}
.dsh-ig-lightbox-abort-btn:hover{color:#ef4444}

/* Hide floating chat composer and width handles when the conversation-view
   gallery page is active. The right-sidebar variant (dsh-ig-page-in-sidebar)
   is excluded: the native conversation runs beside it and needs its composer
   and the column handles untouched. */
[data-conversation-scroll]:has(.dsh-ig-gallery-page:not(.dsh-ig-page-in-sidebar)) [data-composer-seat]{display:none!important}
:has(> [data-conversation-scroll]:has(.dsh-ig-gallery-page:not(.dsh-ig-page-in-sidebar))) > [class*="widthHandle"],
:has(.dsh-ig-gallery-page:not(.dsh-ig-page-in-sidebar)) [class*="widthHandle"],
.root:has(.dsh-ig-gallery-page:not(.dsh-ig-page-in-sidebar)) [class*="widthHandle"]{display:none!important}
`;
		//#endregion
		//#region lib/types/client/gif-style.js
		/** Styles of the GIF player (card overlays, the lightbox player, its menus, the gallery hover) and of the card's saved-file link. */
		const GIF_STYLE = `
/* The host draws corners as superellipses; circles and pills here say corner-shape:round, as the host's own do. */
.dsh-ig-savedto-open{appearance:none;display:inline-block;max-width:calc(100% - 5em);margin:0;padding:0;border:0;background:none;font:inherit;color:var(--dsw-alias-link,#3b6cf0);text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;cursor:pointer}
.dsh-ig-savedto-open:hover{text-decoration:underline}
.dsh-ig-container.is-gif-open{overflow:visible}
.dsh-ig-toolbar.is-pinned{opacity:1;pointer-events:auto}
/* Above the chips only while its own menu is open, so it never covers the speed panel. */
.dsh-ig-toolbar:has(.dsh-ig-dl-menu){z-index:4}
.dsh-ig-toolbar .dsh-ig-tool-btn:disabled{opacity:.4;cursor:default;background:transparent}
.dsh-ig-gif-badge{margin-left:8px;vertical-align:middle;font-size:11px;font-weight:600}
.dsh-ig-gif-chip-slot{position:absolute;left:12px;bottom:12px;z-index:3;line-height:normal}
.dsh-ig-gif-chip{corner-shape:round;appearance:none;border:0;min-width:44px;height:36px;padding:0 10px;border-radius:999px;background:rgba(17,20,26,0.6);color:#fff;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.dsh-ig-gif-chip:hover:not(:disabled){background:rgba(17,20,26,0.8)}
.dsh-ig-gif-chip:disabled{opacity:.55;cursor:default}
.dsh-ig-speed{position:relative;display:inline-flex}
.dsh-ig-speed-panel{corner-shape:round;position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);width:52px;height:212px;box-sizing:border-box;padding:10px 0;border-radius:26px;background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-tertiary,#8a8f99);box-shadow:0 10px 30px rgba(15,23,42,0.18),0 0 0 1px rgba(15,23,42,0.06);display:flex;flex-direction:column;align-items:center;gap:8px;z-index:20;line-height:normal}
.dsh-ig-speed-bar .dsh-ig-speed-panel{bottom:calc(100% + 12px);background:rgba(32,35,42,0.96);color:rgba(255,255,255,0.6);box-shadow:0 10px 30px rgba(0,0,0,0.45)}
.dsh-ig-speed-bar .dsh-ig-speed-rail{background:rgba(255,255,255,0.18)}
.dsh-ig-speed-bar .dsh-ig-speed-fill{background:#5b8cff}
.dsh-ig-speed-bar .dsh-ig-speed-one{background:rgba(255,255,255,0.45)}
.dsh-ig-speed-chip .dsh-ig-speed-panel{left:0;transform:none}
.dsh-ig-speed-icon{display:flex}
.dsh-ig-speed-track{position:relative;width:28px;height:150px}
.dsh-ig-speed-rail,.dsh-ig-speed-fill{corner-shape:round;position:absolute;left:11px;width:6px;border-radius:3px}
.dsh-ig-speed-rail{top:0;bottom:0;background:rgba(127,127,127,0.25)}
.dsh-ig-speed-fill{bottom:0;height:var(--dsh-ig-speed-pct);background:var(--dsw-alias-state-business-primary,#3b6cf0)}
.dsh-ig-speed-one{position:absolute;left:7px;width:14px;height:2px;border-radius:1px;top:calc(var(--dsh-ig-speed-one) - 1px);background:rgba(127,127,127,0.55)}
.dsh-ig-speed-knob{corner-shape:round;position:absolute;left:4px;width:20px;height:20px;border-radius:50%;bottom:calc(var(--dsh-ig-speed-pct) - 10px);background:#fff;box-shadow:0 1px 4px rgba(15,23,42,0.35);pointer-events:none}
.dsh-ig-speed-track:focus-within .dsh-ig-speed-knob{box-shadow:0 0 0 3px rgba(59,108,240,0.45),0 1px 4px rgba(15,23,42,0.35)}
.dsh-ig-speed-input{position:absolute;inset:0;width:28px;height:150px;margin:0;opacity:0;writing-mode:vertical-lr;direction:rtl;cursor:pointer}
.dsh-ig-dl{position:relative;display:inline-flex}
.dsh-ig-dl-menu{position:absolute;top:calc(100% + 8px);left:0;width:236px;box-sizing:border-box;padding:6px;border-radius:12px;background:var(--dsw-alias-bg-layer-3,#fff);box-shadow:0 10px 30px rgba(15,23,42,0.18),0 0 0 1px rgba(15,23,42,0.06);z-index:20;line-height:normal}
.dsh-ig-dl-lightbox .dsh-ig-dl-menu{left:auto;right:0;box-shadow:0 10px 30px rgba(0,0,0,0.4)}
.dsh-ig-dl-item{appearance:none;display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;min-height:44px;padding:8px 14px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary,#1f2329);font:inherit;font-size:14px;text-align:left;cursor:pointer}
.dsh-ig-dl-item>span:first-child{font-weight:500}
.dsh-ig-dl-item:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2,#f2f4f7)}
.dsh-ig-dl-item:disabled{opacity:.45;cursor:default}
.dsh-ig-dl-hint{font-size:12px;color:var(--dsw-alias-label-tertiary,#8a8f99)}
/* The lightbox and the gallery preview are always dark: their menus stay light whatever the host theme. */
.dsh-ig-dl-lightbox .dsh-ig-dl-menu,.dsh-ig-dl-gallery .dsh-ig-dl-menu{background:#fff}
.dsh-ig-dl-lightbox .dsh-ig-dl-item,.dsh-ig-dl-gallery .dsh-ig-dl-item{color:#1f2329}
.dsh-ig-dl-lightbox .dsh-ig-dl-item:hover:not(:disabled),.dsh-ig-dl-gallery .dsh-ig-dl-item:hover:not(:disabled){background:#f2f4f7}
.dsh-ig-dl-lightbox .dsh-ig-dl-hint,.dsh-ig-dl-gallery .dsh-ig-dl-hint{color:#8a8f99}
.dsh-ig-gif-actions{position:absolute;top:20px;right:20px;display:flex;align-items:center;gap:10px;z-index:10}
.dsh-ig-gif-action{corner-shape:round;appearance:none;border:0;height:40px;min-width:40px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,0.12);color:#fff;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:13px;cursor:pointer}
.dsh-ig-gif-action:hover{background:rgba(255,255,255,0.22)}
.dsh-ig-gif-toast{position:absolute;top:72px;right:20px;font-size:12px;color:rgba(255,255,255,0.8);z-index:10}
/* The lightbox is always dark, so its accents use a fixed blue: the host's brand colour is neutral (near-black, or near-white in its dark theme). */
.dsh-ig-gif-dock{position:absolute;bottom:28px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:stretch;gap:10px;max-width:calc(100vw - 48px);z-index:10;cursor:default}
.dsh-ig-gif-bar{corner-shape:round;display:flex;align-items:center;gap:10px;padding:6px;border-radius:999px;background:rgba(255,255,255,0.1);box-shadow:0 0 0 1px rgba(255,255,255,0.08);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-sizing:border-box;max-width:calc(100vw - 48px);color:#fff;line-height:normal}
/* No z-index: the gallery's bottom bar, later in the page, paints over this one, so its download menu opens on top. */
.dsh-ig-gif-bar-gallery{position:absolute;bottom:128px;left:50%;transform:translateX(-50%)}
.dsh-ig-gif-play{corner-shape:round;appearance:none;flex:none;width:44px;height:44px;border:0;border-radius:50%;background:#fff;color:#0d0f13;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.dsh-ig-gif-play:disabled{opacity:.5;cursor:default}
.dsh-ig-gif-bar .dsh-ig-speed-trigger{corner-shape:round;appearance:none;min-width:56px;height:44px;padding:0 12px;border:0;border-radius:999px;background:rgba(255,255,255,0.12);color:#fff;font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;cursor:pointer}
.dsh-ig-gif-bar .dsh-ig-speed-trigger:disabled{opacity:.5;cursor:default}
.dsh-ig-gif-strip{position:relative;flex:0 1 auto;width:350px;min-width:160px;height:44px;border-radius:8px;overflow:hidden;background:rgba(255,255,255,0.12);cursor:pointer;touch-action:none;outline:none}
.dsh-ig-gif-strip:focus-visible{box-shadow:0 0 0 2px #fff}
.dsh-ig-gif-strip[aria-disabled="true"]{cursor:default;animation:dsh-ig-gif-pulse 1.2s ease-in-out infinite}
.dsh-ig-gif-strip canvas{display:block;width:100%;height:100%}
.dsh-ig-gif-strip-head{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#5b8cff;pointer-events:none}
@keyframes dsh-ig-gif-pulse{50%{opacity:.6}}
.dsh-ig-gif-strip-mark{corner-shape:round;position:absolute;top:3px;width:7px;height:7px;margin-left:-3.5px;border-radius:50%;background:#5b8cff;box-shadow:0 0 0 1.5px #fff;pointer-events:none}
/* The frame stays clear of the bars under it: it is lifted by their measured height (--dsh-ig-gif-dock-h) and sized to fit above them. */
.dsh-ig-gif-wrap{position:relative;max-height:none;margin-bottom:calc(var(--dsh-ig-gif-dock-h,56px) + 52px)}
.dsh-ig-gif-wrap .dsh-ig-lightbox-img,.dsh-ig-gif-sheet{display:block;max-height:calc(100vh - var(--dsh-ig-gif-dock-h,56px) - 192px)}
.dsh-ig-gif-wrap.is-editing{border-radius:10px;box-shadow:0 0 0 3px #3b6cf0}
.dsh-ig-gif-wrap.is-sheet .dsh-ig-gif-stage{position:absolute;inset:0;overflow:hidden;opacity:0;pointer-events:none}
.dsh-ig-gif-sheet{display:block;max-width:86vw;border-radius:10px;background:#1b1e24}
.dsh-ig-gif-edit-chip-slot{position:absolute;right:12px;bottom:12px;z-index:3;line-height:normal}
.dsh-ig-container:has(.dsh-ig-version-nav) .dsh-ig-gif-edit-chip-slot{bottom:48px}
.dsh-ig-gif-edit-chip{display:inline-flex;align-items:center;gap:6px;padding:0 12px}
.dsh-ig-gif-edit-toggle{corner-shape:round;appearance:none;flex:none;height:44px;padding:0 18px;border-radius:999px;border:1.5px solid rgba(255,255,255,0.45);background:transparent;color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.dsh-ig-gif-edit-toggle.is-active{background:#3b6cf0;border-color:#3b6cf0}
.dsh-ig-gif-edit-toggle:disabled{opacity:.5;cursor:default}
/* The edit bar takes the player bar's width rather than widening it, and wraps its text. */
.dsh-ig-gif-edit{contain:inline-size;box-sizing:border-box;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,0.08);color:#fff;display:grid;gap:8px;line-height:normal}
.dsh-ig-gif-edit-hint{margin:0;font-size:12px;line-height:1.45;color:rgba(255,255,255,0.6)}
.dsh-ig-gif-edit-row{display:flex;align-items:center;gap:8px}
.dsh-ig-gif-edit-counter{flex:1;min-width:0;font-size:13px;color:rgba(255,255,255,0.85);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-ig-gif-view{corner-shape:round;display:flex;flex:none;padding:3px;border-radius:999px;background:rgba(255,255,255,0.08)}
.dsh-ig-gif-view button{corner-shape:round;appearance:none;height:32px;padding:0 12px;border:0;border-radius:999px;background:transparent;font:inherit;font-size:13px;color:rgba(255,255,255,0.7);cursor:pointer}
.dsh-ig-gif-view button[aria-pressed="true"]{background:rgba(255,255,255,0.18);color:#fff;font-weight:600}
.dsh-ig-gif-edit-ghost,.dsh-ig-gif-edit-send{corner-shape:round;appearance:none;flex:none;height:36px;border-radius:999px;font:inherit;font-size:13px;cursor:pointer}
.dsh-ig-gif-edit-ghost{padding:0 12px;border:1px solid rgba(255,255,255,0.25);background:transparent;color:#fff}
.dsh-ig-gif-edit-send{padding:0 14px;border:0;background:#3b6cf0;color:#fff;font-weight:600}
.dsh-ig-gif-edit-ghost:disabled,.dsh-ig-gif-edit-send:disabled{opacity:.5;cursor:default}
.dsh-ig-gif-edit-notice,.dsh-ig-gif-edit-error{display:grid;gap:6px;justify-items:start;padding:8px 10px;border-radius:8px;font-size:12px;line-height:1.45;white-space:pre-wrap;word-break:break-word}
.dsh-ig-gif-edit-notice{margin:6px 0;background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,0.05));color:var(--dsw-alias-label-secondary,inherit)}
.dsh-ig-gif-edit-error{background:rgba(239,68,68,0.16);color:#fca5a5}
/* The cursor is the pin it places, its sharp corner on the point, as ChatGPT draws it. */
.dsh-ig-gif-edit-layer{position:absolute;inset:0;z-index:3;margin:0;padding:0;border:0;border-radius:10px;background:transparent;cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M2 22V12A10 10 0 0 1 22 12A10 10 0 0 1 12 22Z' fill='%233b6cf0' stroke='white' stroke-width='1.5'/%3E%3C/svg%3E") 2 22,crosshair}
/* While a note is being written, a click on the picture only closes it, so the cursor is the plain one. */
.dsh-ig-gif-wrap:has(.dsh-ig-gif-note.is-new,.dsh-ig-gif-note.is-edit) :is(.dsh-ig-gif-edit-layer,.dsh-ig-gif-sheet-cell){cursor:default}
.dsh-ig-gif-edit-layer:focus-visible{outline:2px solid #fff;outline-offset:-2px}
.dsh-ig-gif-sheet-cell{position:absolute;z-index:3;box-sizing:border-box;margin:0;padding:0;border:0;background:transparent;outline:1px solid #0d0f13;outline-offset:-1px;cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M2 22V12A10 10 0 0 1 22 12A10 10 0 0 1 12 22Z' fill='%233b6cf0' stroke='white' stroke-width='1.5'/%3E%3C/svg%3E") 2 22,crosshair}
.dsh-ig-gif-sheet-cell.is-current{outline:2px solid #3b6cf0;outline-offset:-2px}
.dsh-ig-gif-sheet-cell.is-blank{cursor:default;background:#1b1e24}
.dsh-ig-gif-sheet-cell:focus-visible{outline:2px solid #fff;outline-offset:-2px}
.dsh-ig-gif-sheet-cell span{position:absolute;left:4px;top:4px;padding:1px 5px;border-radius:4px;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;font-weight:600;line-height:1.4;pointer-events:none}
.dsh-ig-gif-pin{corner-shape:round;position:absolute;z-index:4;min-width:28px;height:28px;margin:-28px 0 0;box-sizing:border-box;padding:0 7px;border:2px solid #fff;border-radius:14px 14px 14px 0;background:#3b6cf0;color:#fff;font:inherit;font-size:13px;font-weight:700;line-height:24px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer}
.dsh-ig-gif-pin.is-small{min-width:20px;height:20px;margin-top:-20px;padding:0 4px;border-width:1.5px;border-radius:10px 10px 10px 0;font-size:11px;line-height:17px}
.dsh-ig-gif-pin.is-active{box-shadow:0 0 0 3px rgba(59,108,240,0.55),0 2px 6px rgba(0,0,0,0.4)}
.dsh-ig-gif-pin.is-draft{pointer-events:none}
.dsh-ig-gif-note{corner-shape:round;position:absolute;z-index:5;width:292px;max-width:calc(100vw - 32px);box-sizing:border-box;background:#2f2f2f;color:#fff;box-shadow:0 12px 32px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.1);transform:translate(30px,-36px);line-height:normal;cursor:default}
.dsh-ig-gif-note:focus{outline:none}
.dsh-ig-gif-note.is-left{transform:translate(calc(-100% - 8px),-36px)}
.dsh-ig-gif-note.is-up{transform:translate(30px,calc(-100% + 8px))}
.dsh-ig-gif-note.is-left.is-up{transform:translate(calc(-100% - 8px),calc(-100% + 8px))}
.dsh-ig-gif-note.is-new{height:44px;display:flex;align-items:center;gap:8px;padding:0 4px 0 18px;border-radius:999px}
.dsh-ig-gif-note.is-edit{padding:4px 6px 6px 16px;border-radius:22px}
.dsh-ig-gif-note.is-view{min-height:44px;display:flex;align-items:center;padding:10px 18px;border-radius:22px}
.dsh-ig-gif-note.is-view p{margin:0;flex:1;font-size:15px;line-height:1.5;word-break:break-word}
.dsh-ig-gif-note-field{height:40px;display:flex;align-items:center}
.dsh-ig-gif-note-input{flex:1;min-width:0;width:100%;height:36px;margin:0;padding:0;border:0;outline:0;background:transparent;color:#fff;font:inherit;font-size:15px}
.dsh-ig-gif-note-input::placeholder{color:rgba(255,255,255,0.5)}
.dsh-ig-gif-note-actions{display:flex;align-items:center;gap:6px}
.dsh-ig-gif-note-actions span{flex:1}
.dsh-ig-gif-note-icon,.dsh-ig-gif-note-post{corner-shape:round;appearance:none;flex:none;width:36px;height:36px;margin:0;padding:0;border:0;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}
.dsh-ig-gif-note-icon{margin-left:-8px;background:transparent;color:#fff}
.dsh-ig-gif-note-icon:hover{background:rgba(255,255,255,0.1)}
.dsh-ig-gif-note-post{background:#fff;color:#1f2329}
.dsh-ig-gif-note-post:disabled{background:#8a8a8a;color:#2f2f2f;cursor:default}
.dsh-ig-gif-note-ghost,.dsh-ig-gif-note-save{corner-shape:round;appearance:none;flex:none;height:36px;border-radius:999px;font:inherit;font-size:14px;cursor:pointer}
.dsh-ig-gif-note-ghost{padding:0 14px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);color:#fff}
.dsh-ig-gif-note-save{padding:0 16px;border:0;background:#fff;color:#1f2329;font-weight:600}
.dsh-ig-gif-note-save:disabled{opacity:.45;cursor:default}
.dsh-ig-gallery-gif-badge{position:absolute;left:10px;top:10px;padding:2px 7px;border-radius:6px;background:rgba(17,20,26,0.66);color:#fff;font-size:11px;font-weight:700;line-height:16px;letter-spacing:.3px;pointer-events:none;z-index:2;transition:opacity .15s ease}
.dsh-ig-gallery-card:hover .dsh-ig-gallery-gif-badge,.dsh-ig-gallery-card.is-manage-mode .dsh-ig-gallery-gif-badge,.dsh-ig-gallery-card.is-selected .dsh-ig-gallery-gif-badge{opacity:0}
.dsh-ig-gallery-gif-hover{position:absolute;inset:0;pointer-events:none}
.dsh-ig-lightbox-img.dsh-ig-gallery-gif-img{max-height:calc(100vh - 400px)}
.dsh-ig-dl-gallery .dsh-ig-dl-menu{top:auto;bottom:calc(100% + 8px);box-shadow:0 10px 30px rgba(0,0,0,0.4)}
.dsh-ig-dl-gallery svg{width:14px;height:14px}
`;
		//#endregion
		//#region lib/types/client/tl/conversation-landings.js
		/** Keep one landing subscription while the optional UI service loads or unloads. */
		function createCanvasSessionSelection() {
			let current;
			const listeners = /* @__PURE__ */ new Set();
			const notify = () => {
				for (const listener of listeners) listener();
			};
			return {
				getSnapshot: () => current?.getSnapshot(),
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				bind(source) {
					current = source;
					const stop = source.subscribe(notify);
					notify();
					return () => {
						stop();
						if (current !== source) return;
						current = void 0;
						notify();
					};
				}
			};
		}
		function currentSessionId(sessions, selection) {
			const selected = selection?.getSnapshot();
			if (selected !== void 0) return selected.key || void 0;
			const snapshot = sessions.list.getSnapshot();
			if (snapshot.current) return snapshot.current;
			const mainViews = Object.values(snapshot.byId ?? {}).filter((row) => (row.retainedBy?.mainView ?? 0) > 0);
			return mainViews.length === 1 ? mainViews[0].id : void 0;
		}
		/** Subscribe to live additions, never to card rendering or history replay. */
		function startConversationLandings(sessions, selection) {
			let source;
			let stopEvents;
			const followCurrent = () => {
				const id = currentSessionId(sessions, selection);
				const next = id === void 0 ? void 0 : sessions.binding(id)?.eventSource;
				if (next === source) return;
				stopEvents?.();
				source = next;
				if (next === void 0) return;
				let lastSeq = next.getSnapshot().entries.reduce((seq, entry) => Math.max(seq, entry.event.seq), -1);
				stopEvents = next.subscribe(() => {
					const change = next.getSnapshot().change;
					for (const entry of change.entries ?? []) {
						if (entry.type !== "event") continue;
						const { event } = entry;
						const isNew = event.seq > lastSeq;
						lastSeq = Math.max(lastSeq, event.seq);
						if (change.kind !== "append" || !isNew) continue;
						const results = event.type === "tool/result" ? imageResultsFromMeta(event.data.meta) : imageResultsFromPtcDispatch(event);
						if (results.length === 0) continue;
						pushTlLandingsLive(results.map((result) => ({
							galleryId: String(result.attachment.attachmentId),
							attachment: result.attachment,
							fromConversation: true,
							prompt: result.prompt,
							provider: result.provider,
							model: result.model
						})));
					}
				});
			};
			const stopList = sessions.list.subscribe(followCurrent);
			const stopSelection = selection?.subscribe(followCurrent);
			followCurrent();
			return () => {
				stopList();
				stopSelection?.();
				stopEvents?.();
			};
		}
		//#endregion
		//#region lib/types/client/studio-style.js
		const STUDIO_STYLE = `
.dsh-ig-recent-select{display:block;width:100%;height:100%;padding:0;border:0;border-radius:inherit;background:transparent;cursor:pointer}
.dsh-ig-recent-send{position:absolute;right:3px;bottom:3px;display:flex;align-items:center;justify-content:center;width:25px;height:25px;padding:0;border:1px solid var(--ig-line);border-radius:5px;background:var(--ig-bg-panel);cursor:pointer}
.dsh-ig-recent-send:disabled{opacity:.45;cursor:not-allowed}
.dsh-ig-gallery-page-body.is-workbench{flex:1 1 0;height:100%;min-height:0;padding:0;overflow:hidden;display:flex;flex-direction:column}
.dsh-ig-workbench{--ig-blue:var(--dsw-alias-brand-primary-new-colorprimary-new-color,#2f64f5);--ig-blue-line:color-mix(in srgb,var(--ig-blue) 45%,transparent);--ig-line:var(--dsw-alias-border-l2,color-mix(in srgb,currentColor 11%,transparent));--ig-soft:color-mix(in srgb,currentColor 4%,transparent);--ig-fg:var(--dsw-alias-label-primary,var(--foreground,#182033));--ig-fg-2:var(--dsw-alias-label-secondary,#5a6478);--ig-fg-3:var(--dsw-alias-label-tertiary,#717b90);--ig-fg-cap:var(--dsw-alias-label-caption,#929bad);--ig-bg:var(--dsw-alias-bg-layer-1,var(--background,#fff));--ig-bg-panel:var(--dsw-alias-bg-layer-2,color-mix(in srgb,var(--background,#fff) 96%,#f5f7fb));--ig-bg-thumb:var(--dsw-alias-bg-skeleton,#eef1f7);--ig-danger:#b63737;--ig-warn:#8b671c;position:relative;display:flex;flex-direction:column;min-height:0;height:100%;overflow:hidden;padding:10px 12px 12px;color:var(--ig-fg);box-sizing:border-box;background:radial-gradient(circle at 60% -20%,rgba(63,104,246,.07),transparent 30%)}
body[data-ds-dark-theme] .dsh-ig-workbench{--ig-danger:#f08c8c;--ig-warn:#e5b76a}
.dsh-ig-workbench *{box-sizing:border-box}.dsh-ig-workbench button,.dsh-ig-workbench select,.dsh-ig-workbench textarea{font:inherit;color:inherit}
.dsh-ig-workbench-grid{display:grid;grid-template-columns:minmax(190px,238px) minmax(0,1fr) minmax(286px,340px);grid-template-rows:minmax(0,1fr);min-height:0;height:0;flex:1 1 0;border:1px solid var(--ig-line);border-radius:12px;overflow:hidden;background:var(--ig-bg);box-shadow:0 12px 32px rgba(30,42,76,.05);transition:grid-template-columns .2s ease}
.dsh-ig-workbench-grid.is-sidebar-collapsed{grid-template-columns:minmax(0,1fr) minmax(286px,340px)}
.dsh-ig-workbench-grid.is-generate-collapsed{grid-template-columns:minmax(190px,238px) minmax(0,1fr)}
.dsh-ig-workbench-grid.is-sidebar-collapsed.is-generate-collapsed{grid-template-columns:minmax(0,1fr)}
.dsh-ig-recent-panel,.dsh-ig-generate-panel{min-width:0;min-height:0;overflow:hidden;background:var(--ig-bg-panel)}.dsh-ig-recent-panel{display:flex;flex-direction:column;border-right:1px solid var(--ig-line)}
.dsh-ig-panel-title{height:48px;flex:0 0 48px;padding:0 12px 0 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--ig-line);font-size:13px;font-weight:650}
.dsh-ig-count-badge{font-size:11px;min-width:22px;text-align:center;padding:2px 6px;border-radius:999px;background:var(--ig-soft);color:var(--ig-fg-3);font-weight:500}
.dsh-ig-collapse-btn{width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--ig-fg-3);cursor:pointer;transition:all .15s}
.dsh-ig-collapse-btn:hover{border-color:var(--ig-line);background:var(--ig-soft);color:var(--ig-fg)}
.dsh-ig-recent-scroll{flex:1 1 0;height:0;padding:8px;overflow-x:hidden;overflow-y:auto;min-height:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px;align-content:start}.dsh-ig-recent-empty{min-height:180px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px;color:var(--ig-fg-cap);text-align:center;font-size:12px;grid-column:1/-1}
.dsh-ig-fav-folder-add{margin-left:auto;padding:0 5px;border:0;background:transparent;color:var(--ig-fg-3);font-size:12px;line-height:16px;cursor:pointer;border-radius:4px}.dsh-ig-fav-folder-add:hover{color:var(--ig-blue);background:var(--ig-bg-thumb)}
.dsh-ig-fav-folders{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 6px}
.dsh-ig-fav-folder-chip{display:inline-flex;align-items:center;gap:2px;padding:2px 6px;border:1px solid var(--ig-line);border-radius:999px;background:transparent;color:var(--ig-fg-3);font-size:10.5px}
.dsh-ig-fav-folder-chip.is-active{border-color:var(--ig-blue-line);color:var(--ig-blue);background:color-mix(in srgb,var(--ig-blue) 10%,transparent)}
.dsh-ig-fav-folder-chip>button:first-child{border:0;background:transparent;color:inherit;font-size:inherit;padding:0;cursor:pointer}
.dsh-ig-fav-folder-del{border:0;background:transparent;color:var(--ig-fg-3);cursor:pointer;display:inline-flex;padding:0}.dsh-ig-fav-folder-del:hover{color:var(--ig-danger)}
.dsh-ig-fav-folder-draft{display:flex;gap:4px;margin:2px 0 6px}
.dsh-ig-fav-folder-draft input{flex:1;min-width:0;padding:3px 6px;border:1px solid var(--ig-line);border-radius:5px;background:var(--ig-bg);color:var(--ig-fg);font-size:11px}
.dsh-ig-fav-folder-draft button{padding:3px 8px;border:1px solid var(--ig-line);border-radius:5px;background:transparent;color:var(--ig-fg-2);font-size:11px;cursor:pointer}
.dsh-ig-fav-folder-draft button:first-of-type{border-color:var(--ig-blue-line);color:var(--ig-blue)}
.dsh-ig-fav-dialog-wrap{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(15,20,34,.45)}
.dsh-ig-fav-dialog{width:min(420px,92vw);max-height:70vh;overflow:auto;padding:14px;border-radius:10px;background:var(--ig-bg-panel);border:1px solid var(--ig-line);box-shadow:0 12px 32px rgba(10,14,26,.25);display:flex;flex-direction:column;gap:10px}
.dsh-ig-fav-dialog-title{font-size:12.5px;font-weight:600;color:var(--ig-fg)}
.dsh-ig-fav-dialog-textarea{width:100%;resize:vertical;padding:8px;border:1px solid var(--ig-line);border-radius:6px;background:var(--ig-bg);color:var(--ig-fg);font-size:12px;line-height:1.5}
.dsh-ig-fav-dialog-folder-label{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--ig-fg-2)}
.dsh-ig-fav-dialog-folder-label select{flex:1;padding:4px 6px;border:1px solid var(--ig-line);border-radius:5px;background:var(--ig-bg);color:var(--ig-fg);font-size:11.5px}
.dsh-ig-fav-dialog-actions{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
.dsh-ig-fav-dialog-actions button{padding:5px 12px;border:1px solid var(--ig-line);border-radius:6px;background:transparent;color:var(--ig-fg-2);font-size:12px;cursor:pointer}
.dsh-ig-fav-dialog-actions button.is-primary{border-color:var(--ig-blue);background:var(--ig-blue);color:#fff}
.dsh-ig-fav-dialog-folders{display:flex;flex-direction:column;gap:4px}
.dsh-ig-fav-dialog-folders button{text-align:left;padding:6px 10px;border:1px solid var(--ig-line);border-radius:6px;background:transparent;color:var(--ig-fg-2);font-size:12px;cursor:pointer}
.dsh-ig-fav-dialog-folders button:hover,.dsh-ig-fav-dialog-folders button.is-current{border-color:var(--ig-blue-line);color:var(--ig-blue);background:color-mix(in srgb,var(--ig-blue) 8%,transparent)}
.dsh-ig-fav-del{position:absolute;top:-5px;right:-5px;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid var(--ig-line);border-radius:50%;background:var(--ig-bg);color:var(--ig-fg-3);cursor:pointer;z-index:2;opacity:0;pointer-events:none;transition:opacity .12s,color .15s,border-color .15s}.dsh-ig-fav-del:hover{color:#d5495c;border-color:#e6a3ad}.dsh-ig-fav-prompt:hover .dsh-ig-fav-del,.dsh-ig-fav-del:focus-visible{opacity:1;pointer-events:auto}.dsh-ig-fav-del:focus-visible{outline:2px solid var(--ig-blue);outline-offset:1px}
.dsh-ig-fav-prompt{position:relative;display:flex;align-items:flex-start;gap:2px}
.dsh-ig-fav-prompt-text{flex:1;min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-align:left;padding:5px 8px;border:1px solid var(--ig-line);border-radius:6px;background:transparent;font-size:11px;line-height:1.45;color:var(--ig-fg);cursor:pointer;transition:all .15s}.dsh-ig-fav-prompt-text:hover{border-color:var(--ig-blue-line);background:var(--ig-soft)}
.dsh-ig-fav-save-btn{display:inline-flex;align-items:center;justify-content:center;padding:2px 4px;border:0;background:transparent;color:var(--ig-fg-cap);cursor:pointer;transition:color .15s}.dsh-ig-fav-save-btn:hover{color:#e8a33d}
.dsh-ig-rail-tabs{flex:none;display:flex;gap:4px;padding:4px 8px 6px;border-bottom:1px solid var(--ig-line)}
.dsh-ig-rail-tab{flex:1;height:26px;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;border-radius:6px;background:transparent;font-size:12px;color:var(--ig-fg-3);cursor:pointer;transition:all .15s}.dsh-ig-rail-tab:hover{background:var(--ig-soft);color:var(--ig-fg)}.dsh-ig-rail-tab.is-active{border-color:var(--ig-blue-line);background:var(--ig-soft);color:var(--ig-blue);font-weight:600}
.dsh-ig-fav-scroll{flex:1 1 0;height:0;overflow-x:hidden;overflow-y:auto;min-height:0;padding:8px}
.dsh-ig-fav-section-label{padding:4px 2px 6px;font-size:11px;font-weight:600;color:var(--ig-fg-3)}
.dsh-ig-fav-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}
.dsh-ig-fav-empty{min-height:64px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;color:var(--ig-fg-cap);text-align:center;font-size:11px;border:1px dashed var(--ig-line);border-radius:8px;margin-bottom:8px;padding:8px}
.dsh-ig-fav-prompts{display:flex;flex-direction:column;gap:4px}
.dsh-ig-recent-item{position:relative;width:100%;aspect-ratio:1;align-self:start;content-visibility:auto;contain-intrinsic-size:auto 140px;padding:0;border:1px solid transparent;border-radius:8px;background:transparent;cursor:pointer;transition:border-color .16s,box-shadow .16s}.dsh-ig-recent-item:hover{border-color:var(--ig-blue-line);box-shadow:0 1px 4px rgba(30,42,76,.14)}.dsh-ig-recent-item.is-active{border-color:var(--ig-blue);box-shadow:0 0 0 2px rgba(47,100,245,.18)}.dsh-ig-recent-thumb{width:100%;height:100%;border-radius:7px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--ig-bg-thumb);color:var(--ig-fg-cap)}.dsh-ig-recent-thumb img{width:100%;height:100%;object-fit:cover}
.dsh-ig-load-more{grid-column:1/-1;width:100%;height:32px;margin:4px 0 2px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--ig-line);border-radius:7px;background:transparent;font-size:11px;color:var(--ig-fg-2);cursor:pointer;transition:background .15s,color .15s}.dsh-ig-load-more:hover{background:var(--ig-soft);color:var(--ig-blue);border-color:var(--ig-blue-line)}
.dsh-ig-mini-btn{height:22px;padding:0 7px;display:inline-flex;align-items:center;gap:3px;border:1px solid var(--ig-line);border-radius:5px;background:var(--ig-bg);font-size:10.5px;font-weight:500;color:var(--ig-fg);cursor:pointer;transition:all .15s}.dsh-ig-mini-btn:hover{border-color:var(--ig-blue-line);color:var(--ig-blue);background:rgba(47,100,245,.06)}
.dsh-ig-canvas-column{min-width:0;min-height:0;height:100%;overflow:hidden;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-2,var(--ig-bg))}
.dsh-ig-canvas-toolbar{height:46px;flex:0 0 46px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:0 14px;border-bottom:1px solid var(--ig-line)}
.dsh-ig-canvas-toolbar-left,.dsh-ig-canvas-toolbar-right{display:flex;align-items:center;gap:6px;min-width:0}
.dsh-ig-canvas-toolbar-left{justify-self:start}
.dsh-ig-canvas-toolbar-right{justify-self:end}
.dsh-ig-canvas-toolbar-center{display:flex;align-items:center;justify-self:center;gap:6px;min-width:0}
.dsh-ig-toolbar-divider{width:1px;height:16px;background:var(--ig-line);flex-shrink:0;margin:0 2px}
.dsh-ig-canvas-toolbar button{height:30px;min-width:30px;padding:0 9px;display:inline-flex;align-items:center;justify-content:center;gap:5px;border:1px solid var(--ig-line);border-radius:7px;background:var(--ig-bg);color:var(--ig-fg);font-size:11.5px;font-weight:500;cursor:pointer;transition:border-color .15s,background .15s,color .15s}
.dsh-ig-canvas-toolbar button:hover{border-color:var(--ig-blue-line);background:rgba(47,100,245,.05);color:var(--ig-blue)}
.dsh-ig-canvas-toolbar button.is-active{border-color:var(--ig-blue-line);background:rgba(47,100,245,.08);color:var(--ig-blue);font-weight:550}
.dsh-ig-canvas-toolbar-center button.is-active{border-color:var(--ig-blue);background:rgba(47,100,245,.09);color:var(--ig-blue);font-weight:600;box-shadow:inset 0 0 0 1px rgba(47,100,245,.28)}
.dsh-ig-zoom-display{font-size:11px;min-width:38px;text-align:center;color:var(--ig-fg-2);user-select:none;font-variant-numeric:tabular-nums}
.dsh-ig-canvas-hint{flex:0 0 auto;display:flex;align-items:flex-start;gap:8px;padding:7px 12px;border-bottom:1px solid rgba(47,100,245,.14);background:rgba(47,100,245,.055);color:var(--ig-fg-2);font-size:11.5px;line-height:17px}.dsh-ig-canvas-hint>svg:first-child{flex-shrink:0;color:var(--ig-blue);margin-top:1px}.dsh-ig-canvas-hint>span{flex:1 1 0;min-width:0}.dsh-ig-canvas-hint>button{flex-shrink:0;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:5px;background:transparent;color:var(--ig-fg-cap);cursor:pointer;transition:background .15s,color .15s}.dsh-ig-canvas-hint>button:hover{background:rgba(47,100,245,.1);color:var(--ig-blue)}
.dsh-ig-status-badge-wrap{position:relative;display:inline-flex;align-items:center}
.dsh-ig-status-badge{height:30px;display:inline-flex;align-items:center;gap:7px;padding:0 10px;border:1px solid var(--ig-line);border-radius:7px;background:var(--ig-bg);cursor:pointer;user-select:none;transition:border-color .15s,background .15s,box-shadow .15s}
.dsh-ig-status-badge:hover{border-color:var(--ig-blue-line);background:rgba(47,100,245,.04)}
.dsh-ig-status-dot{width:7px;height:7px;min-width:7px;max-width:7px;border-radius:50%;flex-shrink:0;box-sizing:border-box}
.dsh-ig-status-dot.is-ready{background:#10b981;box-shadow:0 0 0 2px rgba(16,185,129,.2)}
.dsh-ig-status-dot.is-muted{background:#ef4444;box-shadow:0 0 0 2px rgba(239,68,68,.2)}
.dsh-ig-status-text{font-size:11.5px;font-weight:500;color:var(--ig-fg);line-height:1}
.dsh-ig-status-arrow{color:var(--ig-fg-cap);transition:transform .15s,color .15s}
.dsh-ig-status-badge-wrap:hover .dsh-ig-status-arrow{transform:rotate(180deg);color:var(--ig-blue)}
.dsh-ig-status-popover{position:absolute;left:0;top:calc(100% + 6px);width:260px;background:var(--ig-bg);border:1px solid var(--ig-line);border-radius:9px;box-shadow:0 12px 36px rgba(20,28,45,.14);padding:10px 12px;z-index:40;opacity:0;pointer-events:none;transform:translateY(4px);transition:opacity .15s cubic-bezier(.16,1,.3,1),transform .15s cubic-bezier(.16,1,.3,1)}
.dsh-ig-status-badge-wrap:hover .dsh-ig-status-popover{opacity:1;pointer-events:auto;transform:translateY(0)}
.dsh-ig-status-popover-title{display:flex;align-items:center;justify-content:space-between;font-size:10px;font-weight:650;color:var(--ig-fg-cap);margin-bottom:8px;letter-spacing:.02em;text-transform:uppercase}
.dsh-ig-status-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
.dsh-ig-status-list li{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;border-radius:6px;transition:background .12s}
.dsh-ig-status-list li.is-configured{background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.12)}
.dsh-ig-status-list li.is-missing{background:rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.12);opacity:.75}
.dsh-ig-status-item-name{display:flex;flex-direction:column;min-width:0}
.dsh-ig-status-item-name strong{font-size:11.5px;font-weight:600;color:var(--ig-fg);line-height:16px}
.dsh-ig-status-item-name small{font-size:9.5px;color:var(--ig-fg-cap);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:145px;line-height:14px}
.dsh-ig-status-item-tag{font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;flex-shrink:0}
.is-configured .dsh-ig-status-item-tag{color:#059669;background:rgba(16,185,129,.14)}
.is-missing .dsh-ig-status-item-tag{color:#dc2626;background:rgba(239,68,68,.14)}
.dsh-ig-canvas{position:relative;flex:1 1 0;height:0;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:24px;touch-action:none;user-select:none;cursor:grab;background-image:linear-gradient(45deg,rgba(114,128,156,.035) 25%,transparent 25%),linear-gradient(-45deg,rgba(114,128,156,.035) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(114,128,156,.035) 75%),linear-gradient(-45deg,transparent 75%,rgba(114,128,156,.035) 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}
.dsh-ig-canvas.is-dragging,.dsh-ig-canvas.is-dragging *{cursor:grabbing!important}
.dsh-ig-canvas img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;border-radius:10px;box-shadow:0 14px 45px rgba(25,35,63,.18);user-select:none;-webkit-user-drag:none;pointer-events:auto}
.dsh-ig-canvas-empty,.dsh-ig-generating-state{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;color:var(--ig-fg-cap);font-size:12px;padding:26px;cursor:default}
.dsh-ig-canvas-thumb{object-fit:contain;pointer-events:none;opacity:.92}
.dsh-ig-canvas-loading-pill{position:absolute;right:16px;bottom:16px;display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(20,24,32,.72);color:#fff;font-size:11px;pointer-events:none}
.dsh-ig-generating-state strong{font-size:15px;color:var(--ig-fg)}.dsh-ig-generating-state span{font-size:11px}.dsh-ig-generation-orbit{width:66px;height:66px;border-radius:50%;display:grid;place-items:center;color:var(--ig-blue);background:rgba(47,100,245,.09);box-shadow:0 0 0 10px rgba(47,100,245,.035);animation:dshIgPulse 1.8s ease-in-out infinite}
.dsh-ig-result-strip{flex:0 0 auto;min-height:52px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--ig-line)}.dsh-ig-result-strip>span{font-size:12px;font-weight:650}.dsh-ig-result-strip>div,.dsh-ig-result-actions>div{display:flex;gap:7px}.dsh-ig-result-strip button,.dsh-ig-result-actions button{height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 10px;border:1px solid var(--ig-line);border-radius:7px;background:var(--ig-bg);font-size:11px;cursor:pointer}.dsh-ig-result-strip button:hover,.dsh-ig-result-actions button:hover{border-color:var(--ig-blue-line);color:var(--ig-blue)}.dsh-ig-result-actions{flex:0 0 auto;min-height:54px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--ig-line)}.dsh-ig-result-actions p{margin:0;min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:11.5px;line-height:18px;color:var(--ig-fg-2)}.dsh-ig-result-meta{flex:0 0 auto;min-height:32px;padding:6px 14px;display:flex;gap:13px;align-items:center;flex-wrap:wrap;border-top:1px solid var(--ig-line);font-size:10px;color:var(--ig-fg-cap)}.dsh-ig-result-meta span+span:before{content:'·';margin-right:13px}
.dsh-ig-generate-panel{height:100%;display:flex;flex-direction:column;border-left:1px solid var(--ig-line);overflow:hidden}.dsh-ig-generator-form{flex:1 1 0;height:0;padding:15px;display:flex;flex-direction:column;gap:15px;overflow-x:hidden;overflow-y:auto;min-height:0}.dsh-ig-mode-switch{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dsh-ig-mode-switch button{height:39px;border:1px solid var(--ig-line);border-radius:8px;background:var(--ig-bg);display:flex;align-items:center;justify-content:center;gap:7px;font-size:12px;cursor:pointer}.dsh-ig-mode-switch button.is-active{border-color:var(--ig-blue-line);color:var(--ig-blue);background:rgba(47,100,245,.065);box-shadow:inset 0 0 0 1px rgba(47,100,245,.1)}
.dsh-ig-field{position:relative;display:flex;flex-direction:column;gap:7px}.dsh-ig-field>label,.dsh-ig-field-label label{font-size:11.5px;font-weight:630}.dsh-ig-field>label span{font-weight:400;color:var(--ig-fg-cap)}.dsh-ig-field-label{display:flex;align-items:center;justify-content:space-between}.dsh-ig-field-label b{color:#e14d4d}.dsh-ig-field-label button{border:0;background:transparent;color:var(--ig-fg-3);font-size:10.5px;cursor:pointer}.dsh-ig-field textarea{width:100%;height:112px;padding:11px 12px 22px;resize:vertical;border:1px solid var(--ig-line);border-radius:9px;background:var(--ig-bg);font-size:12px;line-height:19px;outline:none}.dsh-ig-field textarea:focus{border-color:var(--ig-blue);box-shadow:0 0 0 3px rgba(47,100,245,.09)}.dsh-ig-field>small{position:absolute;right:9px;bottom:7px;color:var(--ig-fg-cap);font-size:9.5px}.dsh-ig-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.dsh-ig-field-select{display:flex;flex-direction:column;gap:6px;min-width:0}.dsh-ig-field-select>span{font-size:11px;font-weight:620}.dsh-ig-field-select select{width:100%;height:36px;padding:0 26px 0 9px;border:1px solid var(--ig-line);border-radius:8px;background:var(--ig-bg);font-size:11px;outline:none;text-overflow:ellipsis}.dsh-ig-field-select select:focus{border-color:var(--ig-blue)}.dsh-ig-count-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.dsh-ig-count-pill{height:34px;border:1px solid var(--ig-line);border-radius:7px;background:var(--ig-bg);font-size:12px;font-weight:600;color:var(--ig-fg-2);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}.dsh-ig-count-pill:hover{border-color:var(--ig-blue-line);color:var(--ig-blue)}.dsh-ig-count-pill.is-active{border-color:var(--ig-blue);background:rgba(47,100,245,.08);color:var(--ig-blue);box-shadow:inset 0 0 0 1px var(--ig-blue)}
.dsh-ig-generation-kind{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:3px;border:1px solid var(--ig-line);border-radius:9px;background:var(--ig-soft)}.dsh-ig-generation-kind button{height:31px;border:0;border-radius:6px;background:transparent;color:var(--ig-fg-3);font-size:11.5px;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;transition:background .15s,color .15s,box-shadow .15s}.dsh-ig-generation-kind button.is-active{background:var(--ig-bg);color:var(--ig-blue);font-weight:650;box-shadow:0 2px 8px rgba(30,42,76,.09)}
.dsh-ig-compare-box{padding:10px;border:1px solid rgba(47,100,245,.2);border-radius:10px;background:linear-gradient(145deg,rgba(47,100,245,.055),rgba(99,102,241,.018));display:flex;flex-direction:column;gap:9px}.dsh-ig-compare-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.dsh-ig-compare-heading>div{min-width:0;display:flex;flex-direction:column;gap:2px}.dsh-ig-compare-heading strong{font-size:11.5px}.dsh-ig-compare-heading small{font-size:9.5px;color:var(--ig-fg-cap)}.dsh-ig-compare-heading>span{flex:none;padding:2px 6px;border-radius:999px;background:rgba(47,100,245,.11);color:var(--ig-blue);font-size:9.5px;font-weight:650}.dsh-ig-model-checks{display:flex;flex-direction:column;gap:6px}.dsh-ig-model-checks>button{min-height:43px;width:100%;padding:6px 7px;display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center;gap:7px;border:1px solid var(--ig-line);border-radius:8px;background:var(--ig-bg);text-align:left;cursor:pointer;transition:border-color .15s,background .15s,transform .15s}.dsh-ig-model-checks>button:hover{border-color:var(--ig-blue-line);transform:translateY(-1px)}.dsh-ig-model-checks>button.is-selected{border-color:var(--ig-blue-line);background:rgba(47,100,245,.055);box-shadow:inset 3px 0 0 var(--ig-blue)}.dsh-ig-model-checkmark{width:17px;height:17px;border:1px solid var(--ig-line);border-radius:5px;display:grid;place-items:center;color:#fff;background:var(--ig-bg)}.dsh-ig-model-checks>button.is-selected .dsh-ig-model-checkmark{border-color:var(--ig-blue);background:var(--ig-blue)}.dsh-ig-model-copy{display:flex;flex-direction:column;min-width:0}.dsh-ig-model-copy strong{font-size:11px;line-height:15px}.dsh-ig-model-copy small{max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ig-fg-cap);font-size:9.5px;line-height:14px}.dsh-ig-model-settings{display:flex;flex-direction:column;align-items:flex-end;gap:2px;color:var(--ig-fg-2);font-size:9.5px;white-space:nowrap}.dsh-ig-model-settings em{font-style:normal;color:var(--ig-warn);font-size:8.5px}.dsh-ig-compare-box>p{margin:0;color:var(--ig-fg-3);font-size:9.5px;line-height:14px}
.dsh-ig-upload{height:92px;border:1px dashed var(--ig-line);border-radius:9px;background:color-mix(in srgb,var(--ig-bg) 55%,transparent);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:var(--ig-fg-3);cursor:pointer}.dsh-ig-upload strong{font-size:11px;font-weight:570}.dsh-ig-upload small{font-size:9.5px}.dsh-ig-upload:hover,.dsh-ig-upload.is-dragging{border-color:var(--ig-blue);background:rgba(47,100,245,.05);color:var(--ig-blue)}
.dsh-ig-reference-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px}
.dsh-ig-reference-card{position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;background:var(--ig-bg-thumb);border:1px solid var(--ig-line)}
.dsh-ig-reference-card img{width:100%;height:100%;object-fit:cover}
.dsh-ig-reference-card button{position:absolute;right:4px;top:4px;width:18px;height:18px;border:0;border-radius:50%;display:grid;place-items:center;background:rgba(20,28,45,.75);color:#fff;cursor:pointer;padding:0;transition:background .15s}
.dsh-ig-reference-card button:hover{background:#ef4444}
.dsh-ig-reference-add{aspect-ratio:1;border:1px dashed var(--ig-line);border-radius:8px;background:color-mix(in srgb,var(--ig-bg) 55%,transparent);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--ig-fg-3);cursor:pointer;font-size:10px;transition:border-color .15s,color .15s,background .15s}
.dsh-ig-reference-add:hover{border-color:var(--ig-blue);background:rgba(47,100,245,.05);color:var(--ig-blue)}
.dsh-ig-reference-preview{position:relative;height:108px;border-radius:9px;overflow:hidden;background:var(--ig-bg-thumb)}.dsh-ig-reference-preview img{width:100%;height:100%;object-fit:contain}.dsh-ig-reference-preview button{position:absolute;right:7px;top:7px;width:25px;height:25px;border:0;border-radius:50%;display:grid;place-items:center;background:rgba(20,28,45,.72);color:#fff;cursor:pointer}
.dsh-ig-inline-note,.dsh-ig-form-error{padding:9px 10px;border-radius:7px;font-size:10.5px;line-height:16px}.dsh-ig-inline-note{background:rgba(245,158,11,.1);color:var(--ig-warn);border:1px solid rgba(245,158,11,.35)}.dsh-ig-form-error{background:rgba(239,68,68,.08);color:var(--ig-danger);border:1px solid rgba(239,68,68,.3)}.dsh-ig-form-loading{height:70px;display:grid;place-items:center;color:var(--ig-blue)}
.dsh-ig-config-error{padding:14px;display:flex;flex-direction:column;align-items:center;gap:10px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.3);border-radius:8px;color:var(--ig-danger);font-size:11.5px;text-align:center}.dsh-ig-config-error p{margin:0;line-height:17px}.dsh-ig-config-error button{height:30px;display:inline-flex;align-items:center;gap:6px;padding:0 12px;border:1px solid rgba(239,68,68,.35);border-radius:6px;background:var(--ig-bg);color:var(--ig-danger);font-size:11.5px;font-weight:600;cursor:pointer}.dsh-ig-config-error button:hover{background:rgba(239,68,68,.12)}
.dsh-ig-generate-button{height:42px;flex:0 0 auto;border:0;border-radius:8px;background:linear-gradient(135deg,#386cf6,#2758e7);color:#fff!important;display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:650;cursor:pointer;box-shadow:0 8px 18px rgba(47,100,245,.22);transition:transform .16s,box-shadow .16s}.dsh-ig-generate-button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 24px rgba(47,100,245,.28)}.dsh-ig-generate-button:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
.dsh-ig-generate-button.is-cancel{background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 8px 18px rgba(239,68,68,.25)}.dsh-ig-generate-button.is-cancel:hover{background:linear-gradient(135deg,#dc2626,#b91c1c);box-shadow:0 10px 24px rgba(239,68,68,.35)}
.dsh-ig-details{padding:16px;margin:0;overflow:auto}.dsh-ig-details>div{padding:12px 0;border-bottom:1px solid var(--ig-line)}.dsh-ig-details dt{font-size:10.5px;color:var(--ig-fg-cap);margin-bottom:5px}.dsh-ig-details dd{margin:0;font-size:11.5px;line-height:18px;word-break:break-word}.dsh-ig-details-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:220px;padding:20px;color:var(--ig-fg-cap);font-size:11px;text-align:center}
.dsh-ig-workbench-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(3px);z-index:999;display:grid;place-items:center;padding:16px}
.dsh-ig-workbench-modal-box{width:100%;max-width:380px;background:var(--ig-bg);border-radius:12px;padding:20px;box-shadow:0 20px 48px rgba(0,0,0,.22);display:flex;flex-direction:column;gap:14px}
.dsh-ig-workbench-modal-header{display:flex;align-items:center;gap:10px}
.dsh-ig-workbench-modal-header strong{font-size:14px;font-weight:650;color:#b91c1c}
.dsh-ig-workbench-modal-desc{font-size:12px;line-height:18px;color:var(--ig-fg-2);margin:0}
.dsh-ig-workbench-modal-option{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--ig-fg-2);cursor:pointer}
.dsh-ig-workbench-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}
.dsh-ig-workbench-modal-actions button{height:32px;padding:0 14px;border-radius:7px;font-size:11.5px;font-weight:600;cursor:pointer}
.dsh-ig-workbench-modal-cancel{border:1px solid var(--ig-line);background:var(--ig-bg);color:var(--ig-fg-2)}
.dsh-ig-workbench-modal-cancel:hover{background:var(--ig-soft)}
.dsh-ig-workbench-modal-danger{border:0;background:#dc2626;color:#fff}
.dsh-ig-workbench-modal-danger:hover{background:#b91c1c}
@keyframes dshIgPulse{50%{transform:scale(1.06);box-shadow:0 0 0 16px rgba(47,100,245,.025)}}
.dsh-ig-workbench-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#fff;padding:8px 18px;border-radius:10px;font-size:12.5px;font-weight:500;box-shadow:0 12px 32px rgba(0,0,0,0.3);z-index:99999;animation:dshIgFade .15s ease-out;pointer-events:none}
@keyframes dshIgFade{from{opacity:0;transform:translate(-50%,6px)}to{opacity:1;transform:translate(-50%,0)}}
@media(max-width:1120px){.dsh-ig-workbench-grid{grid-template-columns:190px minmax(360px,1fr) 300px}.dsh-ig-result-actions button,.dsh-ig-result-strip button{padding:0 7px;font-size:10px;gap:4px}.dsh-ig-result-actions>div,.dsh-ig-result-strip>div{gap:5px}}
@media(max-width:900px){.dsh-ig-gallery-page-body.is-workbench{height:auto;overflow:auto}.dsh-ig-workbench{height:auto;min-height:100%;overflow:visible;padding:12px}.dsh-ig-workbench-heading{height:auto;padding-bottom:12px;align-items:center}.dsh-ig-provider-quick>span{display:none}.dsh-ig-workbench-grid{height:auto;display:flex;flex:none;flex-direction:column;overflow:visible}.dsh-ig-recent-panel{height:auto;overflow:hidden;border-right:0;border-bottom:1px solid var(--ig-line)}.dsh-ig-recent-scroll{height:auto;display:flex;overflow-x:auto;overflow-y:hidden;padding:8px}.dsh-ig-fav-scroll{height:auto;flex:none;overflow:visible}.dsh-ig-recent-item{min-width:220px}.dsh-ig-canvas-column{height:auto;min-height:560px}.dsh-ig-generate-panel{height:auto;border-left:0;border-top:1px solid var(--ig-line);min-height:560px}.dsh-ig-generator-form{height:auto;overflow:visible}.dsh-ig-canvas{height:auto;min-height:360px}}
@media(max-width:560px){.dsh-ig-workbench-heading>div{display:block}.dsh-ig-workbench-heading h1{font-size:15px}.dsh-ig-provider-quick select{min-width:128px;max-width:150px}.dsh-ig-canvas{padding:12px;min-height:300px}.dsh-ig-result-strip,.dsh-ig-result-actions{align-items:flex-start;flex-direction:column}.dsh-ig-result-strip>div,.dsh-ig-result-actions>div{width:100%}.dsh-ig-result-strip button,.dsh-ig-result-actions button{flex:1;justify-content:center}.dsh-ig-result-actions button span{display:inline}.dsh-ig-field-grid{grid-template-columns:1fr}.dsh-ig-result-meta span+span:before{display:none}}
@media(prefers-reduced-motion:reduce){.dsh-ig-workbench *{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}
.dsh-ig-field-label>span{display:flex;align-items:center;gap:5px}.dsh-ig-field-label .dsh-ig-find-inspiration{display:inline-flex;align-items:center;gap:3px;color:var(--ig-blue);font-weight:600}.dsh-ig-field-label .dsh-ig-find-inspiration:hover{color:color-mix(in srgb,var(--ig-blue) 78%,#fff)}
.dsh-ig-workspace-filter-label{height:30px;display:inline-flex;align-items:center;gap:6px;padding:0 10px;border:1px solid var(--ig-line,rgba(0,0,0,.1));border-radius:7px;background:var(--ig-bg);font-size:11.5px;color:var(--ig-fg);cursor:pointer;user-select:none;transition:border-color .15s,background .15s}
.dsh-ig-workspace-filter-label:hover{border-color:var(--ig-blue-line);background:rgba(47,100,245,.04)}
.dsh-ig-workspace-checkbox{cursor:pointer;accent-color:#2f64f5;width:13.5px;height:13.5px;margin:0}
.dsh-ig-workspace-filter-text{font-weight:500;white-space:nowrap}
.dsh-ig-workspace-filter-badge{font-size:10px;font-weight:600;padding:1px 6px;border-radius:999px;background:color-mix(in srgb,currentColor 7%,transparent);color:var(--ig-fg-2);font-variant-numeric:tabular-nums}
.dsh-ig-canvas-cluster{display:grid;gap:16px;align-items:center;justify-content:center;user-select:none;pointer-events:auto;flex-shrink:0}
.dsh-ig-canvas-cluster[data-count="2"]{grid-template-columns:repeat(2,1fr);max-width:880px}
.dsh-ig-canvas-cluster[data-count="3"],.dsh-ig-canvas-cluster[data-count="4"]{grid-template-columns:repeat(2,1fr);max-width:760px}
.dsh-ig-canvas-item{position:relative;display:flex;align-items:center;justify-content:center;border-radius:10px;cursor:pointer;transition:transform .12s ease-out}
.dsh-ig-canvas-item img{display:block;max-width:100%;max-height:360px;width:auto;height:auto;object-fit:contain;border-radius:10px;box-shadow:0 10px 30px rgba(25,35,63,.16);user-select:none;-webkit-user-drag:none;pointer-events:auto;transition:box-shadow .15s,outline .15s}
.dsh-ig-canvas-item:hover img{box-shadow:0 14px 40px rgba(47,100,245,.2)}
.dsh-ig-canvas-item.is-active img{box-shadow:0 14px 40px rgba(47,100,245,.28)}
.dsh-ig-canvas-item.is-checked img{outline:3px solid var(--ig-blue);outline-offset:2px;box-shadow:0 14px 40px rgba(47,100,245,.35)}
.dsh-ig-canvas-badge{position:absolute;top:10px;left:10px;background:rgba(15,23,42,.7);color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:5px;backdrop-filter:blur(4px);pointer-events:none;transition:background .15s;z-index:2}
.dsh-ig-canvas-badge.is-model{max-width:calc(100% - 20px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.dsh-ig-canvas-item.is-checked .dsh-ig-canvas-badge{background:var(--ig-blue)}
.dsh-ig-canvas-check{position:absolute;top:10px;right:10px;width:22px;height:22px;border:1.5px solid rgba(255,255,255,.85);border-radius:50%;display:grid;place-items:center;background:rgba(15,23,42,.48);color:#fff;box-shadow:0 2px 8px rgba(15,23,42,.18);backdrop-filter:blur(4px);z-index:2;pointer-events:none}.dsh-ig-canvas-item.is-checked .dsh-ig-canvas-check{border-color:#fff;background:var(--ig-blue)}
.dsh-ig-canvas-item-loading{width:260px;height:260px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--ig-bg) 55%,transparent);border:1px solid var(--ig-line);border-radius:10px;color:var(--ig-fg-cap)}
.dsh-ig-lightbox-nav{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border-radius:50%;border:0;background:rgba(15,23,42,.65);color:#fff;display:grid;place-items:center;cursor:pointer;transition:background .15s,transform .15s;z-index:10;backdrop-filter:blur(4px)}
.dsh-ig-lightbox-nav:hover{background:rgba(47,100,245,.85);transform:translateY(-50%) scale(1.08)}
.dsh-ig-lightbox-nav.is-prev{left:18px}
.dsh-ig-lightbox-nav.is-next{right:18px}
.dsh-ig-save-gallery-btn{color:var(--ig-blue)!important;border-color:rgba(47,100,245,.35)!important;background:rgba(47,100,245,.06)!important}
.dsh-ig-save-gallery-btn:hover{background:rgba(47,100,245,.12)!important}
.dsh-ig-save-gallery-btn.is-saved{color:var(--ig-fg-2)!important;border-color:var(--ig-line)!important;background:transparent!important}

/* tldraw infinite canvas surface (P0 spike) */
.dsh-ig-tl-canvas{position:relative;flex:1 1 0;height:0;min-height:0;overflow:hidden;isolation:isolate}
.dsh-ig-canvas-sync-status{position:absolute;z-index:500;bottom:48px;left:60px;right:16px;display:flex;align-items:center;justify-content:center;gap:8px;max-width:560px;margin:auto;padding:7px 12px;border:1px solid var(--ig-line);border-radius:10px;background:var(--ig-bg);color:var(--ig-fg-2);box-shadow:0 2px 8px #0001;font-size:12px;pointer-events:none}
.dsh-ig-canvas-sync-status[data-phase='error']{color:var(--ig-danger);border-color:rgba(239,68,68,.4)}
.dsh-ig-canvas-sync-status button{pointer-events:auto;flex-shrink:0;border:1px solid currentColor;border-radius:6px;padding:3px 9px;background:transparent;color:inherit;cursor:pointer}

/* ---- Right-sidebar seat variant (DSH 0.1.5 'sidebar.right.pane.tab') ----
   The seat is a narrow panel beside the conversation column, not a full
   conversation tab. Specificity (0,2,0) outranks every viewport media query
   above, so these apply regardless of window size: tabs scroll instead of
   wrapping, the page fills the seat box, and the workbench grid shrinks its
   rail and generate-form columns. StudioView's narrow-width observer
   (ResizeObserver) folds the recent rail under 560px. */
.dsh-ig-page-in-sidebar .dsh-ig-studio-tabs-bar{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin}
.dsh-ig-page-in-sidebar .dsh-ig-studio-tab-btn{flex:0 0 auto;white-space:nowrap}
.dsh-ig-page-in-sidebar .dsh-ig-gallery-page-body{padding:14px 14px 16px}
.dsh-ig-page-in-sidebar .dsh-ig-workbench{padding:8px}
.dsh-ig-page-in-sidebar .dsh-ig-workbench-grid{grid-template-columns:minmax(150px,190px) minmax(0,1fr) minmax(206px,264px)}
.dsh-ig-page-in-sidebar .dsh-ig-workbench-grid.is-sidebar-collapsed{grid-template-columns:minmax(0,1fr) minmax(206px,264px)}
.dsh-ig-page-in-sidebar .dsh-ig-workbench-grid.is-generate-collapsed{grid-template-columns:minmax(150px,190px) minmax(0,1fr)}
.dsh-ig-page-in-sidebar .dsh-ig-workbench-grid.is-sidebar-collapsed.is-generate-collapsed{grid-template-columns:minmax(0,1fr)}
.dsh-ig-field-grid.is-output-grid{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}
.dsh-ig-page-in-sidebar .dsh-ig-recent-item{min-width:0}
.dsh-ig-page-in-sidebar .dsh-ig-generate-panel .dsh-ig-field-grid{grid-template-columns:1fr}
.dsh-ig-page-in-sidebar .dsh-ig-tl-canvas{min-height:280px}
`;
		//#endregion
		//#region lib/types/client/tl/tl-brand-tokens.js
		/**
		* Single source of truth for the brand colors used across the tldraw surface.
		*
		* Consumed by tl-theme-css.ts (DOM chrome via CSS variables) and
		* tl-brand-theme.ts (canvas renderer via the runtime theme patch), so
		* re-tinting the surface is a one-file change instead of a hex hunt across
		* two files. Values mirror the workbench tokens in studio-style.ts
		* (`--ig-blue` and friends).
		*/
		/** Brand blue, shared with studio-style.ts `--ig-blue`. */
		const BRAND_BLUE = "#2f64f5";
		/** Brand blue RGB components, for composing rgba() tints in one place. */
		const BRAND_BLUE_RGB = "47, 100, 245";
		/** Cool ink from the workbench foreground family. */
		const BRAND_INK = "#182033";
		/** Flat canvas surface; also feeds export backgrounds, so it stays solid. */
		const CANVAS_BG = "#e6ebf5";
		/** Canvas gradient stops (top and bottom); the mid stop is CANVAS_BG. */
		const CANVAS_BG_TOP = "#eef2fa";
		const CANVAS_BG_BOTTOM = "#dfe6f4";
		//#endregion
		//#region lib/types/client/tl/tl-theme-css.js
		/**
		* DSH image-gen brand skin for the tldraw surface.
		*
		* Injected AFTER the bundled tldraw styles (tl-css.ts): it only re-declares
		* tldraw's own CSS variables and restyles tldraw's own chrome classes, scoped
		* to our canvas container, so upgrading tldraw never requires edits here. This
		* layer owns the UI chrome (panels, toolbars, hover/active feedback, grid
		* dots); colors painted onto the canvas itself (shape palette, selection
		* handles, marquee) come from the runtime theme patch in tl-brand-theme.ts.
		* Dark chrome keeps stock tldraw colors: the plugin lives in DSH's light shell.
		*
		* Beyond re-tinting, this pass reshapes tldraw's signature chrome so the
		* surface no longer reads as "stock tldraw": the grey corner strips (top-left
		* menu zone, bottom-left navigation) become floating white cards with hairline
		* borders, matching the workbench card language.
		*/
		/** Hairline border used on every floating chrome card. */
		const CARD_BORDER = "#d9e2f2";
		/** Shadow used on every floating chrome card (workbench blue-grey family). */
		const CARD_SHADOW = "0px 1px 2px rgba(30, 42, 76, 0.06), 0px 4px 12px rgba(30, 42, 76, 0.08)";
		const TL_THEME_CSS = `
/* DSH image-gen skin for the tldraw surface (light chrome only). */
.dsh-ig-tl-canvas .tl-container.tl-theme__light {
	/* Canvas surface: a clearly cool blue-grey board, distinguishable from the
	   pure-white floating cards at a glance. Same token feeds the runtime
	   theme patch (CANVAS_BG in tl-brand-theme.ts). */
	--tl-color-background: ${CANVAS_BG};
	--tl-color-grid: rgba(88, 110, 158, 0.5);

	/* Brand accents: selection outlines, active tool, chips, focus rings. */
	--tl-color-selected: ${BRAND_BLUE};
	--tl-color-primary: ${BRAND_BLUE};
	--tl-color-focus: ${BRAND_BLUE};
	--tl-color-selection-stroke: ${BRAND_BLUE};
	--tl-color-selection-fill: rgba(${BRAND_BLUE_RGB}, 0.14);

	/* Interaction feedback: hover chips and active-tool highlight are tinted
	   brand blue instead of tldraw's neutral grey-black. */
	--tl-color-hint: rgba(${BRAND_BLUE_RGB}, 0.14);
	--tl-color-muted-1: rgba(${BRAND_BLUE_RGB}, 0.14);
	--tl-color-muted-2: rgba(${BRAND_BLUE_RGB}, 0.07);

	/* Chrome: panels, borders, and text aligned with the workbench tokens. */
	--tl-color-panel: #ffffff;
	--tl-color-panel-contrast: #ffffff;
	--tl-color-low: #ffffff;
	--tl-color-low-border: ${CARD_BORDER};
	--tl-color-divider: #dfe6f3;
	--tl-color-text: ${BRAND_INK};
	--tl-color-text-0: ${BRAND_INK};
	--tl-color-text-1: #242f44;
	--tl-color-text-3: #6b7690;

	/* Shadows: the workbench's cold blue-grey instead of tldraw's black. */
	--tl-shadow-1: 0px 1px 2px rgba(30, 42, 76, 0.24), 0px 1px 3px rgba(30, 42, 76, 0.08);
	--tl-shadow-2:
		0px 0px 2px rgba(30, 42, 76, 0.14), 0px 2px 3px rgba(30, 42, 76, 0.2),
		0px 2px 6px rgba(30, 42, 76, 0.08), inset 0px 0px 0px 1px var(--tl-color-panel-contrast);
	--tl-shadow-3:
		0px 1px 2px rgba(30, 42, 76, 0.24), 0px 2px 6px rgba(30, 42, 76, 0.12),
		inset 0px 0px 0px 1px var(--tl-color-panel-contrast);
	--tl-shadow-4:
		0px 0px 3px rgba(30, 42, 76, 0.16), 0px 5px 4px rgba(30, 42, 76, 0.13),
		0px 2px 16px rgba(30, 42, 76, 0.05), inset 0px 0px 0px 1px var(--tl-color-panel-contrast);

	/* Noticeably rounder chrome than tldraw's stock 4/6/9/11px. */
	--tl-radius-1: 6px;
	--tl-radius-2: 10px;
	--tl-radius-3: 13px;
	--tl-radius-4: 16px;
}

/* ---------------------------------------------------------------
 * De-tldraw pass: reshape tldraw's signature corner strips and
 * floating chrome into the workbench's card language.
 * ------------------------------------------------------------- */

/* Canvas backdrop: subtle vertical gradient (light at top, a touch deeper at
   the bottom) for an airy, lit-from-above feel. Painted on the UI background
   layer ONLY — --tl-color-background stays a flat color because tldraw reuses
   it for export backgrounds and edge highlight lines, which must stay clean. */
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tl-background {
	background-image: linear-gradient(180deg, ${CANVAS_BG_TOP} 0%, ${CANVAS_BG} 60%, ${CANVAS_BG_BOTTOM} 100%);
}

/* Top-left menu strip -> floating white card (Page menu + quick actions). */
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tlui-menu-zone {
	margin: 10px;
	background-color: #ffffff;
	border: 1px solid ${CARD_BORDER};
	border-radius: 12px;
	box-shadow: ${CARD_SHADOW};
}

/* Bottom-left navigation strip -> floating white card (zoom, pages, minimap).
   Offsets detach it from the screen corner; the ::before paints the card. */
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tlui-navigation-panel {
	left: 12px;
	bottom: 12px;
}
.dsh-ig-tl-canvas .tl-container.tl-theme__light[dir='rtl'] .tlui-navigation-panel {
	left: auto;
	right: 12px;
}
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tlui-navigation-panel::before {
	inset: -6px -6px -6px -6px;
	background-color: #ffffff;
	border: 1px solid ${CARD_BORDER};
	border-radius: 12px;
	box-shadow: ${CARD_SHADOW};
}

/* Bottom toolbar pill -> bordered card so it matches the other cards. */
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tlui-main-toolbar__tools {
	border: 1px solid ${CARD_BORDER};
}

/* Vertical left rail (Figma-style, set via components.Toolbar): float it off
   the screen edge like the other cards. Stock offsets (top 90px / bottom
   140px) already clear the top-left menu card and bottom-left minimap card. */
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tlui-main-toolbar--vertical {
	left: 12px;
	padding-left: 0;
}

/* Compact rail buttons (40px instead of stock 48px) for an app-like density
   that differs from tldraw's chunky mobile-sized chrome. */
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tlui-main-toolbar--vertical .tlui-button__tool {
	width: 40px;
	height: 40px;
}
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tlui-main-toolbar--vertical .tlui-button__tool::after {
	inset: 3px;
	border-radius: 9px;
}
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tlui-main-toolbar--vertical .tlui-main-toolbar__extras {
	width: 40px;
}

/* Right style panel -> bordered card. */
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tlui-style-panel__wrapper {
	border: 1px solid ${CARD_BORDER};
}

/* Dropdown menus and popovers -> hairline border for definition. */
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tlui-menu,
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tlui-popover__content {
	border: 1px solid ${CARD_BORDER};
}

/* Active menu chips (e.g. style panel selections): brand tint instead of grey. */
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tlui-button[data-isactive='true'] {
	color: ${BRAND_BLUE};
}
.dsh-ig-tl-canvas .tl-container.tl-theme__light .tlui-button[data-isactive='true']::after {
	background: rgba(${BRAND_BLUE_RGB}, 0.14);
}
`;
		//#endregion
		//#region lib/types/client/inspiration-style.js
		const INSPIRATION_STYLE = `
.dsh-ig-inspiration{--inspiration-blue:#2f64f5;--inspiration-ink:#172033;--inspiration-muted:#718099;--inspiration-line:color-mix(in srgb,currentColor 11%,transparent);min-height:100%;padding:18px 24px 26px;background:radial-gradient(ellipse 80% 45% at 50% -20%,rgba(47,100,245,.12),transparent 70%),var(--dsw-alias-bg-layer-1,#fff);color:var(--foreground,var(--inspiration-ink));box-sizing:border-box}
.dsh-ig-inspiration-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.dsh-ig-inspiration-head-actions{display:flex;align-items:center;gap:8px}.dsh-ig-inspiration-kicker{margin:0 0 4px;color:var(--inspiration-blue);font-size:11px;letter-spacing:.08em;font-weight:700;text-transform:uppercase}.dsh-ig-inspiration-head h1{margin:0;font-size:18px;letter-spacing:-.025em;line-height:1.25}.dsh-ig-inspiration-subtitle{margin:5px 0 0;color:var(--inspiration-muted);font-size:12px;line-height:1.5}.dsh-ig-inspiration-refresh,.dsh-ig-inspiration-clear-cache{height:32px;padding:0 11px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--inspiration-line);border-radius:7px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--inspiration-muted);font:inherit;font-size:12px;white-space:nowrap;cursor:pointer;transition:all .15s ease}.dsh-ig-inspiration-refresh:hover:not(:disabled){border-color:rgba(47,100,245,.42);color:var(--inspiration-blue);background:rgba(47,100,245,.04)}.dsh-ig-inspiration-clear-cache:hover:not(:disabled){border-color:rgba(239,68,68,.4);color:#ef4444;background:rgba(239,68,68,.04)}.dsh-ig-inspiration-refresh:disabled,.dsh-ig-inspiration-clear-cache:disabled{opacity:.55;cursor:wait}
.dsh-ig-inspiration-toolbar{display:grid;grid-template-columns:minmax(180px,1fr) auto repeat(3,minmax(110px,140px));gap:8px;padding:10px;border:1px solid var(--inspiration-line);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 90%,#edf2ff);margin-bottom:16px}.dsh-ig-inspiration-search{min-width:0;position:relative}.dsh-ig-inspiration-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#8995aa}.dsh-ig-inspiration-toolbar input,.dsh-ig-inspiration-toolbar select{width:100%;height:34px;box-sizing:border-box;border:1px solid transparent;border-radius:6px;background:var(--dsw-alias-bg-layer-1,#fff);color:inherit;padding:0 9px;font:inherit;font-size:12px;outline:none}.dsh-ig-inspiration-toolbar input{padding-left:31px}.dsh-ig-inspiration-toolbar input:focus,.dsh-ig-inspiration-toolbar select:focus{border-color:var(--inspiration-blue);box-shadow:0 0 0 3px rgba(47,100,245,.1)}
.dsh-ig-inspiration-fav-filter{height:34px;padding:0 12px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--inspiration-line);border-radius:6px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--inspiration-muted);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap;transition:all .15s ease}.dsh-ig-inspiration-fav-filter:hover{border-color:rgba(47,100,245,.4);color:var(--inspiration-blue)}.dsh-ig-inspiration-fav-filter.is-active{background:#eef3ff;border-color:var(--inspiration-blue);color:var(--inspiration-blue);font-weight:600}.fill-star{fill:currentColor}
.dsh-ig-inspiration-catnav{position:sticky;top:0;z-index:6;display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;padding:8px;border:1px solid var(--inspiration-line);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 92%,#edf2ff);backdrop-filter:blur(8px)}
.dsh-ig-inspiration-catnav-chip{height:26px;padding:0 11px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--inspiration-line);border-radius:999px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--inspiration-muted);font:inherit;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .15s ease}.dsh-ig-inspiration-catnav-chip em{font-style:normal;font-size:10px;opacity:.75}.dsh-ig-inspiration-catnav-chip:hover:not(:disabled){border-color:rgba(47,100,245,.46);color:var(--inspiration-blue)}.dsh-ig-inspiration-catnav-chip.is-active{border-color:var(--inspiration-blue);background:#eef3ff;color:var(--inspiration-blue)}.dsh-ig-inspiration-catnav-chip:disabled{opacity:.4;cursor:default}
.dsh-ig-inspiration-group{margin:0}
.dsh-ig-inspiration-group-head{position:sticky;top:48px;z-index:5;display:flex;align-items:center;gap:8px;margin:6px 0 10px;padding:7px 2px;font-size:12px;font-weight:700;letter-spacing:.02em;color:var(--inspiration-ink);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 86%,transparent);backdrop-filter:blur(6px);scroll-margin-top:48px}.dsh-ig-inspiration-group-head em{font-style:normal;font-weight:600;font-size:10.5px;color:var(--inspiration-muted)}
.dsh-ig-inspiration-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,310px);gap:18px;align-items:start}.dsh-ig-inspiration-summary{height:24px;display:flex;align-items:center;justify-content:space-between;color:var(--inspiration-muted);font-size:11.5px}.dsh-ig-inspiration-summary strong{color:inherit;font-weight:650}.dsh-ig-inspiration-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:12px}.dsh-ig-inspiration-card{position:relative;min-width:0;padding:0;border:1px solid var(--inspiration-line);border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-layer-1,#fff);text-align:left;cursor:pointer;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;content-visibility:auto;contain-intrinsic-size:245px}.dsh-ig-inspiration-card:hover,.dsh-ig-inspiration-card.is-selected{border-color:rgba(47,100,245,.58);box-shadow:0 8px 22px rgba(37,62,123,.11)}.dsh-ig-inspiration-card:hover{transform:translateY(-2px)}.dsh-ig-inspiration-card.is-selected:after{content:'';position:absolute;inset:0;border:2px solid var(--inspiration-blue);border-radius:9px;pointer-events:none}.dsh-ig-inspiration-visual{aspect-ratio:1/1;position:relative;background:linear-gradient(135deg,#f0f4fc,#e3eafa);overflow:hidden}.dsh-ig-inspiration-visual img{width:100%;height:100%;object-fit:cover;display:block}.dsh-ig-inspiration-image-placeholder{height:100%;display:grid;place-items:center;color:#8a99b3}.dsh-ig-inspiration-image-placeholder.is-error{font-size:11px;padding:10px;text-align:center}.dsh-ig-inspiration-card-copy{padding:9px 10px 10px}.dsh-ig-inspiration-card-copy strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:17px}.dsh-ig-inspiration-card-copy span{display:block;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--inspiration-muted);font-size:10.5px}.dsh-ig-inspiration-featured{position:absolute;top:8px;left:8px;display:inline-flex;align-items:center;gap:3px;padding:3px 6px;border-radius:999px;background:rgba(20,31,52,.72);backdrop-filter:blur(5px);color:#fff;font-size:10px;font-weight:600;z-index:1}.dsh-ig-inspiration-card-star{position:absolute;top:8px;right:8px;width:26px;height:26px;border-radius:50%;background:rgba(20,31,52,.6);backdrop-filter:blur(4px);border:none;color:#fff;display:grid;place-items:center;cursor:pointer;z-index:2;opacity:0;transition:opacity .15s,transform .15s}.dsh-ig-inspiration-card:hover .dsh-ig-inspiration-card-star,.dsh-ig-inspiration-card-star.is-favorited{opacity:1}.dsh-ig-inspiration-card-star.is-favorited{color:#f59e0b;background:rgba(20,31,52,.85)}.dsh-ig-inspiration-card-star:hover{transform:scale(1.15)}
.dsh-ig-inspiration-empty{min-height:310px;display:grid;place-items:center;padding:30px;text-align:center;color:var(--inspiration-muted);border:1px dashed var(--inspiration-line);border-radius:10px;font-size:12px}
.dsh-ig-inspiration-empty.is-catalog-error{display:flex;flex-direction:column;gap:12px;color:var(--inspiration-text)}
.dsh-ig-inspiration-empty.is-catalog-error p{margin:0;font-size:13px;color:var(--inspiration-muted)}
.dsh-ig-inspiration-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:999px;background:rgba(15,23,42,.92);backdrop-filter:blur(8px);color:#fff;font-size:12px;font-weight:500;box-shadow:0 10px 30px rgba(0,0,0,.35);z-index:9999;animation:dsh-ig-slide-up .2s ease}
.dsh-ig-inspiration-toast.is-error{background:rgba(185,28,28,.92)}
@keyframes dsh-ig-slide-up{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
.dsh-ig-inspiration-modal-backdrop{position:fixed;inset:0;z-index:10001;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
.dsh-ig-inspiration-modal{width:100%;max-width:400px;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--inspiration-line);border-radius:12px;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.3);animation:dsh-ig-scale-in .15s ease}
@keyframes dsh-ig-scale-in{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.dsh-ig-inspiration-modal h3{margin:0 0 8px;font-size:15px;font-weight:650;color:inherit}
.dsh-ig-inspiration-modal p{margin:0 0 20px;color:var(--inspiration-muted);font-size:12.5px;line-height:1.55}
.dsh-ig-inspiration-modal-actions{display:flex;justify-content:flex-end;gap:10px}
.dsh-ig-inspiration-modal-btn{height:34px;padding:0 14px;border-radius:7px;border:1px solid var(--inspiration-line);background:var(--dsw-alias-bg-layer-1,#fff);color:inherit;font:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s ease}
.dsh-ig-inspiration-modal-btn:hover{background:color-mix(in srgb,currentColor 6%,transparent)}
.dsh-ig-inspiration-modal-btn.is-danger{background:#ef4444;border-color:#ef4444;color:#fff}
.dsh-ig-inspiration-modal-btn.is-danger:hover{background:#dc2626}
.dsh-ig-inspiration-modal-btn:disabled{opacity:.5;cursor:wait}
.dsh-ig-inspiration-retry-btn{border:none;background:rgba(47,100,245,.08);color:var(--inspiration-blue);padding:6px 12px;border-radius:6px;font:inherit;font-size:11px;font-weight:600;cursor:pointer;transition:background .15s}
.dsh-ig-inspiration-retry-btn:hover{background:rgba(47,100,245,.18)}
.dsh-ig-inspiration-end-hint{display:flex;align-items:center;justify-content:center;padding:24px 0 16px;color:var(--inspiration-muted);font-size:12px}
.dsh-ig-inspiration-inspector{position:sticky;top:0;overflow:hidden;border:1px solid var(--inspiration-line);border-radius:11px;background:var(--dsw-alias-bg-layer-1,#fff);box-shadow:0 9px 28px rgba(27,45,88,.06)}.dsh-ig-inspiration-inspector-empty{min-height:310px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:22px;color:var(--inspiration-muted);font-size:12px;text-align:center}.dsh-ig-inspiration-inspector-image{aspect-ratio:16/10;background:#f1f4fa;position:relative;cursor:zoom-in}.dsh-ig-inspiration-inspector-image img{width:100%;height:100%;object-fit:cover}.dsh-ig-inspiration-inspector-zoom-hint{position:absolute;bottom:8px;right:8px;display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;background:rgba(15,23,42,.75);backdrop-filter:blur(5px);color:#fff;font-size:10.5px;font-weight:500;opacity:0;transition:opacity .15s ease;pointer-events:none}.dsh-ig-inspiration-inspector-image:hover .dsh-ig-inspiration-inspector-zoom-hint{opacity:1}.dsh-ig-inspiration-inspector-body{padding:14px}.dsh-ig-inspiration-inspector-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.dsh-ig-inspiration-inspector-body h2{margin:0;font-size:14px;line-height:1.4;flex:1}.dsh-ig-inspiration-inspector-fav{width:30px;height:30px;flex-shrink:0;border:1px solid var(--inspiration-line);border-radius:7px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--inspiration-muted);display:grid;place-items:center;cursor:pointer;transition:all .15s ease}.dsh-ig-inspiration-inspector-fav:hover{border-color:rgba(245,158,11,.4);color:#f59e0b}.dsh-ig-inspiration-inspector-fav.is-favorited{color:#f59e0b;border-color:rgba(245,158,11,.5);background:rgba(245,158,11,.08)}.dsh-ig-inspiration-origin{margin:5px 0 12px;color:var(--inspiration-muted);font-size:11px}.dsh-ig-inspiration-tags{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 12px}.dsh-ig-inspiration-tags span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 6px;border-radius:4px;background:#eef3ff;color:#3e5fb8;font-size:10px}.dsh-ig-inspiration-prompt-label{display:flex;align-items:center;justify-content:space-between;margin:0 0 6px;color:var(--inspiration-muted);font-size:10.5px;font-weight:650}.dsh-ig-inspiration-prompt{max-height:155px;margin:0;padding:9px;overflow:auto;white-space:pre-wrap;border:1px solid var(--inspiration-line);border-radius:7px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,#f8fafc) 90%,#e9efff);font-size:11px;line-height:1.55;color:#526078}.dsh-ig-inspiration-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.dsh-ig-inspiration-actions button,.dsh-ig-inspiration-source-link{height:34px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--inspiration-line);border-radius:7px;background:var(--dsw-alias-bg-layer-1,#fff);color:#536075;font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;text-decoration:none}.dsh-ig-inspiration-actions button:hover,.dsh-ig-inspiration-source-link:hover{border-color:rgba(47,100,245,.46);color:var(--inspiration-blue)}.dsh-ig-inspiration-actions .dsh-ig-inspiration-use{grid-column:1/-1;border-color:var(--inspiration-blue);background:linear-gradient(135deg,#386cf6,#2758e7);color:#fff;box-shadow:0 7px 15px rgba(47,100,245,.2)}.dsh-ig-inspiration-actions .dsh-ig-inspiration-use:hover{color:#fff;transform:translateY(-1px)}
.dsh-ig-inspiration-lightbox{position:fixed;inset:0;z-index:10000;background:rgba(8,12,22,.88);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}.dsh-ig-inspiration-lightbox-content{position:relative;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;align-items:center}.dsh-ig-inspiration-lightbox-img-wrap{max-width:85vw;max-height:82vh;border-radius:10px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.7);background:#05070d}.dsh-ig-inspiration-lightbox-img-wrap img{width:auto;height:auto;max-width:85vw;max-height:82vh;object-fit:contain;display:block}.dsh-ig-inspiration-lightbox-close{position:absolute;top:-16px;right:-16px;width:34px;height:34px;border-radius:50%;background:#1e293b;color:#fff;border:1px solid rgba(255,255,255,.2);cursor:pointer;display:grid;place-items:center;transition:background .15s,transform .15s;z-index:10}.dsh-ig-inspiration-lightbox-close:hover{background:#334155;transform:scale(1.1)}.dsh-ig-inspiration-lightbox-caption{margin-top:12px;color:rgba(255,255,255,.9);font-size:13px;font-weight:500;text-shadow:0 2px 4px rgba(0,0,0,.6)}
.dsh-ig-inspiration-sources{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px}.dsh-ig-inspiration-source-chip{height:30px;padding:0 13px;display:inline-flex;align-items:center;border:1px solid var(--inspiration-line);border-radius:999px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--inspiration-muted);font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;transition:all .15s ease}.dsh-ig-inspiration-source-chip:hover{border-color:rgba(47,100,245,.46);color:var(--inspiration-blue)}.dsh-ig-inspiration-source-chip.is-active{border-color:var(--inspiration-blue);background:linear-gradient(135deg,#386cf6,#2758e7);color:#fff;box-shadow:0 5px 12px rgba(47,100,245,.22)}
.dsh-ig-inspiration-actions .dsh-ig-inspiration-use.is-secondary{grid-column:1/-1;border-color:rgba(47,100,245,.5);background:var(--dsw-alias-bg-layer-1,#fff);color:var(--inspiration-blue);box-shadow:none}.dsh-ig-inspiration-actions .dsh-ig-inspiration-use.is-secondary:hover{color:#2758e7;transform:translateY(-1px)}.dsh-ig-inspiration-actions .dsh-ig-inspiration-use.is-secondary:disabled{opacity:.6;cursor:wait;transform:none}
@media(max-width:980px){.dsh-ig-inspiration-layout{grid-template-columns:1fr}.dsh-ig-inspiration-inspector{position:relative;top:auto}.dsh-ig-inspiration-inspector-empty{min-height:150px}.dsh-ig-inspiration-inspector-image{max-height:290px}.dsh-ig-inspiration-inspector-image img{object-fit:contain;background:#f1f4fa}}@media(max-width:700px){.dsh-ig-inspiration{padding:14px}.dsh-ig-inspiration-head{align-items:center}.dsh-ig-inspiration-toolbar{grid-template-columns:1fr 1fr}.dsh-ig-inspiration-search{grid-column:1/-1}.dsh-ig-inspiration-fav-filter{grid-column:1/-1}.dsh-ig-inspiration-grid{grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:9px}}@media(max-width:420px){.dsh-ig-inspiration-toolbar{grid-template-columns:1fr}.dsh-ig-inspiration-search{grid-column:auto}}

.dsh-ig-inspiration-source-chip svg{flex-shrink:0}
.dsh-ig-baoyu-panel{border:1px solid var(--inspiration-line);border-radius:11px;background:var(--dsw-alias-bg-layer-1,#fff);padding:18px;display:flex;flex-direction:column;gap:14px}
.dsh-ig-baoyu-intro{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.dsh-ig-baoyu-combos{font-size:12px;color:var(--inspiration-blue)}
.dsh-ig-baoyu-hint{font-size:11px;color:var(--inspiration-muted)}
.dsh-ig-baoyu-dim{display:flex;flex-direction:column;gap:7px}
.dsh-ig-baoyu-dim-head{font-size:11px;font-weight:650;color:var(--inspiration-muted);letter-spacing:.02em}
.dsh-ig-baoyu-chips{display:flex;flex-wrap:wrap;gap:6px}
.dsh-ig-baoyu-chip{height:28px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--inspiration-line);border-radius:999px;background:var(--dsw-alias-bg-layer-1,#fff);color:#536075;font:inherit;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s ease}
.dsh-ig-baoyu-chip:hover{border-color:rgba(47,100,245,.46);color:var(--inspiration-blue)}
.dsh-ig-baoyu-chip.is-active{border-color:var(--inspiration-blue);background:rgba(47,100,245,.09);color:var(--inspiration-blue)}
.dsh-ig-baoyu-swatch{display:inline-flex;gap:2px}
.dsh-ig-baoyu-swatch i{width:9px;height:9px;border-radius:50%;border:1px solid rgba(15,23,42,.15);display:block}
.dsh-ig-baoyu-title-input{height:34px;flex:1;padding:0 11px;border:1px solid var(--inspiration-line);border-radius:7px;background:var(--dsw-alias-bg-layer-1,#fff);color:inherit;font:inherit;font-size:12px}
.dsh-ig-baoyu-title-input:focus{outline:none;border-color:rgba(47,100,245,.55)}
.dsh-ig-baoyu-title-input:disabled{opacity:.45}
.dsh-ig-baoyu-required{color:#dc2626;font-size:11px}
.dsh-ig-baoyu-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsh-ig-baoyu-btn{height:34px;padding:0 14px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--inspiration-line);border-radius:7px;background:var(--dsw-alias-bg-layer-1,#fff);color:#536075;font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;transition:all .15s ease}
.dsh-ig-baoyu-btn:hover{border-color:rgba(47,100,245,.46);color:var(--inspiration-blue)}
.dsh-ig-baoyu-btn:disabled{opacity:.5;cursor:not-allowed}
.dsh-ig-baoyu-btn.is-primary{border-color:var(--inspiration-blue);background:linear-gradient(135deg,#386cf6,#2758e7);color:#fff;box-shadow:0 7px 15px rgba(47,100,245,.2)}
.dsh-ig-baoyu-btn.is-primary:hover{color:#fff;transform:translateY(-1px)}
.dsh-ig-baoyu-btn.is-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
.dsh-ig-baoyu-preview-block{display:flex;flex-direction:column;gap:6px}
.dsh-ig-baoyu-preview-head{font-size:11px;font-weight:650;color:var(--inspiration-muted)}
.dsh-ig-baoyu-preview{max-height:260px;margin:0;padding:12px;overflow:auto;white-space:pre-wrap;border:1px solid var(--inspiration-line);border-radius:7px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,#f8fafc) 90%,#e9efff);font-size:11px;line-height:1.6;color:#526078}
`;
		//#endregion
		//#region lib/types/client/output-settings.js
		/** Validate all advanced output fields before the settings form starts writing. */
		function parseExtraFields(text, message) {
			if (!text.trim()) return {};
			let value;
			try {
				value = JSON.parse(text);
			} catch {
				throw new Error(message);
			}
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(message);
			return value;
		}
		function parseSizeTable(text, message) {
			const value = parseExtraFields(text, message);
			const table = {};
			for (const [ratio, tiers] of Object.entries(value)) {
				if (!/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(ratio) || ratio.split(":").some((part) => Number(part) <= 0) || typeof tiers !== "object" || tiers === null || Array.isArray(tiers)) throw new Error(message);
				const entries = Object.entries(tiers);
				if (entries.length === 0 || entries.some(([tier, size]) => !/^(\d+(?:\.\d+)?)(K?)$/.test(tier) || Number.parseFloat(tier) <= 0 || typeof size !== "string" || !size.trim())) throw new Error(message);
				table[ratio] = Object.fromEntries(entries.map(([tier, size]) => [tier, size.trim()]));
			}
			return table;
		}
		//#endregion
		//#region lib/types/client/settings-write.js
		/** DSH 0.1.7 resolves refused writes to false; older settings scopes resolve to void. */
		async function writeSetting(scope, field, value, rejectedMessage) {
			if (await scope.set(field, value) === false) throw new Error(rejectedMessage);
		}
		//#endregion
		//#region lib/types/client/provider-pill.js
		/**
		* Composer tool-row pill: switch the default image provider without leaving
		* the chat. Registered into the official 'conversation.input.right' slot; the
		* write path is the same `provider` settings field the settings card uses, so
		* the two views can never disagree.
		*/
		const PILL_DICT = {
			zh: {
				pillLabel: "生图",
				menuTitle: "生图模型",
				keyConfigured: "Key 已配置",
				keyMissing: "未配置 Key",
				noKeyNeeded: "无需 Key",
				noWorkflow: "未导入工作流",
				subNoKey: "订阅生图",
				subSignedIn: "已登录",
				subSignedOut: "未登录",
				subStatusUnknown: "状态未知",
				readOnly: "图像设置为只读，无法在此切换",
				switchFailed: "切换失败",
				writeRejected: "设置未保存，请重试"
			},
			en: {
				pillLabel: "Image",
				menuTitle: "Image model",
				keyConfigured: "Key configured",
				keyMissing: "No key",
				noKeyNeeded: "No key needed",
				noWorkflow: "No workflow",
				subNoKey: "Subscription",
				subSignedIn: "Signed in",
				subSignedOut: "Signed out",
				subStatusUnknown: "Unknown",
				readOnly: "Image settings are read-only; switch them in the config source",
				switchFailed: "Switch failed",
				writeRejected: "Setting was not saved. Please try again"
			}
		};
		/** Provider row names, per locale. Brand words stay untranslated; only the
		* qualifier ("订阅" / "Sub") localizes, so the pill and the menu agree with the
		* settings card in both languages. */
		const PILL_PROVIDER_LABELS = {
			zh: {
				google: "Gemini",
				openai: "OpenAI",
				"openai-compat": "OpenAI 兼容",
				seedream: "Seedream",
				dashscope: "DashScope",
				xai: "Grok",
				zhipu: "智谱 GLM",
				comfyui: "ComfyUI",
				"chatgpt-sub": "ChatGPT 订阅",
				"grok-sub": "Grok 订阅",
				"google-sub": "Google 订阅"
			},
			en: {
				google: "Gemini",
				openai: "OpenAI",
				"openai-compat": "OpenAI Compatible",
				seedream: "Seedream",
				dashscope: "DashScope",
				xai: "Grok",
				zhipu: "Zhipu GLM",
				comfyui: "ComfyUI",
				"chatgpt-sub": "ChatGPT Sub",
				"grok-sub": "Grok Sub",
				"google-sub": "Google Sub"
			}
		};
		/**
		* Where `position: fixed` offsets start next to the pill, in viewport
		* coordinates. The host composer wraps the tool row in a transformed box
		* (`will-change: transform`), which makes fixed descendants resolve against
		* that box instead of the viewport (#109): viewport coordinates then land the
		* menu a sidebar-width off whenever the left sidebar is open. Two zero-size
		* probes read the real origin, whichever CSS rule creates it.
		*/
		function fixedOriginNear(host) {
			const probe = (css) => {
				const element = document.createElement("div");
				element.style.cssText = `position:fixed;width:0;height:0;visibility:hidden;pointer-events:none;${css}`;
				host.appendChild(element);
				const rect = element.getBoundingClientRect();
				element.remove();
				return rect;
			};
			const topLeft = probe("left:0;top:0");
			return {
				left: topLeft.left,
				top: topLeft.top,
				bottom: probe("left:0;bottom:0").bottom
			};
		}
		/** Compute the fixed-position anchor from the pill button: open upward when
		* the chat pane leaves room above the composer, drop down otherwise. The
		* numbers are relative to the box fixed elements resolve against. */
		function anchorOf(button) {
			const rect = button?.getBoundingClientRect();
			const host = button?.parentElement;
			if (rect === void 0 || host === null || host === void 0) return void 0;
			const origin = fixedOriginNear(host);
			const left = rect.left - origin.left;
			if (rect.top >= 332) return {
				left,
				bottom: origin.bottom - rect.top + 6
			};
			return {
				left,
				top: rect.bottom + 6 - origin.top
			};
		}
		/** Whether the user opted into the composer pill; hidden (not merely inert) when off. */
		function pillVisible(value) {
			return value?.showProviderPill === true;
		}
		const PILL_MODEL_FIELDS = {
			google: "googleModel",
			openai: "openaiModel",
			"openai-compat": "openaiCompatModel",
			seedream: "seedreamModel",
			dashscope: "dashscopeModel",
			xai: "xaiModel",
			zhipu: "zhipuModel"
		};
		const PILL_MODEL_OPTIONS_FIELDS = { "openai-compat": "openaiCompatModels" };
		/** Model (or ComfyUI workflow) a provider row will use with the persisted settings. */
		function pillModelOf(provider, value, channelId) {
			if (provider === "comfyui") {
				const workflow = activeComfyUIWorkflow(value ?? {});
				return workflow === void 0 ? "" : workflow.name;
			}
			if (SUBSCRIPTION_PROVIDERS.includes(provider)) return DEFAULT_MODELS[provider];
			if (provider === "openai-compat") {
				const channel = resolveOpenAICompatChannel(value ?? {}, channelId);
				return channel.model.trim().length > 0 ? channel.model.trim() : DEFAULT_MODELS[provider];
			}
			const field = PILL_MODEL_FIELDS[provider];
			const stored = field === void 0 ? void 0 : value?.[field];
			if (provider === "seedream") return currentSeedreamModel(typeof stored === "string" ? stored : void 0);
			return typeof stored === "string" && stored.length > 0 ? stored : DEFAULT_MODELS[provider];
		}
		/** Optional model choices exposed by a provider; single-model providers return an empty list. */
		function pillModelOptionsOf(provider, value, channelId) {
			if (provider === "comfyui") return resolveComfyUIWorkflows(value ?? {}).map((workflow) => workflow.name);
			if (provider === "openai-compat") {
				const channel = resolveOpenAICompatChannel(value ?? {}, channelId);
				return resolveOpenAICompatModels({
					openaiCompatModel: pillModelOf(provider, value, channel.id),
					openaiCompatModels: channel.models ?? []
				});
			}
			const field = PILL_MODEL_OPTIONS_FIELDS[provider];
			if (field === void 0) return [];
			const configured = value?.[field];
			const models = Array.isArray(configured) ? [...new Set(configured.filter((model) => typeof model === "string").map((model) => model.trim()).filter(Boolean))] : [];
			const defaultModel = pillModelOf(provider, value);
			if (defaultModel.length > 0 && !models.includes(defaultModel)) models.unshift(defaultModel);
			return models;
		}
		function pillTargetKey(provider, channelId) {
			return provider === "openai-compat" ? `openai-compat:${channelId ?? "default"}` : provider;
		}
		/**
		* The settings writes that make a ComfyUI workflow the active one: the same
		* three fields the settings card saves for its active workflow (the name plus
		* the legacy single-workflow mirror), so the two views never disagree.
		* Undefined for a name that is not imported.
		*/
		function comfyUIWorkflowWrites(value, name) {
			const workflow = resolveComfyUIWorkflows(value ?? {}).find((entry) => entry.name === name);
			if (workflow === void 0) return void 0;
			return [
				["comfyuiActiveWorkflow", workflow.name],
				["comfyuiWorkflowJson", workflow.json],
				["comfyuiWorkflowName", workflow.name]
			];
		}
		/** The pill button text: the channel label, or the provider with its active workflow for ComfyUI. */
		function pillButtonLabel(provider, providerLabel, value, channelLabel) {
			if (channelLabel !== void 0) return channelLabel;
			if (provider === "comfyui") {
				const workflow = pillModelOf(provider, value);
				if (workflow.length > 0) return `${providerLabel} · ${workflow}`;
			}
			return providerLabel;
		}
		/** One fixed-position provider menu anchored to the pill button. */
		function ImageProviderPill(props) {
			const [snapshot, setSnapshot] = (0, react.useState)(() => props.scope.getSnapshot());
			const [lang, setLang] = (0, react.useState)(() => props.locale?.getSnapshot?.()?.active?.startsWith("en") ? "en" : "zh");
			const [open, setOpen] = (0, react.useState)(false);
			const [pending, setPending] = (0, react.useState)(void 0);
			const [error, setError] = (0, react.useState)("");
			const [dots, setDots] = (0, react.useState)({});
			const [keyTick, setKeyTick] = (0, react.useState)(0);
			const [subDots, setSubDots] = (0, react.useState)(() => ({
				"chatgpt-sub": "unknown",
				"grok-sub": "unknown",
				"google-sub": "unknown"
			}));
			const buttonRef = (0, react.useRef)(null);
			const [menuStyle, setMenuStyle] = (0, react.useState)(null);
			(0, react.useEffect)(() => props.scope.subscribe(() => {
				setSnapshot(props.scope.getSnapshot());
			}), [props.scope]);
			(0, react.useEffect)(() => props.locale?.subscribe?.(() => {
				setLang(props.locale?.getSnapshot?.()?.active?.startsWith("en") ? "en" : "zh");
			}), [props.locale]);
			(0, react.useEffect)(() => props.credentialEvents?.listen(() => {
				setKeyTick((tick) => tick + 1);
			}), [props.credentialEvents]);
			(0, react.useEffect)(() => {
				let active = true;
				const targets = [...CLOUD_IMAGE_PROVIDERS.filter((provider) => provider !== "openai-compat").map((provider) => ({
					key: provider,
					ref: cloudCredentialRef(provider)
				})), ...resolveOpenAICompatChannels(snapshot.value ?? {}).map((channel) => ({
					key: pillTargetKey("openai-compat", channel.id),
					ref: channel.keyRef
				}))];
				props.credentials.describe(targets.map((target) => target.ref)).then((response) => {
					if (!active) return;
					const next = {};
					for (const target of targets) {
						const info = response.ok ? response.value?.[target.ref] : void 0;
						next[target.key] = response.ok ? info?.configured ? "configured" : "missing" : "unknown";
					}
					setDots(next);
				}).catch(() => {
					if (!active) return;
					setDots({});
				});
				return () => {
					active = false;
				};
			}, [
				props.credentials,
				keyTick,
				snapshot.value
			]);
			(0, react.useEffect)(() => {
				if (!open) return;
				let active = true;
				const probe = async () => {
					try {
						const response = await fetch(SUBSCRIPTION_STATUS_ROUTE, {
							method: "POST",
							cache: "no-store"
						});
						if (!active || !response.ok) return;
						const payload = await response.json();
						if (!active || payload.statuses === void 0) return;
						const next = {};
						for (const provider of SUBSCRIPTION_PROVIDERS) {
							const row = payload.statuses[provider];
							next[provider] = row?.state === "logged-in" ? "logged-in" : row?.state === "logged-out" ? "logged-out" : "unknown";
						}
						setSubDots(next);
					} catch {}
				};
				probe();
				return () => {
					active = false;
				};
			}, [open, keyTick]);
			const t = (keyName) => (lang === "en" ? PILL_DICT.en : PILL_DICT.zh)[keyName];
			const current = snapshot.value?.provider ?? "google";
			const currentChannel = current === "openai-compat" ? resolveOpenAICompatChannel(snapshot.value ?? {}) : void 0;
			const writable = snapshot.writable;
			(0, react.useEffect)(() => {
				if (!open) {
					setMenuStyle(null);
					return;
				}
				const anchor = () => {
					const next = anchorOf(buttonRef.current);
					if (next !== void 0) setMenuStyle(next);
				};
				anchor();
				window.addEventListener("resize", anchor);
				return () => {
					window.removeEventListener("resize", anchor);
				};
			}, [open]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onPointerDown = (event) => {
					const target = event.target;
					if (target instanceof Node && buttonRef.current !== null && !buttonRef.current.contains(target) && !(target instanceof Element && target.closest(".dsh-ig-pill-menu") !== null)) setOpen(false);
				};
				const onKeyDown = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				const onReflow = (event) => {
					if (event.target instanceof Element && event.target.closest(".dsh-ig-pill-menu") !== null) return;
					const rect = buttonRef.current?.getBoundingClientRect();
					if (rect !== void 0 && (rect.bottom < 0 || rect.top > window.innerHeight)) {
						setOpen(false);
						return;
					}
					const next = anchorOf(buttonRef.current);
					if (next !== void 0) setMenuStyle(next);
				};
				document.addEventListener("mousedown", onPointerDown, true);
				document.addEventListener("keydown", onKeyDown, true);
				window.addEventListener("resize", onReflow);
				window.addEventListener("scroll", onReflow, true);
				return () => {
					document.removeEventListener("mousedown", onPointerDown, true);
					document.removeEventListener("keydown", onKeyDown, true);
					window.removeEventListener("resize", onReflow);
					window.removeEventListener("scroll", onReflow, true);
				};
			}, [open]);
			if (!pillVisible(snapshot.value)) return null;
			const select = (provider, model, channelId) => {
				const currentModel = pillModelOf(provider, snapshot.value, channelId);
				const sameChannel = provider !== "openai-compat" || currentChannel?.id === (channelId ?? "default");
				if (pending !== void 0 || provider === current && sameChannel && (model === void 0 || model === currentModel)) {
					setOpen(false);
					return;
				}
				const modelField = model === void 0 ? void 0 : PILL_MODEL_FIELDS[provider];
				setError("");
				setPending(provider);
				(async () => {
					if (model !== void 0 && provider === "comfyui") {
						const writes = comfyUIWorkflowWrites(snapshot.value, model);
						if (writes === void 0) throw new Error(t("writeRejected"));
						for (const [field, value] of writes) await writeSetting(props.scope, field, value, t("writeRejected"));
					} else if (model !== void 0 && provider === "openai-compat" && channelId !== void 0 && channelId !== "default") {
						const channels = (snapshot.value?.openaiCompatChannels ?? []).map((channel) => channel.id === channelId ? {
							...channel,
							model
						} : channel);
						await writeSetting(props.scope, "openaiCompatChannels", channels, t("writeRejected"));
					} else if (model !== void 0 && modelField !== void 0) await writeSetting(props.scope, modelField, model, t("writeRejected"));
					if (provider === "openai-compat" && channelId !== void 0 && currentChannel?.id !== channelId) await writeSetting(props.scope, "openaiCompatActiveChannel", channelId, t("writeRejected"));
					if (provider !== current) await writeSetting(props.scope, "provider", provider, t("writeRejected"));
				})().then(() => {
					setOpen(false);
				}).catch((cause) => {
					setError(cause instanceof Error ? cause.message : String(cause));
				}).finally(() => {
					setPending(void 0);
				});
			};
			/** Plan A dots: ComfyUI is always fixed blue (theme-independent); each
			* subscription reflects its login state (green in, gray out); cloud rows
			* reflect their API-key state as before. */
			const dotClassOf = (provider, channelId) => {
				if (provider === "comfyui") return "dsh-ig-pill-dot-neutral";
				if (isSubscriptionProvider(provider)) return subDots[provider] === "logged-in" ? "dsh-ig-pill-dot-ok" : "dsh-ig-pill-dot-missing";
				const dot = dots[pillTargetKey(provider, channelId)];
				return dot === "configured" ? "dsh-ig-pill-dot-ok" : dot === "missing" ? "dsh-ig-pill-dot-missing" : "dsh-ig-pill-dot-neutral";
			};
			const subtitleOf = (provider, includeModel = true, channelId) => {
				if (provider === "comfyui") {
					const workflow = pillModelOf(provider, snapshot.value);
					if (workflow.length === 0) return `${t("noKeyNeeded")} · ${t("noWorkflow")}`;
					return includeModel ? `${t("noKeyNeeded")} · ${workflow}` : t("noKeyNeeded");
				}
				if (isSubscriptionProvider(provider)) {
					const state = subDots[provider];
					const stateText = state === "logged-in" ? t("subSignedIn") : state === "logged-out" ? t("subSignedOut") : t("subStatusUnknown");
					return `${t("subNoKey")} · ${stateText} · ${pillModelOf(provider, snapshot.value)}`;
				}
				const dot = dots[pillTargetKey(provider, channelId)];
				const model = pillModelOf(provider, snapshot.value, channelId);
				const modelSuffix = includeModel ? ` · ${model}` : "";
				if (dot === "configured") return `${t("keyConfigured")}${modelSuffix}`;
				if (dot === "missing") return `${t("keyMissing")}${modelSuffix}`;
				return includeModel ? model : "";
			};
			const menuEntries = IMAGE_PROVIDERS.flatMap((provider) => provider === "openai-compat" ? resolveOpenAICompatChannels(snapshot.value ?? {}).map((channel) => ({
				provider,
				channel
			})) : [{ provider }]);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-ig-pill-root",
				children: [(0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					ref: buttonRef,
					className: `dsh-ig-pill-button${open ? " dsh-ig-pill-button-open" : ""}`,
					"aria-haspopup": "menu",
					"aria-expanded": open,
					title: writable ? t("menuTitle") : t("readOnly"),
					disabled: !writable,
					onClick: () => {
						setOpen((value) => !value);
					},
					children: [
						(0, react_jsx_runtime.jsxs)("svg", {
							className: "dsh-ig-pill-icon",
							width: "13",
							height: "13",
							viewBox: "0 0 16 16",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "1.6",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							"aria-hidden": "true",
							children: [
								(0, react_jsx_runtime.jsx)("rect", {
									x: "1.5",
									y: "2.5",
									width: "13",
									height: "11",
									rx: "2"
								}),
								(0, react_jsx_runtime.jsx)("circle", {
									cx: "5.5",
									cy: "6.5",
									r: "1.3"
								}),
								(0, react_jsx_runtime.jsx)("path", { d: "M14.5 10.5l-3.2-3.2-6.3 6.2" })
							]
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: "dsh-ig-pill-provider",
							children: pillButtonLabel(current, PILL_PROVIDER_LABELS[lang][current], snapshot.value, currentChannel?.label)
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: `dsh-ig-pill-caret${open ? " dsh-ig-pill-caret-open" : ""}`,
							"aria-hidden": "true",
							children: (0, react_jsx_runtime.jsx)("svg", {
								width: "10",
								height: "10",
								viewBox: "0 0 16 16",
								fill: "none",
								stroke: "currentColor",
								strokeWidth: "2",
								strokeLinecap: "round",
								strokeLinejoin: "round",
								children: (0, react_jsx_runtime.jsx)("path", { d: "M4 10l4-4 4 4" })
							})
						})
					]
				}), open && menuStyle !== null ? (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ig-pill-menu",
					role: "menu",
					"aria-label": t("menuTitle"),
					style: menuStyle,
					children: [
						(0, react_jsx_runtime.jsx)("div", {
							className: "dsh-ig-pill-menu-title",
							children: t("menuTitle")
						}),
						menuEntries.map(({ provider, channel }) => {
							const channelId = channel?.id;
							const modelOptions = pillModelOptionsOf(provider, snapshot.value, channelId);
							const active = provider === current && (provider !== "openai-compat" || currentChannel?.id === channelId);
							const currentModel = active ? pillModelOf(provider, snapshot.value, channelId) : "";
							const unavailable = provider === "comfyui" && modelOptions.length === 0 && !active;
							return (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: modelOptions.length > 0 ? "menuitem" : "menuitemradio",
								"aria-checked": modelOptions.length > 0 ? void 0 : active,
								className: `dsh-ig-pill-option${active ? " dsh-ig-pill-option-active" : ""}`,
								disabled: pending !== void 0 || unavailable,
								onClick: () => {
									select(provider, void 0, channelId);
								},
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: `dsh-ig-pill-dot ${dotClassOf(provider, channelId)}`,
										"aria-hidden": "true"
									}),
									(0, react_jsx_runtime.jsxs)("span", {
										className: "dsh-ig-pill-option-text",
										children: [(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-pill-option-name",
											children: channel?.label ?? PILL_PROVIDER_LABELS[lang][provider]
										}), (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-pill-option-sub",
											children: subtitleOf(provider, modelOptions.length === 0, channelId)
										})]
									}),
									active && modelOptions.length === 0 ? (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-pill-check",
										"aria-hidden": "true",
										children: (0, react_jsx_runtime.jsx)("svg", {
											width: "13",
											height: "13",
											viewBox: "0 0 16 16",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "2.2",
											strokeLinecap: "round",
											strokeLinejoin: "round",
											children: (0, react_jsx_runtime.jsx)("path", { d: "M2.5 8.5l3.5 3.5 7-8" })
										})
									}) : null
								]
							}), modelOptions.map((model) => {
								const selected = active && model === currentModel;
								return (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									role: "menuitemradio",
									"aria-checked": selected,
									className: `dsh-ig-pill-option dsh-ig-pill-model-option${selected ? " dsh-ig-pill-option-active" : ""}`,
									disabled: pending !== void 0,
									onClick: () => {
										select(provider, model, channelId);
									},
									children: [(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-pill-model-name",
										children: model
									}), selected ? (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-pill-check",
										"aria-hidden": "true",
										children: (0, react_jsx_runtime.jsx)("svg", {
											width: "13",
											height: "13",
											viewBox: "0 0 16 16",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "2.2",
											strokeLinecap: "round",
											strokeLinejoin: "round",
											children: (0, react_jsx_runtime.jsx)("path", { d: "M2.5 8.5l3.5 3.5 7-8" })
										})
									}) : null]
								}, model);
							})] }, channelId === void 0 ? provider : pillTargetKey("openai-compat", channelId));
						}),
						error.length > 0 ? (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-pill-error",
							role: "alert",
							children: [
								t("switchFailed"),
								"：",
								error
							]
						}) : null
					]
				}) : null]
			});
		}
		/** Styles for the pill and its fixed-position menu; injected by the client entry. */
		const PROVIDER_PILL_STYLE = `
.dsh-ig-pill-root{position:relative;display:inline-flex;align-items:center;height:28px}
.dsh-ig-pill-button{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 9px 0 8px;border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:14px;background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-secondary,#4b5563);font:inherit;font-size:13px;line-height:20px;cursor:pointer;transition:border-color .15s,background .15s,color .15s;-webkit-user-select:none;user-select:none}
.dsh-ig-pill-button:hover:not(:disabled){border-color:var(--dsw-alias-label-dimmed,#9ca3af);color:var(--dsw-alias-label-primary,#111827)}
.dsh-ig-pill-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4c78ff);outline-offset:1px}
.dsh-ig-pill-button:disabled{opacity:.5;cursor:not-allowed}
.dsh-ig-pill-button-open{border-color:var(--dsw-alias-brand-primary,#4c78ff);color:var(--dsw-alias-label-primary,#111827)}
.dsh-ig-pill-icon{flex:none;color:var(--dsw-alias-brand-primary,#4c78ff)}
.dsh-ig-pill-provider{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-ig-pill-caret{display:inline-flex;flex:none;transition:transform .15s}
.dsh-ig-pill-caret-open{transform:rotate(180deg)}
@container (max-width:700px){
  .dsh-ig-pill-caret{display:none}
  .dsh-ig-pill-button{padding:0 7px 0 6px}
}
.dsh-ig-pill-menu{position:fixed;z-index:1000;min-width:264px;max-width:min(320px,calc(100vw - 24px));padding:6px;border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:12px;background:var(--dsw-alias-bg-layer-3,#fff);box-shadow:0 12px 32px rgba(0,0,0,.16),0 2px 8px rgba(0,0,0,.08);max-height:min(320px,calc(100vh - 48px));overflow-y:auto}
.dsh-ig-pill-menu-title{padding:6px 8px 4px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary,#6b7280)}
.dsh-ig-pill-option{display:flex;width:100%;align-items:center;gap:9px;padding:7px 8px;border:0;border-radius:8px;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer}
.dsh-ig-pill-option:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2,#f3f4f6)}
.dsh-ig-pill-option:disabled{opacity:.6;cursor:default}
.dsh-ig-pill-option:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4c78ff);outline-offset:-2px}
.dsh-ig-pill-option-active{background:var(--dsw-alias-brand-primary-soft,rgba(76,120,255,.10))}
.dsh-ig-pill-dot{flex:none;width:7px;height:7px;border-radius:50%}
.dsh-ig-pill-dot-ok{background:#22c55e}
.dsh-ig-pill-dot-missing{background:#9ca3af}
.dsh-ig-pill-dot-neutral{background:#4c78ff}
.dsh-ig-pill-option-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.dsh-ig-pill-option-name{font-size:12.5px;font-weight:500;color:var(--dsw-alias-label-primary,#111827);line-height:1.2}
.dsh-ig-pill-option-sub{font-size:11px;color:var(--dsw-alias-label-tertiary,#6b7280);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-ig-pill-model-option{padding-left:24px}
.dsh-ig-pill-model-name{flex:1;min-width:0;font-size:12px;color:var(--dsw-alias-label-secondary,#4b5563);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-ig-pill-check{flex:none;color:var(--dsw-alias-brand-primary,#4c78ff)}
.dsh-ig-pill-error{margin-top:4px;padding:6px 8px;border-radius:8px;background:rgba(239,68,68,.08);color:#ef4444;font-size:11.5px;line-height:1.4;word-break:break-all}
`;
		//#endregion
		//#region lib/types/client/index.js
		console.info(`[dsh-image-gen] canvas bundle 2026-11-09T14:12:16.334Z`);
		/** Right-sidebar tab-type registration id (DSH 0.1.5 `sidebarRightTabs`). */
		const SIDEBAR_STUDIO_TAB_ID = "dsh-image-gen/studio";
		/** The tab kind: a page type opened by kind, recognizing no resource address. */
		const SIDEBAR_STUDIO_TAB_KIND = "dsh-image-gen-studio";
		/**
		* Required browser services. The settings form reader is deliberately absent:
		* DSH 0.1.7 serves it as `configForms` (keyed by the Loader entry id) while
		* 0.1.5/0.1.6 expose `settingsScope` (keyed by the legacy namespace), so it is
		* probed at runtime in `apply`. A static inject of either name would park this
		* fiber forever on hosts from the other generation — the issue #55 failure.
		*/
		const inject = [
			"slots",
			"connection",
			"remote",
			"locale"
		];
		/** Host with neither settings generation: reads empty, writes refuse, never throws. */
		function degradedScope() {
			return {
				getSnapshot: () => ({
					value: void 0,
					writable: false,
					status: "unavailable"
				}),
				subscribe: () => () => {},
				set: async () => false
			};
		}
		/** Mount the settings card, generated-image card, and native conversation gallery view. */
		function apply(ctx) {
			const configForms = ctx.get("configForms");
			const settingsScopeApi = configForms === void 0 ? ctx.get("settingsScope") : void 0;
			const scope = configForms?.get("image-gen") ?? settingsScopeApi?.bind({ namespace: "image-generation" }) ?? degradedScope();
			const locale = ctx.get("locale");
			const promotion = { enabled: false };
			ctx.effect(() => installDatalistScrollFix() || (() => {}), "dsh-image-gen: datalist scroll handling");
			ctx.inject(["sessions"], (owner) => {
				const sessions = owner.get("sessions");
				if (typeof sessions?.binding !== "function" || typeof sessions.list?.subscribe !== "function") return;
				const selection = createCanvasSessionSelection();
				owner.effect(() => startConversationLandings(sessions, selection), "dsh-image-gen: live canvas images");
				owner.inject(["uiSession"], (uiOwner) => {
					const current = uiOwner.get("uiSession")?.adapter?.current;
					if (typeof current?.getSnapshot !== "function" || typeof current.subscribe !== "function") return;
					uiOwner.effect(() => selection.bind(current), "dsh-image-gen: current canvas session");
				});
			});
			ctx.effect(() => {
				const style = document.createElement("style");
				style.dataset.plugin = "dsh-image-gen";
				style.textContent = `${PLUGIN_STYLE}\n${GIF_STYLE}\n${STUDIO_STYLE}\n${INSPIRATION_STYLE}\n${PROVIDER_PILL_STYLE}`;
				const themeStyle = document.createElement("style");
				themeStyle.dataset.plugin = "dsh-image-gen";
				themeStyle.textContent = TL_THEME_CSS;
				document.head.appendChild(style);
				document.head.appendChild(themeStyle);
				setCanvasStyleAnchor(themeStyle);
				return () => {
					setCanvasStyleAnchor(null);
					style.remove();
					themeStyle.remove();
				};
			}, "dsh-image-gen: styles");
			if (typeof indexedDB !== "undefined") {
				const request = indexedDB.deleteDatabase("dsh_image_gen_canvas");
				request.onerror = () => {};
				request.onblocked = () => {};
			}
			const register = ctx.slots.register.bind(ctx.slots);
			ctx.inject(["uiConversation"], (owner) => {
				const uiConversation = asModernUiConversation(owner.get("uiConversation"));
				if (uiConversation === void 0) throw new Error("dsh-image-gen: uiConversation has an incompatible interface");
				promotion.enabled = true;
				const ownerRegister = owner.slots.register.bind(owner.slots);
				owner.effect(() => uiConversation.events.register(createImageResultDefinition()), "dsh-image-gen: promoted image result node");
				owner.slots.inject("conversation.chat.node", () => ownerRegister({
					name: "conversation.chat.node",
					key: IMAGE_RESULT_NODE_KIND,
					inject: () => ({ locale })
				}, PromotedImageResultNode));
			});
			const credentialListeners = /* @__PURE__ */ new Set();
			const notifyCredentialsUpdated = () => {
				for (const listener of credentialListeners) listener();
			};
			ctx.effect(() => {
				const remote = ctx.get("remote");
				if (typeof remote?.$on !== "function") return () => {};
				return remote.$on("credentials/reference-updated", notifyCredentialsUpdated);
			}, "dsh-image-gen: credential events");
			const credentialEvents = { listen(callback) {
				credentialListeners.add(callback);
				return () => {
					credentialListeners.delete(callback);
				};
			} };
			const injectSettingsItem = (owner) => {
				const ownerRegister = owner.slots.register.bind(owner.slots);
				const injectSettingsFace = () => ({
					scope,
					credentials: credentialsProxy,
					credentialsAvailable,
					locale,
					credentialEvents
				});
				owner.slots.inject("plugins.bundle.config", () => ownerRegister({
					name: "plugins.bundle.config",
					key: "@forever-lwy/dsh-image-gen",
					locale,
					inject: injectSettingsFace
				}, ImageGenerationSettingsCard));
				owner.slots.inject("settings.plugin.item", () => ownerRegister({
					name: "settings.plugin.item",
					key: IMAGE_GENERATION_NAMESPACE,
					inject: injectSettingsFace
				}, ImageGenerationSettingsCard));
			};
			const injectComposerPill = (owner) => {
				const ownerRegister = owner.slots.register.bind(owner.slots);
				owner.slots.inject("conversation.input.right", () => ownerRegister({
					name: "conversation.input.right",
					id: "image-provider",
					order: 10,
					inject: () => ({
						scope,
						credentials: credentialsProxy,
						locale,
						credentialEvents
					})
				}, ImageProviderPill));
			};
			const credentialsRef = { current: asCredentialsRemote(ctx.get("remote.credentials")) ?? credentialsFromLegacyConnection(ctx.get("connection")) };
			/** Stable delegating remote so the host-cached inject face never goes stale. */
			const credentialsProxy = {
				describe(refs) {
					const remote = credentialsRef.current;
					return remote === void 0 ? Promise.resolve({ ok: false }) : remote.describe(refs);
				},
				set(ref, value) {
					const remote = credentialsRef.current;
					return remote === void 0 ? Promise.resolve({
						ok: false,
						error: { message: "credentials service unavailable" }
					}) : remote.set(ref, value);
				},
				get unset() {
					const remote = credentialsRef.current;
					return remote?.unset?.bind(remote);
				}
			};
			/** False while the host core exposes no credentials service (preview cores). */
			const credentialsAvailable = () => credentialsRef.current !== void 0;
			injectSettingsItem(ctx);
			injectComposerPill(ctx);
			ctx.inject(["remote.credentials"], (remoteCtx) => {
				const credentials = asCredentialsRemote(remoteCtx.get("remote.credentials"));
				if (credentials === void 0) {
					console.warn("dsh-image-gen: remote.credentials resolved with an incompatible interface; key settings stay degraded");
					return;
				}
				credentialsRef.current = credentials;
				notifyCredentialsUpdated();
			});
			ctx.slots.inject("tool.call.toolview", () => register({
				name: "tool.call.toolview",
				key: "generate_image",
				inject: () => ({
					locale,
					promoted: promotion.enabled
				})
			}, GeneratedImageCard));
			ctx.slots.inject("tool.call.toolview", () => register({
				name: "tool.call.toolview",
				key: "generate_images",
				inject: () => ({
					locale,
					promoted: promotion.enabled
				})
			}, GeneratedImagesCard));
			ctx.slots.inject("tool.call.toolview", () => register({
				name: "tool.call.toolview",
				key: "edit_image",
				inject: () => ({
					locale,
					promoted: promotion.enabled
				})
			}, GeneratedImageCard));
			ctx.slots.inject("conversation.view", () => register({
				name: "conversation.view",
				id: "gallery",
				order: 20,
				label: () => {
					return (locale?.getSnapshot?.()?.active)?.startsWith("en") ? "Gallery" : "画廊";
				},
				inject: () => ({
					locale,
					credentialEvents
				})
			}, GalleryViewTab));
			ctx.inject(["sidebarRightTabs"], (owner) => {
				const sidebarTabs = owner.get("sidebarRightTabs");
				const sidebarTitle = () => {
					return (locale?.getSnapshot?.()?.active)?.startsWith("en") ? "Image Studio" : "图像工作台";
				};
				owner.effect(() => sidebarTabs.register({
					id: SIDEBAR_STUDIO_TAB_ID,
					kind: SIDEBAR_STUDIO_TAB_KIND,
					priority: "extension",
					title: () => sidebarTitle(),
					guide: [{
						order: 100,
						title: () => sidebarTitle()
					}]
				}), "dsh-image-gen: sidebar studio tab type");
				const ownerRegister = owner.slots.register.bind(owner.slots);
				owner.slots.inject("sidebar.right.pane.tab", () => ownerRegister({
					name: "sidebar.right.pane.tab",
					key: SIDEBAR_STUDIO_TAB_ID,
					inject: () => ({
						locale,
						credentialEvents,
						inSidebar: true,
						defaultTab: "studio",
						initialCanvasSurface: "infinite"
					})
				}, GalleryViewTab));
			});
		}
		function asModernUiConversation(value) {
			if (value === null || typeof value !== "object") return void 0;
			const events = value.events;
			if (events === null || typeof events !== "object") return void 0;
			return typeof events.register === "function" ? value : void 0;
		}
		function asCredentialsRemote(value) {
			if (value === null || typeof value !== "object") return void 0;
			const candidate = value;
			return typeof candidate.describe === "function" && typeof candidate.set === "function" ? candidate : void 0;
		}
		function credentialsFromLegacyConnection(value) {
			if (value === null || typeof value !== "object") return void 0;
			const credentials = value.api?.credentials;
			if (credentials === void 0 || typeof credentials.describe !== "function" || typeof credentials.set !== "function") return void 0;
			const legacy = credentials;
			return {
				async describe(refs) {
					const response = await legacy.describe({ refs });
					return response.result.ok ? {
						ok: true,
						value: response.result.value.credentials
					} : { ok: false };
				},
				async set(ref, credentialValue) {
					const response = await legacy.set({
						ref,
						value: credentialValue
					});
					return response.result.ok ? { ok: true } : {
						ok: false,
						error: response.result.error
					};
				}
			};
		}
		function emptyProviderRow() {
			return {
				expanded: false,
				label: "",
				model: "",
				models: [],
				editModel: "",
				baseURL: "",
				googleNative: false,
				keyInput: "",
				keyStatus: "checking",
				keyInfo: void 0,
				testing: false,
				testResult: void 0,
				fetchingModels: false,
				modelOptions: [],
				modelFetchMessage: "",
				modelFetchIsError: false,
				saving: false,
				message: "",
				messageIsError: false,
				workflows: [],
				activeWorkflow: "",
				timeoutSeconds: DEFAULT_COMFYUI_TIMEOUT_MS / 1e3,
				editFormat: "multipart",
				editExtraText: "",
				sizeTableText: "",
				generationQuality: "",
				qualityOptionsText: DEFAULT_COMPAT_QUALITIES.join(", "),
				generateExtraText: "",
				editSizeMode: "auto",
				outputFormat: "jpeg",
				watermark: true,
				background: "opaque"
			};
		}
		/** Settings field each cloud provider persists its model under. */
		const CLOUD_MODEL_FIELDS = {
			google: "googleModel",
			openai: "openaiModel",
			"openai-compat": "openaiCompatModel",
			seedream: "seedreamModel",
			dashscope: "dashscopeModel",
			xai: "xaiModel",
			zhipu: "zhipuModel"
		};
		/** Settings field each cloud provider persists its endpoint or base URL under. */
		const CLOUD_URL_FIELDS = {
			google: "googleEndpoint",
			openai: "openaiBaseURL",
			"openai-compat": "openaiCompatBaseURL",
			seedream: "seedreamBaseURL",
			dashscope: "dashscopeEndpoint",
			xai: "xaiBaseURL",
			zhipu: "zhipuBaseURL"
		};
		/** Dictionary key of each cloud provider's endpoint hint. */
		const CLOUD_HINT_KEYS = {
			google: "endpointHintGoogle",
			openai: "endpointHintOpenAI",
			"openai-compat": "endpointHintOpenAICompat",
			seedream: "endpointHintSeedream",
			dashscope: "endpointHintDashScope",
			xai: "endpointHintXAI",
			zhipu: "endpointHintZhipu"
		};
		/** Config field a cloud provider persists its model under. */
		function modelFieldOf(provider) {
			return CLOUD_MODEL_FIELDS[provider];
		}
		/** Config field a cloud provider persists its endpoint or base URL under. */
		function baseURLFieldOf(provider) {
			return CLOUD_URL_FIELDS[provider];
		}
		/** Providers whose settings row offers the "pull models" button. */
		function modelPullSupported(_provider) {
			return true;
		}
		/** Serialize the extra-fields record into editor text; empty record becomes ''. */
		function editExtraTextOf(value) {
			if (value === void 0 || Object.keys(value).length === 0) return "";
			try {
				return JSON.stringify(value);
			} catch {
				return "";
			}
		}
		/** Persisted or selected edit-format value → row state; unknown values fall back to standard multipart. */
		function parseEditFormat(value) {
			return value === "jsonImageUrlArray" || value === "formReferenceImages" || value === "siliconflowJson" ? value : "multipart";
		}
		function compatChannelRowKey(channelId) {
			return `openai-compat:${channelId}`;
		}
		function compatRowFields(channel) {
			return {
				label: channel.label,
				model: channel.model,
				models: resolveOpenAICompatModels({
					openaiCompatModel: channel.model,
					openaiCompatModels: channel.models ?? []
				}),
				editModel: channel.editModel ?? "",
				baseURL: channel.baseURL,
				editFormat: parseEditFormat(channel.editFormat),
				editExtraText: editExtraTextOf(channel.editExtra),
				sizeTableText: editExtraTextOf(channel.sizes),
				generationQuality: channel.quality ?? "",
				qualityOptionsText: (channel.qualityOptions !== void 0 && channel.qualityOptions.length > 0 ? channel.qualityOptions : DEFAULT_COMPAT_QUALITIES).join(", "),
				generateExtraText: editExtraTextOf(channel.extraBody),
				editSizeMode: channel.editSizeMode === "selected" ? "selected" : "auto"
			};
		}
		/** Build one row per provider from persisted settings, including ComfyUI extras. */
		function rowsFromSettings(value) {
			const rows = {};
			for (const provider of IMAGE_PROVIDERS) rows[provider] = {
				...emptyProviderRow(),
				model: modelOf(provider, value),
				baseURL: baseURLOf(provider, value),
				...provider === "google" ? { googleNative: value?.googleNative === true } : {},
				...provider === "openai" ? { sizeTableText: editExtraTextOf(value?.openaiSizes) } : {},
				...provider === "comfyui" ? {
					workflows: resolveComfyUIWorkflows(value ?? {}),
					activeWorkflow: activeComfyUIWorkflow(value ?? {})?.name ?? "",
					timeoutSeconds: Math.max(1, Math.round((value?.comfyuiTimeoutMs ?? 3e5) / 1e3))
				} : {},
				...provider === "openai-compat" ? compatRowFields(resolveOpenAICompatChannels(value ?? {})[0]) : {},
				...provider === "seedream" ? {
					outputFormat: value?.seedreamOutputFormat === "png" ? "png" : "jpeg",
					watermark: value?.seedreamWatermark !== false,
					background: value?.seedreamBackground === "transparent" ? "transparent" : "opaque"
				} : {}
			};
			for (const channel of resolveOpenAICompatChannels(value ?? {}).slice(1)) rows[compatChannelRowKey(channel.id)] = {
				...emptyProviderRow(),
				...compatRowFields(channel)
			};
			return rows;
		}
		/** Edit each provider independently, pick an explicit default, and verify keys inline. */
		function ImageGenerationSettingsCard(props) {
			const [open] = (0, react.useState)(true);
			const [snapshot, setSnapshot] = (0, react.useState)(() => props.scope.getSnapshot());
			const [health, setHealth] = (0, react.useState)();
			const state = settingsState(snapshot, health);
			const settingsWritable = state === "ready";
			const [lang, setLang] = (0, react.useState)(() => props.locale?.getSnapshot?.()?.active?.startsWith("en") ? "en" : "zh");
			const [defaultProvider, setDefaultProvider] = (0, react.useState)(() => props.scope.getSnapshot().value?.provider ?? "google");
			const [providerMessage, setProviderMessage] = (0, react.useState)("");
			const [providerMessageIsError, setProviderMessageIsError] = (0, react.useState)(false);
			const [cloudTimeoutSeconds, setCloudTimeoutSeconds] = (0, react.useState)(() => (props.scope.getSnapshot().value?.cloudTimeoutMs ?? 15e4) / 1e3);
			const [cloudTimeoutMessage, setCloudTimeoutMessage] = (0, react.useState)("");
			const [saveToWorkspace, setSaveToWorkspace] = (0, react.useState)(() => props.scope.getSnapshot().value?.saveToWorkspace ?? true);
			const [workspaceFolder, setWorkspaceFolder] = (0, react.useState)(() => props.scope.getSnapshot().value?.workspaceFolder ?? "dsh-image-gen");
			const [showPill, setShowPill] = (0, react.useState)(() => props.scope.getSnapshot().value?.showProviderPill === true);
			const [uiMessage, setUiMessage] = (0, react.useState)("");
			const [uiMessageIsError, setUiMessageIsError] = (0, react.useState)(false);
			const [workspaceMessage, setWorkspaceMessage] = (0, react.useState)("");
			const [workspaceMessageIsError, setWorkspaceMessageIsError] = (0, react.useState)(false);
			const [rows, setRows] = (0, react.useState)(() => rowsFromSettings(props.scope.getSnapshot().value));
			const [compatChannels, setCompatChannels] = (0, react.useState)(() => resolveOpenAICompatChannels(props.scope.getSnapshot().value ?? {}).slice(1));
			const [keyTick, setKeyTick] = (0, react.useState)(0);
			const [subStatus, setSubStatus] = (0, react.useState)(() => ({
				"chatgpt-sub": { state: "unknown" },
				"grok-sub": { state: "unknown" },
				"google-sub": { state: "unknown" }
			}));
			const [subTick, setSubTick] = (0, react.useState)(0);
			const [subBusy, setSubBusy] = (0, react.useState)({});
			const [subPending, setSubPending] = (0, react.useState)([]);
			(0, react.useEffect)(() => {
				const sync = () => {
					setSnapshot(props.scope.getSnapshot());
				};
				const unsubscribe = props.scope.subscribe(sync);
				sync();
				return unsubscribe;
			}, [props.scope]);
			(0, react.useEffect)(() => {
				if (!open || snapshot.mode === "memory") return void 0;
				const controller = new AbortController();
				fetchSettingsHealth(controller.signal).then((value) => {
					if (!controller.signal.aborted) setHealth(value);
				});
				return () => {
					controller.abort();
				};
			}, [
				open,
				snapshot.status,
				snapshot.mode
			]);
			(0, react.useEffect)(() => {
				return props.locale?.subscribe?.(() => {
					setLang(props.locale?.getSnapshot?.()?.active?.startsWith("en") ? "en" : "zh");
				});
			}, [props.locale]);
			const credentialEvents = props.credentialEvents;
			(0, react.useEffect)(() => credentialEvents?.listen(() => {
				setKeyTick((tick) => tick + 1);
			}), [credentialEvents]);
			const pending = subPending;
			(0, react.useEffect)(() => {
				if (!open) return void 0;
				let active = true;
				const probe = async () => {
					try {
						const response = await fetch(SUBSCRIPTION_STATUS_ROUTE, {
							method: "POST",
							cache: "no-store"
						});
						if (!response.ok) return;
						const payload = await response.json();
						if (!active || payload.statuses === void 0) return;
						const next = {
							"chatgpt-sub": { state: "unknown" },
							"grok-sub": { state: "unknown" },
							"google-sub": { state: "unknown" }
						};
						for (const provider of SUBSCRIPTION_PROVIDERS) {
							const row = payload.statuses[provider];
							if (row?.state === "logged-in") next[provider] = {
								state: "logged-in",
								...typeof row.email === "string" ? { email: row.email } : {}
							};
							else if (row?.state === "logged-out") next[provider] = { state: "logged-out" };
						}
						setSubStatus(next);
						const landed = pending.filter((entry) => next[entry.provider].state === "logged-in");
						if (landed.length > 0) {
							setSubPending((current) => current.filter((entry) => next[entry.provider].state !== "logged-in"));
							for (const entry of landed) updateRow(entry.provider, {
								message: t("subLoginOk"),
								messageIsError: false
							});
						}
						const WINDOW_MS = 63e4;
						if (pending.filter((entry) => Date.now() - entry.startedAt > WINDOW_MS).length > 0) setSubPending((current) => current.filter((entry) => Date.now() - entry.startedAt <= WINDOW_MS));
					} catch {}
				};
				probe();
				let timer;
				if (pending.length > 0) timer = setInterval(() => {
					probe();
				}, 2e3);
				const onFocus = () => {
					probe();
				};
				window.addEventListener("focus", onFocus);
				return () => {
					active = false;
					if (timer !== void 0) clearInterval(timer);
					window.removeEventListener("focus", onFocus);
				};
			}, [
				open,
				subTick,
				pending
			]);
			/** Start a subscription login: the host registers PKCE and the loopback
			* catch server, then the browser opens the vendor's authorize URL. The
			* provider joins the pending set so the badge polls until login lands. */
			const subscriptionLogin = async (provider) => {
				updateRow(provider, {
					message: "",
					messageIsError: false
				});
				setSubBusy((current) => ({
					...current,
					[provider]: "login"
				}));
				try {
					const response = await fetch(SUBSCRIPTION_LOGIN_ROUTE, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ provider })
					});
					const payload = await response.json().catch(() => ({}));
					if (!response.ok || payload.ok !== true || typeof payload.url !== "string") {
						const detail = typeof payload.error === "string" ? payload.error : payload.error?.message;
						throw new Error(detail ?? `HTTP ${String(response.status)}`);
					}
					setSubPending((current) => [...current.filter((entry) => entry.provider !== provider), {
						provider,
						startedAt: Date.now()
					}]);
					window.open(payload.url, "_blank", "noopener");
					updateRow(provider, {
						message: t("subWaitingLogin"),
						messageIsError: false
					});
				} catch (cause) {
					updateRow(provider, {
						message: cause instanceof Error ? cause.message : String(cause),
						messageIsError: true
					});
				} finally {
					setSubBusy((current) => {
						const next = { ...current };
						delete next[provider];
						return next;
					});
				}
			};
			/** Sign out one subscription account; nothing else changes. */
			const subscriptionLogout = async (provider) => {
				setSubBusy((current) => ({
					...current,
					[provider]: "logout"
				}));
				try {
					const response = await fetch(SUBSCRIPTION_LOGIN_ROUTE, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							provider,
							action: "logout"
						})
					});
					if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
					updateRow(provider, {
						message: "",
						messageIsError: false
					});
				} catch (cause) {
					updateRow(provider, {
						message: cause instanceof Error ? cause.message : String(cause),
						messageIsError: true
					});
				} finally {
					setSubBusy((current) => {
						const next = { ...current };
						delete next[provider];
						return next;
					});
					setSubTick((tick) => tick + 1);
				}
			};
			const t = (keyName, params) => {
				let text = (lang === "en" ? DICT.en : DICT.zh)[keyName] || DICT.zh[keyName] || keyName;
				if (params) for (const [k, v] of Object.entries(params)) text = text.replace(`{${k}}`, v);
				return text;
			};
			const settingsMessage = state === "ready" ? void 0 : t({
				loading: "settingsLoading",
				remote: "settingsRemote",
				unavailable: "settingsUnavailable",
				readOnly: "settingsReadOnly",
				incompatible: "settingsIncompatible"
			}[state]);
			const saveSetting = async (field, value) => {
				if (settingsMessage !== void 0) throw new Error(settingsMessage);
				await writeSetting(props.scope, field, value, t("settingsWriteRejected"));
			};
			const providerLabels = {
				google: t("providerGoogle"),
				openai: t("providerOpenAI"),
				"openai-compat": t("providerOpenAICompat"),
				seedream: t("providerSeedream"),
				dashscope: t("providerDashScope"),
				xai: t("providerXAI"),
				zhipu: t("providerZhipu"),
				comfyui: t("providerComfyUI"),
				"chatgpt-sub": t("providerChatGPTSub"),
				"grok-sub": t("providerGrokSub"),
				"google-sub": t("providerGoogleSub")
			};
			(0, react.useEffect)(() => {
				const value = snapshot.value;
				setDefaultProvider(value?.provider ?? "google");
				setCloudTimeoutSeconds((value?.cloudTimeoutMs ?? 15e4) / 1e3);
				setSaveToWorkspace(value?.saveToWorkspace ?? true);
				setWorkspaceFolder(value?.workspaceFolder ?? "dsh-image-gen");
				setShowPill(value?.showProviderPill === true);
				setRows((current) => {
					const next = { ...current };
					for (const provider of IMAGE_PROVIDERS) next[provider] = {
						...current[provider],
						model: modelOf(provider, value),
						...provider === "openai-compat" ? compatRowFields(resolveOpenAICompatChannels(value ?? {})[0]) : {},
						baseURL: baseURLOf(provider, value),
						...provider === "comfyui" ? {
							workflows: resolveComfyUIWorkflows(value ?? {}),
							activeWorkflow: activeComfyUIWorkflow(value ?? {})?.name ?? "",
							timeoutSeconds: Math.max(1, Math.round((value?.comfyuiTimeoutMs ?? 3e5) / 1e3))
						} : {},
						...provider === "seedream" ? {
							outputFormat: value?.seedreamOutputFormat === "png" ? "png" : "jpeg",
							watermark: value?.seedreamWatermark !== false,
							background: value?.seedreamBackground === "transparent" ? "transparent" : "opaque"
						} : {}
					};
					for (const channel of resolveOpenAICompatChannels(value ?? {}).slice(1)) {
						const key = compatChannelRowKey(channel.id);
						next[key] = {
							...current[key] ?? emptyProviderRow(),
							...compatRowFields(channel)
						};
					}
					return next;
				});
			}, [snapshot]);
			const credentials = props.credentials;
			const credentialsAvailable = props.credentialsAvailable;
			(0, react.useEffect)(() => {
				let active = true;
				const targets = [...CLOUD_IMAGE_PROVIDERS.flatMap((provider) => {
					const keyRef = cloudCredentialRef(provider);
					return keyRef === void 0 ? [] : [{
						key: provider,
						keyRef
					}];
				}), ...compatChannels.map((channel) => ({
					key: compatChannelRowKey(channel.id),
					keyRef: channel.keyRef
				}))];
				if (!credentialsAvailable()) {
					setRows((current) => {
						const next = { ...current };
						for (const target of targets) next[target.key] = {
							...current[target.key] ?? emptyProviderRow(),
							keyStatus: "unavailable",
							keyInfo: void 0
						};
						return next;
					});
					return () => {
						active = false;
					};
				}
				for (const target of targets) {
					setRows((current) => ({
						...current,
						[target.key]: {
							...current[target.key],
							keyStatus: "checking"
						}
					}));
					credentials.describe([target.keyRef]).then((response) => {
						if (!active) return;
						const info = response.ok ? response.value?.[target.keyRef] : void 0;
						setRows((current) => ({
							...current,
							[target.key]: {
								...current[target.key],
								keyStatus: response.ok ? info?.configured ? "configured" : "missing" : "unknown",
								keyInfo: info
							}
						}));
					}).catch(() => {
						if (!active) return;
						setRows((current) => ({
							...current,
							[target.key]: {
								...current[target.key],
								keyStatus: "unknown"
							}
						}));
					});
				}
				return () => {
					active = false;
				};
			}, [
				credentials,
				credentialsAvailable,
				keyTick,
				compatChannels
			]);
			const updateRow = (target, patch) => {
				setRows((current) => ({
					...current,
					[target]: {
						...current[target],
						...patch
					}
				}));
			};
			/** The only action that ever changes the default provider; saving a key never does. */
			const selectDefaultProvider = (provider) => {
				setDefaultProvider(provider);
				setProviderMessage("");
				setProviderMessageIsError(false);
				saveSetting("provider", provider).catch((cause) => {
					setDefaultProvider(snapshot.value?.provider ?? "google");
					setProviderMessage(cause instanceof Error ? cause.message : String(cause));
					setProviderMessageIsError(true);
				});
			};
			const saveProviderRow = async (provider, channel) => {
				const target = channel === void 0 ? provider : compatChannelRowKey(channel.id);
				const row = rows[target];
				updateRow(target, {
					saving: true,
					message: "",
					messageIsError: false
				});
				try {
					if (channel !== void 0) {
						const label = row.label.trim();
						if (label.length === 0) throw new Error(t("channelNameRequired"));
						const updated = {
							...channel,
							label,
							baseURL: row.baseURL.trim(),
							model: row.model.trim(),
							models: resolveOpenAICompatModels({
								openaiCompatModel: row.model,
								openaiCompatModels: row.models
							}),
							editModel: row.editModel.trim(),
							quality: row.generationQuality.trim(),
							qualityOptions: [...new Set(row.qualityOptionsText.split(",").map((value) => value.trim()).filter(Boolean))],
							extraBody: parseExtraFields(row.generateExtraText, t("editExtraInvalid")),
							editSizeMode: row.editSizeMode,
							editFormat: row.editFormat,
							editExtra: parseExtraFields(row.editExtraText, t("editExtraInvalid")),
							sizes: parseSizeTable(row.sizeTableText, t("sizeTableInvalid"))
						};
						const nextChannels = compatChannels.some((entry) => entry.id === channel.id) ? compatChannels.map((entry) => entry.id === channel.id ? updated : entry) : [...compatChannels, updated];
						await saveSetting("openaiCompatChannels", nextChannels);
						setCompatChannels(nextChannels);
						if (row.keyInput.trim().length > 0) {
							if (!credentialsAvailable()) throw new Error(t("credentialsUnavailable"));
							const response = await props.credentials.set(channel.keyRef, row.keyInput.trim());
							if (!response.ok) throw new Error(response.error?.message ?? t("saveKeyFailed"));
							updateRow(target, {
								keyInput: "",
								keyStatus: "configured"
							});
						}
					} else if (provider === "comfyui") {
						const entries = row.workflows.map((entry) => ({
							name: entry.name.trim(),
							json: entry.json,
							presetPrompt: (entry.presetPrompt ?? "").trim()
						}));
						for (const entry of entries) {
							if (entry.name.length === 0) throw new Error(t("workflowNameRequired"));
							validateComfyUIWorkflowJson(entry.json);
						}
						if (new Set(entries.map((entry) => entry.name)).size !== entries.length) throw new Error(t("workflowDuplicateName"));
						const activeEntry = entries.find((entry) => entry.name === row.activeWorkflow) ?? entries[0];
						await saveSetting("comfyuiBaseURL", row.baseURL);
						await saveSetting("comfyuiWorkflows", entries);
						await saveSetting("comfyuiActiveWorkflow", activeEntry === void 0 ? "" : activeEntry.name);
						await saveSetting("comfyuiWorkflowJson", activeEntry === void 0 ? "" : activeEntry.json);
						await saveSetting("comfyuiWorkflowName", activeEntry === void 0 ? "" : activeEntry.name);
						await saveSetting("comfyuiTimeoutMs", Math.max(1, Math.round(row.timeoutSeconds)) * 1e3);
					} else if (isSubscriptionProvider(provider)) await Promise.resolve();
					else {
						const editExtra = provider === "openai-compat" ? parseExtraFields(row.editExtraText, t("editExtraInvalid")) : {};
						const sizeTable = provider === "openai" || provider === "openai-compat" ? parseSizeTable(row.sizeTableText, t("sizeTableInvalid")) : {};
						const generateExtra = provider === "openai-compat" ? parseExtraFields(row.generateExtraText, t("editExtraInvalid")) : {};
						if (provider === "openai") for (const tiers of Object.values(sizeTable)) for (const size of Object.values(tiers)) validateOfficialSize(row.model, size);
						await saveSetting(modelFieldOf(provider), row.model);
						await saveSetting(baseURLFieldOf(provider), row.baseURL);
						if (provider === "google") await saveSetting("googleNative", row.googleNative);
						if (provider === "openai") await saveSetting("openaiSizes", sizeTable);
						if (provider === "openai-compat") {
							await saveSetting("openaiCompatLabel", row.label.trim());
							await saveSetting("openaiCompatModels", resolveOpenAICompatModels({
								openaiCompatModel: row.model,
								openaiCompatModels: row.models
							}));
							await saveSetting("openaiCompatEditModel", row.editModel.trim());
							await saveSetting("openaiCompatEditFormat", row.editFormat);
							await saveSetting("openaiCompatEditExtra", editExtra);
							await saveSetting("openaiCompatSizes", sizeTable);
							await saveSetting("openaiCompatQuality", row.generationQuality.trim());
							await saveSetting("openaiCompatQualityOptions", [...new Set(row.qualityOptionsText.split(",").map((value) => value.trim()).filter(Boolean))]);
							await saveSetting("openaiCompatExtraBody", generateExtra);
							await saveSetting("openaiCompatEditSizeMode", row.editSizeMode);
						}
						if (provider === "seedream") {
							await saveSetting("seedreamOutputFormat", row.outputFormat);
							await saveSetting("seedreamWatermark", row.watermark);
							await saveSetting("seedreamBackground", row.background);
						}
						if (row.keyInput.trim().length > 0) {
							const keyRef = cloudCredentialRef(provider);
							if (keyRef === void 0) throw new Error(t("comfyuiNoKey"));
							if (!credentialsAvailable()) throw new Error(t("credentialsUnavailable"));
							const response = await props.credentials.set(keyRef, row.keyInput.trim());
							if (!response.ok) throw new Error(response.error?.message ?? t("saveKeyFailed"));
							updateRow(target, {
								keyInput: "",
								keyStatus: "configured"
							});
						}
					}
					updateRow(target, {
						message: t("saved"),
						messageIsError: false,
						testResult: void 0,
						modelFetchMessage: "",
						modelFetchIsError: false
					});
				} catch (cause) {
					updateRow(target, {
						message: cause instanceof Error ? cause.message : String(cause),
						messageIsError: true
					});
				} finally {
					updateRow(target, { saving: false });
				}
			};
			const addCompatChannel = () => {
				const id = `channel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
				const channel = {
					id,
					label: `OpenAI 兼容 ${compatChannels.length + 2}`,
					keyRef: openAICompatKeyRef(id),
					baseURL: "",
					model: "",
					models: [],
					qualityOptions: [...DEFAULT_COMPAT_QUALITIES]
				};
				setCompatChannels((current) => [...current, channel]);
				setRows((current) => ({
					...current,
					[compatChannelRowKey(id)]: {
						...emptyProviderRow(),
						...compatRowFields(channel),
						expanded: true
					}
				}));
			};
			const removeCompatChannel = async (channel) => {
				if (!window.confirm(t("removeChannelConfirm", { label: channel.label }))) return;
				const target = compatChannelRowKey(channel.id);
				if (!(snapshot.value?.openaiCompatChannels?.some((entry) => entry.id === channel.id) === true)) {
					setCompatChannels((current) => current.filter((entry) => entry.id !== channel.id));
					setRows((current) => {
						const next = { ...current };
						delete next[target];
						return next;
					});
					return;
				}
				let removed = false;
				updateRow(target, {
					saving: true,
					message: "",
					messageIsError: false
				});
				try {
					const nextChannels = compatChannels.filter((entry) => entry.id !== channel.id);
					await saveSetting("openaiCompatChannels", nextChannels);
					if (snapshot.value?.openaiCompatActiveChannel === channel.id) await saveSetting("openaiCompatActiveChannel", "default");
					removed = true;
					setCompatChannels(nextChannels);
					setRows((current) => {
						const next = { ...current };
						delete next[target];
						return next;
					});
				} catch (cause) {
					updateRow(target, {
						message: cause instanceof Error ? cause.message : String(cause),
						messageIsError: true
					});
				} finally {
					if (!removed) updateRow(target, { saving: false });
				}
			};
			/** These actions use host settings, so drafts must be saved before making a request. */
			const providerActionBlockMessage = (provider, channel) => {
				const target = channel === void 0 ? provider : compatChannelRowKey(channel.id);
				const row = rows[target];
				if (row.keyInput.trim().length > 0) return t("saveKeyFirst");
				if (isSubscriptionProvider(provider)) return void 0;
				const address = row.baseURL.trim();
				if (address.length === 0) return t("endpointRequired");
				if (address !== (channel === void 0 ? baseURLOf(provider, props.scope.getSnapshot().value) : channel.baseURL).trim()) return t("saveEndpointFirst");
				if (provider === "google" && row.googleNative !== (props.scope.getSnapshot().value?.googleNative === true)) return t("saveGoogleProtocolFirst");
			};
			/** Localize the host's missing-address error while preserving upstream details. */
			const providerErrorMessage = (message) => message === "Base URL is not configured" ? t("savedEndpointMissing") : message ?? t("testFailed");
			/** Probe through the host route so the browser side never touches credential values. */
			const testConnection = async (provider, channel) => {
				const target = channel === void 0 ? provider : compatChannelRowKey(channel.id);
				const blocked = providerActionBlockMessage(provider, channel);
				if (blocked !== void 0) {
					updateRow(target, {
						message: blocked,
						messageIsError: false,
						testResult: void 0
					});
					return;
				}
				updateRow(target, {
					testing: true,
					testResult: void 0,
					message: "",
					messageIsError: false
				});
				try {
					const response = await fetch(TEST_CONNECTION_ROUTE, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							provider,
							...channel === void 0 ? {} : { channel: channel.id }
						})
					});
					if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
					updateRow(target, { testResult: await response.json() });
				} catch (cause) {
					updateRow(target, { testResult: {
						ok: false,
						reason: "error",
						message: cause instanceof Error ? cause.message : String(cause)
					} });
				} finally {
					updateRow(target, { testing: false });
				}
			};
			/** Pull the provider's image-capable model ids through the host route (Google and the OpenAI family). */
			const fetchProviderModels = async (provider, channel) => {
				const target = channel === void 0 ? provider : compatChannelRowKey(channel.id);
				const blocked = providerActionBlockMessage(provider, channel);
				if (blocked !== void 0) {
					updateRow(target, {
						modelFetchMessage: blocked,
						modelFetchIsError: false
					});
					return;
				}
				updateRow(target, {
					fetchingModels: true,
					modelFetchMessage: "",
					modelFetchIsError: false
				});
				try {
					const response = await fetch(TEST_CONNECTION_ROUTE, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							provider,
							action: "models",
							...channel === void 0 ? {} : { channel: channel.id }
						})
					});
					if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
					const payload = await response.json();
					if (payload.ok && Array.isArray(payload.models)) {
						const models = payload.models.filter((id) => typeof id === "string");
						updateRow(target, {
							modelOptions: models,
							modelFetchMessage: models.length > 0 ? t("modelsFound", { n: String(models.length) }) : t("modelsNone"),
							modelFetchIsError: models.length === 0
						});
					} else if (payload.reason === "missing-key") updateRow(target, {
						modelFetchMessage: t("badgeMissing"),
						modelFetchIsError: true
					});
					else if (payload.reason === "unauthorized") updateRow(target, {
						modelFetchMessage: t("testUnauthorized"),
						modelFetchIsError: true
					});
					else updateRow(target, {
						modelFetchMessage: providerErrorMessage(payload.message),
						modelFetchIsError: true
					});
				} catch (cause) {
					updateRow(target, {
						modelFetchMessage: cause instanceof Error ? cause.message : String(cause),
						modelFetchIsError: true
					});
				} finally {
					updateRow(target, { fetchingModels: false });
				}
			};
			const clearProviderKey = async (provider, channel) => {
				const target = channel === void 0 ? provider : compatChannelRowKey(channel.id);
				const keyRef = channel === void 0 ? cloudCredentialRef(provider) : channel.keyRef;
				if (keyRef === void 0) return;
				if (typeof props.credentials.unset !== "function") {
					updateRow(target, {
						message: t("clearKeyUnsupported"),
						messageIsError: true
					});
					return;
				}
				updateRow(target, {
					saving: true,
					message: "",
					messageIsError: false
				});
				try {
					const response = await props.credentials.unset(keyRef);
					if (!response.ok) throw new Error(response.error?.message ?? t("clearKeyFailed"));
					updateRow(target, {
						keyStatus: "missing",
						keyInput: "",
						testResult: void 0,
						message: t("keyCleared"),
						messageIsError: false
					});
				} catch (cause) {
					updateRow(target, {
						message: cause instanceof Error ? cause.message : String(cause),
						messageIsError: true
					});
				} finally {
					updateRow(target, { saving: false });
				}
			};
			const testResultText = (result) => {
				if (result === void 0) return "";
				if (result.ok) return t("testOk");
				if (result.reason === "missing-key") return t("badgeMissing");
				if (result.reason === "unauthorized") return t("testUnauthorized");
				return `${t("testFailed")}${result.message !== void 0 && result.message.length > 0 ? `: ${providerErrorMessage(result.message)}` : ""}`;
			};
			const badgeOf = (provider, channel) => {
				if (provider === "comfyui") return {
					text: t("comfyuiNoKey"),
					className: "dsh-ig-badge dsh-ig-badge-neutral"
				};
				if (isSubscriptionProvider(provider)) {
					const status = subStatus[provider].state;
					if (status === "logged-in") return {
						text: t("subBadgeLoggedIn"),
						className: "dsh-ig-badge dsh-ig-badge-ok"
					};
					if (status === "logged-out") return {
						text: t("subBadgeLoggedOut"),
						className: "dsh-ig-badge dsh-ig-badge-missing"
					};
					return {
						text: t("subBadgeUnknown"),
						className: "dsh-ig-badge dsh-ig-badge-neutral"
					};
				}
				const target = channel === void 0 ? provider : compatChannelRowKey(channel.id);
				const status = rows[target].keyStatus;
				if (status === "checking") return {
					text: t("badgeChecking"),
					className: "dsh-ig-badge dsh-ig-badge-neutral dsh-ig-badge-checking"
				};
				if (status === "configured") return {
					text: t("badgeConfigured"),
					className: "dsh-ig-badge dsh-ig-badge-ok"
				};
				if (status === "missing") return {
					text: t("badgeMissing"),
					className: "dsh-ig-badge dsh-ig-badge-missing"
				};
				if (status === "unavailable") return {
					text: t("badgeUnavailable"),
					className: "dsh-ig-badge dsh-ig-badge-neutral"
				};
				return {
					text: t("badgeUnknown"),
					className: "dsh-ig-badge dsh-ig-badge-neutral"
				};
			};
			const importWorkflow = async (event) => {
				const file = event.target.files?.[0];
				event.target.value = "";
				if (file === void 0) return;
				updateRow("comfyui", {
					message: "",
					messageIsError: false
				});
				try {
					if (file.size > 5242880) throw new Error(t("workflowTooLarge"));
					const json = await file.text();
					validateComfyUIWorkflowJson(json);
					const name = uniqueComfyUIWorkflowName(file.name, rows.comfyui.workflows.map((entry) => entry.name));
					setRows((current) => ({
						...current,
						comfyui: {
							...current.comfyui,
							workflows: [...current.comfyui.workflows, {
								name,
								json
							}],
							activeWorkflow: current.comfyui.activeWorkflow.length > 0 ? current.comfyui.activeWorkflow : name
						}
					}));
					updateRow("comfyui", {
						message: t("workflowImported", { name }),
						messageIsError: false
					});
				} catch (cause) {
					updateRow("comfyui", {
						message: cause instanceof Error ? cause.message : String(cause),
						messageIsError: true
					});
				}
			};
			/** Renaming the active entry keeps the active selection following its new name. */
			const renameWorkflow = (index, name) => {
				setRows((current) => {
					const previous = current.comfyui.workflows[index];
					const workflows = current.comfyui.workflows.map((entry, position) => position === index ? {
						...entry,
						name
					} : entry);
					const activeWorkflow = previous !== void 0 && previous.name === current.comfyui.activeWorkflow ? name : current.comfyui.activeWorkflow;
					return {
						...current,
						comfyui: {
							...current.comfyui,
							workflows,
							activeWorkflow
						}
					};
				});
			};
			/** Removing the active entry moves the selection to the first remaining workflow. */
			const removeWorkflow = (index) => {
				setRows((current) => {
					const previous = current.comfyui.workflows[index];
					const workflows = current.comfyui.workflows.filter((_entry, position) => position !== index);
					const activeWorkflow = previous !== void 0 && previous.name === current.comfyui.activeWorkflow ? workflows[0]?.name ?? "" : current.comfyui.activeWorkflow;
					return {
						...current,
						comfyui: {
							...current.comfyui,
							workflows,
							activeWorkflow
						}
					};
				});
			};
			/** Editing one entry's preset leaves the rest of the entry untouched. */
			const setWorkflowPreset = (index, presetPrompt) => {
				setRows((current) => {
					const workflows = current.comfyui.workflows.map((entry, position) => position === index ? {
						...entry,
						presetPrompt
					} : entry);
					return {
						...current,
						comfyui: {
							...current.comfyui,
							workflows
						}
					};
				});
			};
			const commitCloudTimeout = () => {
				if (!Number.isInteger(cloudTimeoutSeconds) || cloudTimeoutSeconds < 5 || cloudTimeoutSeconds > 3600) {
					setCloudTimeoutSeconds((snapshot.value?.cloudTimeoutMs ?? 15e4) / 1e3);
					return;
				}
				const next = cloudTimeoutSeconds * 1e3;
				if (next === (snapshot.value?.cloudTimeoutMs ?? 15e4)) return;
				setCloudTimeoutMessage("");
				saveSetting("cloudTimeoutMs", next).catch((cause) => {
					setCloudTimeoutSeconds((snapshot.value?.cloudTimeoutMs ?? 15e4) / 1e3);
					setCloudTimeoutMessage(cause instanceof Error ? cause.message : String(cause));
				});
			};
			/** Workspace checkbox persists immediately, like every other toggle on this card. */
			const toggleSaveToWorkspace = (next) => {
				setSaveToWorkspace(next);
				setWorkspaceMessage("");
				setWorkspaceMessageIsError(false);
				saveSetting("saveToWorkspace", next).catch((cause) => {
					setSaveToWorkspace(snapshot.value?.saveToWorkspace ?? true);
					setWorkspaceMessage(cause instanceof Error ? cause.message : String(cause));
					setWorkspaceMessageIsError(true);
				});
			};
			/** Folder input persists on Enter or blur; no save button needed. */
			const commitWorkspaceFolder = () => {
				const next = workspaceFolder.trim();
				if (next === (snapshot.value?.workspaceFolder ?? "dsh-image-gen")) return;
				setWorkspaceMessage("");
				setWorkspaceMessageIsError(false);
				saveSetting("workspaceFolder", next).then(() => {
					setWorkspaceMessage(t("saved"));
				}).catch((cause) => {
					setWorkspaceFolder(snapshot.value?.workspaceFolder ?? "dsh-image-gen");
					setWorkspaceMessage(cause instanceof Error ? cause.message : String(cause));
					setWorkspaceMessageIsError(true);
				});
			};
			/** The pill toggle saves immediately, like the default-provider radio. */
			const toggleShowPill = (next) => {
				setShowPill(next);
				setUiMessage("");
				setUiMessageIsError(false);
				saveSetting("showProviderPill", next).catch((cause) => {
					setShowPill(snapshot.value?.showProviderPill === true);
					setUiMessage(cause instanceof Error ? cause.message : String(cause));
					setUiMessageIsError(true);
				});
			};
			const renderCloudBody = (provider, channel) => {
				const target = channel === void 0 ? provider : compatChannelRowKey(channel.id);
				const row = rows[target];
				const update = (patch) => {
					updateRow(target, patch);
				};
				const modelListId = `dsh-ig-${target.replace(/[^A-Za-z0-9_-]/g, "-")}-model-options`;
				const officialEditFormat = provider === "openai-compat" ? compatEditFormat({
					openaiCompatBaseURL: row.baseURL,
					openaiCompatModel: row.editModel.trim() || row.model
				}) : "multipart";
				const automaticEditFormat = officialEditFormat !== "multipart";
				const editFormat = automaticEditFormat ? officialEditFormat : row.editFormat;
				const keyRef = channel === void 0 ? cloudCredentialRef(provider) ?? "" : channel.keyRef;
				const keyReadOnly = row.keyInfo?.writable === false;
				const keyUnavailable = !credentialsAvailable();
				const providerLabel = provider === "openai-compat" && row.label.trim().length > 0 ? row.label.trim() : providerLabels[provider];
				const compatModelChoices = provider === "openai-compat" ? resolveOpenAICompatModels({
					openaiCompatModel: row.model,
					openaiCompatModels: [...row.models, ...row.modelOptions]
				}) : [];
				return (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-ig-provider-body",
					children: (0, react_jsx_runtime.jsxs)("form", {
						onSubmit: (event) => {
							event.preventDefault();
							saveProviderRow(provider, channel);
						},
						children: [
							provider === "openai-compat" ? (0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-ig-field",
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ig-label",
									children: t("channelName")
								}), (0, react_jsx_runtime.jsx)("input", {
									className: "dsh-ig-input",
									value: row.label,
									onChange: (event) => {
										update({ label: event.target.value });
									},
									placeholder: providerLabels[provider],
									required: channel !== void 0,
									disabled: !settingsWritable
								})]
							}) : null,
							(0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("apiKeyLabel", { provider: providerLabel })
									}),
									(0, react_jsx_runtime.jsx)("input", {
										className: "dsh-ig-input",
										type: "password",
										autoComplete: "off",
										value: row.keyInput,
										onChange: (event) => {
											update({ keyInput: event.target.value });
										},
										placeholder: row.keyStatus === "configured" ? t("apiKeyPlaceholder") : "",
										disabled: !settingsWritable || keyReadOnly || keyUnavailable
									}),
									(0, react_jsx_runtime.jsxs)("span", {
										className: "dsh-ig-hint",
										children: [keyUnavailable ? t("credentialsUnavailable") : keyReadOnly ? t("keyReadOnly", { source: row.keyInfo?.source ?? "" }) : t("apiKeyHint", { key: keyRef }), channel === void 0 && API_KEY_CONSOLE_URLS[provider] !== void 0 ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [" ", (0, react_jsx_runtime.jsx)("a", {
											className: "dsh-ig-link",
											href: API_KEY_CONSOLE_URLS[provider],
											target: "_blank",
											rel: "noopener noreferrer",
											children: t("getApiKey")
										})] }) : null]
									})
								]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("endpoint")
									}),
									(0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-ig-input-group",
										children: [(0, react_jsx_runtime.jsx)("input", {
											className: "dsh-ig-input",
											type: "url",
											value: row.baseURL,
											onChange: (event) => {
												update({ baseURL: event.target.value });
											},
											required: true,
											disabled: !settingsWritable
										}), provider !== "openai-compat" ? (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dsh-ig-btn-reset",
											title: t("resetTitle"),
											onClick: () => {
												update({ baseURL: DEFAULT_BASE_URLS[provider] });
											},
											disabled: !settingsWritable,
											children: t("reset")
										}) : null]
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-hint",
										children: t(provider === "google" && row.googleNative ? "endpointHintGoogleNative" : CLOUD_HINT_KEYS[provider])
									})
								]
							}),
							provider === "google" ? (0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-ig-field",
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ig-label",
									children: t("googleProtocol")
								}), (0, react_jsx_runtime.jsxs)("select", {
									className: "dsh-ig-input",
									value: row.googleNative ? "native" : "interactions",
									onChange: (event) => {
										update({ googleNative: event.target.value === "native" });
									},
									disabled: !settingsWritable,
									children: [(0, react_jsx_runtime.jsx)("option", {
										value: "interactions",
										children: t("googleInteractions")
									}), (0, react_jsx_runtime.jsx)("option", {
										value: "native",
										children: t("googleNative")
									})]
								})]
							}) : null,
							(0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t(provider === "openai-compat" ? "defaultModel" : "model")
									}),
									modelPullSupported(provider) ? (0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-ig-input-group",
										children: [
											(0, react_jsx_runtime.jsx)("input", {
												className: "dsh-ig-input",
												value: row.model,
												onChange: (event) => {
													update({ model: event.target.value });
												},
												onBlur: () => {
													if (provider === "openai-compat") update({ models: resolveOpenAICompatModels({
														openaiCompatModel: row.model,
														openaiCompatModels: row.models
													}) });
												},
												list: modelListId,
												required: provider !== "openai-compat",
												disabled: !settingsWritable
											}),
											(0, react_jsx_runtime.jsx)("datalist", {
												id: modelListId,
												children: row.modelOptions.map((id) => (0, react_jsx_runtime.jsx)("option", { value: id }, id))
											}),
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dsh-ig-btn-secondary",
												disabled: row.fetchingModels || row.saving || !settingsWritable,
												onClick: () => {
													fetchProviderModels(provider, channel);
												},
												children: row.fetchingModels ? t("fetchingModels") : t("fetchModels")
											})
										]
									}) : (0, react_jsx_runtime.jsx)("input", {
										className: "dsh-ig-input",
										value: row.model,
										onChange: (event) => {
											update({ model: event.target.value });
										},
										required: true,
										disabled: !settingsWritable
									}),
									modelPullSupported(provider) ? row.modelFetchMessage.length > 0 ? (0, react_jsx_runtime.jsx)("span", {
										className: `dsh-ig-hint${row.modelFetchIsError ? " dsh-ig-hint-error" : ""}`,
										role: "status",
										children: row.modelFetchMessage
									}) : (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-hint",
										children: t("fetchModelsHint")
									}) : null
								]
							}),
							provider === "openai-compat" && compatModelChoices.length > 0 ? (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("availableModels")
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: "dsh-ig-model-picker",
										children: compatModelChoices.map((id) => {
											const isDefault = row.model.trim() === id;
											const checked = isDefault || row.models.includes(id);
											return (0, react_jsx_runtime.jsxs)("label", {
												className: "dsh-ig-check-row",
												title: id,
												children: [
													(0, react_jsx_runtime.jsx)("input", {
														type: "checkbox",
														checked,
														disabled: !settingsWritable || isDefault,
														onChange: (event) => {
															const models = event.target.checked ? [...row.models, id] : row.models.filter((model) => model !== id);
															update({ models: resolveOpenAICompatModels({
																openaiCompatModel: row.model,
																openaiCompatModels: models
															}) });
														}
													}),
													(0, react_jsx_runtime.jsx)("span", {
														className: "dsh-ig-model-option",
														children: id
													}),
													isDefault ? (0, react_jsx_runtime.jsx)("span", {
														className: "dsh-ig-model-default",
														children: t("defaultModelTag")
													}) : null
												]
											}, id);
										})
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-hint",
										children: t("availableModelsHint")
									})
								]
							}) : null,
							provider === "openai-compat" ? (0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("editModel")
									}),
									(0, react_jsx_runtime.jsx)("input", {
										className: "dsh-ig-input",
										value: row.editModel,
										onChange: (event) => {
											update({ editModel: event.target.value });
										},
										list: modelListId,
										disabled: !settingsWritable
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-hint",
										children: t("editModelHint")
									})
								]
							}) : null,
							provider === "openai-compat" ? (0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("editFormat")
									}),
									(0, react_jsx_runtime.jsxs)("select", {
										className: "dsh-ig-input",
										value: automaticEditFormat ? "__official__" : row.editFormat,
										onChange: (event) => {
											update({ editFormat: parseEditFormat(event.target.value) });
										},
										disabled: !settingsWritable || automaticEditFormat,
										children: [
											automaticEditFormat ? (0, react_jsx_runtime.jsx)("option", {
												value: "__official__",
												children: t("editFormatAutomatic")
											}) : null,
											(0, react_jsx_runtime.jsx)("option", {
												value: "multipart",
												children: t("editFormatMultipart")
											}),
											(0, react_jsx_runtime.jsx)("option", {
												value: "jsonImageUrlArray",
												children: t("editFormatJsonImageUrlArray")
											}),
											(0, react_jsx_runtime.jsx)("option", {
												value: "formReferenceImages",
												children: t("editFormatFormReferenceImages")
											}),
											(0, react_jsx_runtime.jsx)("option", {
												value: "siliconflowJson",
												children: t("editFormatSiliconFlow")
											})
										]
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-hint",
										children: t(editFormat === "siliconflowJson" ? "editFormatSiliconFlowHint" : "editFormatHint")
									})
								]
							}) : null,
							provider === "seedream" ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								(0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-ig-field",
									children: [
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-label",
											children: t("arkOutputFormat")
										}),
										(0, react_jsx_runtime.jsxs)("select", {
											className: "dsh-ig-input",
											value: row.outputFormat,
											onChange: (event) => {
												update({ outputFormat: event.target.value === "png" ? "png" : "jpeg" });
											},
											disabled: !settingsWritable,
											children: [(0, react_jsx_runtime.jsx)("option", {
												value: "jpeg",
												children: t("arkOutputFormatJpeg")
											}), (0, react_jsx_runtime.jsx)("option", {
												value: "png",
												children: t("arkOutputFormatPng")
											})]
										}),
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-hint",
											children: t("arkOutputFormatHint")
										})
									]
								}),
								(0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-ig-field",
									children: [
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-label",
											children: t("arkWatermark")
										}),
										(0, react_jsx_runtime.jsxs)("select", {
											className: "dsh-ig-input",
											value: row.watermark ? "on" : "off",
											onChange: (event) => {
												update({ watermark: event.target.value === "on" });
											},
											disabled: !settingsWritable,
											children: [(0, react_jsx_runtime.jsx)("option", {
												value: "on",
												children: t("arkWatermarkOn")
											}), (0, react_jsx_runtime.jsx)("option", {
												value: "off",
												children: t("arkWatermarkOff")
											})]
										}),
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-hint",
											children: t("arkWatermarkHint")
										})
									]
								}),
								(0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-ig-field",
									children: [
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-label",
											children: t("arkBackground")
										}),
										(0, react_jsx_runtime.jsxs)("select", {
											className: "dsh-ig-input",
											value: row.background,
											onChange: (event) => {
												update({ background: event.target.value === "transparent" ? "transparent" : "opaque" });
											},
											disabled: !settingsWritable,
											children: [(0, react_jsx_runtime.jsx)("option", {
												value: "opaque",
												children: t("arkBackgroundOpaque")
											}), (0, react_jsx_runtime.jsx)("option", {
												value: "transparent",
												children: t("arkBackgroundTransparent")
											})]
										}),
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-hint",
											children: t("arkBackgroundHint")
										})
									]
								})
							] }) : null,
							provider === "openai" || provider === "openai-compat" ? (0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("sizeTable")
									}),
									(0, react_jsx_runtime.jsx)("textarea", {
										className: "dsh-ig-input dsh-ig-textarea",
										value: row.sizeTableText,
										onChange: (event) => {
											update({ sizeTableText: event.target.value });
										},
										rows: 3,
										disabled: !settingsWritable
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-hint",
										children: t("sizeTableHint")
									})
								]
							}) : null,
							provider === "openai-compat" ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								(0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-ig-field",
									children: [
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-label",
											children: t("defaultQuality")
										}),
										(0, react_jsx_runtime.jsx)("input", {
											className: "dsh-ig-input",
											value: row.generationQuality,
											onChange: (event) => {
												update({ generationQuality: event.target.value });
											},
											placeholder: "high",
											disabled: !settingsWritable
										}),
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-hint",
											children: t("defaultQualityHint")
										})
									]
								}),
								(0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-ig-field",
									children: [(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("qualityOptions")
									}), (0, react_jsx_runtime.jsx)("input", {
										className: "dsh-ig-input",
										value: row.qualityOptionsText,
										onChange: (event) => {
											update({ qualityOptionsText: event.target.value });
										},
										disabled: !settingsWritable
									})]
								}),
								(0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-ig-field",
									children: [
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-label",
											children: t("generateExtra")
										}),
										(0, react_jsx_runtime.jsx)("textarea", {
											className: "dsh-ig-input dsh-ig-textarea",
											value: row.generateExtraText,
											onChange: (event) => {
												update({ generateExtraText: event.target.value });
											},
											placeholder: "{\"watermark\":false}",
											rows: 2,
											disabled: !settingsWritable
										}),
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-hint",
											children: t("generateExtraHint")
										})
									]
								})
							] }) : null,
							provider === "openai-compat" && (editFormat === "jsonImageUrlArray" || editFormat === "qwenJson" || editFormat === "siliconflowJson") ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [editFormat === "jsonImageUrlArray" ? (0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-ig-field",
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ig-label",
									children: t("editSizeMode")
								}), (0, react_jsx_runtime.jsxs)("select", {
									className: "dsh-ig-input",
									value: row.editSizeMode,
									onChange: (event) => {
										update({ editSizeMode: event.target.value === "selected" ? "selected" : "auto" });
									},
									disabled: !settingsWritable,
									children: [(0, react_jsx_runtime.jsx)("option", {
										value: "auto",
										children: t("editSizeAuto")
									}), (0, react_jsx_runtime.jsx)("option", {
										value: "selected",
										children: t("editSizeSelected")
									})]
								})]
							}) : null, (0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("editExtra")
									}),
									(0, react_jsx_runtime.jsx)("textarea", {
										className: "dsh-ig-input dsh-ig-textarea",
										value: row.editExtraText,
										onChange: (event) => {
											update({ editExtraText: event.target.value });
										},
										placeholder: t("editExtraPlaceholder"),
										rows: 2,
										disabled: !settingsWritable
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-hint",
										children: t("editExtraHint")
									})
								]
							})] }) : null,
							(0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-row-actions",
								children: [(0, react_jsx_runtime.jsx)("p", {
									className: `dsh-ig-status${row.messageIsError ? " dsh-ig-status-error" : ""}`,
									role: "status",
									children: row.message || testResultText(row.testResult)
								}), (0, react_jsx_runtime.jsxs)("span", {
									className: "dsh-ig-row-buttons",
									children: [
										(0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dsh-ig-btn-secondary",
											disabled: row.testing || row.saving,
											onClick: () => {
												testConnection(provider, channel);
											},
											children: row.testing ? t("testing") : t("testConnection")
										}),
										row.keyStatus === "configured" && !keyReadOnly ? (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dsh-ig-btn-secondary dsh-ig-btn-danger",
											disabled: row.saving,
											onClick: () => {
												clearProviderKey(provider, channel);
											},
											children: t("clearKey")
										}) : null,
										(0, react_jsx_runtime.jsx)("button", {
											className: "dsh-ig-save",
											type: "submit",
											disabled: row.saving || row.testing || row.fetchingModels || !settingsWritable,
											children: row.saving ? t("saving") : t("save")
										})
									]
								})]
							})
						]
					})
				});
			};
			const renderComfyUIBody = () => {
				const row = rows.comfyui;
				return (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-ig-provider-body",
					children: (0, react_jsx_runtime.jsxs)("form", {
						onSubmit: (event) => {
							event.preventDefault();
							saveProviderRow("comfyui");
						},
						children: [
							(0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("endpoint")
									}),
									(0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-ig-input-group",
										children: [(0, react_jsx_runtime.jsx)("input", {
											className: "dsh-ig-input",
											type: "url",
											value: row.baseURL,
											onChange: (event) => {
												updateRow("comfyui", { baseURL: event.target.value });
											},
											required: true,
											disabled: !settingsWritable
										}), (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dsh-ig-btn-reset",
											title: t("resetTitle"),
											onClick: () => {
												updateRow("comfyui", { baseURL: DEFAULT_BASE_URLS.comfyui });
											},
											disabled: !settingsWritable,
											children: t("reset")
										})]
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-hint",
										children: t("endpointHintComfyUI")
									})
								]
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("workflow")
									}),
									(0, react_jsx_runtime.jsxs)("div", {
										className: "dsh-ig-file-row",
										children: [(0, react_jsx_runtime.jsxs)("label", {
											className: "dsh-ig-file-button",
											children: [(0, react_jsx_runtime.jsx)("input", {
												className: "dsh-ig-file-input",
												type: "file",
												accept: ".json,application/json",
												onChange: (event) => {
													importWorkflow(event);
												}
											}), t("workflowImport")]
										}), row.workflows.length === 0 ? (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-file-name",
											children: t("workflowMissing")
										}) : null]
									}),
									row.workflows.length > 0 ? (0, react_jsx_runtime.jsx)("ul", {
										className: "dsh-ig-workflow-list",
										children: row.workflows.map((entry, index) => (0, react_jsx_runtime.jsxs)("li", {
											className: "dsh-ig-workflow-row",
											children: [(0, react_jsx_runtime.jsxs)("div", {
												className: "dsh-ig-workflow-main",
												children: [
													(0, react_jsx_runtime.jsx)("label", {
														className: "dsh-ig-workflow-active",
														title: t("workflowActiveTitle"),
														children: (0, react_jsx_runtime.jsx)("input", {
															type: "radio",
															name: "dsh-ig-active-workflow",
															"aria-label": t("workflowActiveTitle"),
															checked: entry.name === row.activeWorkflow,
															onChange: () => {
																updateRow("comfyui", { activeWorkflow: entry.name });
															}
														})
													}),
													(0, react_jsx_runtime.jsx)("input", {
														className: "dsh-ig-input dsh-ig-workflow-name",
														value: entry.name,
														title: entry.name,
														onChange: (event) => {
															renameWorkflow(index, event.target.value);
														}
													}),
													(0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: "dsh-ig-btn-reset",
														onClick: () => {
															removeWorkflow(index);
														},
														children: t("workflowRemove")
													})
												]
											}), (0, react_jsx_runtime.jsx)("input", {
												className: "dsh-ig-input dsh-ig-workflow-preset",
												value: entry.presetPrompt ?? "",
												placeholder: t("workflowPresetPlaceholder"),
												title: t("workflowPresetTitle"),
												onChange: (event) => {
													setWorkflowPreset(index, event.target.value);
												}
											})]
										}, String(index)))
									}) : null,
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-hint",
										children: t("workflowHint")
									})
								]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("timeout")
									}),
									(0, react_jsx_runtime.jsx)("input", {
										className: "dsh-ig-input",
										type: "number",
										min: "1",
										max: "3600",
										step: "1",
										value: row.timeoutSeconds,
										onChange: (event) => {
											updateRow("comfyui", { timeoutSeconds: Number(event.target.value) });
										},
										required: true,
										disabled: !settingsWritable
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-hint",
										children: t("timeoutHint")
									})
								]
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-row-actions",
								children: [(0, react_jsx_runtime.jsx)("p", {
									className: `dsh-ig-status${row.messageIsError ? " dsh-ig-status-error" : ""}`,
									role: "status",
									children: row.message || testResultText(row.testResult)
								}), (0, react_jsx_runtime.jsxs)("span", {
									className: "dsh-ig-row-buttons",
									children: [(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-btn-secondary",
										disabled: row.testing,
										onClick: () => {
											testConnection("comfyui");
										},
										children: row.testing ? t("testing") : t("testConnection")
									}), (0, react_jsx_runtime.jsx)("button", {
										className: "dsh-ig-save",
										type: "submit",
										disabled: row.saving || !settingsWritable || row.workflows.length === 0,
										children: row.saving ? t("saving") : t("save")
									})]
								})]
							})
						]
					})
				});
			};
			/** Subscription rows: account login/logout, fixed model, edit limitation. */
			const renderSubscriptionBody = (provider) => {
				const row = rows[provider];
				const status = subStatus[provider];
				const busy = subBusy[provider];
				return (0, react_jsx_runtime.jsx)("div", {
					className: "dsh-ig-provider-body",
					children: (0, react_jsx_runtime.jsxs)("form", {
						onSubmit: (event) => {
							event.preventDefault();
							saveProviderRow(provider);
						},
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("subSectionTitle")
									}),
									(0, react_jsx_runtime.jsx)("p", {
										className: "dsh-ig-hint",
										children: t("subHint")
									}),
									(0, react_jsx_runtime.jsx)("p", {
										className: "dsh-ig-hint",
										role: "note",
										children: t("subProxyHint")
									})
								]
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("subAccountLabel")
									}),
									(0, react_jsx_runtime.jsx)("p", {
										className: "dsh-ig-hint",
										children: status.state === "logged-in" ? t("subAccountEmail", { email: status.email ?? "" }) : status.state === "logged-out" ? t("subAccountNone") : t("subBadgeUnknown")
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-row-buttons",
										children: status.state === "logged-in" ? (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dsh-ig-btn-secondary",
											disabled: busy !== void 0,
											onClick: () => {
												subscriptionLogout(provider);
											},
											children: busy === "logout" ? t("subLoggingOut") : t("subLogout")
										}) : (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dsh-ig-save",
											disabled: busy !== void 0,
											onClick: () => {
												subscriptionLogin(provider);
												setSubTick((tick) => tick + 1);
											},
											children: busy === "login" ? t("subLoggingIn") : t("subLogin")
										})
									})
								]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-label",
										children: t("subModelLabel")
									}),
									(0, react_jsx_runtime.jsx)("input", {
										className: "dsh-ig-input",
										type: "text",
										value: row.model,
										readOnly: true,
										disabled: true
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-hint",
										children: t("subModelHint")
									})
								]
							}),
							(0, react_jsx_runtime.jsx)("div", {
								className: "dsh-ig-field",
								children: (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ig-hint",
									children: t("subEditCapability")
								})
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-row-actions",
								children: [(0, react_jsx_runtime.jsx)("p", {
									className: `dsh-ig-status${row.messageIsError ? " dsh-ig-status-error" : ""}`,
									role: "status",
									children: row.message || testResultText(row.testResult)
								}), (0, react_jsx_runtime.jsxs)("span", {
									className: "dsh-ig-row-buttons",
									children: [(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dsh-ig-btn-secondary",
										disabled: row.testing,
										onClick: () => {
											testConnection(provider);
											setSubTick((tick) => tick + 1);
										},
										children: row.testing ? t("testing") : t("testConnection")
									}), (0, react_jsx_runtime.jsx)("button", {
										className: "dsh-ig-save",
										type: "submit",
										disabled: row.saving || !settingsWritable,
										children: row.saving ? t("saving") : t("save")
									})]
								})]
							})
						]
					})
				});
			};
			const renderProviderRow = (provider) => {
				const row = rows[provider];
				const badge = badgeOf(provider);
				const label = provider === "openai-compat" && row.label.trim().length > 0 ? row.label.trim() : providerLabels[provider];
				return (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ig-provider-row",
					children: [(0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-provider-head-row",
						children: [(0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dsh-ig-provider-head",
							"aria-expanded": row.expanded,
							onClick: () => {
								updateRow(provider, { expanded: !row.expanded });
							},
							children: [
								(0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ig-provider-name",
									children: label
								}),
								(0, react_jsx_runtime.jsxs)("span", {
									className: badge.className,
									title: badge.text,
									children: [(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-badge-dot",
										"aria-hidden": "true"
									}), badge.text]
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: `dsh-ig-provider-chevron ${row.expanded ? "dsh-ig-provider-chevron-open" : ""}`,
									"aria-hidden": "true",
									children: (0, react_jsx_runtime.jsx)("svg", {
										width: "12",
										height: "12",
										viewBox: "0 0 16 16",
										fill: "none",
										stroke: "currentColor",
										strokeWidth: "2",
										strokeLinecap: "round",
										strokeLinejoin: "round",
										children: (0, react_jsx_runtime.jsx)("path", { d: "M4 6l4 4 4-4" })
									})
								})
							]
						}), provider === "openai-compat" ? (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-ig-btn-secondary dsh-ig-channel-add",
							title: t("addCompatChannel"),
							"aria-label": t("addCompatChannel"),
							onClick: addCompatChannel,
							disabled: !settingsWritable,
							children: (0, react_jsx_runtime.jsx)("svg", {
								viewBox: "0 0 16 16",
								fill: "none",
								stroke: "currentColor",
								strokeWidth: "1.6",
								strokeLinecap: "round",
								"aria-hidden": "true",
								children: (0, react_jsx_runtime.jsx)("path", { d: "M8 3v10M3 8h10" })
							})
						}) : null]
					}), row.expanded ? provider === "comfyui" ? renderComfyUIBody() : isSubscriptionProvider(provider) ? renderSubscriptionBody(provider) : renderCloudBody(provider) : null]
				}, provider);
			};
			const renderCompatChannelRow = (channel) => {
				const target = compatChannelRowKey(channel.id);
				const row = rows[target];
				const badge = badgeOf("openai-compat", channel);
				return (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ig-provider-row dsh-ig-compat-channel-row",
					children: [(0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-ig-provider-head-row",
						children: [(0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dsh-ig-provider-head",
							"aria-expanded": row.expanded,
							onClick: () => {
								updateRow(target, { expanded: !row.expanded });
							},
							children: [
								(0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ig-provider-name",
									children: channel.label
								}),
								(0, react_jsx_runtime.jsxs)("span", {
									className: badge.className,
									title: badge.text,
									children: [(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-badge-dot",
										"aria-hidden": "true"
									}), badge.text]
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: `dsh-ig-provider-chevron ${row.expanded ? "dsh-ig-provider-chevron-open" : ""}`,
									"aria-hidden": "true",
									children: (0, react_jsx_runtime.jsx)("svg", {
										width: "12",
										height: "12",
										viewBox: "0 0 16 16",
										fill: "none",
										stroke: "currentColor",
										strokeWidth: "2",
										strokeLinecap: "round",
										strokeLinejoin: "round",
										children: (0, react_jsx_runtime.jsx)("path", { d: "M4 6l4 4 4-4" })
									})
								})
							]
						}), (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-ig-btn-secondary dsh-ig-btn-danger",
							disabled: row.saving || !settingsWritable,
							onClick: () => {
								removeCompatChannel(channel);
							},
							children: t("removeChannel")
						})]
					}), row.expanded ? renderCloudBody("openai-compat", channel) : null]
				}, target);
			};
			return (0, react_jsx_runtime.jsxs)("li", {
				className: "dsh-ig-card",
				children: [(0, react_jsx_runtime.jsx)("div", {
					className: "dsh-ig-head",
					children: (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-ig-head-text",
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: "dsh-ig-title",
							children: t("title")
						}), (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-ig-desc",
							children: t("description")
						})]
					})
				}), (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-ig-body",
					children: [
						settingsMessage !== void 0 ? (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-ig-status dsh-ig-status-readonly",
							role: "note",
							children: settingsMessage
						}) : null,
						(0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-field",
							children: [
								(0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ig-label",
									children: t("defaultProvider")
								}),
								(0, react_jsx_runtime.jsx)("div", {
									className: "dsh-ig-radios",
									role: "radiogroup",
									"aria-label": t("defaultProvider"),
									children: IMAGE_PROVIDERS.map((provider) => (0, react_jsx_runtime.jsxs)("label", {
										className: `dsh-ig-radio${defaultProvider === provider ? " dsh-ig-radio-checked" : ""}`,
										children: [(0, react_jsx_runtime.jsx)("input", {
											type: "radio",
											name: "dsh-ig-default-provider",
											checked: defaultProvider === provider,
											onChange: () => {
												selectDefaultProvider(provider);
											},
											disabled: !settingsWritable
										}), providerLabels[provider]]
									}, provider))
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ig-hint",
									children: t("defaultProviderHint")
								}),
								providerMessage.length > 0 ? (0, react_jsx_runtime.jsx)("span", {
									className: `dsh-ig-status${providerMessageIsError ? " dsh-ig-status-error" : ""}`,
									role: "status",
									children: providerMessage
								}) : null
							]
						}),
						(0, react_jsx_runtime.jsxs)("label", {
							className: "dsh-ig-field",
							children: [
								(0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ig-label",
									children: t("cloudTimeout")
								}),
								(0, react_jsx_runtime.jsx)("input", {
									className: "dsh-ig-input",
									type: "number",
									min: "5",
									max: "3600",
									step: "1",
									value: cloudTimeoutSeconds,
									onChange: (event) => {
										setCloudTimeoutSeconds(Number(event.target.value));
									},
									onBlur: () => {
										commitCloudTimeout();
									},
									onKeyDown: (event) => {
										if (event.key === "Enter") commitCloudTimeout();
									},
									required: true,
									disabled: !settingsWritable
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ig-hint",
									children: t("cloudTimeoutHint")
								}),
								cloudTimeoutMessage.length > 0 ? (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ig-status dsh-ig-status-error",
									role: "status",
									children: cloudTimeoutMessage
								}) : null
							]
						}),
						(0, react_jsx_runtime.jsx)("div", {
							className: "dsh-ig-providers",
							children: IMAGE_PROVIDERS.flatMap((provider) => [renderProviderRow(provider), ...provider === "openai-compat" ? compatChannels.map((channel) => renderCompatChannelRow(channel)) : []])
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-section",
							children: [
								(0, react_jsx_runtime.jsx)("span", {
									className: "dsh-ig-section-title",
									children: t("workspaceSection")
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: "dsh-ig-field",
									children: [(0, react_jsx_runtime.jsxs)("label", {
										className: "dsh-ig-check-row",
										children: [(0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: saveToWorkspace,
											onChange: (event) => {
												toggleSaveToWorkspace(event.target.checked);
											},
											disabled: !settingsWritable
										}), (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-label",
											children: t("saveToWorkspace")
										})]
									}), (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-hint",
										children: t("saveToWorkspaceHint")
									})]
								}),
								saveToWorkspace ? (0, react_jsx_runtime.jsxs)("label", {
									className: "dsh-ig-field",
									children: [
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-label",
											children: t("folder")
										}),
										(0, react_jsx_runtime.jsx)("input", {
											className: "dsh-ig-input",
											value: workspaceFolder,
											onChange: (event) => {
												setWorkspaceFolder(event.target.value);
											},
											onBlur: () => {
												commitWorkspaceFolder();
											},
											onKeyDown: (event) => {
												if (event.key === "Enter") commitWorkspaceFolder();
											},
											placeholder: "dsh-image-gen",
											disabled: !settingsWritable
										}),
										(0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-hint",
											children: t("folderHint")
										})
									]
								}) : null,
								workspaceMessage.length > 0 ? (0, react_jsx_runtime.jsx)("p", {
									className: `dsh-ig-status${workspaceMessageIsError ? " dsh-ig-status-error" : ""}`,
									role: "status",
									children: workspaceMessage
								}) : null
							]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-ig-section",
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: "dsh-ig-section-title",
								children: t("uiSection")
							}), (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-ig-field",
								children: [
									(0, react_jsx_runtime.jsxs)("label", {
										className: "dsh-ig-check-row",
										children: [(0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: showPill,
											onChange: (event) => {
												toggleShowPill(event.target.checked);
											},
											disabled: !settingsWritable
										}), (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-ig-label",
											children: t("showPill")
										})]
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: "dsh-ig-hint",
										children: t("showPillHint")
									}),
									uiMessage.length > 0 ? (0, react_jsx_runtime.jsx)("p", {
										className: `dsh-ig-status${uiMessageIsError ? " dsh-ig-status-error" : ""}`,
										role: "status",
										children: uiMessage
									}) : null
								]
							})]
						})
					]
				})]
			});
		}
		/** Keep the legacy Tool row for old DSH and hand modern results to the independent Chat node. */
		function modelOf(provider, value) {
			const stored = provider === "comfyui" ? activeComfyUIWorkflow(value ?? {})?.name : isSubscriptionProvider(provider) ? DEFAULT_MODELS[provider] : value?.[CLOUD_MODEL_FIELDS[provider]];
			if (provider === "seedream") return currentSeedreamModel(typeof stored === "string" ? stored : void 0);
			return typeof stored === "string" && stored.length > 0 ? stored : DEFAULT_MODELS[provider];
		}
		function baseURLOf(provider, value) {
			const stored = provider === "comfyui" ? value?.comfyuiBaseURL : isSubscriptionProvider(provider) ? "" : value?.[CLOUD_URL_FIELDS[provider]];
			return typeof stored === "string" && stored.length > 0 ? stored : DEFAULT_BASE_URLS[provider];
		}
		//#endregion
		exports.GeneratedImageCard = GeneratedImageCard;
		exports.GeneratedImagesCard = GeneratedImagesCard;
		exports.ImageGenerationSettingsCard = ImageGenerationSettingsCard;
		exports.PromotedImageResultNode = PromotedImageResultNode;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map