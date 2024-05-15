import { SemanticTokenTypes } from "vscode-languageserver";
import { isMap } from "yaml";

import type { Pair, ParsedNode } from "yaml";
import type { MythicDoc, ValidationResult, Workspace } from "../../../index.js";
import type { MythicComponentDeclaration } from "../../../document-models/mythiccomponent.js";

import { DIAGNOSTIC_DEFAULT } from "../../../index.js";
import { Highlight } from "../../../lsp/models/highlight.js";
import { parseDocumentation } from "../../../util/documentationparser.js";

// TODO TODO TODO
// This function is very impure and modifies many things in the workspace.
// Refactor this to be more functional!
/**
 * A higher-order-function that returns a function that post-validates a component key.
 */
export function component<
    TType extends keyof ValidationResult["mythic"],
    TComponent extends ValidationResult["mythic"][TType][0],
>(
    ComponentFn: new (
        ws: Workspace,
        id: string,
        declarations: MythicComponentDeclaration<
        Pair<ParsedNode, ParsedNode | null>
        >[]
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

            const ids = ws
                .mergedValidationResult()
                .mythic[componentType].map((c) => c.id);

            if (ids.includes(id)) {
                result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Duplicate ${componentType} id: ${id}`,
                    range: doc.convertToRange(key.range),
                });
                const existingComponent = ws
                    .mergedValidationResult()
                    .mythic[componentType].find((c) => c.id === id);
                if (existingComponent) {
                    existingComponent.declarations = existingComponent.declarations.filter(
                        (d) => d.doc !== doc,
                    );
                }
            }

            if (!componentNode) {
                continue;
            }

            // cut off the range at the first '.'
            const yamlRange = [...key.range] as [number, number, number];
            if (id.includes(".")) {
                yamlRange[1] = yamlRange[0] + id.indexOf(".");
            }
            if (id.includes(".")) {
                id = id.slice(0, id.indexOf("."));
            }
            const range = doc.convertToRange(yamlRange);
            result.highlights.unshift(new Highlight(range, highlightColor));

            const idKey = doc.source.slice(yamlRange[0], yamlRange[1]);

            ws.logger?.debug({ pair, idKey, walked, ids, ws, doc, value });
            if (ids.includes(idKey)) {
                const existingComponent = ws
                    .mergedValidationResult()
                    .mythic[componentType].find((c) => c.id === idKey);
                existingComponent?.declarations.push({
                    declaration: pair,
                    doc: doc,
                });
            } else if (walked.has(idKey)) {
                const component = result.mythic[componentType].find(
                    (c) => c.id === idKey,
                );
                component?.declarations.push({
                    declaration: pair,
                    doc: doc,
                });
            } else {
                const newComponent: TComponent = new ComponentFn(ws, id, [
                    {
                        declaration: pair,
                        doc: doc,
                    },
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
