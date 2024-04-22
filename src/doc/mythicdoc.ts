import { readFile } from "fs/promises";

import { Result } from "@marionebl/result";
import { URI } from "vscode-uri";
import { parseDocument } from "yaml";

import type { PathLike } from "fs";
import type { Position, Range } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { ParsedNode, Range as YamlRange } from "yaml";
import type { Workspace } from "../index.js";
import type { Schema } from "./schema/schema.js";

import { ValidationResult } from "./schema/schema.js";
import { findSchema, matchSchemaID } from "./schema/pathmap.js";
import { DocMetadata } from "./docmetadata.js";

/**
 * Represents a document in the Mythic system.
 */
export class MythicDoc {
    /**
     * A cached array of the lengths of each line in the document.
     * Used for calculating the position of a character in the document.
     */
    protected readonly lineLengths: number[];

    public cachedValidationResult?: ValidationResult | undefined;

    public metadata: DocMetadata = {};

    /**
     * A set of URIs of documents that this document depends on.
     * When a document is processed, its dependencies are processed first.
     */
    public dependencies = new Set<string>();

    public constructor(
        /**
         * The source text of the document.
         */
        public readonly source: string,
        /**
         * The URI of the document.
         */
        public readonly uri: URI,
        /**
         * The schema of the document, if any.
         */
        public schema?: Schema,
    ) {
        this.lineLengths = this.source.split("\n").map((line) => line.length);
    }

    /**
     * Creates a new MythicDoc by reading the contents of a file given by its path.
     *
     * @param path The path to the file to read.
     * @returns A {@link Promise} that resolves to the new MythicDoc.
     */
    public static async fromFilePath(path: PathLike): Promise<Result<MythicDoc, string>> {
        const source = await readFile(path, "utf-8");
        if (!source) {
            // eslint-disable-next-line new-cap -- this is a static method. I presume this library uses 'Result.Err' with caps E because of how Rust does it.
            return Result.Err(`Failed to read file at ${path.toString()}.`);
        }
        // eslint-disable-next-line new-cap -- see above
        return Result.Ok(
            new MythicDoc(
                source,
                URI.file(path.toString()),
                findSchema(path.toString()),
            ),
        );
    }

    /**
     * Creates a new MythicDoc from a LSP {@link TextDocument}.
     */
    public static fromTextDocument(doc: TextDocument) {
        return new MythicDoc(doc.getText(), URI.parse(doc.uri), findSchema(doc.uri));
    }

    /**
     * Converts a `Range` from the `yaml` package to a `Range` from the `vscode-languageserver` package.
     *
     * @param range The range to convert.
     */
    public convertToRange(range: YamlRange): Range {
        const start = this.convertToPosition(range[0]);
        const end = this.convertToPosition(range[1]);
        return { start, end };
    }

    /**
     * Converts a `Range` from the `vscode-languageserver` package to a `Range` from the `yaml` package.
     *
     * @param range The range to convert.
     */
    public convertToYamlRange(range: Range): YamlRange {
        const start = this.convertToYamlPosition(range.start);
        const end = this.convertToYamlPosition(range.end);
        return [start, end, end];
    }

    /**
     * Converts a 0-based numerical position to a `Position` from the `vscode-languageserver` package.
     *
     * @param position The position to convert.
     */
    public convertToPosition(position: number): Position {
        // 0 is first line
        let pos = position,
            line = 0,
            character = 0;
        const len = this.lineLengths.length;
        for (let i = 0; i < len; i++) {
            const lineLength = this.lineLengths[i]! + 1;
            if (pos < lineLength) {
                line = i;
                character = pos;
                break;
            }
            pos -= lineLength;
        }
        return { line, character };
    }

    /**
     * Converts a `Position` from the `vscode-languageserver` package to a numerical, 0-based position.
     *
     * @param position The position to convert.
     */
    public convertToYamlPosition(position: Position): number {
        let offset = 0;
        for (let i = 0; i < position.line; i++) {
            offset += this.lineLengths[i]! + 1;
        }
        offset += position.character;
        return offset;
    }

    /**
     * Parses the document into a YAML AST.
     */
    public parse(): ParsedNode | null {
        return parseDocument(this.source, {
            keepSourceTokens: true,
        }).contents;
    }

    public updateMetadata(workspace: Workspace): ValidationResult {
        // a metadata line starts with ## and must be on the top of the document
        // scan from top until we find a non-metadata line
        const lines = this.source.split("\n");
        let metadataString = "";
        for (const line of lines) {
            if (!line.startsWith("##")) {
                break;
            }
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            metadataString += "  " + line.slice(2) + "\n";
        }
        workspace.logger?.debug(`[METADATA] ${metadataString}`);
        const parsed = DocMetadata.parse(workspace, this, metadataString);
        this.metadata = parsed.metadata;
        workspace.logger?.debug({ parsed });

        if (this.metadata.fileType) {
            this.schema = matchSchemaID(this.metadata.fileType);
        }

        return parsed.result;
    }

    /**
     * Partially processes the document against its schema.
     *
     * **Note:** This method mutates the document by caching the result of the validation.
     *
     * @param workspace The workspace to validate the document in.
     */
    public partialProcess(workspace: Workspace): ValidationResult | undefined {
        workspace.logger?.debug(`[PROCESS] Partial, ${this.uri.toString()}`);
        this.cachedValidationResult = new ValidationResult();
        const metadataResult = this.updateMetadata(workspace);
        this.cachedValidationResult.merge(metadataResult);
        const yaml = this.parse();
        if (!yaml) {
            return undefined;
        }
        const res = this.schema?.partialProcess(workspace, this, yaml);
        if (res) {
            this.cachedValidationResult = res;
        }
        return res;
    }

    /**
     * Fully processes the document against its schema.
     *
     * **Note:** This method mutates the document by caching the result of the validation.
     *
     * @param workspace The workspace to validate the document in.
     */
    public fullProcess(workspace: Workspace): ValidationResult | undefined {
        workspace.logger?.debug(`[PROCESS] Full, ${this.uri.toString()}`);
        this.cachedValidationResult = new ValidationResult();
        const metadataResult = this.updateMetadata(workspace);
        this.cachedValidationResult.merge(metadataResult);
        const yaml = this.parse();
        if (!yaml) {
            return undefined;
        }
        const partialResult = this.schema?.partialProcess(workspace, this, yaml);
        if (partialResult) {
            this.cachedValidationResult.merge(partialResult);
        }
        const fullResult = this.schema?.fullProcess(workspace, this, yaml);
        if (fullResult) {
            this.cachedValidationResult.merge(fullResult);
        }
        return this.cachedValidationResult;
    }
}
