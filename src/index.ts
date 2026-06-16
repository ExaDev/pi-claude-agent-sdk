/**
 * Claude Agent SDK — standalone pi extension.
 *
 * Registers a custom pi provider (`claude-agent-sdk`) whose `streamSimple`
 * routes model calls through the Claude Agent SDK subprocess, so they draw from
 * the Claude Pro/Max subscription rate-limit pool instead of pi's per-token
 * Anthropic-OAuth path. Tool execution stays native to pi (deny-and-reroute),
 * so the host's bash override, permissions, etc. still apply.
 *
 * The provider is registered at load (its models appear in /model); the
 * optional SDK is imported only when `streamSimple` runs. Two history modes are
 * selectable via `exadev.claudeAgentSdk.mode` in settings.json: `flatten` (default,
 * robust) and `session` (SDK session resume, preserves real assistant turns).
 */

import type {
    Api,
    AssistantMessageEventStream,
    Context,
    Model,
    SimpleStreamOptions,
} from "@earendil-works/pi-ai";
import { getModels } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
    PROVIDER_API,
    PROVIDER_DISPLAY_NAME,
    PROVIDER_ID,
} from "./constants.ts";
import { loadAgentSdkSettings } from "./settings.ts";
import { streamClaudeAgentSdk } from "./provider.ts";

/** Per-pi-session SDK session cursor, used by `session` mode. Module-level: the
 *  factory runs once per process, so this is shared across the session. */
const sdkSessions = new Map<
    string,
    { sdkSessionId: string | undefined; sentCount: number; head: string }
>();

/** Build the model list from pi-ai's anthropic catalogue, preserving cost and
 *  the thinking-level map. `api` is the recognised `anthropic-messages`. */
function buildProviderModels() {
    return getModels("anthropic").map((model) => ({
        id: model.id,
        name: `${model.name} (SDK)`,
        api: PROVIDER_API,
        reasoning: model.reasoning,
        ...(model.thinkingLevelMap
            ? { thinkingLevelMap: model.thinkingLevelMap }
            : {}),
        input: model.input,
        cost: model.cost,
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
    }));
}

export default function (pi: ExtensionAPI): void {
    const streamSimple = (
        model: Model<Api>,
        context: Context,
        options: SimpleStreamOptions | undefined
    ): AssistantMessageEventStream => {
        // Read per turn so config changes (authMode, mode) take effect without a
        // reload; two small files, negligible against a subprocess spawn.
        const settings = loadAgentSdkSettings(process.cwd());
        return streamClaudeAgentSdk(model, context, options, {
            settings,
            sdkSessions,
        });
    };

    pi.registerProvider(PROVIDER_ID, {
        name: PROVIDER_DISPLAY_NAME,
        api: PROVIDER_API,
        // baseUrl is unused: streamSimple replaces the HTTP transport entirely.
        // A literal placeholder satisfies the "apiKey required when defining
        // models" rule; it is never sent — the SDK authenticates itself.
        baseUrl: PROVIDER_ID,
        apiKey: PROVIDER_ID,
        models: buildProviderModels(),
        streamSimple,
    });
}
