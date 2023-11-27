import { MATERIALS } from "./defaultData/materials.js";
import { DEFAULT_TICK_DURATION } from "./defaultData/tick.js";

export type MythicData = {
    /**
     * All material IDs that are used in the workspace.
     */
    readonly materialIds: Set<string>;
    /**
     * All entity IDs that are used in the workspace.
     */
    readonly entityIds: Set<string>;
    /**
     * The duration of a singular tick in seconds.
     */
    readonly tickDuration: number;
};

/**
 * A fluent-interface builder for MythicData.
 */
export class MythicDataBuilder {
    public readonly materialIds = MATERIALS;

    public readonly entityIds = new Set<string>();

    public tickDuration = DEFAULT_TICK_DURATION;

    public constructor(data?: MythicData) {
        if (data) {
            this.materialIds = data.materialIds;
            this.entityIds = data.entityIds;
            this.tickDuration = data.tickDuration;
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

    public build(): MythicData {
        return {
            materialIds: this.materialIds,
            entityIds: this.entityIds,
            tickDuration: this.tickDuration,
        };
    }
}
