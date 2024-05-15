import type { Range } from "vscode-languageserver";
import type { MythicDoc } from "../../doc/mythicdoc.js";

export class RangeLink {
    public constructor(
        public fromDoc: MythicDoc,
        public fromRange: Range,
        public toDoc: MythicDoc,
        public toSelectionRange: Range,
        public toRange?: Range,
    ) {}
}
