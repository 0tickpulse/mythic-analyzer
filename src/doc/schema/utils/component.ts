import { SemanticTokenTypes } from "vscode-languageserver";
import { isMap } from "yaml";

import type { ParsedNode } from "yaml";
import type { MythicComponent } from "../../../document-models/mythiccomponent.js";
import type { MythicDoc, ValidationResult, Workspace } from "../../../index.js";

import { DIAGNOSTIC_DEFAULT } from "../../../index.js";
import { Highlight } from "../../../lsp/models/highlight.js";
import { parseDocumentation } from "../../../util/documentationparser.js";

/**
 * A higher-order-function that returns a function that post-validates a component key.
 */
export function component(
    ComponentFn: new (doc: MythicDoc, id: string, declaration: ParsedNode) => MythicComponent,
    highlightColor: SemanticTokenTypes = SemanticTokenTypes.function,
) {
    return (
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
        result: ValidationResult,
    ) => {
        if (!isMap(value)) {
            return;
        }
        const keys = value.items.map((pair) => pair.key);
        for (const key of keys) {
            const id = key.toString();
            // ids typically disallows whitspaces
            if (id.includes(" ")) {
                result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Whitespaces are not allowed here!`,
                    range: doc.convertToRange(key.range),
                });
            }
            // cut off the range at the first '.'
            const yamlRange = [...key.range] as [number, number, number];
            if (id.includes(".")) {
                yamlRange[1] = yamlRange[0] + id.indexOf(".");
            }
            const range = doc.convertToRange(yamlRange);
            result.highlights.push(new Highlight(range, highlightColor));

            const mythicskill = new ComponentFn(doc, id, value);

            const comment = key.commentBefore;
            if (comment) {
                const contents = parseDocumentation(comment);
                mythicskill.documentation = contents;
            }

            result.mythicSkills.push(mythicskill);
        }
    };
}
