import { isMap, isScalar } from "yaml";

import type { SchemaObjectProperty } from "../../../index.js";
import type { SchemaValueOrFn } from "../schema.js";

import { Schema } from "../schema.js";

import { SchemaObject } from "./object.js";

export class SchemaMap extends SchemaObject {
    public constructor(
        public readonly value: SchemaValueOrFn<Schema> = new Schema(),
    ) {
        super((ws, doc, value) => {
            if (!isMap(value)) {
                return {};
            }
            const keys = value.items.map((pair) => pair.key);
            const keyScalars = keys.filter(isScalar);
            const keyStrings = keyScalars.map((key) => key.toString());
            const v: Record<string, SchemaObjectProperty> = {};
            for (const key of keyStrings) {
                v[key] = {
                    schema: this.resolveValueOrFn(ws, doc, value, this.value),
                };
            }
            return v;
        });
    }
}
