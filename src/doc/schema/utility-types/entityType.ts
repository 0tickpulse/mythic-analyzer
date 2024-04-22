import { SemanticTokenTypes } from "vscode-languageserver";

import { Highlight } from "../../../lsp/models/highlight.js";
import { ENTITIES } from "../../../mythic/defaultData/entities.js";
import { SchemaString } from "../base-types/string.js";

export const SCHEMA_ENTITY_TYPE = new SchemaString(ENTITIES)
    .withName("entity_type")
    .onPartialProcess((ws, doc, value, result) => {
        if (!ENTITIES.has((value.toJSON() as string).toUpperCase())) {
            return;
        }
        result.highlights.unshift(new Highlight(doc.convertToRange(value.range), SemanticTokenTypes.enumMember));
    });
