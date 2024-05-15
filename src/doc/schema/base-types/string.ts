import { isScalar } from "yaml";

import type { SemanticTokenTypes } from "vscode-languageserver";
import type { SchemaValueOrFn } from "../schema.js";
import type { ParsedNode } from "yaml";
import type { MythicDoc } from "../../mythicdoc.js";
import type { Workspace } from "../../../index.js";

import { DIAGNOSTIC_DEFAULT } from "../../../errors.js";
import { Schema, ValidationResult } from "../schema.js";
import { closest, equalsIgnoreCase } from "../../../util/string.js";
import { Highlight } from "../../../lsp/models/highlight.js";
import { isIterable } from "../../../util/types.js";

export class SchemaString extends Schema {
    /**
     * Highlights the string with the given semantic token type if it matches.
     */
    public highlight?: SemanticTokenTypes;

    public constructor(
        public readonly matcher?: SchemaValueOrFn<string | RegExp | Iterable<string>>,
        public readonly caseSensitive: SchemaValueOrFn<boolean> = false,
    ) {
        super();
    }

    public override internalName(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
    ): string {
        return "string";
    }

    public override partialProcess(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
    ): ValidationResult {
        const result = super.partialProcess(ws, doc, value);
        const range = doc.convertToRange(value.range);
        if (!isScalar(value)) {
            return result.toMerged(
                new ValidationResult([
                    {
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Expected \`${this.toString(ws, doc, value)}\`.`,
                        range: range,
                    },
                ]),
            );
        }
        const matcher = this.resolveValueOrFn(ws, doc, value, this.matcher);
        const cs = this.resolveValueOrFn(ws, doc, value, this.caseSensitive);
        const string = value.value as string;
        if (matcher instanceof RegExp) {
            if (!matcher.test(string)) {
                result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Expected a string matching ${matcher.source}, but got ${string}.`,
                    range: range,
                });
                return result;
            }
        } else if (isIterable(matcher) && typeof matcher !== "string") {
            const arr = Array.from(matcher);
            if (!this.#includes(arr, string, cs)) {
                const closestValue = this.#closest(arr, string, cs);
                let error = `Expected \`${this.toString(ws, doc, value)}\`, but got ${string}.`;
                if (closestValue !== undefined) {
                    error += ` Did you mean ${closestValue}?`;
                }
                result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: error,
                    range: range,
                });
                return result;
            }
        } else if (matcher !== undefined) {
            if (!this.#equals(matcher, string, cs)) {
                result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Expected ${matcher}, but got ${string}.`,
                    range: range,
                });
                return result;
            }
        }
        if (this.highlight) {
            result.highlights.unshift(new Highlight(range, this.highlight));
        }
        return result;
    }

    #equals(a: string, b: string, cs: boolean): boolean {
        if (cs) {
            return a === b;
        }
        return equalsIgnoreCase(a, b);
    }

    #includes(arr: string[], str: string, cs: boolean): boolean {
        if (cs) {
            return arr.includes(str);
        }
        return arr.some((s) => equalsIgnoreCase(s, str));
    }

    #closest(arr: string[], str: string, cs: boolean): string | undefined {
        if (cs) {
            return closest(str, arr);
        }
        return closest(str.toLowerCase(), arr.map((s) => s.toLowerCase()));
    }
}
