import type { Pair, ParsedNode, Range as YamlRange } from "yaml";
import type { Position, Range } from "vscode-languageserver";

/**
 * Checks if a position is within a range.
 * This function is inclusive.
 *
 * @param pos   The position to check.
 * @param range The range to check.
 */
function posIsIn(pos: Position, range: Range) {
    if (pos.line > range.start.line && pos.line < range.end.line) {
        return true;
    }
    if (pos.line === range.start.line && pos.line === range.end.line) {
        return pos.character >= range.start.character && pos.character <= range.end.character;
    }
    if (pos.line === range.start.line) {
        return pos.character >= range.start.character;
    }
    return (
        pos.line >= range.start.line
        && pos.line <= range.end.line
        && pos.character >= range.start.character
        && pos.character <= range.end.character
    );
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
