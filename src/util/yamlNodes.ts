import { isMap } from "yaml";

import type { ParsedNode } from "yaml";
import type { MythicDoc } from "../doc/index.js";

function nodePreciseSource(doc: MythicDoc, node: ParsedNode) {
    const source = doc.source;
    return source.slice(node.range[0], node.range[1]);
}

function getNodeInMap(node: ParsedNode, path: string): ParsedNode | null {
    if (!isMap(node)) {
        return null;
    }
    const parts = path.split(".");
    let current: ParsedNode | null | undefined = node;
    for (const part of parts) {
        if (!isMap(current)) {
            return null;
        }
        current = current.get(part);
        if (!current) {
            return null;
        }
    }
    return current;
}

export { nodePreciseSource, getNodeInMap };
