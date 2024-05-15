import { isMap, isScalar, parseDocument } from "yaml";
import { SemanticTokenTypes } from "vscode-languageserver";

import type { SchemaID } from "./schema/pathmap.js";
import type { MythicDoc, Workspace } from "../index.js";

import { highlightYaml } from "../yaml/highlighter.js";
import { Highlight } from "../lsp/models/highlight.js";
import { includesIgnoreCase } from "../util/string.js";

import { ValidationResult, SCHEMA_IDS, SchemaObject, SchemaString } from "./schema/index.js";

export class DocMetadata {
    public fileType?: SchemaID;

    private static readonly DOCMETADATA_SCHEMA = new SchemaObject({
        FileType: {
            schema: new SchemaString(SCHEMA_IDS)

                .onPartialProcess((ws, doc, value, result) => {
                    if (!includesIgnoreCase(SCHEMA_IDS, value.toJSON() as string)) {
                        return;
                    }
                    result.highlights.unshift(new Highlight(doc.convertToRange(value.range), SemanticTokenTypes.enumMember));
                }),
            description:
                "The type of file this document represents. Useful when the extension can't determine the file type itself.",
        },
    });

    public static parse(
        ws: Workspace,
        doc: MythicDoc,
        src: string,
    ): DocMetadataParseResult {
        const yml = parseDocument(src, { keepSourceTokens: true }).contents;
        const metadata = new DocMetadata();
        const result = new ValidationResult();
        if (!yml) {
            return {
                metadata,
                result,
            };
        }
        result.merge(highlightYaml(ws, doc, yml));
        result.merge(this.DOCMETADATA_SCHEMA.partialProcess(ws, doc, yml));
        // result.transformRanges((range) => ({
        //     start: {
        //         line: range.start.line,
        //         character: range.start.character + "##".length,
        //     },
        //     end: {
        //         line: range.end.line,
        //         character: range.end.character + "##".length,
        //     },
        // }));

        if (!isMap(yml)) {
            return {
                metadata,
                result,
            };
        }

        for (const pair of yml.items) {
            const key = pair.key.toString();
            const value = pair.value;
            switch (key) {
                case "FileType":
                    if (
                        isScalar(value)
                        && includesIgnoreCase(SCHEMA_IDS, value.value as string)
                    ) {
                        metadata.fileType = value.value as SchemaID;
                    }
                    break;
            }
        }

        return {
            metadata,
            result,
        };
    }
}

export type DocMetadataParseResult = {
    metadata: DocMetadata;
    result: ValidationResult;
};
