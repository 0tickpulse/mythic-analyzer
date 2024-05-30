import { isSeq } from "yaml";

import type { ParsedNode } from "yaml";
import type { MythicDoc, Workspace } from "../../../index.js";

import { ValidationResult } from "../../../index.js";
import { Schema } from "../schema.js";
import { DIAGNOSTIC_DEFAULT } from "../../../errors/errors.js";

export class SchemaList extends Schema {
    public constructor(public readonly items?: Schema | Schema[], public readonly allowDupe = true) {
        super();
    }

    public override internalName(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
    ): string {
        if (this.items === undefined) {
            return "list";
        }
        if (Array.isArray(this.items)) {
            return `[${this.items
                .map((item) => item.toString(ws, doc, value))
                .join(", ")}]`;
        }
        return `list(${this.items.toString(ws, doc, value)})`;
    }

    public override partialProcess(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
    ): ValidationResult {
        const result = super.partialProcess(ws, doc, value);
        if (!isSeq(value)) {
            return result.toMerged(new ValidationResult([
                {
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Expected \`${this.toString(ws, doc, value)}\`.`,
                    range: doc.convertToRange(value.range),
                    code: "yaml-invalid-type",
                },
            ]));
        }
        if (this.items === undefined) {
            return result;
        }
        if (Array.isArray(this.items)) {
            if (value.items.length > this.items.length) {
                result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Too many items in list. Expected ${this.items.length}, but got ${value.items.length}.`,
                    range: doc.convertToRange(value.range),
                    code: "yaml-list-length-mismatch",
                });
            }
            if (value.items.length < this.items.length) {
                result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Too few items in list. Expected ${this.items.length}, but got ${value.items.length}.`,
                    range: doc.convertToRange(value.range),
                    code: "yaml-list-length-mismatch",
                });
            }
            this.items.forEach((item, i) => {
                const yamlItem = value.items[i];
                if (!yamlItem) {
                    return;
                }
                const itemResult = item.partialProcess(ws, doc, yamlItem);
                result.merge(itemResult);
            });
        } else {
            for (const item of value.items) {
                result.merge(this.items.partialProcess(ws, doc, item));
            }
        }
        for (let i = 0; i < value.items.length; i++) {
            for (let j = i + 1; j < value.items.length; j++) {
                if (value.items[i]?.toJSON() === value.items[j]?.toJSON() && !this.allowDupe && value.items[i]?.toJSON() !== null) {
                    result.diagnostics.push({
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Duplicate item in list.`,
                        range: doc.convertToRange(value.items[j]!.range),
                        code: "yaml-duplicate-item",
                    });
                }
            }
        }
        return result;
    }

    public override fullProcess(ws: Workspace, doc: MythicDoc, value: ParsedNode): ValidationResult {
        const result = super.fullProcess(ws, doc, value);
        if (!isSeq(value)) {
            return result;
        }
        if (this.items === undefined) {
            return result;
        }

        if (Array.isArray(this.items)) {
            this.items.forEach((item, i) => {
                const yamlItem = value.items[i];
                if (!yamlItem) {
                    return;
                }
                const itemResult = item.fullProcess(ws, doc, yamlItem);
                result.merge(itemResult);
            });
        } else {
            for (const item of value.items) {
                result.merge(this.items.fullProcess(ws, doc, item));
            }
        }

        return result;
    }
}
