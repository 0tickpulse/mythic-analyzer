import { CompletionItemKind, SemanticTokenTypes } from "vscode-languageserver";
import { isScalar } from "yaml";

import { SchemaString } from "../base-types/string.js";
import { RangeLink } from "../../../lsp/models/rangeLink.js";
import { pairRange } from "../../../util/positions.js";

export const SCHEMA_MYTHIC_MOB_ID = new SchemaString()
    .withName("mythic_mob_id")
    .onFullProcess((ws, doc, value, result) => {
        const mobs = ws.mergedValidationResult().mythic.mobs;
        const valueRange = doc.convertToRange(value.range);

        const schema = new SchemaString(
            mobs.map((m) => ({
                matcher: m.id,
                completionItem: {
                    kind: CompletionItemKind.Class,
                    label: m.id,
                    documentation: m.generatedDescription,
                },
            })),
        ).withName("mythic_mob_id");

        schema.highlight = SemanticTokenTypes.class;
        const newResult = schema
            .partialProcess(ws, doc, value)
            .toMerged(schema.fullProcess(ws, doc, value));
        if (isScalar(value)) {
            const originalMob = mobs.find((mob) => mob.id === value.value);
            if (!originalMob) {
                result.merge(newResult);
                return;
            }
            const declarations = originalMob.declarations;
            for (const { doc: declDoc, declaration } of declarations) {
                newResult.rangeLinks.push(
                    new RangeLink(
                        doc,
                        valueRange,
                        declDoc,
                        declDoc.convertToRange(declaration.key.range),
                        declaration.value
                            ? declDoc.convertToRange(pairRange(declaration))
                            : undefined,
                    ),
                );
            }
            newResult.hovers.push({
                contents: originalMob.generatedDescription,
                range: valueRange,
            });
        }
        result.merge(newResult);
    });
