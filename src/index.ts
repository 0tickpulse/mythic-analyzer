import {
    TextDocuments,
    SemanticTokenTypes,
    SemanticTokenModifiers,
    createConnection,
    ProposedFeatures,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";

import type { Connection } from "vscode-languageserver";
import type { Logger } from "./logger.js";
import type { RangeLink } from "./lsp/models/rangeLink.js";

import { MythicDoc } from "./doc/mythicdoc.js";
import { STDOUT_LOGGER } from "./logger.js";
import { initializeHandler } from "./lsp/listeners/initialize.js";
import { hoverHandler } from "./lsp/listeners/hover.js";
import { recursiveReadDir } from "./util/files.js";
import { semanticTokenHandler } from "./lsp/listeners/semantictokens.js";
import { ValidationResult } from "./doc";
import { MythicDataBuilder } from "./mythic/data.js";
import { definitionHandler } from "./lsp/listeners/definition.js";
import { LineConfig } from "./mythicskills/lineconfig.js";
import { completionHandler } from "./lsp/listeners/completion.js";

async function main() {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- I'm just using this to get the arguments.
    const args = process.argv.slice(2);

    const mode = args[0];
    if (mode === "lsp") {
        const workspace = new Workspace();
        if (!process.stdin.isTTY && !args.includes("--no-logger")) {
            workspace.logger = STDOUT_LOGGER;
        }
        workspace.createLSP(createConnection(ProposedFeatures.all));
    } else if (mode === "cli") {
        process.stdout.write("== MYTHIC ANALYZER CLI ==\n");
        const folder = args[1];
        if (!folder) {
            process.stderr.write("Usage: mythic cli <folder>\n");
            throw new Error("No folder specified");
        }
        process.stdout.write(`Analyzing ${folder}...\n`);
        const workspace = new Workspace();
        workspace.logger = STDOUT_LOGGER;

        // read all files in the folder
        await workspace.loadFolder(folder);

        for (const doc of workspace.docs.values()) {
            workspace.logger.log(`== ${doc.uri.toString()}`);
            doc.partialProcess(workspace);
            const result = doc.fullProcess(workspace);
            if (!result) {
                workspace.logger.log("⚠️ No validation result.");
                continue;
            }
            workspace.logger.log(result);
            // const diagnostics = result.diagnostics;
            // for (const diagnostic of diagnostics) {
            //     const range = diagnostic.range;
            //     const message = diagnostic.message;
            //     const start = range.start;
            //     const end = range.end;
            //     const line = start.line;
            //     const character = start.character;
            //     const endLine = end.line;
            //     const endCharacter = end.character;
            //     process.stdout.write(`${line}:${character}-${endLine}:${endCharacter} ${message}\n`);
            // }
        }
    } else if (mode === "skilltest") {
        process.stdout.write("== MYTHIC SKILL TEST ==\n");
        const workspace = new Workspace();
        workspace.logger = STDOUT_LOGGER;

        // recursively listen for input
        for (;;) {
            process.stdout.write("Enter a skill: ");
            const skill = await new Promise<string>((resolve) => {
                process.stdin.once("data", (data) => {
                    resolve(data.toString().trim());
                });
            });

            const doc = new MythicDoc(skill, URI.file("stdin"));
            const skillObject = new LineConfig(workspace, doc, skill);

            workspace.logger.log(JSON.stringify(skillObject));
            workspace.logger.log(skillObject.config);
        }
    }
}

/**
 * A workspace in the Mythic system.
 * This is a collection of documents that are all part of the same project.
 * This class contains the logic for documents and the data structures that are parsed from them.
 */
class Workspace {
    /**
     * The documents in the workspace.
     */
    public readonly docs = new Map<string, MythicDoc>();

    public readonly partialParseQueue = new Set<MythicDoc>();

    public readonly fullParseQueue = new Set<MythicDoc>();

    public readonly mythicData = new MythicDataBuilder().build();

    /**
     * Range links are links between ranges in documents.
     * Used for things like go to definition.
     */
    public get rangeLinks(): RangeLink[] {
        const links: RangeLink[] = [];
        for (const doc of this.docs.values()) {
            for (const link of doc.cachedValidationResult?.rangeLinks ?? []) {
                links.push(link);
            }
        }
        return links;
    }

    /**
     * The semantic token types that the workspace supports.
     */
    public readonly semanticTokenTypes: SemanticTokenTypes[] = [
        SemanticTokenTypes.namespace,
        SemanticTokenTypes.type,
        SemanticTokenTypes.class,
        SemanticTokenTypes.enum,
        SemanticTokenTypes.interface,
        SemanticTokenTypes.struct,
        SemanticTokenTypes.typeParameter,
        SemanticTokenTypes.parameter,
        SemanticTokenTypes.variable,
        SemanticTokenTypes.property,
        SemanticTokenTypes.enumMember,
        SemanticTokenTypes.event,
        SemanticTokenTypes.function,
        SemanticTokenTypes.method,
        SemanticTokenTypes.macro,
        SemanticTokenTypes.keyword,
        SemanticTokenTypes.modifier,
        SemanticTokenTypes.comment,
        SemanticTokenTypes.string,
        SemanticTokenTypes.number,
        SemanticTokenTypes.regexp,
        SemanticTokenTypes.operator,
        SemanticTokenTypes.decorator,
    ];

    /**
     * The semantic token modifiers that the workspace supports.
     */
    public readonly semanticTokenModifiers: SemanticTokenModifiers[] = [
        SemanticTokenModifiers.declaration,
    ];

    /**
     * A logger for the workspcae for debugging purposes.
     * You must implement this yourself.
     */
    public logger?: Logger;

    /**
     * Loads a new document into the workspace.
     * Note that this will overwrite any existing document with the same URI.
     * This does not process the document.
     *
     * @param doc The document to load.
     */
    public load(doc: MythicDoc): void {
        this.docs.set(doc.uri.toString(), doc);
    }

    public mergedValidationResult(): ValidationResult {
        const res = new ValidationResult();
        for (const doc of this.docs.values()) {
            if (!doc.cachedValidationResult) {
                continue;
            }
            res.merge(doc.cachedValidationResult);
        }
        return res;
    }

    /**
     * Loads all files in a folder into the workspace.
     * Calls {@link Workspace#load} for each file.
     *
     * @param folder The folder to load files from.
     */
    public async loadFolder(folder: string): Promise<void> {
        const files = await recursiveReadDir(folder);
        for (const file of files) {
            if (!file.endsWith(".yaml") && !file.endsWith(".yml")) {
                continue;
            }
            const docResult = await MythicDoc.fromFilePath(file);
            if (await docResult.isErr()) {
                this.logger?.error(docResult.unwrapErr());
                continue;
            }
            const doc = await docResult.unwrap();
            this.load(doc);
        }
    }

    /**
     * Unloads a document from the workspace.
     *
     * @param doc The document to unload.
     */
    public unload(doc: MythicDoc): void {
        this.docs.delete(doc.uri.toString());
    }

    /**
     * Gets a document from the workspace by its URI.
     *
     * @param uri The URI of the document to get.
     */
    public get(uri: string): MythicDoc | undefined {
        return this.docs.get(uri);
    }

    /**
     * Opens a LSP connection to the workspace.
     *
     * @param connection The connection to open.
     */
    public createLSP(connection: Connection) {
        this.logger?.log("Creating LSP connection.");
        const documents = new TextDocuments(TextDocument);
        connection.onInitialize(initializeHandler(this));
        connection.onHover(hoverHandler(this));
        connection.languages.semanticTokens.on(semanticTokenHandler(this));
        connection.onDefinition(definitionHandler(this));
        connection.onCompletion(completionHandler(this));
        documents.onDidChangeContent((change) => {
            this.logger?.log(`Document ${change.document.uri} changed.`);
            connection
                .sendDiagnostics({
                    uri: change.document.uri,
                    diagnostics: [],
                })
                .catch((err) => {
                    this.logger?.error(
                        `Failed to send diagnostics for ${
                            change.document.uri
                        }: ${String(err)}`,
                    );
                });
            const doc = MythicDoc.fromTextDocument(change.document);
            this.logger?.log(
                `Loaded document ${doc.uri.toString()} after change.`,
            );
            this.load(doc);
            const result = doc.fullProcess(this);
            const diags = result?.diagnostics;
            connection
                .sendDiagnostics({
                    uri: change.document.uri,
                    diagnostics: diags ?? [],
                })
                .catch((err) => {
                    this.logger?.error(
                        `Failed to send diagnostics for ${
                            change.document.uri
                        }: ${String(err)}`,
                    );
                });
            connection.languages.semanticTokens.refresh();
        });
        documents.listen(connection);
        connection.listen();
    }

    public getAllDependenciesOf(doc: MythicDoc): MythicDoc[] {
        // beware of cycles
        const deps = new Set<MythicDoc>();
        const queue = [doc];
        while (queue.length !== 0) {
            const doc = queue.pop()!;
            for (const dep of doc.dependencies) {
                const depDoc = this.get(dep);
                if (!depDoc) {
                    continue;
                }
                deps.add(depDoc);
                queue.push(depDoc);
            }
        }
        return Array.from(deps);
    }
}

if (require.main === module) {
    main().catch((err) => {
        process.stderr.write((err as unknown as Error).stack!);
    });
}

export * from "./doc";
export * from "./document-models";
export * from "./errors/errors.js";
export * from "./logger";
export { Workspace };
