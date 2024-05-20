import { MythicComponent } from "./mythiccomponent.js";

export class MythicItem extends MythicComponent {
    public get generatedDescription(): string {
        return (
            "# Mythic Item: `"
            + this.id
            + "`"
            + (this.documentation ? "\n\n" + this.documentation : "")
        );
    }
}
