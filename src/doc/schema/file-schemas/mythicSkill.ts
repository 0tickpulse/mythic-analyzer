import { isMap } from "yaml";
import { SemanticTokenTypes } from "vscode-languageserver";

import { mdSeeAlso } from "../../../util/markdown.js";
import { SchemaList } from "../base-types/list.js";
import { SchemaMap } from "../base-types/map.js";
import { SchemaNumber } from "../base-types/number.js";
import { SchemaObject } from "../base-types/object.js";
import { SchemaString } from "../base-types/string.js";
import { Highlight } from "../../../lsp/models/highlight.js";
import { MythicSkill } from "../../../document-models/mythicskill.js";
import { parseDocumentation } from "../../../util/documentationparser.js";

export const MYTHIC_SKILL_SCHEMA = new SchemaMap(
    new SchemaObject({
        Cooldown: {
            schema: new SchemaNumber(0, undefined, true),
            required: false,
            description:
                "The cooldown of this skill in seconds."
                + mdSeeAlso("Skills/Metaskills#cooldown"),
        },
        Skills: {
            schema: new SchemaList(new SchemaString()),
            required: true,
            description:
                "The skills that this skill will use."
                + mdSeeAlso("Skills/Metaskills#skills"),
        },
    }).withName("mythic_skill_config"),
    (ws, doc, { commentBefore }, v) => {
        if (!commentBefore) {
            return undefined;
        }
        let documentation = parseDocumentation(commentBefore);
        documentation += "\n\n";
        documentation += mdSeeAlso("Skills/Metaskills");
        return documentation;
    },
).onPartialProcess((ws, doc, value, result) => {
    if (!isMap(value)) {
        return;
    }
    const keys = value.items.map((pair) => pair.key);
    for (const key of keys) {
        const range = doc.convertToRange(key.range);
        const color = SemanticTokenTypes.function;
        result.highlights.push(new Highlight(range, color));

        const mythicskill = new MythicSkill(value);

        const comment = key.commentBefore;
        if (comment) {
            const contents = parseDocumentation(comment);
            mythicskill.documentation = contents;
        }

        result.mythicSkills.push(mythicskill);
    }
});
