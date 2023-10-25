import type picomatch from "picomatch";
import type { Schema } from "./schema.js";

const PATH_MAP_DEFAULT: PathMap = [];

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
