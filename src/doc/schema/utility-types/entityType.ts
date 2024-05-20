import { CompletionItemKind, SemanticTokenTypes } from "vscode-languageserver";

import { Highlight } from "../../../lsp/models/highlight.js";
import { ENTITIES } from "../../../mythic/defaultData/entities.js";
import { SchemaString } from "../base-types/string.js";
import { includesIgnoreCase } from "../../../util/string.js";

export const SCHEMA_ENTITY_TYPE = new SchemaString(Array.from(ENTITIES).map(m => ({
    matcher: m,
    completionItem: {
        kind: CompletionItemKind.EnumMember,
        label: m,
    },
})))
    .withName("entity_type")
    .onPartialProcess((ws, doc, value, result) => {
        if (!includesIgnoreCase(ENTITIES, value.toString())) {
            return;
        }
        result.highlights.unshift(new Highlight(doc.convertToRange(value.range), SemanticTokenTypes.enumMember));
    });
