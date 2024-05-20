import { CompletionItemKind, SemanticTokenTypes } from "vscode-languageserver";
import { isMap, isScalar } from "yaml";

import { MythicMob } from "../../../document-models/mythicmob.js";
import { DIAGNOSTIC_DEFAULT } from "../../../errors/errors.js";
import { mdLinkWiki, mdSeeAlso } from "../../../util/markdown.js";
import { includesIgnoreCase } from "../../../util/string.js";
import { SchemaBool } from "../base-types/bool.js";
import { SchemaList } from "../base-types/list.js";
import { SchemaMap } from "../base-types/map.js";
import { SchemaNumber } from "../base-types/number.js";
import { SchemaObject } from "../base-types/object.js";
import { SchemaString } from "../base-types/string.js";
import { SCHEMA_ENTITY_TYPE } from "../utility-types/entityType.js";
import { SCHEMA_MYTHIC_MOB_ID } from "../utility-types/mythicMobId.js";
import { component } from "../utils/component.js";
import { MythicSkillList } from "../utility-types/mythicSkillList.js";

export const MYTHIC_MOB_SCHEMA: SchemaMap = new SchemaMap(
    new SchemaObject((ws, doc, value) => ({
        Template: {
            schema: SCHEMA_MYTHIC_MOB_ID,
            description: `The base mythic mob to use as a template.
            This is used to inherit all the settings from another mythic mob.

            ${mdSeeAlso("Mobs/Templates")}`,
        },
        Exclude: {
            schema: new SchemaList(new SchemaString(() => {
                const properties = MYTHIC_MOB_SCHEMA.properties;
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
                return Object.keys(objectProperties(ws, doc, value)).map(key => ({
                    matcher: key,
                    completionItem: {
                        label: key,
                        kind: CompletionItemKind.Property,
                    },
                }));
            })),
            description: `Excludes unwanted inherited properties from the template.

            ${mdSeeAlso("Mobs/Templates")}`,
        },
        Type: {
            schema: SCHEMA_ENTITY_TYPE,
            description: `The base entity type of the mythic mob.

            ${mdSeeAlso("Mobs/Mobs#type")}`,
        },
        Display: {
            schema: new SchemaString(),
            description: `The display name of the mythic mob. Does not update on its own, but can be changed using the \`setname\` mechanic.

            ${mdSeeAlso("Mobs/Mobs#display")}`,
        },
        Health: {
            schema: new SchemaNumber(0),
            description: `Sets the base value of the mob's max health attribute.
            Mythic doesn't have any limitations on max health but Spigot, however, caps the max health at 2048.
            This can easily be changed in spigot's configuration file, \`server_root\\spigot.yml\`.
            Whenever the mob is holding or wearing an item with attribute modifiers will also affect the total max health.

            ${mdSeeAlso("Mobs/Mobs#health")}`,
        },
        Damage: {
            schema: new SchemaNumber(0),
            description: `Sets the base value of the mob's melee attack damage attribute.
            \`1\` damage equals to \`0.5\` hearts, so a mob with \`6\` damage will deal \`3\` full hearts of damage.
            This attribute will never affect damage done by ranged attacks, like arrows or potions.
            Whenever the mob is holding or wearing an item with attribute modifiers will also affect the mob's melee damage.

            ${mdSeeAlso("Mobs/Mobs#damage")}`,
        },
        Armor: {
            schema: new SchemaNumber(
                0,
                (ws) => ws.mythicData.attributeMaxArmor,
            ),
            description: `Sets the base value of the mob's armor attribute.
            Minecraft caps the max armor value to \`30\`.
            Whenever the mob is holding or wearing an item with attribute modifiers will also affect the total armor.

            ${mdSeeAlso("Mobs/Mobs#armor")}`,
        },
        HealthBar: {
            schema: new SchemaObject({
                Enabled: {
                    schema: new SchemaBool(),
                    description: `Enables or disables the health bar hologram.`,
                    required: true,
                },
                Offset: {
                    schema: new SchemaNumber(),
                    description: `Sets the vertical offset of the health bar hologram.`,
                },
            }),
            description: `Creates a basic health bar hologram. Requires "Holograms" or "HolographicDisplays" plugin.

            ${mdSeeAlso("Mobs/Mobs#healthbar")}`,
        },
        BossBar: {
            schema: new SchemaObject({
                Enabled: {
                    schema: new SchemaBool(),
                    description: `Enables or disables the boss bar.`,
                    required: true,
                },
                Title: {
                    schema: new SchemaString(),
                    description: `Sets the title of the boss bar.`,
                },
                Range: {
                    schema: new SchemaNumber(0),
                    description: `Sets the range of the boss bar. Defaults to 64.`,
                },
                Color: {
                    schema: new SchemaString(
                        (ws) => ws.mythicData.bossbarColors,
                    ),
                    description: `Sets the color of the boss bar. ⚠️ This is case-sensitive.`,
                },
                Style: {
                    schema: new SchemaString(
                        (ws) => ws.mythicData.bossbarStyles,
                    ),
                    description: `Sets the style of the boss bar. ⚠️ This is case-sensitive.`,
                },
                CreateFog: {
                    schema: new SchemaBool(),
                    description: `If true, adds a fog-like effect to the player's vision while in the radius defined for the bossbar.`,
                },
                DarkenSky: {
                    schema: new SchemaBool(),
                    description: `If true, darkens the sky while in the radius defined for the bossbar, similar to the effect created when the Wither is spawned.`,
                },
                PlayMusic: {
                    schema: new SchemaBool(),
                    description: `Whether to play boss music while in the radius defined for the bossbar.`,
                },
            }),
            description: `Defines and controls the health bar of the mob.
            Looks like the Ender Dragon's or the Wither's health bar, but is configurable in appearance.

Example usage:

\`\`\`yaml
SuperCreeper:
    Type: creeper
    Display: '&cTest'
    Health: 20
    BossBar:
        Enabled: true
        Title: 'Test'
        Range: 20
        Color: RED
        Style: SOLID
\`\`\`

${mdSeeAlso("Mobs/Mobs#bossbar")}`,
        },
        Faction: {
            schema: new SchemaString(),
            description: `Sets the mob's faction, which can be used for advanced ${mdLinkWiki(
                "Mobs/Custom-AI", "Custom AI",
            )}}) configurations or ${mdLinkWiki(
                "Skills/Targeters#targeter-option", "targeter filtering",
            )}}).
            Faction is case-sensitive, so be careful when using faction conditions.

            ${mdSeeAlso("Mobs/Mobs#faction")}`,
        },
        Mount: {
            schema: SCHEMA_MYTHIC_MOB_ID,
            description: `Sets the mount of your mob.
            Must be another MythicMob.
            The mob will automatically ride on the defined mount when it spawns.

            ${mdSeeAlso("Mobs/Mobs#mount")}`,
        },
        DisplayOptions: {
            schema: new SchemaObject((ws, doc, value2) => {
                if (!isMap(value)) {
                    return {};
                }

                const type = value.items.find(
                    (pair) => isScalar(pair.key) && pair.key.value === "Type",
                );
                if (!type) {
                    return {};
                }

                const textDisplayOptions = {
                    Text: {
                        schema: new SchemaString(),
                        description: `Sets the text displayed.`,
                    },
                };

                const itemDisplayOptions = {
                    Item: {
                        schema: new SchemaString(),
                        description: `Sets the item displayed.`,
                    },
                };

                const blockDisplayOptions = {
                    Block: {
                        schema: new SchemaString(),
                        description: `Sets the block displayed.`,
                    },
                };

                const baseOptions = {
                    // A: {
                    //     schema: new SchemaString(),
                    //     description: `test`,
                    // },
                };

                const options = baseOptions;

                switch (type.value?.toString()) {
                    case "block_display":
                        Object.assign(options, blockDisplayOptions);
                        break;
                    case "item_display":
                        Object.assign(options, itemDisplayOptions);
                        break;
                    case "text_display":
                        Object.assign(options, textDisplayOptions);
                        break;
                }

                return options;
            }),
            description: `Sets the display entity options of the mob.
            Requires mob to have type \`block_display\`, \`item_display\`, or \`text_display\`.

            ${mdSeeAlso("Mobs/Mobs#displayoptions")}`,
        },
        Options: {
            schema: new SchemaMap(),
            description: `This is a special field which comes with numerous sub-options, like determining if the mob should despawn,
            setting knockback resistance, follow range, movement speed and many more.
            A list of available mob options can be found in the ${mdLinkWiki(
            "Mobs/Options", "Mob Options",
        )}}) page.

            ${mdSeeAlso("Mobs/Mobs#options")}`,
        },
        Modules: {
            schema: new SchemaObject({
                ThreatTables: {
                    schema: new SchemaBool(),
                    description: `Enables or disables ${mdLinkWiki("Mobs/ThreatTables", "Threat Tables")} for the mob.`,
                    aliases: ["ThreatTable"],
                },
                ImmunityTables: {
                    schema: new SchemaBool(),
                    description: `Enables or disables ${mdLinkWiki("Mobs/ImmunityTables", "Immunity Tables")} for the mob.`,
                },
            }),
            description: `This field allows you to enable or disable modules, like ${mdLinkWiki(
                "Mobs/ThreatTables",
            )}}) and/or ${mdLinkWiki("Mobs/ImmunityTables")}.

            ${mdSeeAlso("Mobs/Mobs#modules")}`,
        },
        AIGoalSelectors: {
            schema: new SchemaList(new SchemaString()),
            description: `TModifies and customizes the ${mdLinkWiki("Mobs/Custom-AI#ai-goal-selectors", "AI goals")} of the mob.

            ${mdSeeAlso("Mobs/Mobs#aigoalselectors")}`,
        },
        AITargetSelectors: {
            schema: new SchemaList(new SchemaString()),
            description: `Modifies and customizes the ${mdLinkWiki("Mobs/Custom-AI#ai-target-selectors", "AI targets")} of the mob.

            ${mdSeeAlso("Mobs/Mobs#aitargetselectors")}`,
        },
        Drops: {
            schema: new SchemaList(new SchemaString()),
            description: `Add or completely modify the mob loot drops.
            Can be vanilla items, mythic items, experience points, cross-plugin items (if supported), or even custom drop tables with their own condition system.
            See ${mdLinkWiki("drops/Drops")} for more information.

            ${mdSeeAlso("Mobs/Mobs#drops")}`,
        },
        DamageModifiers: {
            schema: new SchemaList(new SchemaString()),
            description: `Modify how much damage the mob will take from different damage causes.
            For example, DamageModifiers can be used to make the mob immune to melee attacks, but weak to ranged attacks.
            See ${mdLinkWiki("Mobs/DamageModifiers")} for more information.

            ${mdSeeAlso("Mobs/Mobs#damagemodifiers")}`,
        },
        Equipment: {
            schema: new SchemaList(new SchemaString()),
            description: `Equips the mob with vanilla items or mythic items when it first spawns.
            See ${mdLinkWiki("Mobs/Equipment")} for more information.

            ${mdSeeAlso("Mobs/Mobs#equipment")}`,
        },
        KillMessages: {
            schema: new SchemaList(new SchemaString()),
            description: `Customize the ${mdLinkWiki("Mobs/KillMessages", "kill messages")} that appears when the mob kills a player.

            ${mdSeeAlso("Mobs/Mobs#killmessages")}`,
        },
        LevelModifiers: {
            schema: new SchemaObject(Object.fromEntries(["Health", "Damage", "KnockbackResistance", "Power", "Armor", "MovementSpeed"].map((key) => [
                key,
                {
                    schema: new SchemaNumber(0),
                    description: `Sets the \`${key}\` statistic the mob will gain per level.`,
                },
            ]))),
            description: `MythicMobs can have ${mdLinkWiki("Mobs/Levels", "levels")} and this field is used to determine which kinds of statistics they should gain on when their levels change.

            ${mdSeeAlso("Mobs/Mobs#levelmodifiers")}`,
        },
        Disguise: {
            schema: new SchemaString(),
            description: `Changes the appearance of the mob to be like other entity types.
            Requires the plugin [🔗 LibsDisguises](https://www.spigotmc.org/resources/libs-disguises-free.81/) to be installed and functioning on your server.
            See ${mdLinkWiki("Mobs/Disguises")} for more information.

            ${mdSeeAlso("Mobs/Mobs#disguise")}`,
        },
        Skills: {
            schema: new MythicSkillList(),
            description: `Skills are an integral feature of Mythic. All mobs are able to have skills of various types that can be triggered under different circumstances with varying
            conditions. The Mythic skill system is quite intuitive once you get used to it, and can be used to create anything from simple mobs to incredibly complex bosses.
            See ${mdLinkWiki("Skills/Skills")} to get started on making your own skills.

            ${mdSeeAlso("Mobs/Mobs#skills")}`,
        },
        Nameplate: {
            schema: new SchemaObject({
                Enabled: {
                    schema: new SchemaBool(),
                    description: `Enables or disables the nameplate.`,
                    required: true,
                },
                Mounted: {
                    schema: new SchemaBool(),
                    description: `If true, forces the nameplate to work with modeled entities from the ModelEngine plugin`,
                },
            }),
            description: `Forces the usage of Mythic nameplates on the mob, if the Enabled: true option is used.
            This makes display names like Display: "Hello\nWorld!" be displayed on two separate lines.

            ${mdSeeAlso("Mobs/Mobs#nameplate")}`,
        },
        Hearing: {
            schema: new SchemaObject({
                Enabled: {
                    schema: new SchemaBool(),
                    description: `Enables or disables the mob's hearing.`,
                },
            }),
            description: `Allows the mob to "hear" sounds like a warden would.
            Turning this on enables the new ${mdLinkWiki("Skills/Triggers#onhear", "`~onHear`")} trigger.

            ${mdSeeAlso("Mobs/Mobs#hearing")}`,
        },
        Variables: {
            schema: new SchemaMap(),
            description: `Instead of using a lot of \`setvariable\` mechanics \`~onSpawn\`, you can make a mob spawn with already set ${mdLinkWiki("Skills/Variables", "variables")} via the use the of Variables mob field.

            ${mdSeeAlso("Mobs/Mobs#variables")}`,
        },
        Trades: {
            schema: new SchemaMap(),
            description: `Customizes the villager trades.
            Villagers must have a profession and a profession level of 2 to be able to keep its custom trades.

            ${mdSeeAlso("Mobs/Mobs#trades")}`,
        },
    })).withName("mythic_mob_config"),
)
    .onPartialProcess(component(MythicMob, "mobs", SemanticTokenTypes.class))
    .onPartialProcess((ws, doc, v, result) => {
        if (!isMap(v)) {
            return;
        }

        for (const { key, value } of v.items) {
            if (!isMap(value)) {
                continue;
            }

            const type = value.items.find(
                (pair) => isScalar(pair.key) && pair.key.value === "Type",
            );

            if (includesIgnoreCase(ws.mythicData.entityIds, key.toString())) {
                // ...
                if (type) {
                    result.diagnostics.push({
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Type is not required for vanilla override of ${key.toString()}.`,
                        range: doc.convertToRange(type.key.range),
                        code: "mythic-mob-vanilla-override-type",
                    });
                }
            }

            // DisplayOptions is only for block_display, item_display, and text_display
            if (
                !includesIgnoreCase(
                    ["block_display", "item_display", "text_display"],
                    type?.value?.toString() ?? "",
                )
            ) {
                const displayOptions = value.items.find(
                    (pair) => isScalar(pair.key)
                        && pair.key.value === "DisplayOptions",
                );

                if (displayOptions) {
                    result.diagnostics.push({
                        ...DIAGNOSTIC_DEFAULT,
                        message: `DisplayOptions is only available for block_display, item_display, and text_display. Got ${
                            type?.value?.toString() ?? "unknown"
                        }.`,
                        range: doc.convertToRange(displayOptions.key.range),
                        code: "mythic-mob-invalid-display-options",
                    });
                }
            }
        }
    });
