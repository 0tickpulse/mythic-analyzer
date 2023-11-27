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
};

export class MythicDataBuilder {
    public readonly materialIds = MATERIALS;

    public readonly entityIds = new Set<string>();

    public tickDuration = DEFAULT_TICK_DURATION;

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
