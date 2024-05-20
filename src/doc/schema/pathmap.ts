import picomatch from "picomatch";

import type { Schema } from "./schema.js";

import { equalsIgnoreCase } from "../../util/string.js";

import { MYTHIC_MOB_SCHEMA } from "./file-schemas/mythicMob.js";
import { MYTHIC_SKILL_SCHEMA } from "./file-schemas/mythicSkill.js";
import { MYTHIC_ITEM_SCHEMA } from "./file-schemas/mythicItem.js";

const PATH_MAP_DEFAULT = [
    [
        picomatch(
            "**/plugins/MythicMobs/{Skills,Packs/*/Skills}/**/*.{yml,yaml}",
        ),
        MYTHIC_SKILL_SCHEMA,
        "MYTHIC_SKILL",
    ],
    [
        picomatch("**/plugins/MythicMobs/{Mobs,Packs/*/Mobs}/**/*.{yml,yaml}"),
        MYTHIC_MOB_SCHEMA,
        "MYTHIC_MOB",
    ],
    [
        picomatch("**/plugins/MythicMobs/{Items,Packs/*/Items}/**/*.{yml,yaml}"),
        MYTHIC_ITEM_SCHEMA,
        "MYTHIC_ITEM",
    ],
] as const satisfies PathMap;

const SCHEMA_IDS = PATH_MAP_DEFAULT.map(([, , id]) => id);

/**
 * Finds the file schema for a given path.
 *
 * @param path     The path to the file.
 * @param pathMap  The path map to use. Usually shouldn't be changed.
 * @returns
 */
function findSchema(
    path: string,
    pathMap: PathMap = PATH_MAP_DEFAULT,
): Schema | undefined {
    for (const [matcher, schema] of pathMap) {
        if (matcher(path)) {
            return schema;
        }
    }
    return undefined;
}

function matchSchemaID(
    id: string,
    pathMap: PathMap = PATH_MAP_DEFAULT,
): Schema | undefined {
    for (const [, schema, schemaID] of pathMap) {
        if (equalsIgnoreCase(schemaID, id)) {
            return schema;
        }
    }
    return undefined;
}

/**
 * A map of glob matchers to schemas.
 */
type PathMap = readonly (readonly [picomatch.Matcher, Schema, string])[];
type SchemaID = (typeof SCHEMA_IDS)[number];

export type { PathMap, SchemaID };

export { findSchema, matchSchemaID, PATH_MAP_DEFAULT, SCHEMA_IDS };

