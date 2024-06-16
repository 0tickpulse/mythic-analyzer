import { CompletionItemKind } from "vscode-languageserver";
import { isMap, isPair, isScalar } from "yaml";

import type { CompletionItem } from "vscode-languageserver";
import type { Pair, ParsedNode, YAMLMap, Range as YamlRange } from "yaml";
import type { MythicDoc } from "../../mythicdoc.js";
import type { RangedCompletionItems, ValidationResult } from "../schema.js";
import type { SchemaValueOrFn, Workspace } from "../../../index.js";

import { SchemaMap } from "../../../index.js";
import { DIAGNOSTIC_DEFAULT } from "../../../errors/errors.js";
import { closest } from "../../../util/string.js";
import { Schema } from "../schema.js";
import { posIsIn } from "../../../util/positions.js";
import { recursedPairs } from "../../../util/yamlNodes.js";

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
        const nonObjectProperties: Record<string, SchemaObjectProperty> = {};
        for (const [key, property] of Object.entries(properties)) {
            const { schema } = property;
            if (
                !(schema instanceof SchemaObject)
                || schema instanceof SchemaMap
            ) {
                nonObjectProperties[key] = property;
                continue;
            }
            ws.logger?.debug("submapped", {
                key,
                property,
                schema,
                value,
            });
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

                const newAliases = aliases.map((alias) => `${key}.${alias}`);
                clonedProperty.aliases = [...new Set(newAliases)]; // deduplicate

                ws.logger?.debug("submapped, setting", {
                    key,
                    subkey,
                    clonedProperty,
                    submappedProperties,
                    aliases,
                    properties,
                    property,
                    schema,
                });
                submapped[`${key}.${subkey}`] = clonedProperty;
            }
        }

        const result = {
            ...nonObjectProperties,
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
        const processedPairs: Pair<ParsedNode, ParsedNode | null>[] = [];

        for (const [key, property] of Object.entries(properties)) {
            const aliases
                = this.resolveObjectValueOrFn(
                    ws,
                    doc,
                    value,
                    value,
                    property.aliases,
                ) ?? [];
            const pairs = value.items.flatMap((pair) => this.nodeHasProperty(ws, doc, pair, aliases),
            );
            processedPairs.push(...pairs);
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

                if ((property.schema instanceof SchemaMap || !(property.schema instanceof SchemaObject)) && isMap(pair.value)) {
                    // Add its pairs to the processed pairs
                    for (const subPair of pair.value.items) {
                        processedPairs.push(subPair);
                    }
                }

                result.merge(valueResult);
            }
        }
        for (const pair of recursedPairs(value)) {
            if (isMap(pair.value)) {
                continue;
            }
            if (this instanceof SchemaMap && value.items.includes(pair)) {
                continue;
            }
            const key = pair.key;
            if (!processedPairs.includes(pair)) {
                const closestValue = closest(
                    key.toString(),
                    Object.keys(properties),
                );
                ws.logger?.debug("partialProcess, unexpectedProperty", {
                    key,
                    pair,
                    processedPairs,
                    value,
                    schema: this,
                });
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
            const aliases = this.resolveObjectValueOrFn(
                ws,
                doc,
                value,
                value,
                property.aliases,
            );
            const nodes = this.nodeHasProperty(
                ws,
                doc,
                value,
                aliases ?? [key],
            );
            for (const node of nodes) {
                if (!node.value) {
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
        }

        const completionItems = this.addCompletions(ws, doc, value, properties);
        result.completionItems.push(...completionItems);
        return result;
    }

    private addCompletions(
        ws: Workspace,
        doc: MythicDoc,
        value: YAMLMap.Parsed,
        properties: Record<string, SchemaObjectProperty>,
        keyPrefix = "",
    ): RangedCompletionItems[] {
        const completionItems: RangedCompletionItems[] = [];
        const pairKeymap = new Map<
            number,
            {
                keyMatcher: string;
                properties: Record<string, SchemaObjectProperty>;
            }
        >();
        for (const [i, pair] of value.items.entries()) {
            const keyMatcher = keyPrefix + pair.key.toString();
            const propertiesWithKey = this.propertiesWithExactKey(
                ws,
                doc,
                pair.key,
                pair.value,
                properties,
                // pair.key.toString(),
                keyMatcher,
            );
            pairKeymap.set(i, {
                keyMatcher: keyMatcher,
                properties: propertiesWithKey,
            });
        }
        const missingProperties = Object.entries(properties).filter(([key]) => {
            return !pairKeymap.has(
                value.items.findIndex((pair) => pair.key.toString() === key),
            );
        });

        ws.logger?.debug("addCompletions", {
            value,
            properties,
            keyPrefix,
            missingProperties,
        });
        for (const [i, pair] of value.items.entries()) {
            const propertiesWithKey = pairKeymap.get(i)!.properties;
            // for (const [_, property] of Object.entries(propertiesWithKey)) {
            //     const aliases = this.resolveObjectValueOrFn(
            //         ws,
            //         doc,
            //         pair.key,
            //         pair.value,
            //         property.aliases,
            //     );
            const valueRange = pair.value?.range ?? pair.key.range;
            // find the next non-whitespace character after the value
            let nextNonWhitespaceIdx = doc.source
                .slice(valueRange[2])
                .search(/\S/u);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            if (nextNonWhitespaceIdx === -1) {
                nextNonWhitespaceIdx = doc.source.length;
            } else {
                nextNonWhitespaceIdx += valueRange[2];
            }
            const newEnd = Math.max(valueRange[2], nextNonWhitespaceIdx);
            const modifiedValueRange = doc.convertToRange([
                valueRange[0],
                newEnd,
                newEnd,
            ]);
            ws.logger?.debug("addCompletions, aliases", {
                valueRange,
                modifiedValueRange,
                completionLabels: missingProperties.map(([key, property]) => key.slice(keyPrefix.length),
                ),
                keyPrefix,
            });
            completionItems.push({
                range: modifiedValueRange,
                conditions: (ws, doc, position) => {
                    if (
                        pair.value
                        && posIsIn(position, doc.convertToRange(pair.value.range))
                    ) {
                        return false;
                    }
                    const numericPosition = doc.convertToYamlPosition(position);
                    const line = doc.source.split("\n")[position.line];
                    if (!line) {
                        return true;
                    }

                    const prevValue = value.items[i - 1];
                    ws.logger?.debug("addCompletions, conditions", {
                        numericPosition,
                        line,
                        position,
                        modifiedValueRange,
                        prevValue,
                    });
                    if (prevValue) {
                        let checkStart
                            = prevValue.value?.range[1] ?? prevValue.key.range[1];
                        checkStart += 1;
                        // check if position is after the previous value
                        if (numericPosition > checkStart) {
                            return true;
                        }
                    } else {
                        // check from start of line
                        if (line.slice(0, position.character).trim() === "") {
                            return true;
                        }
                    }

                    return false;
                },
                items: missingProperties.flatMap(([key, property]) => {
                    const aliases = this.resolveObjectValueOrFn(
                        ws,
                        doc,
                        pair.key,
                        pair.value,
                        property.aliases,
                    );
                    const completions: CompletionItem[] = [];
                    ws.logger?.debug("addCompletions, completionItemIteration", {
                        key,
                        property,
                        aliases,
                    });
                    for (const alias of aliases ?? []) {
                        const sliced = alias.slice(keyPrefix.length);
                        ws.logger?.debug("addCompletions, completionItemIteration", {
                            key,
                            property,
                            alias,
                            sliced,
                        });
                        if (sliced.includes(".")) {
                            continue;
                        }
                        completions.push({
                            label: sliced,
                            kind: CompletionItemKind.Property,
                            detail: this.resolveObjectValueOrFn(
                                ws,
                                doc,
                                pair.key,
                                pair.value,
                                property.description,
                            ),
                        });
                    }
                    return completions;
                }),
            });

            if (pair.value) {
                ws.logger?.debug("addCompletions, recursing", {
                    pair,
                    value,
                    properties,
                    propertiesWithKey,
                    keyPrefix,
                });
                if (isMap(pair.value)) {
                    const subCompletionItems = this.addCompletions(
                        ws,
                        doc,
                        pair.value,
                        propertiesWithKey,
                        `${keyPrefix}${pair.key.toString()}.`,
                    );
                    // remove current completionitems which overlap with subcompletionitems
                    completionItems.push(...subCompletionItems);
                } else {
                    const valueRange = pair.value.range;
                    const nextNonWhitespaceIdx = doc.source
                        .slice(valueRange[2])
                        .search(/\S/u);
                    const newEnd = Math.max(
                        valueRange[2],
                        nextNonWhitespaceIdx,
                    );
                    const modifiedValueRange = doc.convertToRange([
                        valueRange[0],
                        newEnd,
                        newEnd,
                    ]);
                    completionItems.push({
                        range: modifiedValueRange,
                        items: Object.entries(properties).map(
                            ([key, property]) => {
                                return {
                                    label: key.slice(keyPrefix.length),
                                    kind: CompletionItemKind.Property,
                                    detail: this.resolveObjectValueOrFn(
                                        ws,
                                        doc,
                                        value,
                                        value,
                                        property.description,
                                    ),
                                };
                            },
                        ),
                    });
                }
            }
        }

        if (value.items.length === 0) {
            completionItems.push({
                range: doc.convertToRange(value.range),
                items: Object.entries(properties).map(([key, property]) => {
                    return {
                        label: key.slice(keyPrefix.length),
                        kind: CompletionItemKind.Property,
                        detail: this.resolveObjectValueOrFn(
                            ws,
                            doc,
                            value,
                            value,
                            property.description,
                        ),
                    };
                }),
            });
        }
        return completionItems;
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
    ): Pair<ParsedNode, ParsedNode | null>[] {
        return aliases
            .flatMap((alias) => this.findValueKey(ws, doc, node, alias))
            .filter(Boolean);
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
    ): Pair<ParsedNode, ParsedNode | null>[] {
        const result: Pair<ParsedNode, ParsedNode | null>[] = [];
        if (isMap(node)) {
            const foundValues = node.items.filter(
                (pair) => isScalar(pair.key) && pair.key.value === key,
            );
            if (foundValues.length > 0) {
                return foundValues;
            }
        } else {
            if (String(node.key) === key) {
                return [node];
            }
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
                // return null;
                continue;
            }
            if (isPair(pair) && String(pair.key) !== subkey) {
                // return null;
                continue;
            }
            if (!pair.value || !isMap(pair.value)) {
                // return null;
                continue;
            }
            const rest = split.slice(i + 1).join(".");
            const foundValue = this.findValueKey(ws, doc, pair.value, rest);
            // if (foundValue) {
            //     return foundValue;
            // }
            result.push(...foundValue);
        }
        // return null;
        return result;
    }

    protected propertiesWithKey(
        ws: Workspace,
        doc: MythicDoc,
        keyNode: ParsedNode,
        valueNode: ParsedNode | null,
        properties: Record<string, SchemaObjectProperty>,
        key: string,
    ): Record<string, SchemaObjectProperty> {
        const result: Record<string, SchemaObjectProperty> = {};
        for (const [propertyKey, property] of Object.entries(properties)) {
            if (propertyKey === key) {
                result[propertyKey] = property;
                continue;
            }
            if (property.aliases) {
                const aliases = this.resolveObjectValueOrFn(
                    ws,
                    doc,
                    keyNode,
                    valueNode,
                    property.aliases,
                );
                const found = aliases?.find((alias) => {
                    const split = alias.split(".");
                    for (const [i, _part] of split.entries()) {
                        const subkey = split.slice(0, i + 1).join(".");
                        if (subkey === key) {
                            return true;
                        }
                    }
                    return false;
                });
                if (found) {
                    result[found] = property;
                }
            }
        }
        return result;
    }

    /**
     * Like {@link propertiesWithKey}, but strictly checks for the key, not just a part of it.
     */
    protected propertiesWithExactKey(
        ws: Workspace,
        doc: MythicDoc,
        keyNode: ParsedNode,
        valueNode: ParsedNode | null,
        properties: Record<string, SchemaObjectProperty>,
        key: string,
    ): Record<string, SchemaObjectProperty> {
        const result: Record<string, SchemaObjectProperty> = {};
        for (const [propertyKey, property] of Object.entries(properties)) {
            if (propertyKey === key) {
                result[propertyKey] = property;
                continue;
            }
            if (property.aliases) {
                const aliases = this.resolveObjectValueOrFn(
                    ws,
                    doc,
                    keyNode,
                    valueNode,
                    property.aliases,
                );
                const found = aliases?.find((alias) => alias.startsWith(key));
                if (found) {
                    result[found] = property;
                }
            }
        }
        return result;
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
