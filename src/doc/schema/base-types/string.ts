import type { SchemaValueOrFn } from "../schema.js";
import type { Node } from "yaml";
import type { MythicDoc } from "../../mythicdoc.js";

import { DIAGNOSTIC_DEFAULT } from "../../../errors.js";
import { Schema, ValidationResult } from "../schema.js";

export class SchemaString extends Schema {
    public constructor(
        public readonly matcher?: SchemaValueOrFn<string | RegExp>,
        public readonly caseSensitive: SchemaValueOrFn<boolean> = false,
    ) {
        super();
    }

    public override validate(doc: MythicDoc, value: Node): ValidationResult {
        if (typeof value.toJSON() !== "string") {
            return new ValidationResult([
                {
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Expected a string, but got ${typeof value.toJSON()}.`,
                    range: doc.convertToRange(value.range!),
                },
            ]);
        }
        const matcher = this.resolveValueOrFn(doc, value, this.matcher);
        if (matcher === undefined) {
            return new ValidationResult();
        }
        const cs = this.resolveValueOrFn(doc, value, this.caseSensitive);
        const string = value.toJSON() as string;
        if (matcher instanceof RegExp) {
            if (!matcher.test(string)) {
                return new ValidationResult([
                    {
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Expected a string matching ${matcher.source}, but got ${string}.`,
                        range: doc.convertToRange(value.range!),
                    },
                ]);
            }
        } else {
            if (!this.#equals(matcher, string, cs)) {
                return new ValidationResult([
                    {
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Expected ${matcher}, but got ${string}.`,
                        range: doc.convertToRange(value.range!),
                    },
                ]);
            }
        }
        return new ValidationResult();
    }

    #equals(a: string, b: string, cs: boolean): boolean {
        if (cs) {
            return a === b;
        }
        return a.toLowerCase() === b.toLowerCase();
    }
}
