import {
    SemanticTokenTypes,
    SemanticTokenModifiers,
} from "vscode-languageserver";

import { Highlight } from "../../../src/lsp/models/highlight";

test("test mythic-analyzer.Highlight.modifierBitFlag", () => {
    const hl = new Highlight(
        {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 },
        },
        SemanticTokenTypes.comment,
        [SemanticTokenModifiers.readonly, SemanticTokenModifiers.static],
    );
    expect(
        hl.modifierBitFlag([
            SemanticTokenModifiers.readonly,
            SemanticTokenModifiers.static,
        ]),
    ).toBe(3);
});
