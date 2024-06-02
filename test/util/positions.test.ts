import type { Position, Range } from "vscode-languageserver-textdocument";

import { posIsIn } from "../../src/util/positions.js";

test("test mythic-analyzer.posIsIn", () => {
    const tests: {
        pos: Position;
        range: Range;
        expected: boolean;
    }[] = [
        // Test 1: Position is before range start line
        {
            pos: { line: 0, character: 0 },
            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } },
            expected: false,
        },
        // Test 2: Position is at range start line, before range start character
        {
            pos: { line: 1, character: 0 },
            range: { start: { line: 1, character: 1 }, end: { line: 1, character: 1 } },
            expected: false,
        },
        // Test 3: Position is at range start line, at range start character
        {
            pos: { line: 1, character: 1 },
            range: { start: { line: 1, character: 1 }, end: { line: 1, character: 1 } },
            expected: true,
        },
        // Test 4: Position is at range start line, after range start character, before range end character in same line
        {
            pos: { line: 1, character: 2 },
            range: { start: { line: 1, character: 1 }, end: { line: 1, character: 3 } },
            expected: true,
        },
        // Test 5: Position is at range start line, after range start character, after range end character in same line
        {
            pos: { line: 1, character: 4 },
            range: { start: { line: 1, character: 1 }, end: { line: 1, character: 3 } },
            expected: false,
        },
        // Test 6: Position is at range end line, after range end character
        {
            pos: { line: 2, character: 0 },
            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } },
            expected: false,
        },
        // Test 7: Position is at range end line, at range end character
        {
            pos: { line: 1, character: 0 },
            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } },
            expected: true,
        },
        // Test 8: Position is at range end line, before range end character
        {
            pos: { line: 1, character: 0 },
            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 1 } },
            expected: true,
        },
    ];

    for (const test of tests) {
        expect(posIsIn(test.pos, test.range)).toBe(test.expected);
    }
});
