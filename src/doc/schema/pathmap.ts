import picomatch from "picomatch";

import type { Schema } from "./schema.js";

import { MYTHIC_SKILL_SCHEMA } from "./file-schemas/mythicSkill.js";
import { MYTHIC_MOB_SCHEMA } from "./file-schemas/mythicMob.js";

const PATH_MAP_DEFAULT: PathMap = [
    [picomatch("**/plugins/MythicMobs/{Skills,Packs/*/Skills}/**/*.{yml,yaml}"), MYTHIC_SKILL_SCHEMA],
    [picomatch("**/plugins/MythicMobs/{Mobs,Packs/*/Mobs}/**/*.{yml,yaml}"), MYTHIC_MOB_SCHEMA],
];

function findSchema(path: string, pathMap: PathMap = PATH_MAP_DEFAULT): Schema | undefined {
    for (const [matcher, schema] of pathMap) {
        if (matcher(path)) {
            return schema;
        }
    }
    return undefined;
}

/**
 * A map of glob matchers to schemas.
 */
export type PathMap = [picomatch.Matcher, Schema][];

export { PATH_MAP_DEFAULT, findSchema };
