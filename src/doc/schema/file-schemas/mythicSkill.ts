import { mdSeeAlso } from "../../../util/markdown.js";
import { SchemaMap } from "../base-types/map.js";
import { SchemaNumber } from "../base-types/number.js";
import { SchemaObject } from "../base-types/object.js";

export const MYTHIC_SKILL_SCHEMA = new SchemaMap([], new SchemaObject([], {
    Cooldown: {
        schema: new SchemaNumber([], 0, undefined, true),
        required: false,
        description:
            "The cooldown of this skill in seconds."
            + mdSeeAlso("Skills/Metaskills#cooldown"),
    },
}));
