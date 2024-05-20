import type { MythicDoc } from "../doc/index.js";
import type { Workspace } from "../index.js";

import { LineConfig, LineToken } from "./lineconfig.js";

export class SkillTargeter extends LineConfig {
    public atToken: LineToken;

    /**
     *
     *
     * @param ws
     * @param doc
     * @param source Includes the `@` symbol
     * @param offset Should start at the `@` symbol
     */
    public constructor(
        ws: Workspace,
        doc: MythicDoc,
        source: string,
        offset: number,
    ) {
        super(ws, doc, source.substring(1), offset + 1);
        ws.logger?.debug({
            source: source.substring(1),
            offset: offset + 1,
        });
        this.atToken = new LineToken("@", [
            LineConfig.createPos(source, 0, offset),
            LineConfig.createPos(source, 1, offset),
            LineConfig.createPos(source, 1, offset),
        ]);
    }
}
