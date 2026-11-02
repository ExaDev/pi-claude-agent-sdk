/**
 * Unit tests for thinking configuration: which models take the adaptive (effort) path and how each pi thinking level maps onto the SDK options. Model choices come from pi-ai's own catalogue by property, never by id.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Api, Model } from "@earendil-works/pi-ai";
import { getBuiltinModels } from "@earendil-works/pi-ai/providers/all";
import { buildProviderModels } from "../index.ts";
import {
    resolveThinkingOptions,
    supportsAdaptiveThinking as isAdaptive,
} from "../provider.ts";
import { MAX_LEGACY_THINKING_BUDGET } from "../constants.ts";

const catalogue: Model<Api>[] = getBuiltinModels("anthropic");

function firstModel(predicate: (model: Model<Api>) => boolean): Model<Api> {
    const model = catalogue.find(predicate);
    if (model === undefined) {
        throw new Error("pi-ai's anthropic catalogue has no matching model");
    }
    return model;
}

void describe("buildProviderModels", () => {
    void it("carries pi-ai's adaptive-thinking flag onto every registered model", () => {
        const registered = new Map(
            buildProviderModels().map((model) => [model.id, model])
        );
        for (const model of catalogue) {
            assert.equal(
                registered.get(model.id)?.compat?.forceAdaptiveThinking ===
                    true,
                isAdaptive(model),
                model.id
            );
        }
    });
});

void describe("resolveThinkingOptions", () => {
    void it("disables thinking when no level is requested", () => {
        assert.deepEqual(
            resolveThinkingOptions(
                firstModel(isAdaptive),
                undefined,
                undefined
            ),
            { thinking: { type: "disabled" } }
        );
    });

    void it("uses adaptive thinking with max effort for the max level on adaptive models", () => {
        const options = resolveThinkingOptions(
            firstModel(isAdaptive),
            "max",
            undefined
        );
        assert.deepEqual(options.thinking, {
            type: "adaptive",
            display: "summarized",
        });
        assert.equal(options.effort, "max");
        assert.equal(options.maxThinkingTokens, undefined);
    });

    void it("gives budget-based models the high budget for the max level", () => {
        const model = firstModel((m) => m.reasoning && !isAdaptive(m));
        const options = resolveThinkingOptions(model, "max", { high: 4096 });
        assert.equal(options.maxThinkingTokens, 4096);
        assert.equal(options.thinking, undefined);
        const defaulted = resolveThinkingOptions(model, "max", undefined);
        assert.equal(
            defaulted.maxThinkingTokens,
            Math.min(MAX_LEGACY_THINKING_BUDGET, model.maxTokens - 1)
        );
    });
});
