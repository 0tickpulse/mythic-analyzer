import { readFile } from "fs/promises";

import { URI } from "vscode-uri";

import type { Position, Range } from "vscode-languageserver";
import type { Range as YamlRange } from "yaml";
import type { PathLike } from "fs";
import type { Schema } from "./schema/schema.js";

import { findSchema } from "./schema/pathmap.js";

/**
 * Represents a document in the Mythic system.
 */
export class MythicDoc {
    /**
     * A cached array of the lengths of each line in the document.
     * Used for calculating the position of a character in the document.
     */
    protected readonly lineLengths = this.source.split("\n").map((line) => line.length);

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
        public readonly schema?: Schema,
    ) {}

    /**
     * Creates a new MythicDoc by reading the contents of a file given by its path.
     *
     * @param path The path to the file to read.
     * @returns A {@link Promise} that resolves to the new MythicDoc.
     */
    public static async fromFilePath(path: PathLike): Promise<MythicDoc> {
        return new MythicDoc(await readFile(path, "utf-8"), URI.file(path.toString()), findSchema(path.toString()));
    }

    /**
     * Converts a `Range` from the `yaml` package to a `Range` from the `vscode-languageserver` package.
     *
     * @param range The range to convert.
     */
    public convertToRange(range: YamlRange): Range {
        const start = this.convertToPosition(range[0]);
        const end = this.convertToPosition(range[2]);
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
        let line = 0, column = position;
        while (column > this.lineLengths[line]!) {
            column -= this.lineLengths[line]!;
            line++;
        }
        const character = column;
        return { line, character };
    }

    /**
     * Converts a `Position` from the `vscode-languageserver` package to a numerical, 0-based position.
     *
     * @param position The position to convert.
     */
    public convertToYamlPosition(position: Position): number {
        let line = 0, column = position.character;
        while (line < position.line) {
            column += this.lineLengths[line]!;
            line++;
        }
        return column;
    }
}
