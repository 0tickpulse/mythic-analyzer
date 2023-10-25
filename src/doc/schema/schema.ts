import type { DefinitionLink, Diagnostic, Hover } from "vscode-languageserver";
import type { Node } from "yaml";
import type { MythicDoc } from "../mythicdoc.js";

/**
 * The result after validating a value against a schema.
 */
class ValidationResult {
    public constructor(
        public readonly diagnostics: Diagnostic[] = [],
        public readonly hovers: Hover[] = [],
        public readonly definitionLinks: DefinitionLink[] = [],
        public readonly scheduledValidation: (() => void)[] = [],
    ) {}
}

/**
 * A schemawhich represents *any* value.
 * This is also used as the base schema for all other schemas.
 */
class Schema {
    public validate(doc: MythicDoc, value: Node): ValidationResult {
        return new ValidationResult();
    }

    public toString(): string {
        return "any";
    }

    protected resolveValueOrFn<T>(doc: MythicDoc, value: Node, valueOrFn: SchemaValueOrFn<T>): T {
        if (typeof valueOrFn === "function") {
            return (valueOrFn as (doc: MythicDoc, value: Node) => T)(doc, value);
        }
        return valueOrFn as T;
    }
}

/**
 * A value or a function that returns a value.
 * @param T The type of the value. This cannot be a function, which is reflected in the type.
 */
export type SchemaValueOrFn<T> =
    T extends (...args: unknown[]) => unknown ? never : T | ((doc: MythicDoc, value: Node) => T);

export { ValidationResult, Schema };
