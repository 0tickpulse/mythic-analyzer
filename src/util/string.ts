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

function includesIgnoreCase(arr: Iterable<string>, search: string): boolean;
function includesIgnoreCase(str: string, search: string): boolean;
function includesIgnoreCase(
    arrOrStr: Iterable<string> | string,
    search: string,
): boolean {
    if (typeof arrOrStr === "string") {
        return arrOrStr.toLowerCase().includes(search.toLowerCase());
    }
    for (const str of arrOrStr) {
        if (str.toLowerCase() === search.toLowerCase()) {
            return true;
        }
    }
    return false;
}

function equalsIgnoreCase(str: string, search: string): boolean {
    return str.toLowerCase() === search.toLowerCase();
}

export { closest, stringifyRange, includesIgnoreCase, equalsIgnoreCase };
