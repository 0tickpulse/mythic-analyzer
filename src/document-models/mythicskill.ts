import { MythicComponent } from "./mythiccomponent.js";

export class MythicSkill extends MythicComponent {
    public get generatedDescription(): string {
        return (
            "# Mythic Skill: `"
            + this.id
            + "`"
            + (this.documentation ? "\n\n" + this.documentation : "")
        );
    }
}
