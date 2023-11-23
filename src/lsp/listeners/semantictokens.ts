import type {
    SemanticTokens,
    SemanticTokensParams,
} from "vscode-languageserver";
import type { Workspace } from "../../index.js";

import { posCmp } from "../../util/positions.js";

export function semanticTokenHandler(workspace: Workspace) {
    return function onSemanticTokens({
        textDocument,
    }: SemanticTokensParams): SemanticTokens {
        workspace.logger?.log(`[REQUEST] Semantic Tokens, ${textDocument.uri}`);
        const doc = workspace.get(textDocument.uri);
        const highlights = doc?.cachedValidationResult?.highlights;
        if (!highlights) {
            // lsp spec allows null to be returned, but the typescript types don't. this should hopefully be fixed soon
            return null as unknown as SemanticTokens;
        }

        highlights.sort((a, b) => posCmp(a.range.start, b.range.start));

        let lastLine = 0,
            lastChar = 0;
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- this is the size of the array
        const tokens = new Array<number>(highlights.length * 5);
        let tokenIndex = 0;

        for (let i = 0; i < highlights.length; i++) {
            const highlight = highlights[i]!;
            const line = highlight.range.start.line - lastLine;
            const char
                = line === 0
                    ? highlight.range.start.character - lastChar
                    : highlight.range.start.character;
            const length
                = highlight.range.end.character - highlight.range.start.character;
            const type = highlight.colorIndex(workspace.semanticTokenTypes);
            tokens[tokenIndex++] = line;
            tokens[tokenIndex++] = char;
            tokens[tokenIndex++] = length;
            tokens[tokenIndex++] = type;
            tokens[tokenIndex++] = highlight.modifierBitFlag(
                workspace.semanticTokenModifiers,
            );
            lastLine = highlight.range.start.line;
            lastChar = highlight.range.start.character;
        }

        workspace.logger?.log(
            `[RESPONSE] Semantic Tokens, ${textDocument.uri}, ${highlights.length} highlights.`,
        );
        return { data: tokens };
    };
}
