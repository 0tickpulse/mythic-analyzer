import { SemanticTokenTypes } from "vscode-languageserver";

import type { MythicDoc, Workspace } from "../index.js";

import { ValidationResult } from "../index.js";
import { Highlight } from "../lsp/models/highlight.js";

import { LineConfig, LineToken } from "./lineconfig.js";

export class SkillTrigger {
    public tildeToken: LineToken;

    public nameToken: LineToken;

    public colonToken?: LineToken;

    public triggerArgToken?: LineToken;

    public result = new ValidationResult();

    public constructor(
        public ws: Workspace,
        public doc: MythicDoc,
        public source: string,
        public offset: number,
    ) {
        this.tildeToken = new LineToken("~", [offset, offset + 1, offset + 1]);
        if (!source.includes(":")) {
            this.nameToken = new LineToken(source, [
                LineConfig.createPos(source, 1, offset),
                LineConfig.createPos(source, source.length, offset),
                LineConfig.createPos(source, source.length, offset),
            ]);
            return;
        }
        const colonOffset = source.indexOf(":");

        this.nameToken = new LineToken(source.substring(0, colonOffset), [
            LineConfig.createPos(source, 1, offset),
            LineConfig.createPos(source, colonOffset, offset),
            LineConfig.createPos(source, colonOffset, offset),
        ]);
        this.colonToken = new LineToken(":", [
            LineConfig.createPos(source, colonOffset, offset),
            LineConfig.createPos(source, colonOffset + 1, offset),
            LineConfig.createPos(source, colonOffset + 1, offset),
        ]);
        this.triggerArgToken = new LineToken(
            source.substring(colonOffset + 1),
            [
                LineConfig.createPos(source, colonOffset + 1, offset),
                LineConfig.createPos(source, source.length, offset),
                LineConfig.createPos(source, source.length, offset),
            ],
        );
    }

    public addHighlights(ws: Workspace, doc: MythicDoc): this {
        this.result.highlights.unshift(
            new Highlight(
                doc.convertToRange(this.tildeToken.range),
                SemanticTokenTypes.operator,
            ),
            new Highlight(
                doc.convertToRange(this.nameToken.range),
                SemanticTokenTypes.event,
            ),
        );
        this.colonToken && this.result.highlights.unshift(
            new Highlight(
                doc.convertToRange(this.colonToken.range),
                SemanticTokenTypes.operator,
            ),
        );
        this.triggerArgToken && this.result.highlights.unshift(
            new Highlight(
                doc.convertToRange(this.triggerArgToken.range),
                SemanticTokenTypes.string,
            ),
        );

        return this;
    }
}
