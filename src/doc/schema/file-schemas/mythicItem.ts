import { CompletionItemKind, SemanticTokenTypes } from "vscode-languageserver";

import { MythicItem } from "../../../document-models/mythicitem.js";
import { DIAGNOSTIC_DEFAULT } from "../../../errors/errors.js";
import { mdLinkWiki, mdSeeAlso } from "../../../util/markdown.js";
import { includesIgnoreCase } from "../../../util/string.js";
import { getNodeInMap } from "../../../util/yamlNodes.js";
import { SchemaList } from "../base-types/list.js";
import { SchemaMap } from "../base-types/map.js";
import { SchemaNumber } from "../base-types/number.js";
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
        // TODO: Extract this into a util function
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
        Display: {
            schema: new SchemaString(),
            description: `Sets the display name of the item.

            ${mdSeeAlso("Items/Items#display")}`,
        },
        Lore: {
            schema: new SchemaList(new SchemaString()),
            description: `Sets the lore of the item. You can generate a random number using \`{min-max}\`, \`<random.#to#>\`, or \`<random.float.#to#>\`.

            ${mdSeeAlso("Items/Items#lore")}`,
        },
        CustomModelData: {
            schema: new SchemaNumber(),
            description: `Sets the CustomModelData tag on the item.

            ${mdSeeAlso("Items/Items#custommodeldata")}`,
            aliases: ["Model"],
        },
        Durability: {
            schema: new SchemaNumber(0),
            description: `Sets the amount of durability to take off the item.

            ${mdSeeAlso("Items/Items#durability")}`,
        },
        Attributes: {
            schema: new SchemaObject(),
            description: `Special field that allows the addition of item attributes to certain armor slots.

            ${mdSeeAlso("Items/Items#attributes")}`,
        },
        Amount: {
            schema: new SchemaNumber(1).withInteger(true),
            description: `Sets the default amount of items to give when this item is being called by the plugin.

            ${mdSeeAlso("Items/Items#amount")}`,
        },
        Options: {
            schema: new SchemaMap(),
            description: `A special field that comes with numerous sub-options.

            ${mdSeeAlso("Items/Items#options")}`,
        },
        Enchantments: {
            schema: new SchemaList(
                new SchemaString().withName("enchantment"),
                false,
            ),
            description: `Sets the enchantments on the item. Any items can have any enchantments(s).

            ${mdSeeAlso("Items/Items#enchantments")}`,
        },
        Hide: {
            schema: new SchemaList(
                new SchemaString(
                    ws.mythicData.hideFlags.map((f) => ({
                        matcher: f,
                        completionItem: {
                            label: f,
                            kind: CompletionItemKind.EnumMember,
                        },
                    })),
                )
                    .setHighlight(SemanticTokenTypes.enumMember)
                    .withName("hide"),
                false,
            ),
            description: `Special field that allows to hide specific things from the item tooltip.

            ${mdSeeAlso("Items/Items#hide")}`,
        },
        PotionEffects: {
            schema: new SchemaList(new SchemaString()).onPartialProcess(
                (ws, doc, value2, result) => {
                    const itemType = getNodeInMap(value, "Id");
                    if (!itemType) {
                        return;
                    }
                    if (
                        !includesIgnoreCase(
                            [
                                "potion",
                                "splash_potion",
                                "lingering_potion",
                                "tipped_arrow",
                            ],
                            itemType.toString(),
                        )
                    ) {
                        result.diagnostics.push({
                            ...DIAGNOSTIC_DEFAULT,
                            message: `Potion effects can only be applied to items of type \`potion\`, \`splash_potion\`, \`lingering_potion\`, or \`tipped_arrow\`.`,
                            range: doc.convertToRange(value2.range),
                            code: "mythic-item-invalid-potion-effects",
                        });
                    }
                },
            ),
            description: `Sets the potion effects of the item. These effects won't do anything if the base item is not a potion, splash_potion, lingering_potion, or tipped_arrow.
            See ${mdLinkWiki("Items/Potions")}.

            ${mdSeeAlso("Items/Items#potioneffects")}`,
        },
        BannerLayers: {
            schema: new SchemaList(new SchemaString()),
            description: `Sets the banner layers of a banner or a shield.
            See ${mdLinkWiki("Items/Banner-Layers")}.

            ${mdSeeAlso("Items/Items#bannerlayers")}`,
        },
        CanPlaceOn: {
            schema: new SchemaList(new SchemaString()),
            description: `Sets what blocks this item can be placed on, if the player is in adventure mode.

            ${mdSeeAlso("Items/Items#canplaceon")}`,
        },
        CanBreak: {
            schema: new SchemaList(new SchemaString()),
            description: `Sets what blocks this item can break, if the player is in adventure mode.

            ${mdSeeAlso("Items/Items#canbreak")}`,
        },
        Group: {
            schema: new SchemaString(),
            description: `Sets the group the item is in for \`/mm items browse\`.

            ${mdSeeAlso("Items/Items#group")}`,
        },
        NBT: {
            schema: new SchemaMap(),
            description: `Sets the NBT data for the item.

            ${mdSeeAlso("Items/Items#nbt")}`,
        },
    })).withName("mythic_item_config"),
).onPartialProcess(component(MythicItem, "items", SemanticTokenTypes.class));
