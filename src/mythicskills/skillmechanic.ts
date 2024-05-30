import type { MythicDoc, Workspace } from "../index.js";
import type { LineConfig, LineToken } from "./lineconfig.js";
import type { SkillCondition } from "./skillcondition.js";

import { SkillTrigger } from "./skilltrigger.js";
import { SkillTargeter } from "./skilltargeter.js";

export class SkillMechanic {
    public targeter?: SkillTargeter;

    public trigger?: SkillTrigger;

    public conditions: SkillCondition[] = [];

    public chanceToken?: LineToken;

    public constructor(public source: string, public lineConfig: LineConfig) {}

    public static parseTargeter(ws: Workspace, doc: MythicDoc, source: string, offset: number): SkillTargeter {
        return new SkillTargeter(ws, doc, source, offset);
    }

    public static parseTrigger(ws: Workspace, doc: MythicDoc, source: string, offset: number): SkillTrigger {
        return new SkillTrigger(ws, doc, source, offset);
    }
}
