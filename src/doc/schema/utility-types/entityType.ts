import { SemanticTokenTypes } from "vscode-languageserver";

import { Highlight } from "../../../lsp/models/highlight.js";
import { ENTITIES } from "../../../mythic/defaultData/entities.js";
import { SchemaString } from "../base-types/string.js";
import { includesIgnoreCase } from "../../../util/string.js";

export const SCHEMA_ENTITY_TYPE = new SchemaString(ENTITIES)
    .withName("entity_type")
    .onPartialProcess((ws, doc, value, result) => {
        if (!includesIgnoreCase(ENTITIES, value.toJSON() as string)) {
            return;
        }
        result.highlights.unshift(new Highlight(doc.convertToRange(value.range), SemanticTokenTypes.enumMember));
    });
