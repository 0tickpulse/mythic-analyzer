import { SemanticTokenTypes } from "vscode-languageserver";

import type { MythicDoc, Workspace } from "../index.js";

import { DIAGNOSTIC_DEFAULT, ValidationResult } from "../index.js";

import { LineToken, LineConfig } from "./lineconfig.js";

export class SkillCondition extends LineConfig {
    public questionToken?: LineToken;

    public triggerToken?: LineToken;

    public notToken?: LineToken;

    /**
     * Should be used only when you've ensured that the source starts with `?`!
     *
     * @param ws
     * @param doc
     * @param source
     * @param offset
     */
    public constructor(
        ws: Workspace,
        doc: MythicDoc,
        source: string,
        offset: number,
    ) {
        const res = new ValidationResult();
        if (!source.startsWith("?")) {
            res.diagnostics.push({
                ...DIAGNOSTIC_DEFAULT,
                message: "Condition must start with '?'",
                range: doc.convertToRange([
                    LineConfig.createPos(source, 0, offset),
                    LineConfig.createPos(source, 1, offset),
                    LineConfig.createPos(source, 1, offset),
                ]),
            });
        }
        const quesToken = new LineToken("?", [
            LineConfig.createPos(source, 0, offset),
            LineConfig.createPos(source, 1, offset),
            LineConfig.createPos(source, 1, offset),
        ]);
        let triggerToken: LineToken | undefined,
            notToken: LineToken | undefined,
            condRestOffset;
        if (source.startsWith("?~")) {
            triggerToken = new LineToken("~", [
                LineConfig.createPos(source, 1, offset),
                LineConfig.createPos(source, 1 + 1, offset),
                LineConfig.createPos(source, 1 + 1, offset),
            ]);
            condRestOffset = 1 + 1;
        } else {
            condRestOffset = 1;
        }
        if (source.substring(condRestOffset).startsWith("!")) {
            notToken = new LineToken("!", [
                LineConfig.createPos(source, condRestOffset, offset),
                LineConfig.createPos(source, condRestOffset + 1, offset),
                LineConfig.createPos(source, condRestOffset + 1, offset),
            ]);
            condRestOffset++;
        }
        super(ws, doc, source.substring(condRestOffset), offset + condRestOffset);
        this.questionToken = quesToken;
        this.triggerToken = triggerToken;
        this.notToken = notToken;
    }

    public override addHighlights(ws: Workspace, doc: MythicDoc): this {
        super.addHighlights(ws, doc);
        this.main?.addHighlight(ws, doc, this.result, SemanticTokenTypes.function);
        this.questionToken?.addHighlight(ws, doc, this.result, SemanticTokenTypes.operator);
        this.triggerToken?.addHighlight(ws, doc, this.result, SemanticTokenTypes.operator);
        this.notToken?.addHighlight(ws, doc, this.result, SemanticTokenTypes.operator);
        return this;
    }
}
