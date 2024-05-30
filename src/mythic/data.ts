import { DEFAULT_ATTRIBUTE_ARMOR_MAX } from "./defaultData/attributes.js";
import { DEFAULT_BOSSBAR_COLORS, DEFAULT_BOSSBAR_STYLES } from "./defaultData/bossbar.js";
import { DEFAULT_ENCHANTMENTS } from "./defaultData/enchantments.js";
import { DEFAULT_ENTITIES } from "./defaultData/entities.js";
import { DEFAULT_HIDE_FLAGS } from "./defaultData/hideFlags.js";
import { MATERIALS } from "./defaultData/materials.js";
import { DEFAULT_TICK_DURATION } from "./defaultData/tick.js";

export type MythicData = {
    /**
     * All material IDs that are used in the workspace.
     */
    materialIds: Set<string>;
    /**
     * All entity IDs that are used in the workspace.
     */
    entityIds: Set<string>;
    /**
     * The duration of a singular tick in seconds.
     */
    tickDuration: number;
    /**
     * The maximum armor value that an entity can have.
     */
    attributeMaxArmor: number;
    /**
     * Available colors for the bossbar.
     */
    bossbarColors: string[];
    /**
     * Available styles for the bossbar.
     */
    bossbarStyles: string[];
    /**
     * Available enchantments for items.
     */
    enchantments: string[];
    /**
     * Available hide flags for items.
     */
    hideFlags: string[];
};

/**
 * A fluent-interface builder for MythicData.
 */
export class MythicDataBuilder {
    public readonly materialIds = MATERIALS;

    public readonly entityIds = DEFAULT_ENTITIES;

    public attributeMaxArmor: number = DEFAULT_ATTRIBUTE_ARMOR_MAX;

    public tickDuration = DEFAULT_TICK_DURATION;

    public bossbarColors: string[] = DEFAULT_BOSSBAR_COLORS;

    public bossbarStyles: string[] = DEFAULT_BOSSBAR_STYLES;

    public enchantments: string[] = DEFAULT_ENCHANTMENTS;

    public hideFlags: string[] = DEFAULT_HIDE_FLAGS;

    public constructor(data?: Partial<MythicData>) {
        if (data) {
            data.materialIds && (this.materialIds = data.materialIds);
            data.entityIds && (this.entityIds = data.entityIds);
            data.attributeMaxArmor && (this.attributeMaxArmor = data.attributeMaxArmor);
            data.tickDuration && (this.tickDuration = data.tickDuration);
            data.bossbarColors && (this.bossbarColors = data.bossbarColors);
            data.bossbarStyles && (this.bossbarStyles = data.bossbarStyles);
            data.enchantments && (this.enchantments = data.enchantments);
            data.hideFlags && (this.hideFlags = data.hideFlags);
        }
    }

    public addMaterialId(id: string): this {
        this.materialIds.add(id);
        return this;
    }

    public addEntityId(id: string): this {
        this.entityIds.add(id);
        return this;
    }

    public setTickDuration(duration: number): this {
        this.tickDuration = duration;
        return this;
    }

    public setAttributeMaxArmor(maxArmor: number): this {
        this.attributeMaxArmor = maxArmor;
        return this;
    }

    public setBossbarColors(colors: string[]): this {
        this.bossbarColors = colors;
        return this;
    }

    public setBossbarStyles(styles: string[]): this {
        this.bossbarStyles = styles;
        return this;
    }

    public setEnchantments(enchantments: string[]): this {
        this.enchantments = enchantments;
        return this;
    }

    public setHideFlags(hideFlags: string[]): this {
        this.hideFlags = hideFlags;
        return this;
    }

    public build(): MythicData {
        return {
            materialIds: this.materialIds,
            entityIds: this.entityIds,
            tickDuration: this.tickDuration,
            attributeMaxArmor: this.attributeMaxArmor,
            bossbarColors: this.bossbarColors,
            bossbarStyles: this.bossbarStyles,
            enchantments: this.enchantments,
            hideFlags: this.hideFlags,
        };
    }
}
