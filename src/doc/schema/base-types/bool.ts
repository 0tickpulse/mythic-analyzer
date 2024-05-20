import { isScalar } from "yaml";

import type { ParsedNode } from "yaml";
import type { Workspace } from "../../../index.js";
import type { MythicDoc } from "../../mythicdoc.js";
import type { ValidationResult } from "../schema.js";

import { DIAGNOSTIC_DEFAULT } from "../../../index.js";
import { Schema } from "../schema.js";

export class SchemaBool extends Schema {
    public override internalName(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
    ): string {
        return "bool";
    }

    public override partialProcess(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
    ): ValidationResult {
        const result = super.partialProcess(ws, doc, value);
        if (!isScalar(value)) {
            result.diagnostics.push({
                ...DIAGNOSTIC_DEFAULT,
                message: `Expected \`${this.toString(ws, doc, value)}\`.`,
                range: doc.convertToRange(value.range),
                code: "yaml-invalid-type",
            });
            return result;
        }
        const string = value.toJSON() as unknown;
        if (string !== true && string !== false) {
            result.diagnostics.push({
                ...DIAGNOSTIC_DEFAULT,
                message: `Expected a boolean, but got ${value.srcToken!.source}.`,
                range: doc.convertToRange(value.range),
                code: "yaml-invalid-type",
            });
        }
        return result;
    }
}
