import type { Position, Range } from "vscode-languageserver";

export function posIsIn(pos: Position, range: Range) {
    return (
        pos.line >= range.start.line
        && pos.line <= range.end.line
        && pos.character >= range.start.character
        && pos.character <= range.end.character
    );
}
