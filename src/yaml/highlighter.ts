import { visit } from "yaml";
import { SemanticTokenTypes } from "vscode-languageserver";

import type { ParsedNode } from "yaml";
import type { MythicDoc } from "../doc/index.js";
import type { Workspace } from "../index.js";

import { ValidationResult } from "../doc/index.js";
import { Highlight } from "../lsp/models/highlight.js";

export function highlightYaml(ws: Workspace, doc: MythicDoc, yaml: ParsedNode) {
    const result = new ValidationResult();
    visit(yaml, {
        Scalar: (key, node, path) => {
            result.highlights.unshift(
                new Highlight(doc.convertToRange(node.range!), key === "key" ? SemanticTokenTypes.property : SemanticTokenTypes.string),
            );
        },
    });
    return result;
}
