import type { CompletionItem, CompletionParams } from "vscode-languageserver";
import type { Workspace } from "../../index.js";

import { posIsIn } from "../../util/positions.js";

export function completionHandler(workspace: Workspace) {
    return function onCompletion(params: CompletionParams): CompletionItem[] {
        workspace.logger?.log(
            `[REQUEST] Completion, ${params.textDocument.uri}`,
        );
        const completions = workspace.get(params.textDocument.uri)
            ?.cachedValidationResult?.completionItems;
        if (!completions) {
            workspace.logger?.log(
                `[RESPONSE] Completion, ${params.textDocument.uri}, no completions found.`,
            );
            return [];
        }
        const doc = workspace.get(params.textDocument.uri);
        const validCompletions = completions.filter((completion) => {
            // workspace.logger?.log(
            //     `Checking if completion ${completion.items.map((item) => item.label).slice(0, 5).join(", ")}... with range ${JSON.stringify(completion.range)} is in position ${JSON.stringify(params.position)}.`,
            // );
            // const res = posIsIn(params.position, completion.range);
            // workspace.logger?.log(`Result: ${String(res)}`);
            // return res;
            return (
                posIsIn(params.position, completion.range)
                && ((doc
                && completion.conditions?.(workspace, doc, params.position))
                ?? true)
            );
        });
        workspace.logger?.log(
            `[RESPONSE] Completion, ${params.textDocument.uri}, ${completions.length} completions found, ${validCompletions.length} in range.`,
        );
        workspace.logger?.debug({
            validCompletions: validCompletions.map((completion) => ({
                range: completion.range,
                items: completion.items.map((item) => item.label),
            })),
        });
        return validCompletions.flatMap((completion) => completion.items);
    };
}
