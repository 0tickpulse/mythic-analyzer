import { isSeq } from "yaml";

import type { ParsedNode } from "yaml";
import type { MythicDoc, Workspace } from "../../../index.js";

import { ValidationResult } from "../../../index.js";
import { Schema } from "../schema.js";
import { DIAGNOSTIC_DEFAULT } from "../../../errors.js";

export class SchemaList extends Schema {
    public constructor(public readonly items?: Schema | Schema[]) {
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
                });
            }
            if (value.items.length < this.items.length) {
                result.diagnostics.push({
                    ...DIAGNOSTIC_DEFAULT,
                    message: `Too few items in list. Expected ${this.items.length}, but got ${value.items.length}.`,
                    range: doc.convertToRange(value.range),
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
        return result;
    }
}
