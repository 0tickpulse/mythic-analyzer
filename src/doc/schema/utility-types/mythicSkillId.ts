import { SemanticTokenTypes } from "vscode-languageserver";
import { isScalar } from "yaml";

import { SchemaString } from "../base-types/string.js";
import { RangeLink } from "../../../lsp/models/rangeLink.js";

export const SCHEMA_MYTHIC_SKILL_ID = new SchemaString()
    .withName("mythic_skill_id")
    .onFullProcess((ws, doc, value, result) => {
        const skills = ws.mergedValidationResult().mythic.skills;
        const skillNames = skills.map((skill) => skill.id);
        const schema = new SchemaString(skillNames);
        schema.highlight = SemanticTokenTypes.function;
        const newResult = schema.partialProcess(ws, doc, value);
        if (isScalar(value)) {
            const originalSkill = skills.find(
                (skill) => skill.id === value.value,
            );
            if (!originalSkill) {
                return;
            }
            const declarations = originalSkill.declarations[0]!;
            newResult.rangeLinks.push(
                new RangeLink(
                    doc,
                    doc.convertToRange(value.range),
                    originalSkill.doc,
                    doc.convertToRange(declarations.range),
                ),
            );
            newResult.hovers.push({
                contents:
                    "# Mythic Skill: `"
                    + originalSkill.id
                    + "`"
                    + (originalSkill.documentation
                        ? "\n\n" + originalSkill.documentation
                        : ""),
                range: doc.convertToRange(value.range),
            });
        }
        result.merge(newResult);
    });
