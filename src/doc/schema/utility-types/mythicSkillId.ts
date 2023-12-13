import { SemanticTokenTypes } from "vscode-languageserver";
import { isScalar } from "yaml";

import { SchemaString } from "../base-types/string.js";
import { RangeLink } from "../../../lsp/models/rangeLink.js";

export const SCHEMA_MYTHIC_SKILL_ID = new SchemaString()
    .withName("mythic_skill_id")
    .onFullProcess((ws, doc, value, result) => {
        const skills = ws.mergedValidationResult().mythicSkills;
        const skillNames = skills.map((skill) => skill.id);
        const schema = new SchemaString(skillNames);
        schema.highlight = SemanticTokenTypes.function;
        const newResult = schema.partialProcess(ws, doc, value);
        if (newResult.diagnostics.length === 0 && isScalar(value)) {
            const originalSkill = skills.find(
                (skill) => skill.id === value.value,
            )!;
            newResult.rangeLinks.push(
                new RangeLink(
                    doc,
                    doc.convertToRange(value.range),
                    originalSkill.doc,
                    doc.convertToRange(originalSkill.declaration.range),
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
