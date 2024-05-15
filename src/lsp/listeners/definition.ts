import type { DefinitionParams, LocationLink } from "vscode-languageserver";
import type { Workspace } from "../../index.js";

import { posIsIn } from "../../util/positions.js";

export function definitionHandler(workspace: Workspace) {
    return function ondDefinition({
        position,
        textDocument,
    }: DefinitionParams): LocationLink[] | null {
        workspace.logger?.log(`[REQUEST] Definition, ${textDocument.uri}`);

        const rangeLinks = workspace.get(textDocument.uri)
            ?.cachedValidationResult?.rangeLinks;

        if (!rangeLinks) {
            workspace.logger?.log(
                `[RESPONSE] Definition, ${textDocument.uri}, no rangeLinks found.`,
            );
            return null;
        }

        workspace.logger?.log({ rangeLinks });

        const linksInRange = rangeLinks.filter((link) => posIsIn(position, link.fromRange),
        );

        workspace.logger?.log(
            `[RESPONSE] Definition, ${textDocument.uri}, ${rangeLinks.length} rangeLinks found, ${linksInRange.length} in range.`,
        );

        const result = linksInRange.map((link) => ({
            targetUri: link.toDoc.uri.toString(),
            targetRange: link.toRange ?? link.toSelectionRange,
            targetSelectionRange: link.toSelectionRange,
            originSelectionRange: link.fromRange,
        }));

        workspace.logger?.log({ result });
        return result;
    };
}
