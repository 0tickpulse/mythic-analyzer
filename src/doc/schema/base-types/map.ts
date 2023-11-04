import { isMap, isScalar } from "yaml";

import type { ParsedNode } from "yaml";
import type {
    MythicDoc,
    SchemaObjectProperty,
    Workspace,
} from "../../../index.js";
import type { SchemaValueOrFn } from "../schema.js";

import { Schema } from "../schema.js";

import { SchemaObject } from "./object.js";

export class SchemaMap extends SchemaObject {
    public constructor(
        public readonly value: SchemaValueOrFn<Schema> = new Schema(),
        public readonly description?: (
            ws: Workspace,
            doc: MythicDoc,
            key: ParsedNode,
            value: ParsedNode | null
        ) => string | undefined,
    ) {
        super((ws, doc, value) => {
            if (!isMap(value)) {
                return {};
            }
            const keys = value.items.map((pair) => pair.key);
            const keyScalars = keys.filter(isScalar);
            const keyStrings = keyScalars.map((key) => key.toString());
            const v: Record<string, SchemaObjectProperty> = {};
            keyStrings.forEach((keyString, i) => {
                v[keyString] = {
                    schema: this.resolveValueOrFn(ws, doc, value, this.value),
                    description: this.description?.(
                        ws,
                        doc,
                        keyScalars[i]!,
                        value.items[i]!.value,
                    ),
                };
            });
            return v;
        });
    }
}
