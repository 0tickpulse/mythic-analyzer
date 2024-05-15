import { isMap, isPair } from "yaml";

import type { Pair, ParsedNode } from "yaml";
import type { MythicDoc } from "../doc/mythicdoc.js";
import type { Workspace } from "../index.js";

class MythicComponent<T extends Pair<ParsedNode, ParsedNode | null> = Pair<ParsedNode, ParsedNode | null>> {
    public constructor(
        public ws: Workspace,
        public id: string,
        public declarations: MythicComponentDeclaration<T>[],
        public documentation?: string,
    ) {
        ws.logger?.debug(`Creating MythicComponent with id ${id}, declarations ${declarations.length}. Declaration type is ${declarations[0]!.constructor.name}.`);
    }

    public getNode(name: string): ParsedNode | undefined {
        return this.declarations.map(({ declaration }) => {
            if (!isPair(declaration)) {
                return undefined;
            }
            const value = declaration.value;
            if (!isMap(value)) {
                return undefined;
            }
            const v = value.get(name);
            if (!v) {
                return undefined;
            }
            return v;
        }).find(Boolean);
    }
}

type MythicComponentDeclaration<T extends Pair<ParsedNode, ParsedNode | null>> = {
    declaration: T;
    doc: MythicDoc;
};

export type { MythicComponentDeclaration };
export { MythicComponent };
