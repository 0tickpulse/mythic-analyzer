import { isScalar } from "yaml";

import { MythicComponent } from "./mythiccomponent.js";

export class MythicMob extends MythicComponent {
    public get mobType(): string | undefined {
        const type = this.getNode("Type");
        if (!type || !isScalar(type)) {
            return undefined;
        }
        return type.toString();
    }

    public get generatedDescription(): string {
        return (
            "# Mythic Mob: `"
            + this.id
            + "`"
            + (this.documentation ? "\n\n" + this.documentation : "")
        );
    }
}
