import type { Hover, HoverParams } from "vscode-languageserver";
import type { Workspace } from "../../index.js";

import { posIsIn } from "../../util/positions.js";

export function hoverHandler(workspace: Workspace) {
    return function onHover({
        position,
        textDocument,
    }: HoverParams): Hover | null {
        workspace.logger?.log(`[REQUEST] Hover, ${textDocument.uri}`);
        const hovers = workspace.get(textDocument.uri)?.cachedValidationResult
            ?.hovers;
        if (!hovers) {
            workspace.logger?.log(
                `[RESPONSE] Hover, ${textDocument.uri}, no hovers found.`,
            );
            return null;
        }
        const hoversInRange = hovers.filter((hover) => posIsIn(position, hover.range),
        );
        workspace.logger?.log(
            `[RESPONSE] Hover, ${textDocument.uri}, ${hovers.length} hovers found, ${hoversInRange.length} in range.`,
        );
        return hoversInRange.length === 0
            ? null
            : {
                contents: hoversInRange
                    .map((hover) => hover.contents)
                    .join("\n\n"),
                range: hoversInRange[0]!.range,
            };
    };
}
