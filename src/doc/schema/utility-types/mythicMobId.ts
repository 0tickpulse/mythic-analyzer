import { SemanticTokenTypes } from "vscode-languageserver";
import { isScalar } from "yaml";

import { SchemaString } from "../base-types/string.js";
import { RangeLink } from "../../../lsp/models/rangeLink.js";
import { pairRange } from "../../../util/positions.js";

export const SCHEMA_MYTHIC_MOB_ID = new SchemaString()
    .withName("mythic_mob_id")
    .onFullProcess((ws, doc, value, result) => {
        const mobs = ws.mergedValidationResult().mythic.mobs;
        const mobNames = mobs.map((mob) => mob.id);
        const schema = new SchemaString(mobNames);
        schema.highlight = SemanticTokenTypes.class;
        const newResult = schema.partialProcess(ws, doc, value);
        if (isScalar(value)) {
            const originalMob = mobs.find((mob) => mob.id === value.value);
            if (!originalMob) {
                return;
            }
            const declarations = originalMob.declarations;
            for (const { doc: declDoc, declaration } of declarations) {
                newResult.rangeLinks.push(
                    new RangeLink(
                        doc,
                        doc.convertToRange(value.range),
                        declDoc,
                        declDoc.convertToRange(declaration.key.range),
                        declaration.value
                            ? declDoc.convertToRange(pairRange(declaration))
                            : undefined,
                    ),
                );
            }
            newResult.hovers.push({
                contents:
                    "# Mythic Mob: `"
                    + originalMob.id
                    + "`"
                    + (originalMob.documentation
                        ? "\n\n" + originalMob.documentation
                        : ""),
                range: doc.convertToRange(value.range),
            });
        }
        result.merge(newResult);
    });