import { URI } from "vscode-uri";

import type { InitializeParams, InitializeResult } from "vscode-languageserver";
import type { Workspace } from "../../index.js";

export function initializeHandler(workspace: Workspace) {
    return async function onInitialize(
        params: InitializeParams,
    ): Promise<InitializeResult> {
        workspace.logger?.log(
            "LSP connection initialized. Loading all files...",
        );
        const uri = URI.parse(params.workspaceFolders![0]!.uri);
        await workspace.loadFolder(uri.fsPath);
        workspace.logger?.log(
            `Loaded ${workspace.docs.size} files. Processing...`,
        );
        for (const doc of workspace.docs.values()) {
            doc.partialProcess(workspace);
        }

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
                definitionProvider: true,
                completionProvider: {
                    triggerCharacters: ["-", " "],
                },
            },
        };
    };
}
