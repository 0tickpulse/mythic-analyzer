import type { DefinitionLink, Diagnostic, Hover } from "vscode-languageserver";
import type { ParsedNode } from "yaml";
import type { MythicDoc } from "../mythicdoc.js";
import type { Workspace } from "../../index.js";

/**
 * The result after validating a value against a schema.
 */
class ValidationResult {
    public constructor(
        public readonly diagnostics: Diagnostic[] = [],
        public readonly hovers: Required<Hover>[] = [],
        public readonly definitionLinks: DefinitionLink[] = [],
    ) {}

    /**
     * Merges this validation result with another.
     * This does not mutate either of the validation results, instead returning a new one.
     *
     * @param other The other validation result to merge with.
     */
    public toMerged(other: ValidationResult): ValidationResult {
        return new ValidationResult(
            this.diagnostics.concat(other.diagnostics),
            this.hovers.concat(other.hovers),
            this.definitionLinks.concat(other.definitionLinks),
        );
    }

    /**
     * Merges this validation result with another.
     * This mutates this validation result.
     *
     * @param other The other validation result to merge with.
     */
    public merge(other: ValidationResult): void {
        this.diagnostics.push(...other.diagnostics);
        this.hovers.push(...other.hovers);
        this.definitionLinks.push(...other.definitionLinks);
    }
}

/**
 * A schemawhich represents *any* value.
 * This is also used as the base schema for all other schemas.
 */
class Schema {
    /**
     * Any further processes that should be run on the value.
     */
    public readonly processes: SchemaValueOrFn<
    ((
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode
    ) => ValidationResult)[]
    > = [];

    /**
     * Partially processes a document. Should be used to do simple checks on a document.
     *
     * @param doc   The document to process.
     * @param value The value to process.
     * @returns A {@link ValidationResult} containing any errors and other things.
     */
    public partialProcess(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
    ): ValidationResult {
        return new ValidationResult();
    }

    /**
     * Processes a document fully. Should be used when the document is open in the editor, or in the terminal.
     * This should not call {@link Schema.partialProcess} as that will automatically be called before this.
     *
     * @param doc   The document to process.
     * @param value The value to process.
     * @returns A {@link ValidationResult} containing any errors and other things.
     */
    public fullProcess(ws: Workspace, doc: MythicDoc, value: ParsedNode): ValidationResult {
        const result = new ValidationResult();
        for (const process of this.resolveValueOrFn(ws, doc, value, this.processes)) {
            result.merge(process(ws, doc, value));
        }
        return result;
    }

    /**
     * Returns a string representation of the schema. This is used for error messages, hovers, etc.
     */
    public toString(ws: Workspace, doc: MythicDoc, value: ParsedNode): string {
        return "any";
    }

    /**
     * A helper function for resolving multiples values or a functions that return a value.
     *
     * @param doc        The document to resolve the value in.
     * @param value      The value to resolve the value in.
     * @param valueOrFns The values or functions to resolve.
     */
    protected resolveValuesOrFns<TTypes extends readonly unknown[]>(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
        ...valueOrFns: {
            [K in keyof TTypes]: SchemaValueOrFn<TTypes[K]>;
        } & { length: TTypes["length"] }
    ): TTypes {
        return valueOrFns.map((valueOrFn) => {
            if (typeof valueOrFn === "function") {
                return valueOrFn(ws, doc, value) as unknown as TTypes[number];
            }
            return valueOrFn;
        }) as unknown as TTypes;
    }

    /**
     * A helper function for resolving a value or a function that returns a value.
     *
     * @param doc       The document to resolve the value in.
     * @param value     The value to resolve the value in.
     * @param valueOrFn The value or function to resolve.
     */
    protected resolveValueOrFn<T>(ws: Workspace, doc: MythicDoc, value: ParsedNode, valueOrFn: SchemaValueOrFn<T>): T {
        if (typeof valueOrFn === "function") {
            return valueOrFn(ws, doc, value) as T;
        }
        return valueOrFn as T;
    }
}

/**
 * A value or a function that returns a value.
 *
 * @param T The type of the value. This cannot be a function, which is reflected in the type.
 */
export type SchemaValueOrFn<T> = T extends (...args: unknown[]) => unknown
    ? never
    : T | ((ws: Workspace, doc: MythicDoc, value: ParsedNode) => T);

export { Schema, ValidationResult };
