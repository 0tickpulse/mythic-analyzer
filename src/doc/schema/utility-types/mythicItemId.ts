import { CompletionItemKind, SemanticTokenTypes } from "vscode-languageserver";
import { isScalar } from "yaml";

import { SchemaString } from "../base-types/string.js";
import { RangeLink } from "../../../lsp/models/rangeLink.js";
import { pairRange } from "../../../util/positions.js";

export const SCHEMA_MYTHIC_ITEM_ID = new SchemaString()
    .withName("mythic_item_id")
    .onFullProcess((ws, doc, value, result) => {
        const items = ws.mergedValidationResult().mythic.items;
        const valueRange = doc.convertToRange(value.range);

        const schema = new SchemaString(
            items.map((s) => ({
                matcher: s.id,
                completionItem: {
                    kind: CompletionItemKind.Class,
                    label: s.id,
                    documentation: s.generatedDescription,
                },
            })),
        ).withName("mythic_item_id");

        schema.highlight = SemanticTokenTypes.class;
        const newResult = schema
            .partialProcess(ws, doc, value)
            .toMerged(schema.fullProcess(ws, doc, value));
        if (isScalar(value)) {
            const originalItem = items.find((item) => item.id === value.value);
            if (!originalItem) {
                result.merge(newResult);
                return;
            }
            const declarations = originalItem.declarations;
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
                contents: originalItem.generatedDescription,
                range: valueRange,
            });
        }
        result.merge(newResult);
    });
