import { isMap } from "yaml";

import type { Pair, ParsedNode, YAMLMap } from "yaml";
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

function recursedPairs(map: YAMLMap.Parsed): Pair<ParsedNode, ParsedNode | null>[] {
    const pairs: Pair<ParsedNode, ParsedNode | null>[] = [];
    for (const pair of map.items) {
        pairs.push(pair);
        if (isMap(pair.value)) {
            pairs.push(...recursedPairs(pair.value));
        }
    }
    return pairs;
}

export { nodePreciseSource, getNodeInMap, recursedPairs };
