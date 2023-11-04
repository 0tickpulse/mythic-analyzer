/**
 * Parses a YAML comment into the proper documentation format.
 *
 * @param input The input to parse.
 */
export function parseDocumentation(input: string): string {
    const lines = input.split("\n");
    let descriptionLines: string[] = [];
    for (const line of lines) {
        if (line.startsWith("#")) {
            descriptionLines.push(line.slice(1));
        } else {
            descriptionLines = [];
        }
    }
    return descriptionLines.join("\n");
}
