import levenshtein from "js-levenshtein";

import type { Range } from "vscode-languageserver";

const DEFAULT_MAX_DISTANCE = 3;

function closest(
    str: string,
    matches: string[],
    maxDistance: number = DEFAULT_MAX_DISTANCE,
): string | undefined {
    let bestMatch: string | undefined,
        bestDistance = Infinity;
    for (const match of matches) {
        const distance = levenshtein(str, match);
        if (distance < bestDistance) {
            bestMatch = match;
            bestDistance = distance;
        }
    }
    return bestDistance <= maxDistance ? bestMatch : undefined;
}

function stringifyRange(range: Range): string {
    return `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
}

export { closest, stringifyRange };
