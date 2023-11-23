import { isMap, isScalar } from "yaml";

import type { ParsedNode } from "yaml";
import type { MythicDoc } from "../../mythicdoc.js";
import type { SchemaValueOrFn, Workspace } from "../../../index.js";
import type { ValidationResult } from "../schema.js";

import { DIAGNOSTIC_DEFAULT } from "../../../errors.js";
import { Schema } from "../schema.js";
import { closest } from "../../../util/string.js";

export class SchemaObject extends Schema {
    public constructor(
        public readonly properties: SchemaValueOrFn<
        Record<string, SchemaObjectProperty>
        > = {},
    ) {
        super();
    }

    public override internalName(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
    ): string {
        return `{ ${Object.entries(
            this.resolveValueOrFn(ws, doc, value, this.properties),
        )
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
        const result = super.partialProcess(ws, doc, value);
        if (!isMap(value)) {
            result.diagnostics.push({
                ...DIAGNOSTIC_DEFAULT,
                message: `Expected \`${this.toString(ws, doc, value)}\`.`,
                range: doc.convertToRange(value.range),
            });
            return result;
        }
        const properties = this.resolveValueOrFn(
            ws,
            doc,
            value,
            this.properties,
        );
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
            let hover = `\`${key}\`: \`${property.schema.toString(
                ws,
                doc,
                pair.value,
            )}\``;
            if (property.description) {
                hover += `\n\n${property.description}`;
            }
            result.hovers.push({
                range: doc.convertToRange(pair.key.range),
                contents: hover,
            });

            result.merge(property.schema.partialProcess(ws, doc, pair.value));
        }
        for (const pair of value.items) {
            const key = pair.key;
            if (!properties[key.toString()]) {
                const closestValue = closest(key.toString(), Object.keys(properties));
                let error = `Unexpected property ${key.toString()}.`;
                if (closestValue) {
                    error += ` Did you mean \`${closestValue}\`?`;
                }
                result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: error,
                    range: doc.convertToRange(key.range),
                });
            }
        }
        return result;
    }

    public override fullProcess(ws: Workspace, doc: MythicDoc, value: ParsedNode): ValidationResult {
        const result = super.fullProcess(ws, doc, value);
        if (!isMap(value)) {
            return result;
        }
        const properties = this.resolveValueOrFn(ws, doc, value, this.properties);
        for (const [key, property] of Object.entries(properties)) {
            const node = value.items.find((pair) => isScalar(pair.key) && pair.key.value === key)?.value;
            if (!node) {
                continue;
            }
            result.merge(property.schema.fullProcess(ws, doc, node));
        }
        return result;
    }
}

export type SchemaObjectProperty = {
    schema: Schema;
    /**
     * Defaults to false.
     */
    required?: boolean | undefined;
    description?: string | undefined;
};
