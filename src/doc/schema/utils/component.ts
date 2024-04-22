import { SemanticTokenTypes } from "vscode-languageserver";
import { isMap } from "yaml";

import type { ParsedNode } from "yaml";
import type { MythicDoc, ValidationResult, Workspace } from "../../../index.js";

import { DIAGNOSTIC_DEFAULT } from "../../../index.js";
import { Highlight } from "../../../lsp/models/highlight.js";
import { parseDocumentation } from "../../../util/documentationparser.js";

/**
 * A higher-order-function that returns a function that post-validates a component key.
 */
export function component<
    TType extends keyof ValidationResult["mythic"],
    TComponent extends ValidationResult["mythic"][TType][0],
>(
    ComponentFn: new (
        ws: Workspace,
        doc: MythicDoc,
        id: string,
        declarations: ParsedNode[]
    ) => TComponent,
    componentType: TType,
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
        const pairs = value.items;
        const walked = new Set<string>();
        for (const pair of pairs) {
            const key = pair.key;
            let id = key.toString();
            const componentNode = pair.value;
            // ids typically disallows whitspaces
            if (id.includes(" ")) {
                result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Whitespaces are not allowed here!`,
                    range: doc.convertToRange(key.range),
                });
            }
            if (!componentNode) {
                continue;
            }

            // cut off the range at the first '.'
            const yamlRange = [...key.range] as [number, number, number];
            if (id.includes(".")) {
                yamlRange[1] = yamlRange[0] + id.indexOf(".");
            }
            id = id.slice(0, id.indexOf("."));
            const range = doc.convertToRange(yamlRange);
            result.highlights.unshift(new Highlight(range, highlightColor));

            const idKey = doc.source.slice(yamlRange[0], yamlRange[1]);
            if (walked.has(idKey)) {
                const component = result.mythic[componentType].find(
                    (c) => c.id === idKey,
                );
                component?.declarations.push(componentNode);
            } else {
                const newComponent: TComponent = new ComponentFn(ws, doc, id, [
                    componentNode,
                ]);

                const comment = key.commentBefore;
                if (comment) {
                    const contents = parseDocumentation(comment);
                    newComponent.documentation = contents;
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any -- we know that the type is correct
                result.mythic[componentType].push(newComponent as any);
            }
        }
    };
}
