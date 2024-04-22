import { isMap } from "yaml";

import type { ParsedNode } from "yaml";
import type { MythicDoc } from "../doc/mythicdoc.js";
import type { Workspace } from "../index.js";

export class MythicComponent {
    public constructor(
        public ws: Workspace,
        public doc: MythicDoc,
        public id: string,
        public declarations: ParsedNode[],
        public documentation?: string,
    ) {
        ws.logger?.debug(`Creating MythicComponent with id ${id}, declarations ${declarations.length}. Declaration type is ${declarations[0]!.constructor.name}.`);
    }

    public getNode(name: string): ParsedNode | undefined {
        return this.declarations.map(d => {
            if (!isMap(d)) {
                return undefined;
            }
            const v = d.get(name);
            if (!v) {
                return undefined;
            }
            return v;
        }).find(Boolean);
    }
}
