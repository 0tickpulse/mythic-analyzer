import { isMap, isScalar } from "yaml";

import type { Pair, ParsedNode } from "yaml";
import type { MythicDoc } from "../../mythicdoc.js";
import type { SchemaValueOrFn, Workspace } from "../../../index.js";
import type { ValidationResult } from "../schema.js";

import { DIAGNOSTIC_DEFAULT } from "../../../errors.js";
import { Schema } from "../schema.js";
import { closest } from "../../../util/string.js";

/**
 * An Object is a structured data type that represents a collection of properties.
 * This schema type is used to validate YAML maps against a set of properties.
 *
 * Note that this supports **submappings**, a special syntax in Mythic that allows you to
 * quickly define submappings:
 *
 * ```yml
 * A.B: C
 * # is equivalent to
 * A:
 *   B: C
 * ```
 *
 * This means that if you set a property `A` to an object with `B`, the schema will check both the literal `A.B` and the submapping `A: { B: ... }`.
 */
class SchemaObject extends Schema {
    public constructor(
        public readonly properties: SchemaValueOrFn<
        Record<string, SchemaObjectProperty>
        > = {},
    ) {
        super();
    }

    private submapped(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
    ): Record<string, SchemaObjectProperty> {
        const properties = this.resolveValueOrFn(
            ws,
            doc,
            value,
            this.properties,
        );
        const submapped: Record<string, SchemaObjectProperty> = {};
        for (const [key, { schema }] of Object.entries(properties)) {
            if (schema instanceof SchemaObject) {
                const submappedProperties = schema.submapped(ws, doc, value);
                for (const [subkey, subproperty] of Object.entries(
                    submappedProperties,
                )) {
                    // before setting, check if the property already exists
                    // submapped[`${key}.${subkey}`] = subproperty;
                    const newKey = `${key}.${subkey}`;
                    const split = newKey.split(".");
                    let hasProperty = false,
                        current: ParsedNode | null = value;
                    for (const i of split) {
                        if (!isMap(current)) {
                            break;
                        }

                        const pair:
                        | Pair<ParsedNode, ParsedNode | null>
                        | undefined = current.items.find(
                            (pair) => isScalar(pair.key) && pair.key.value === i,
                        );
                        if (!pair) {
                            hasProperty = false;
                            break;
                        }

                        current = pair.value;
                        hasProperty = true;
                    }

                    if (!hasProperty) {
                        submapped[`${key}.${subkey}`] = subproperty;
                    }
                }
            }
        }

        const result = {
            ...properties,
            ...submapped,
        };

        return result;
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

    // eslint-disable-next-line max-lines-per-function
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
        const properties = this.submapped(ws, doc, value);
        for (const [key, property] of Object.entries(properties)) {
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
            const description = this.resolveObjectValueOrFn(
                ws,
                doc,
                pair.key,
                value,
                property.description,
            );
            if (description) {
                hover += `\n\n${description}`;
            }
            result.hovers.push({
                range: doc.convertToRange(pair.key.range),
                contents: hover,
            });

            result.merge(
                this.resolveObjectValueOrFn(
                    ws,
                    doc,
                    pair.key,
                    value,
                    property.schema,
                ).partialProcess(ws, doc, pair.value),
            );
        }
        for (const pair of value.items) {
            const key = pair.key;
            if (!properties[key.toString()]) {
                const closestValue = closest(
                    key.toString(),
                    Object.keys(properties),
                );
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

    public override fullProcess(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
    ): ValidationResult {
        const result = super.fullProcess(ws, doc, value);
        if (!isMap(value)) {
            return result;
        }
        const properties = this.submapped(ws, doc, value);
        for (const [key, property] of Object.entries(properties)) {
            const node = value.items.find(
                (pair) => isScalar(pair.key) && pair.key.value === key,
            );
            if (!node?.value) {
                continue;
            }
            const schema = this.resolveObjectValueOrFn(
                ws,
                doc,
                node.key,
                node.value,
                property.schema,
            );
            result.merge(schema.fullProcess(ws, doc, node.value));
        }
        return result;
    }

    protected resolveObjectValueOrFn<T>(
        ws: Workspace,
        doc: MythicDoc,
        key: ParsedNode,
        value: ParsedNode,
        valueOrFn: SchemaObjectValueOrFn<T>,
    ): T {
        if (typeof valueOrFn === "function") {
            return valueOrFn(ws, doc, key, value) as T;
        }
        return valueOrFn as T;
    }
}

type SchemaObjectValueOrFn<T> = T extends (...args: unknown[]) => unknown
    ? never
    :
    | T
    | ((
        ws: Workspace,
        doc: MythicDoc,
        key: ParsedNode,
        value: ParsedNode
    ) => T);

type SchemaObjectProperty = {
    schema: SchemaObjectValueOrFn<Schema>;
    /**
     * Defaults to false.
     */
    required?: SchemaObjectValueOrFn<boolean | undefined>;
    description?: SchemaObjectValueOrFn<string | undefined>;
};

export { SchemaObject };
export type { SchemaObjectProperty, SchemaObjectValueOrFn };
