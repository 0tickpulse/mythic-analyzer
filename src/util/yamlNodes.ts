import type { ParsedNode } from "yaml";
import type { MythicDoc } from "../doc/index.js";

function nodePreciseSource(doc: MythicDoc, node: ParsedNode) {
    const source = doc.source;
    return source.slice(node.range[0], node.range[1]);
}

export { nodePreciseSource };
