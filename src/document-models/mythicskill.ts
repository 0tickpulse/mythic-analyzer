import type { ParsedNode } from "yaml";

export class MythicSkill {
    public constructor(public declaration: ParsedNode, public documentation?: string) {}
}
