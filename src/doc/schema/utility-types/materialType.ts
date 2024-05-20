import { CompletionItemKind, SemanticTokenTypes } from "vscode-languageserver";

import { Highlight } from "../../../lsp/models/highlight.js";
import { MATERIALS } from "../../../mythic/defaultData/materials.js";
import { includesIgnoreCase } from "../../../util/string.js";
import { SchemaString } from "../base-types/string.js";

export const SCHEMA_MATERIAL_TYPE = new SchemaString(Array.from(MATERIALS).map(m => ({
    matcher: m,
    completionItem: {
        kind: CompletionItemKind.EnumMember,
        label: m,
    },
})))
    .withName("material_type")
    .onPartialProcess((ws, doc, value, result) => {
        if (!includesIgnoreCase(MATERIALS, String(value))) {
            return;
        }

        result.highlights.unshift(
            new Highlight(
                doc.convertToRange(value.range),
                SemanticTokenTypes.enumMember,
            ),
        );
    });
