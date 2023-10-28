import levenshtein from "js-levenshtein";

const DEFAULT_MAX_DISTANCE = 3;

export function closest(
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
