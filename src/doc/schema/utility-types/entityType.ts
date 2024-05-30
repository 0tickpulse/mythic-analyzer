import { CompletionItemKind, SemanticTokenTypes } from "vscode-languageserver";

import { Highlight } from "../../../lsp/models/highlight.js";
import { includesIgnoreCase } from "../../../util/string.js";
import { SchemaString } from "../base-types/string.js";

export const SCHEMA_ENTITY_TYPE = new SchemaString((ws) => Array.from(ws.mythicData.entityIds).map(m => ({
    matcher: m,
    completionItem: {
        kind: CompletionItemKind.EnumMember,
        label: m,
    },
})))
    .withName("entity_type")
    .onPartialProcess((ws, doc, value, result) => {
        if (!includesIgnoreCase(ws.mythicData.entityIds, value.toString())) {
            return;
        }
        result.highlights.unshift(new Highlight(doc.convertToRange(value.range), SemanticTokenTypes.enumMember));
    });
