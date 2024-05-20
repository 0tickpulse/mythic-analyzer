import { CompletionItemKind, SemanticTokenTypes } from "vscode-languageserver";
import { isScalar } from "yaml";

import { SchemaString } from "../base-types/string.js";
import { RangeLink } from "../../../lsp/models/rangeLink.js";
import { pairRange } from "../../../util/positions.js";

export const SCHEMA_MYTHIC_SKILL_ID = new SchemaString()
    .withName("mythic_skill_id")
    .onFullProcess((ws, doc, value, result) => {
        const skills = ws.mergedValidationResult().mythic.skills;
        const valueRange = doc.convertToRange(value.range);

        const schema = new SchemaString(
            skills.map((s) => ({
                matcher: s.id,
                completionItem: {
                    kind: CompletionItemKind.Function,
                    label: s.id,
                    documentation: s.generatedDescription,
                },
            })),
        ).withName("mythic_skill_id");

        schema.highlight = SemanticTokenTypes.function;
        const newResult = schema
            .partialProcess(ws, doc, value)
            .toMerged(schema.fullProcess(ws, doc, value));
        if (isScalar(value)) {
            const originalSkill = skills.find(
                (skill) => skill.id === value.value,
            );
            if (!originalSkill) {
                result.merge(newResult);
                return;
            }
            const declarations = originalSkill.declarations;
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
                contents:
                    "# Mythic Skill: `"
                    + originalSkill.id
                    + "`"
                    + (originalSkill.documentation
                        ? "\n\n" + originalSkill.documentation
                        : ""),
                range: valueRange,
            });
        }
        result.merge(newResult);
    });
