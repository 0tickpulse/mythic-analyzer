import type { Hover, HoverParams } from "vscode-languageserver";
import type { Workspace } from "../../index.js";

import { posIsIn } from "../../util/positions.js";

export function hoverHandler(workspace: Workspace) {
    return function onHover({
        position,
        textDocument,
    }: HoverParams): Hover | null {
        workspace.logger?.log(`[REQUEST] Hover, ${textDocument.uri}`);
        const hovers = workspace.get(textDocument.uri)?.cachedValidationResult?.hovers;
        if (!hovers) {
            workspace.logger?.log(`[RESPONSE] Hover, ${textDocument.uri}, no hovers found.`);
            return null;
        }
        for (const hover of hovers) {
            if (posIsIn(position, hover.range)) {
                return hover;
            }
        }
        workspace.logger?.log(`[RESPONSE] Hover, ${textDocument.uri}, no hovers in range.`);
        return null;
    };
}
