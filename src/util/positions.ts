import type { Pair, ParsedNode, Range as YamlRange } from "yaml";
import type { Position, Range } from "vscode-languageserver";

function posIsIn(pos: Position, range: Range) {
    if (pos.line < range.start.line || pos.line > range.end.line) {
        return false;
    }
    if (pos.line === range.start.line && pos.character < range.start.character) {
        return false;
    }
    if (pos.line === range.end.line && pos.character > range.end.character) {
        return false;
    }
    return true;
}

function posCmp(a: Position, b: Position) {
    if (a.line === b.line) {
        return a.character - b.character;
    }
    return a.line - b.line;
}

function pairRange(pair: Pair<ParsedNode, ParsedNode | null>): YamlRange {
    return [pair.key.range[0], pair.value!.range[1], pair.value!.range[2]];
}

export { posIsIn, posCmp, pairRange };
