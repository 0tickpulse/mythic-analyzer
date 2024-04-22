import { SemanticTokenTypes } from "vscode-languageserver";
import { isMap, isScalar } from "yaml";

import { DIAGNOSTIC_DEFAULT } from "../../../errors.js";
import { SchemaMap } from "../base-types/map.js";
import { SchemaNumber } from "../base-types/number.js";
import { SchemaObject } from "../base-types/object.js";
import { SchemaString } from "../base-types/string.js";
import { SCHEMA_ENTITY_TYPE } from "../utility-types/entityType.js";
import { component } from "../utils/component.js";
import { mdLinkWiki, mdSeeAlso } from "../../../util/markdown.js";
import { MythicMob } from "../../../document-models/mythicmob.js";
import { SchemaBool } from "../base-types/bool.js";
import { SCHEMA_MYTHIC_MOB_ID } from "../utility-types/mythicMobId.js";

export const MYTHIC_MOB_SCHEMA = new SchemaMap(
    new SchemaObject({
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
            description: `Sets the mob's faction, which can be used for advanced [Custom AI](${mdLinkWiki("Mobs/Custom-AI")}) configurations or [targeter filtering](${mdLinkWiki("Skills/Targeters#targeter-option")}).
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
    }).withName("mythic_mob_config"),
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

            if (ws.mythicData.entityIds.has(key.toString().toUpperCase())) {
                // ...
                if (type) {
                    result.diagnostics.push({
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Type is not required for vanilla override of ${key.toString()}.`,
                        range: doc.convertToRange(type.key.range),
                    });
                }
            }
        }
    });
