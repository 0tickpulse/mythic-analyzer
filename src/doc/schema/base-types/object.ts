import { isMap, isPair, isScalar } from "yaml";
import { CompletionItemKind } from "vscode-languageserver";

import type { CompletionItem } from "vscode-languageserver";
import type { Pair, ParsedNode, YAMLMap } from "yaml";
import type { MythicDoc } from "../../mythicdoc.js";
import type { SchemaValueOrFn, Workspace } from "../../../index.js";
import type { ValidationResult } from "../schema.js";

import { DIAGNOSTIC_DEFAULT } from "../../../errors/errors.js";
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

    /**
     * Resolves and returns a record of submapped properties for the given workspace, document, and value.
     *
     * @param ws - The workspace.
     * @param doc - The document.
     * @param value - The parsed node value.
     * @returns A record of submapped properties.
     */
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
            if (!(schema instanceof SchemaObject)) {
                continue;
            }
            const submappedProperties = schema.submapped(ws, doc, value);
            for (const [subkey, subproperty] of Object.entries(
                submappedProperties,
            )) {
                // before setting, check if the property already exists
                // submapped[`${key}.${subkey}`] = subproperty;
                const aliases
                    = (subproperty.aliases
                    && this.resolveObjectValueOrFn(
                        ws,
                        doc,
                        value,
                        value,
                        subproperty.aliases,
                    ))
                    ?? [];
                aliases.push(subkey);
                const clonedProperty = { ...subproperty };
                // for (const alias of aliases) {
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

                const newAliases = aliases.map((alias) => `${key}.${alias}`);
                clonedProperty.aliases = newAliases;

                if (!hasProperty) {
                    submapped[`${key}.${subkey}`] = clonedProperty;
                }
                // }
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
                code: "yaml-invalid-type",
            });
            return result;
        }
        const properties = this.submapped(ws, doc, value);

        for (const [key, property] of Object.entries(properties)) {
            const aliases
                = this.resolveObjectValueOrFn(
                    ws,
                    doc,
                    value,
                    value,
                    property.aliases,
                ) ?? [];
            aliases.push(key);
            const pairs = value.items
                .map((pair) => this.nodeHasProperty(ws, doc, pair, aliases))
                .filter(Boolean) as Pair<ParsedNode, ParsedNode | null>[];
            if (pairs.length === 0) {
                if (property.required && key.split(".").length === 1) {
                    // only check for top-level properties
                    result.diagnostics.push({
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Missing required property ${key}.`,
                        range: doc.convertToRange(value.range),
                        code: "yaml-missing-property",
                    });
                }
                continue;
            }
            if (pairs.length > 1) {
                for (const pair of pairs) {
                    result.diagnostics.push({
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Duplicate property ${key}.`,
                        range: doc.convertToRange(pair.key.range),
                        code: "yaml-duplicate-property",
                    });
                }
            }
            for (const pair of pairs) {
                if (!pair.value) {
                    result.diagnostics.push({
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Expected a value for ${key}.`,
                        range: doc.convertToRange(pair.key.range),
                        code: "yaml-missing-value",
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
                const aliases = this.resolveObjectValueOrFn(
                    ws,
                    doc,
                    pair.key,
                    value,
                    property.aliases,
                );
                if (aliases) {
                    hover += `\n\nAliases: ${aliases
                        .map((alias) => `\`${alias}\``)
                        .join(", ")}`;
                }
                result.hovers.push({
                    range: doc.convertToRange(pair.key.range),
                    contents: hover,
                });

                const valueResult = this.resolveObjectValueOrFn(
                    ws,
                    doc,
                    pair.key,
                    value,
                    property.schema,
                ).partialProcess(ws, doc, pair.value);

                result.merge(valueResult);
            }
        }
        for (const pair of value.items) {
            const key = pair.key;
            if (
                !this.propertyIncludesKey(
                    ws,
                    doc,
                    key,
                    pair.value,
                    properties,
                    key.toString(),
                )
            ) {
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
                    code: "yaml-unexpected-property",
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
            const completionItems = Object.entries(
                this.resolveValueOrFn(ws, doc, value, this.properties),
            ).map(([key, property]) => {
                return this.createCompletionItem(ws, doc, value, key, property);
            });

            let nextNonWhitespaceIdx = doc.source.length;
            for (let i = value.range[1]; i < doc.source.length; i++) {
                if (!/[\s\n]/u.test(doc.source[i]!)) {
                    nextNonWhitespaceIdx = i;
                    break;
                }
            }

            result.completionItems.push({
                range: doc.convertToRange([
                    value.range[0],
                    Math.max(value.range[1], nextNonWhitespaceIdx),
                    Math.max(value.range[1], nextNonWhitespaceIdx),
                ]),
                items: completionItems,
            });

            return result;
        }
        const properties = this.submapped(ws, doc, value);
        for (const [key, property] of Object.entries(properties)) {
            const node = value.items.find(
                (pair) => isScalar(pair.key)
                && (pair.key.value === key
                || (property.aliases
                    ? this.resolveObjectValueOrFn(
                        ws,
                        doc,
                        pair.key,
                        value,
                        property.aliases,
                    )?.includes(pair.key.value as string)
                    : false)),
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

        const nonSubmappedProperties = this.resolveValueOrFn(
            ws,
            doc,
            value,
            this.properties,
        );
        const autoCompleteItems = Object.entries(nonSubmappedProperties)
            .filter(([key]) => !this.nodeHasProperty(ws, doc, value, [key]))
            .map(([propKey, propValue]) => {
                return this.createCompletionItem(
                    ws,
                    doc,
                    value,
                    propKey,
                    propValue,
                );
            });
        let prevValue: ParsedNode | null = null;
        for (const pair of value.items) {
            const { key: pairKey, value: pairValue } = pair;

            if (!prevValue) {
                prevValue = pairValue;
                continue;
            }

            const prevValueRange = doc.convertToRange(prevValue.range);
            const keyRange = doc.convertToRange(pairKey.range);
            const autocompleteRange = {
                start: prevValueRange.end,
                end: keyRange.end,
            };

            result.completionItems.push({
                range: autocompleteRange,
                items: autoCompleteItems,
            });

            prevValue = pairValue;
        }

        const lastValue = prevValue;
        if (lastValue) {
            let nextNonWhitespaceIdx = doc.source.length;
            for (let i = lastValue.range[1]; i < doc.source.length; i++) {
                if (!/[\s\n]/u.test(doc.source[i]!)) {
                    nextNonWhitespaceIdx = i;
                    break;
                }
            }
            const autocompleteRange = {
                start: doc.convertToPosition(lastValue.range[1]),
                end: doc.convertToPosition(
                    Math.max(value.range[1], nextNonWhitespaceIdx),
                ),
            };
            result.completionItems.push({
                range: autocompleteRange,
                items: autoCompleteItems,
            });
        }

        return result;
    }

    protected createCompletionItem(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
        key: string,
        property: SchemaObjectProperty,
    ): CompletionItem {
        return {
            label: key,
            kind: CompletionItemKind.Property,
            detail: this.resolveObjectValueOrFn(
                ws,
                doc,
                value,
                value,
                property.description,
            ),
        };
    }

    /**
     * Respects property aliases.
     */
    protected nodeHasProperty(
        ws: Workspace,
        doc: MythicDoc,
        node: YAMLMap.Parsed | Pair<ParsedNode, ParsedNode | null>,
        aliases: string[],
    ): Pair<ParsedNode, ParsedNode | null> | null {
        return (
            aliases
                .map((alias) => this.findValueKey(ws, doc, node, alias))
                .find(Boolean) ?? null
        );
    }

    /**
     * This respects submapping; for example, if you have a property `A.B` and a submapping `A: { B: ... }`,
     * this will return true for both `A.B` and `A: { B: ... }`.
     * This is done through recursion:
     *
     * 1. Check if the value has a key that matches the literal `A.B.C`.
     * 2. If not, check if the value has a key that matches `A` or `A.B`.
     * 3. Gets the value of `A` or `A.B` and repeats the process.
     */
    protected findValueKey(
        ws: Workspace,
        doc: MythicDoc,
        node: YAMLMap.Parsed | Pair<ParsedNode, ParsedNode | null>,
        key: string,
    ): Pair<ParsedNode, ParsedNode | null> | null {
        let foundValue = isMap(node)
            ? node.items.find(
                (pair) => isScalar(pair.key) && pair.key.value === key,
            )
            : node;
        if (isPair(foundValue) && String(foundValue.key) !== key) {
            foundValue = undefined;
        }

        if (foundValue) {
            return foundValue;
        }
        const split = key.split(".");
        for (const [i, _part] of split.entries()) {
            const subkey = split.slice(0, i + 1).join(".");
            const pair = isMap(node)
                ? node.items.find(
                    (pair) => isScalar(pair.key) && pair.key.value === subkey,
                )
                : node;
            if (!pair) {
                return null;
            }
            if (isPair(pair) && String(pair.key) !== subkey) {
                return null;
            }
            if (!pair.value || !isMap(pair.value)) {
                return null;
            }
            const rest = split.slice(i + 1).join(".");
            const foundValue = this.findValueKey(ws, doc, pair.value, rest);
            if (foundValue) {
                return foundValue;
            }
        }
        return null;
    }

    protected propertyIncludesKey(
        ws: Workspace,
        doc: MythicDoc,
        keyNode: ParsedNode,
        valueNode: ParsedNode | null,
        properties: Record<string, SchemaObjectProperty>,
        key: string,
    ): boolean {
        // check if properties include the key, and also check all aliases
        return Boolean(
            Object.keys(properties).find(
                (propertyKey) => propertyKey === key
                || (properties[propertyKey]?.aliases
                    ? this.resolveObjectValueOrFn(
                        ws,
                        doc,
                        keyNode,
                        valueNode,
                        properties[propertyKey]?.aliases,
                    )?.includes(key)
                    : false),
            ),
        );
    }

    protected resolveObjectValueOrFn<T>(
        ws: Workspace,
        doc: MythicDoc,
        key: ParsedNode,
        value: ParsedNode | null,
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
            value: ParsedNode | null
        ) => T);

type SchemaObjectProperty = {
    schema: SchemaObjectValueOrFn<Schema>;
    /**
     * Defaults to false.
     */
    required?: SchemaObjectValueOrFn<boolean | undefined>;
    description?: SchemaObjectValueOrFn<string | undefined>;
    aliases?: SchemaObjectValueOrFn<string[] | undefined>;
};

export { SchemaObject };
export type { SchemaObjectProperty, SchemaObjectValueOrFn };
