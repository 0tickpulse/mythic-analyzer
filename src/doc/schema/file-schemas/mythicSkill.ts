import { mdSeeAlso } from "../../../util/markdown.js";
import { SchemaList } from "../base-types/list.js";
import { SchemaMap } from "../base-types/map.js";
import { SchemaNumber } from "../base-types/number.js";
import { SchemaObject } from "../base-types/object.js";
import { SchemaString } from "../base-types/string.js";

export const MYTHIC_SKILL_SCHEMA = new SchemaMap(new SchemaObject({
    Cooldown: {
        schema: new SchemaNumber(0, undefined, true),
        required: false,
        description:
            "The cooldown of this skill in seconds."
            + mdSeeAlso("Skills/Metaskills#cooldown"),
    },
    Skills: {
        schema: new SchemaList(new SchemaString()),
        required: true,
        description:
            "The skills that this skill will use."
            + mdSeeAlso("Skills/Metaskills#skills"),
    },
}));
