import type { ParsedNode } from "yaml";
import type { MythicDoc, Workspace } from "../../../index.js";
import type { SchemaValueOrFn } from "../schema.js";

import { Schema, ValidationResult } from "../schema.js";
import { DIAGNOSTIC_DEFAULT } from "../../../errors/errors.js";

export class SchemaNumber extends Schema {
    public constructor(

        public readonly min?: SchemaValueOrFn<number>,
        public readonly max?: SchemaValueOrFn<number>,
        public readonly minInclusive: SchemaValueOrFn<boolean> = true,
        public readonly maxInclusive: SchemaValueOrFn<boolean> = true,
        public readonly integer: SchemaValueOrFn<boolean> = false,
    ) {
        super();
    }

    public override partialProcess(ws: Workspace, doc: MythicDoc, value: ParsedNode): ValidationResult {
        const result = super.partialProcess(ws, doc, value);
        if (typeof value.toJSON() !== "number") {
            return result.toMerged(new ValidationResult([
                {
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Expected \`${this.toString(ws, doc, value)}\`.`,
                    range: doc.convertToRange(value.range),
                    code: "yaml-invalid-type",
                },
            ]));
        }

        const [min, max, minInclusive, maxInclusive, integer] = Schema.resolveValuesOrFns(ws, doc, value,
            this.min,
            this.max,
            this.minInclusive,
            this.maxInclusive,
            this.integer,
        );

        const num = value.toJSON() as number;
        if (min !== undefined) {
            if (minInclusive ? num < min : num <= min) {
                return result.toMerged(new ValidationResult([
                    {
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Expected value to be greater than ${min}, but got ${num}.`,
                        range: doc.convertToRange(value.range),
                    },
                ]));
            }
        }
        if (max !== undefined) {
            if (maxInclusive ? num > max : num >= max) {
                return result.toMerged(new ValidationResult([
                    {
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Expected value to be less than ${max}, but got ${num}.`,
                        range: doc.convertToRange(value.range),
                    },
                ]));
            }
        }
        if (integer && !Number.isInteger(num)) {
            return result.toMerged(new ValidationResult([
                {
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Expected value to be an integer, but got ${num}.`,
                    range: doc.convertToRange(value.range),
                },
            ]));
        }
        return result;
    }

    public override internalName(ws: Workspace, doc: MythicDoc, value: ParsedNode) {
        const [min, max, minInclusive, maxInclusive, integer] = Schema.resolveValuesOrFns(ws, doc, value,
            this.min,
            this.max,
            this.minInclusive,
            this.maxInclusive,
            this.integer,
        );

        let res = integer ? "integer" : "number";
        if (min !== undefined || max !== undefined) {
            res += `(${min?.toString() ?? ""}${
                min && minInclusive ? "=" : ""
            }..${max && maxInclusive ? "=" : ""}${
                max?.toString() ?? ""
            })`;
        }
        return res;
    }

    public withMin(min: SchemaValueOrFn<number>): this {
        return new SchemaNumber(min, this.max, this.minInclusive, this.maxInclusive, this.integer) as this;
    }

    public withMax(max: SchemaValueOrFn<number>): this {
        return new SchemaNumber(this.min, max, this.minInclusive, this.maxInclusive, this.integer) as this;
    }

    public withMinInclusive(minInclusive: SchemaValueOrFn<boolean>): this {
        return new SchemaNumber(this.min, this.max, minInclusive, this.maxInclusive, this.integer) as this;
    }

    public withMaxInclusive(maxInclusive: SchemaValueOrFn<boolean>): this {
        return new SchemaNumber(this.min, this.max, this.minInclusive, maxInclusive, this.integer) as this;
    }

    public withInteger(integer: SchemaValueOrFn<boolean>): this {
        return new SchemaNumber(this.min, this.max, this.minInclusive, this.maxInclusive, integer) as this;
    }
}
