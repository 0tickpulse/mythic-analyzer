import type { MythicDoc } from "./doc/mythicdoc.js";

/**
 * A workspace in the Mythic system.
 * This is a collection of documents that are all part of the same project.
 * This class contains the logic for documents and the data structures that are parsed from them.
 */
export class Workspace {
    /**
     * The documents in the workspace.
     */
    public readonly docs = new Map<string, MythicDoc>();

    /**
     * Loads a new document into the workspace.
     * @param doc The document to load.
     */
    public load(doc: MythicDoc): void {
        this.docs.set(doc.uri.toString(), doc);
    }
}

export * from "./doc";
