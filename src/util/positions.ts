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

export { posIsIn, posCmp };
