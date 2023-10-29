import { isMap, isScalar } from "yaml";

import type { ParsedNode } from "yaml";
import type { MythicDoc } from "../../mythicdoc.js";
import type { SchemaValueOrFn, Workspace } from "../../../index.js";

import { DIAGNOSTIC_DEFAULT } from "../../../errors.js";
import { Schema, ValidationResult } from "../schema.js";

export class SchemaObject extends Schema {
    public constructor(
        public readonly properties: SchemaValueOrFn<Record<string, SchemaObjectProperty>> = {},
    ) {
        super();
    }

    public override toString(ws: Workspace, doc: MythicDoc, value: ParsedNode): string {
        return `{ ${Object.entries(this.resolveValueOrFn(ws, doc, value, this.properties))
            .map(([key, property]) => {
                return `${key}: ${property.schema.toString(ws, doc, value)}`;
            })
            .join(", ")} }`;
    }

    public override partialProcess(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
    ): ValidationResult {
        if (!isMap(value)) {
            return new ValidationResult([
                {
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Expected ${this.toString(ws, doc, value)}.`,
                    range: doc.convertToRange(value.range),
                },
            ]);
        }
        const result = new ValidationResult();
        const properties = this.resolveValueOrFn(ws, doc, value, this.properties);
        for (const [key, property] of Object.entries(properties)) {
            // const node = value.get(key);
            const pair = value.items.find(
                (pair) => isScalar(pair.key) && pair.key.value === key,
            );
            if (!pair) {
                if (property.required) {
                    result.diagnostics.push({
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Missing required property ${key}.`,
                        range: doc.convertToRange(value.range),
                    });
                }
                continue;
            }
            if (!pair.value) {
                result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Expected a value for ${key}.`,
                    range: doc.convertToRange(pair.key.range),
                });
                continue;
            }
            if (property.description) {
                result.hovers.push({
                    range: doc.convertToRange(pair.key.range),
                    contents: property.description,
                });
            }
            result.merge(property.schema.partialProcess(ws, doc, pair.value));
        }
        // check for extra properties
        for (const pair of value.items) {
            const key = pair.key;
            if (!properties[key.toString()]) {
                result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Unexpected property ${key.toString()}.`,
                    range: doc.convertToRange(key.range),
                });
            }
        }
        return result;
    }
}

export type SchemaObjectProperty = {
    schema: Schema;
    required?: boolean;
    description?: string;
};
