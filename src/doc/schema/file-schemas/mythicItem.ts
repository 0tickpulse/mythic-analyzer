import { CompletionItemKind, SemanticTokenTypes } from "vscode-languageserver";

import { MythicItem } from "../../../document-models/mythicitem.js";
import { mdSeeAlso } from "../../../util/markdown.js";
import { SchemaList } from "../base-types/list.js";
import { SchemaMap } from "../base-types/map.js";
import { SchemaObject } from "../base-types/object.js";
import { SchemaString } from "../base-types/string.js";
import { SCHEMA_MATERIAL_TYPE } from "../utility-types/materialType.js";
import { SCHEMA_MYTHIC_ITEM_ID } from "../utility-types/mythicItemId.js";
import { component } from "../utils/component.js";

export const MYTHIC_ITEM_SCHEMA: SchemaMap = new SchemaMap(
    new SchemaObject((ws, doc, value) => ({
        Template: {
            schema: SCHEMA_MYTHIC_ITEM_ID,
            description: `The base mythic mob to use as a template.
            This is used to inherit all the settings from another mythic mob.

            ${mdSeeAlso("Mobs/Templates")}`,
        },
        Exclude: {
            schema: new SchemaList(
                new SchemaString(() => {
                    const properties = MYTHIC_ITEM_SCHEMA.properties;
                    if (typeof properties !== "function") {
                        return []; // This should never happen
                    }
                    const propertyMap = properties(ws, doc, value);
                    const property = Object.values(propertyMap)[0];
                    if (!property) {
                        return [];
                    }
                    const schemaObject = property.schema;
                    if (!(schemaObject instanceof SchemaObject)) {
                        return [];
                    }
                    const objectProperties = schemaObject.properties;
                    if (typeof objectProperties !== "function") {
                        return [];
                    }
                    return Object.keys(objectProperties(ws, doc, value)).map(
                        (key) => ({
                            matcher: key,
                            completionItem: {
                                label: key,
                                kind: CompletionItemKind.Property,
                            },
                        }),
                    );
                }),
            ),
            description: `Excludes unwanted inherited properties from the template.

            ${mdSeeAlso("Mobs/Templates")}`,
        },
        Id: {
            schema: SCHEMA_MATERIAL_TYPE,
            description: `The base material to use for your item.

            ${mdSeeAlso("Items/Items#id")}`,
        },
    })).withName("mythic_item_config"),
).onPartialProcess(component(MythicItem, "items", SemanticTokenTypes.class));
