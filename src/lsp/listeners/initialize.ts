import type { Workspace } from "../../index.js";
import type { InitializeParams, InitializeResult } from "vscode-languageserver";

export function initializeHandler(workspace: Workspace) {
    return function onInitialize(_: InitializeParams): InitializeResult {
        workspace.logger?.log("LSP connection initialized.");
        return {
            capabilities: {
                hoverProvider: true,
                semanticTokensProvider: {
                    full: true,
                    range: false,
                    legend: {
                        tokenTypes: workspace.semanticTokenTypes,
                        tokenModifiers: workspace.semanticTokenModifiers,
                    },
                },
            },
        };
    };
}
