import { SemanticTokenTypes } from "vscode-languageserver";

import type { MythicDoc } from "../doc/mythicdoc.js";
import type { Workspace } from "../index.js";

import { ValidationResult } from "../doc/schema/index.js";
import { DIAGNOSTIC_DEFAULT } from "../errors/errors.js";
import { Highlight } from "../lsp/models/highlight.js";

class LineToken {
    public constructor(
        public readonly value: string,
        public readonly range: [number, number, number],
    ) {}

    public addHighlight(ws: Workspace, doc: MythicDoc, result: ValidationResult, color: SemanticTokenTypes): void {
        const hl = new Highlight(doc.convertToRange(this.range), color);
        result.highlights.unshift(hl);
    }
}

class ConfigValue {
    public constructor(
        public readonly key: LineToken,
        public readonly equals: LineToken,
        public readonly value: LineToken,
        public readonly semicolon?: LineToken,
    ) {}
}

class LineConfig {
    public source: string;

    /**
     * The "main" part of the config, before any blocks.
     */
    public main?: LineToken;

    public config: ConfigValue[] = [];

    public result = new ValidationResult();

    public offset = 0;

    public openBraceToken?: LineToken;

    public closeBraceToken?: LineToken;

    /**
     * It's important to use offset to ensure that the ranges are correct.
     */
    public constructor(
        ws: Workspace,
        doc: MythicDoc,
        source: string,
        offset = 0,
    ) {
        this.source = LineConfig.unparseBlock(source);
        let parsed = LineConfig.parseString(source);
        this.offset = offset;

        if (parsed.includes("{") && parsed.includes("}")) {
            const openBraceIndex = parsed.indexOf("{");
            this.main = new LineToken(parsed.substring(0, openBraceIndex), [
                // this.offset,
                // openBraceIndex + this.offset,
                // openBraceIndex + this.offset,
                LineConfig.createPos(parsed, 0, this.offset),
                LineConfig.createPos(parsed, openBraceIndex, this.offset),
                LineConfig.createPos(parsed, openBraceIndex, this.offset),
            ]);

            const closeBraceIndex = parsed.lastIndexOf("}");
            let count = 0,
                pos = parsed.length;
            parsed = parsed.substring(openBraceIndex + 1, closeBraceIndex);

            this.openBraceToken = new LineToken("{", [
                // openBraceIndex + this.offset,
                // openBraceIndex + 1 + this.offset,
                // openBraceIndex + 1 + this.offset,
                LineConfig.createPos(parsed, openBraceIndex + 0, this.offset),
                LineConfig.createPos(parsed, openBraceIndex + 1, this.offset),
                LineConfig.createPos(parsed, openBraceIndex + 1, this.offset),
            ]);
            this.closeBraceToken = new LineToken("}", [
                // closeBraceIndex + this.offset,
                // closeBraceIndex + 1 + this.offset,
                // closeBraceIndex + 1 + this.offset,
                LineConfig.createPos(parsed, closeBraceIndex + 0, this.offset),
                LineConfig.createPos(parsed, closeBraceIndex + 1, this.offset),
                LineConfig.createPos(parsed, closeBraceIndex + 1, this.offset),
            ]);

            this.offset += openBraceIndex + 1;

            let depth;
            for (depth = 0; depth < pos; depth++) {
                const c = parsed.charAt(depth);
                if (c === "{") {
                    count++;
                }
                if (c === "}") {
                    count--;
                }
            }

            if (count !== 0) {
                this.result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: "Mismatched braces!",
                    range: doc.convertToRange([
                        // openBraceIndex + this.offset,
                        // closeBraceIndex + this.offset,
                        // closeBraceIndex + this.offset,
                        LineConfig.createPos(parsed, openBraceIndex, this.offset),
                        LineConfig.createPos(parsed, closeBraceIndex, this.offset),
                        LineConfig.createPos(parsed, closeBraceIndex, this.offset),
                    ]),
                    code: "lineconfig-mismatched-braces",
                });
            }

            if (parsed.length === 0) {
                return;
            }

            let start = 0;
            pos = 0;
            depth = 0;
            // const lastKey: LineToken | null = null;
            // const lastValue: LineToken | null = null;
            // const inBlock = false;
            parsed += "}";

            for (let i = 0; i < parsed.length; i++) {
                const c = parsed.charAt(i);
                if (c === "{" || c === "[") {
                    depth++;
                }
                if (c === "}" || c === "]") {
                    depth--;
                }

                if ((c === ";" && depth === 0) || (c === "}" && depth < 0)) {
                    const element = parsed.substring(start, pos);
                    if (pos - start > 0 && element.length > 0) {
                        const key = element
                            .substring(0, element.indexOf("="))
                            .trim()
                            .toLowerCase();
                        const value = element
                            .substring(element.indexOf("=") + 1)
                            .trim();
                        const keyToken = new LineToken(key, [
                            // start + this.offset,
                            // start + key.length + this.offset,
                            // start + key.length + this.offset,
                            LineConfig.createPos(parsed, start, this.offset),
                            LineConfig.createPos(
                                parsed,
                                start + key.length,
                                this.offset,
                            ),
                            LineConfig.createPos(
                                parsed,
                                start + key.length,
                                this.offset,
                            ),
                        ]);
                        const equalsToken = new LineToken("=", [
                            // start + key.length + this.offset,
                            // start + key.length + 1 + this.offset,
                            // start + key.length + 1 + this.offset,
                            LineConfig.createPos(
                                parsed,
                                start + key.length,
                                this.offset,
                            ),
                            LineConfig.createPos(
                                parsed,
                                start + key.length + 1,
                                this.offset,
                            ),
                            LineConfig.createPos(
                                parsed,
                                start + key.length + 1,
                                this.offset,
                            ),
                        ]);
                        const valueToken = new LineToken(value, [
                            // start + key.length + 1 + this.offset,
                            // start + key.length + value.length + 1 + this.offset,
                            // start + key.length + value.length + 1 + this.offset,
                            LineConfig.createPos(
                                parsed,
                                start + key.length + 1,
                                this.offset,
                            ),
                            LineConfig.createPos(
                                parsed,
                                start + key.length + value.length + 1,
                                this.offset,
                            ),
                            LineConfig.createPos(
                                parsed,
                                start + key.length + value.length + 1,
                                this.offset,
                            ),
                        ]);
                        let semicolonToken: LineToken | undefined;
                        if (c === ";") {
                            semicolonToken = new LineToken(";", [
                                // start + key.length + value.length + 1 + this.offset,
                                // start + key.length + value.length + 2 + this.offset,
                                // start + key.length + value.length + 2 + this.offset,
                                LineConfig.createPos(
                                    parsed,
                                    start + key.length + value.length + 1,
                                    this.offset,
                                ),
                                LineConfig.createPos(
                                    parsed,
                                    start + key.length + value.length + 1 + 1,
                                    this.offset,
                                ),
                                LineConfig.createPos(
                                    parsed,
                                    start + key.length + value.length + 1 + 1,
                                    this.offset,
                                ),
                            ]);
                        }
                        this.config.push(
                            new ConfigValue(
                                keyToken,
                                equalsToken,
                                valueToken,
                                semicolonToken,
                            ),
                        );

                        if (this.config.filter((c) => c.key.value === key).length > 1) {
                            this.result.diagnostics.push({
                                ...DIAGNOSTIC_DEFAULT,
                                message: `Duplicate key: ${key}`,
                                range: doc.convertToRange([
                                    // start + this.offset,
                                    // pos + this.offset,
                                    // pos + this.offset,
                                    LineConfig.createPos(parsed, start, this.offset),
                                    LineConfig.createPos(parsed, pos, this.offset),
                                    LineConfig.createPos(parsed, pos, this.offset),
                                ]),
                                code: "lineconfig-duplicate-key",
                            });
                        }
                    }
                    start = pos + 1;
                }

                pos++;
            }
        } else if (parsed.includes("[") && parsed.includes("]")) {
            const split1 = parsed.split("[");
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            if (split1.length !== 2) {
                this.result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: "Invalid block syntax!",
                    range: doc.convertToRange([
                        // this.offset,
                        // parsed.length + this.offset,
                        // parsed.length + this.offset,
                        LineConfig.createPos(parsed, 0, this.offset),
                        LineConfig.createPos(
                            parsed,
                            parsed.length,
                            this.offset,
                        ),
                        LineConfig.createPos(
                            parsed,
                            parsed.length,
                            this.offset,
                        ),
                    ]),
                    code: "lineconfig-invalid-block-syntax",
                });
                return;
            }
            parsed = split1[1]!;
            const split2 = parsed.split("]");
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            if (split2.length !== 2) {
                this.result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: "Invalid block syntax!",
                    range: doc.convertToRange([
                        // this.offset,
                        // parsed.length + this.offset,
                        // parsed.length + this.offset,
                        LineConfig.createPos(parsed, 0, this.offset),
                        LineConfig.createPos(
                            parsed,
                            parsed.length,
                            this.offset,
                        ),
                        LineConfig.createPos(
                            parsed,
                            parsed.length,
                            this.offset,
                        ),
                    ]),
                    code: "lineconfig-invalid-block-syntax",
                });
                return;
            }
            parsed = split2[0]!;
        } else {
            this.main = new LineToken(parsed, [
                // this.offset,
                // parsed.length + this.offset,
                // parsed.length + this.offset,
                LineConfig.createPos(parsed, 0, this.offset),
                LineConfig.createPos(parsed, parsed.length, this.offset),
                LineConfig.createPos(parsed, parsed.length, this.offset),
            ]);
        }
    }

    public addHighlights(ws: Workspace, doc: MythicDoc): this {
        this.openBraceToken?.addHighlight(ws, doc, this.result, SemanticTokenTypes.operator);
        this.closeBraceToken?.addHighlight(ws, doc, this.result, SemanticTokenTypes.operator);

        for (const { key, value, equals, semicolon } of this.config) {
            key.addHighlight(ws, doc, this.result, SemanticTokenTypes.property);
            equals.addHighlight(ws, doc, this.result, SemanticTokenTypes.operator);

            const num = Number(value.value);
            value.addHighlight(
                ws,
                doc,
                this.result,
                isNaN(num)
                    ? SemanticTokenTypes.string
                    : SemanticTokenTypes.number,
            );

            semicolon?.addHighlight(ws, doc, this.result, SemanticTokenTypes.operator);
        }

        return this;
    }

    public static unparseBlock(inputString: string): string {
        let modifiedString = inputString;
        // Handle strings within double quotes
        if (modifiedString.includes("\"")) {
            const parts = modifiedString.split("\"");
            let newString = "";
            for (let i = 0; i < parts.length; i++) {
                newString
                    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                    += i % 2 === 0
                        ? (parts[i] as string)
                        : `"${LineConfig.unparseSpecialChars(
                            parts[i] as string,
                        )}"`;
            }
            modifiedString = newString;
        }

        // Handle strings within single quotes (similar to double quotes)
        if (modifiedString.includes("'")) {
            const parts = modifiedString.split("'");
            let newString = "";
            for (let i = 0; i < parts.length; i++) {
                newString
                    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                    += i % 2 === 0
                        ? (parts[i] as string)
                        : `'${LineConfig.unparseSpecialChars(
                            parts[i] as string,
                        )}'`;
            }
            modifiedString = newString;
        }

        let position = 0,
            braceCount = 0,
            substringStart = 0,
            startCurlyBraceIndex = 0,
            parsedString = "";

        for (const char of modifiedString) {
            if (char === "{") {
                if (braceCount === 0) {
                    startCurlyBraceIndex = position;
                }
                braceCount++;
            }

            if (char === "}") {
                braceCount--;
                if (braceCount === 0) {
                    const beforeBlock = modifiedString.substring(
                        substringStart,
                        startCurlyBraceIndex,
                    );
                    const blockContent = modifiedString
                        .substring(startCurlyBraceIndex, position)
                        .replace(/ /gu, "<&csp>")
                        .replace(/-/gu, "<&da>");
                    // const afterBlock = modifiedString.substring(position);

                    parsedString += beforeBlock + blockContent;
                    substringStart = position;
                }
            }
            position++;
        }

        parsedString += modifiedString.substring(substringStart, position);
        return parsedString;
    }

    /**
     * This also accounts for the special characters, making them only count as one character.
     */
    public static createPos(
        source: string,
        idx: number,
        idxOffset: number = 0,
    ) {
        const specialCharacters = [
            "<&da>",
            "<&bs>",
            "<&fs>",
            "<&sp>",
            "<&cm>",
            "<&sc>",
            "<&eq>",
            "<&lc>",
            "<&rc>",
            "<&lb>",
            "<&rb>",
            "<&sq>",
            "<&csp>",
        ];

        let count = 0;
        for (let i = 0; i < idx; i++) {
            for (const special of specialCharacters) {
                if (source.startsWith(special, i)) {
                    i += special.length - 1;
                    break;
                }
            }
            count++;
        }

        return count + idxOffset;
    }

    public static unparseSpecialChars(input: string): string {
        return input
            .replace(/-/gu, "<&da>")
            .replace(/\\/gu, "<&bs>")
            .replace(/\//gu, "<&fs>")
            .replace(/ /gu, "<&sp>")
            .replace(/,/gu, "<&cm>")
            .replace(/;/gu, "<&sc>")
            .replace(/=/gu, "<&eq>")
            .replace(/\{/gu, "<&lc>")
            .replace(/\}/gu, "<&rc>")
            .replace(/\[/gu, "<&lb>")
            .replace(/\]/gu, "<&rb>")
            .replace(/'/gu, "<&sq>");
    }

    public static parseString(input: string): string {
        return input
            .replace(/<&csp>/gu, " ")
            .replace("<&da>", "-")
            .trim();
    }
}

export { LineConfig, LineToken, ConfigValue };
