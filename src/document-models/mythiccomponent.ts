import type { ParsedNode } from "yaml";
import type { MythicDoc } from "../doc/mythicdoc.js";

export class MythicComponent {
    public constructor(
        public doc: MythicDoc,
        public id: string,
        public declaration: ParsedNode,
        public documentation?: string,
    ) {}
}
