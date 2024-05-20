import type { CompletionItem, CompletionParams } from "vscode-languageserver";
import type { Workspace } from "../../index.js";

import { posIsIn } from "../../util/positions.js";

export function completionHandler(workspace: Workspace) {
    return function onCompletion(
        params: CompletionParams,
    ): CompletionItem[] {
        workspace.logger?.log(`[REQUEST] Completion, ${params.textDocument.uri}`);
        const completions = workspace.get(params.textDocument.uri)?.cachedValidationResult
            ?.completionItems;
        if (!completions) {
            workspace.logger?.log(
                `[RESPONSE] Completion, ${params.textDocument.uri}, no completions found.`,
            );
            return [];
        }
        const completionsInRange = completions.filter((completion) => posIsIn(params.position, completion.range));
        workspace.logger?.log(
            `[RESPONSE] Completion, ${params.textDocument.uri}, ${completions.length} completions found, ${completionsInRange.length} in range.`,
        );
        return completionsInRange.flatMap((completion) => completion.items);
    };
}
