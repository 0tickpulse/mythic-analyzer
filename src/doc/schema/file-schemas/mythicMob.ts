import { SemanticTokenTypes } from "vscode-languageserver";
import { isMap, isScalar } from "yaml";

import { MythicSkill } from "../../../document-models/mythicskill.js";
import { SchemaMap } from "../base-types/map.js";
import { SchemaObject } from "../base-types/object.js";
import { component } from "../utils/component.js";
import { SchemaString } from "../base-types/string.js";
import { DIAGNOSTIC_DEFAULT } from "../../../errors.js";

export const MYTHIC_MOB_SCHEMA = new SchemaMap(
    new SchemaObject({
        Type: {
            schema: new SchemaString(),
            description: "The type of the mythic mob.",
        },
    }).withName("mythic_mob_config"),
)
    .onPartialProcess(component(MythicSkill, SemanticTokenTypes.class))
    .onPartialProcess((ws, doc, v, result) => {
        if (!isMap(v)) {
            return;
        }

        for (const { key, value } of v.items) {
            if (!isMap(value)) {
                continue;
            }

            const type = value.items.find(
                (pair) => isScalar(pair.key) && pair.key.value === "Type",
            );

            if (ws.mythicData.entityIds.has(key.toString().toUpperCase())) {
                // ...
                if (type) {
                    result.diagnostics.push({
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Type is not required for vanilla override of ${key.toString()}.`,
                        range: doc.convertToRange(type.key.range),
                    });
                }
            }
        }
    });
